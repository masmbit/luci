/*
 * Copyright (C) 2008-2026 The OpenWrt Project
 * Copyright (C) 2026 masmbit
 * 
 * This is free software, licensed under the Apache License, Version 2.0.
 * See /LICENSE for more information.
 * 
 * luci-app-openvpn : shared status class
 *
 * 1. --- TEXT & CONSTANTS --- ..... Global translations and constants
 * 2. --- HELPER --- ............... Router connections and file setup
 * 3. --- STATUS VIEW --- .......... Live statistics and traffic tables
 */

/* global E */
'use strict';

/*
 * --- TEXT & CONSTANTS ---
 */
const TXT = {
    INFO: {
        creating: _('Creating...'),
        disabled: _('Disabled'),        
        error: _('Error'),
        instance_x: _('Instance #'),
        pending: _('Pending...'),
        running: _('Running'),        
        no_clients_connected: _('No clients connected')
    },
    TH: {
        vpn: _('VPN'),
        instance: _('Instance'),
        encryption: _('Encryption'),
        type: _('Type'),
        status: _('Status'),
        local_ip_port: _('Local IP / Port'),
        remote_ip_port: _('Remote IP / Port'),
        transfer_rx_tx: _('Transfer (Rx / Tx)'),
        uptime: _('UpTime'),
        no_inst: _('No instances configured')
    },
    CMD: {
        openvpn: 'openvpn',
        vpn_port_str: '1194',
        ip_loopback: '127.0.0.1'
    },
    DIR: {
        openvpn: '/etc/openvpn/',
        proc: '/proc/'
    },
    FILE: {
        proc_net_dev: '/proc/net/dev',
        proc_uptime: '/proc/uptime',
        var_run_openvpn: '/var/run/openvpn.',
    },
    ID: {
        displayname: 'displayname',
        Common_Name: 'Common Name',
        GLOBAL_STATS: 'GLOBAL STATS',
        OpenVPN_CLIENT_LIST: 'OpenVPN CLIENT LIST',
        ROUTING_TABLE: 'ROUTING TABLE',
        error_dashboard_refresh: 'LuCI Live Dashboard Refresh Failed:'
    }
};


/*
 * --- HELPER ---
 */


/**
 * Gets the active status of the OpenVPN service from ubus.
 */
const callServiceList = L.rpc.declare({
    object: 'service',
    method: 'list',
    params: ['name'],
    expect: { 'openvpn': {} }
});

/**
 * Checks if an OpenVPN instance is enabled.
 */
const isInstanceEnabled = function (instance_id) {
    return L.uci.get(TXT.CMD.openvpn, instance_id, 'enabled') === '1';
};

/**
 * Checks if at least one OpenVPN instance is enabled in the configuration array.
 */
const isAnyInstanceEnabled = function (sections) {
    const targetSections = Array.isArray(sections) ? sections : [];
    for (let i = 0; i < targetSections.length; i++) {
        if (targetSections[i] && targetSections[i]['.name'] && isInstanceEnabled(targetSections[i]['.name'])) {
            return true;
        }
    }
    return false;
};

/**
 * Refreshes volatile runtime data from procfs.
 */
const refreshSystemTelemetry = function (viewData) {
    return Promise.all([
        L.resolveDefault(L.fs.read(TXT.FILE.proc_net_dev), ''),
        L.resolveDefault(L.fs.read(TXT.FILE.proc_uptime), '0')
    ]).then(function (results) {
        const [rawDevData, rawUptime] = results;
        viewData.devData = rawDevData || '';
        const parts = String(rawUptime).trim().split(/\s+/);
        viewData.uptime = (parts && parts[0]) ? parseFloat(parts[0]) : 0;        
    });
};

/**
 * Parses client IP addresses from the OpenVPN status log file.
 */
const parseConnectedClients = function (statusContent) {
    const connectedClients = [];
    if (!statusContent) return connectedClients;

    const lines = statusContent.split('\n');
    let insideClientList = false;

    for (let c = 0; c < lines.length; c++) {
        const line = lines[c].trim();
        if (line.indexOf(TXT.ID.OpenVPN_CLIENT_LIST) !== -1 || line.indexOf(TXT.ID.Common_Name) !== -1) {
            insideClientList = true;
            continue;
        }
        if (line.indexOf(TXT.ID.ROUTING_TABLE) !== -1 || line.indexOf(TXT.ID.GLOBAL_STATS) !== -1) {
            break;
        }
        if (insideClientList && line.length > 0) {
            const ipMatch = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)/);
            if (ipMatch && ipMatch[1]) {
                connectedClients.push(ipMatch[1].trim());
            }
        }
    }
    return connectedClients;
};

/**
 * Parses raw LuCI change tuples into a clean array of pending instance names.
 */
const getOpenVpnChanges = function (rawChanges) {
    const pendingInstances = [];
    if (!Array.isArray(rawChanges)) return pendingInstances;

    for (let i = 0; i < rawChanges.length; i++) {
        const change = rawChanges[i];
        if (Array.isArray(change) && change.length >= 3) {
            const operation = change[0];
            const sectionName = change[1];
            const optionName = change[2];

            if (operation === 'set' && optionName === 'enabled' && sectionName) {
                if (pendingInstances.indexOf(sectionName) === -1) {
                    pendingInstances.push(sectionName);
                }
            }
        }
    }
    return pendingInstances;
};

/**
 * Evaluates the current global operational state of all OpenVPN instances.
 */
const getCurrentOpenVpnState = function (sections, updatedInstances, openvpnChanges) {
    const uciEnabled = isAnyInstanceEnabled(sections);
    if (!uciEnabled) return 'disabled';
    if (Array.isArray(openvpnChanges) && openvpnChanges.length > 0) return 'pending';

    let totalEnabledCount = 0;
    let totalRunningCount = 0;

    for (let i = 0; i < updatedInstances.length; i++) {
        const inst = updatedInstances[i];
        if (inst && isInstanceEnabled(inst.id)) {
            totalEnabledCount++;
            if (inst.isRunning === true) totalRunningCount++;
        }
    }
    if (totalEnabledCount > 0 && totalRunningCount === totalEnabledCount) return 'active';
    return 'error';
};

/**
 * Reads the active runtime status and telemetry fields for all instances.
 */
const readInstanceStatus = function (sections, instancesObj, systemUptime) {
    const instPromises = [];
    // Convert current runtime uptime context into a safe integer helper variable
    const currentUptime = parseFloat(systemUptime) || 0;

    sections.forEach(function (s) {
        const id = s['.name'];
        const numMatch = id.match(/\d+$/);
        const instNum = numMatch ? parseInt(numMatch, 10) : 1;
        const role = L.uci.get(TXT.CMD.openvpn, id, 'role') || 'server';

        const readPromise = L.resolveDefault(L.fs.read(TXT.DIR.openvpn + id + '.conf'), '').then(function (confContent) {
            const runtimeInstance = instancesObj[id] || {};
            const isRunning = (runtimeInstance.running === true);
            const pidVal = isRunning ? (runtimeInstance.pid || '-') : '-';

            const baseResult = {
                id: id, instNum: instNum, role: role,
                confContent: String(confContent).trim(),
                isRunning: isRunning, pid: pidVal,
                startTime: 0, connectedClients: []
            };

            if (!isRunning || pidVal === '-') return baseResult;

            return L.resolveDefault(L.fs.stat(TXT.DIR.proc + pidVal), null).then(function (statObj) {
                if (statObj && statObj.mtime) {
                    let rawMtimeSec = 0;
                    if (typeof statObj.mtime === 'object' && statObj.mtime.sec) {
                        rawMtimeSec = parseInt(statObj.mtime.sec, 10) || 0;
                    } else if (typeof statObj.mtime === 'number') {
                        rawMtimeSec = Math.floor(statObj.mtime);
                    } else if (typeof statObj.mtime === 'string') {
                        rawMtimeSec = parseInt(statObj.mtime, 10) || 0;
                    }

                    // Secure calculation bridging Unix Epoch time and Linux Kernel relative ticks
                    if (rawMtimeSec > 1000000000) {
                        // If procfs delivers absolute Unix seconds, translate it into relative uptime
                        const currentUnixTime = Math.floor(new Date().getTime() / 1000);
                        const bootUnixAnchor = currentUnixTime - currentUptime;
                        baseResult.startTime = (rawMtimeSec > bootUnixAnchor) ? (rawMtimeSec - bootUnixAnchor) : 0;
                    } else {
                        // If procfs delivers relative kernel seconds directly, keep it matching the CPU ticks
                        baseResult.startTime = rawMtimeSec;
                    }
                }
                if (role !== 'server') return baseResult;

                const statusFilePath = TXT.FILE.var_run_openvpn + id + '.status';
                return L.resolveDefault(L.fs.read(statusFilePath), '').then(function (statusContent) {
                    baseResult.connectedClients = parseConnectedClients(statusContent);
                    return baseResult;
                });
            });
        });
        instPromises.push(readPromise);
    });
    return Promise.all(instPromises);
};


/*
 * --- STATUS VIEW ---
 */


/**
 * Extracts networking and crypto parameters from configuration data.
 */
const parseNetworkParams = function (role, confContent, isRunning) {
    const params = { localIp: '0.0.0.0', localPort: TXT.CMD.vpn_port_str, clientRemote: '-', proto: '', cipher: '-' };

    if (!confContent) return params;

    const lines = confContent.split(/[\r\n]+/);
    for (let j = 0; j < lines.length; j++) {
        const line = lines[j].trim();

        // Extract cipher string
        if (line.indexOf('cipher ') === 0) {
            params.cipher = line.replace('cipher ', '').trim().toUpperCase();
        }
        // Fallback or prefer data-ciphers array string (extracts first preferred crypto)
        else if (line.indexOf('data-ciphers ') === 0) {
            const dcParts = line.replace('data-ciphers ', '').trim().split(':');
            if (dcParts && dcParts[0]) {
                params.cipher = dcParts[0].trim().toUpperCase();
            }
        }

        if (line.indexOf('proto ') === 0) {
            const protoParts = line.split(/\s+/);
            if (protoParts.length >= 2) {
                params.proto = String(protoParts[1]).trim().toUpperCase();
            }
        }

        if (role === 'client' && line.indexOf('remote ') === 0) {
            const rParts = line.split(/\s+/);
            const remoteIp = (rParts.length >= 2) ? rParts[1] : TXT.CMD.ip_loopback;
            const remotePort = (rParts.length >= 3) ? rParts[2] : TXT.CMD.vpn_port_str;

            params.localIp = TXT.CMD.ip_loopback;
            params.localPort = isRunning ? 'dynamic' : '-';
            params.clientRemote = remoteIp + ':' + remotePort;
        } else if (role === 'server') {
            if (line.indexOf('port ') === 0) {
                const pParts = line.split(/\s+/);
                if (pParts.length >= 2) params.localPort = pParts[1];
            }
            if (line.indexOf('server ') === 0) {
                const sParts = line.split(/\s+/);
                if (sParts.length >= 2) params.localIp = sParts[1].replace(/\.0$/, '.1');
            }
        }
    }
    return params;
};

/**
 * Extracts exact Tx/Rx packet and byte telemetry from Linux kernel stats.
 */
const parseKernelInterfaceData = function (tunDevice, devDataRaw) {
    const stats = { rxBytes: 0, rxPkts: 0, txBytes: 0, txPkts: 0, hasData: false };

    if (!devDataRaw || devDataRaw.length === 0) return stats;

    const devLines = devDataRaw.split('\n');
    for (let d = 0; d < devLines.length; d++) {
        if (devLines[d].indexOf(tunDevice + ':') !== -1) {
            const parts = devLines[d].replace(/.*:/, '').trim().split(/\s+/);
            if (parts.length >= 16) {
                stats.rxBytes = parseInt(parts[0], 10) || 0;
                stats.rxPkts = parseInt(parts[1], 10) || 0;
                stats.txBytes = parseInt(parts[8], 10) || 0;
                stats.txPkts = parseInt(parts[9], 10) || 0;
                stats.hasData = true;
            }
            break;
        }
    }
    return stats;
};

/**
 * Renders the remote node network column context based on instance roles.
 */
const renderRemoteNode = function (role, isRunning, netParams, connectedClients, protoStr) {
    if (role === 'client') {
        if (!isRunning) return E('span', { 'style': 'color: var(--text-color-light, #64748b);' }, '-');
        const cleanProto = protoStr || '';
        return E('span', { 'style': 'font-family: var(--font-monospace, monospace); color: var(--text-color, #334155);' }, netParams.clientRemote + cleanProto);
    }

    if (!isRunning) return E('span', { 'style': 'color: var(--text-color-light, #64748b);' }, '-');

    if (!Array.isArray(connectedClients) || connectedClients.length === 0) {
        return E('span', { 'style': 'font-style: italic; color: var(--text-color-light, #64748b);' }, TXT.INFO.no_clients_connected);
    }

    const clientRows = [];
    connectedClients.forEach(function (client) {
        clientRows.push(E('div', {
            'style': 'font-family: var(--font-monospace, monospace); margin: 0; padding: 0; border: none !important; line-height: 1.2; color: var(--text-color, #334155);'
        }, [
            E('strong', {}, client)
        ]));
    });

    return E('div', { 'style': 'display: block; margin: 0; padding: 0; border: none !important;' }, clientRows);
};


/**
 * Formats a raw byte metric into a human-readable data size string.
 */
const formatStatusBytes = function (b) {
    if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
    if (b >= 1024) return (b / 1024).toFixed(1) + ' KB';
    return b + ' B';
};

/**
 * Calculates and formats individual instance runtime durations based on router uptime.
 */
const calculateInstanceUptime = function (procStartSeconds, systemUptime) {
    const startSec = parseInt(procStartSeconds, 10);
    if (isNaN(startSec) || startSec <= 0) return '-';

    const diff = Math.floor(systemUptime) - startSec;
    if (isNaN(diff) || diff < 0) return '00:00:00';

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    const pad = function (n) { return n < 10 ? '0' + n : n; };

    if (days > 0) {
        return days + 'd ' + pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
    }
    return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
};

/**
 * Render and refresh the openvpn instance status and telemetry table.
 */
const refreshStatusTable = function (instances, devDataRaw, systemUptime, isLiveRefresh, openvpnChanges) {
    const tableRows = [];
    const rawChanges = openvpnChanges || null;

    for (let i = 0; i < instances.length; i++) {
        const inst = instances[i];
        const role = inst.role || 'server';

        const netParams = parseNetworkParams(role, inst.confContent, inst.isRunning);
        const kernelStats = parseKernelInterfaceData('tun' + (inst.instNum - 1), devDataRaw);

        const protoStr = (inst.isRunning && netParams.proto) ? '-' + netParams.proto : '';
        const remoteIpNode = renderRemoteNode(role, inst.isRunning, netParams, inst.connectedClients, protoStr);

        const customUciName = L.uci.get(TXT.CMD.openvpn, inst.id, TXT.ID.displayname) || '';
        const displayId = customUciName ? customUciName : TXT.INFO.instance_x + inst.instNum;

        const typeBadge = E('span', {
            'class': 'ifacebadge',
            'style': 'font-weight:normal !important; padding:2px 6px; border-radius:3px; background:var(--background-color, transparent) !important; border:1px solid var(--border-color, #cbd5e1); color:var(--text-color, #334155);'
        }, role.charAt(0).toUpperCase() + role.slice(1));

        const hasPendingApply = (Array.isArray(rawChanges) && rawChanges.indexOf(inst.id) !== -1);
        let statusBadge;

        if (inst.isRunning) {
            statusBadge = E('span', {
                'class': 'ifacebadge',
                'style': 'font-weight:normal !important; padding:2px 8px; border-radius:3px; background:var(--background-color, transparent) !important; color:var(--action-bg, #00a8ff) !important; border:1px solid var(--action-border, #0097e6); text-shadow:none !important; box-shadow:none !important;'
            }, TXT.INFO.running + ' (PID: ' + inst.pid + ')');
        } else if (hasPendingApply) {
            statusBadge = E('span', {
                'class': 'ifacebadge',
                'style': 'font-weight:normal !important; padding:2px 8px; border-radius:3px; background:var(--background-color, transparent) !important; color:#e67e22 !important; border:1px solid #d35400; text-shadow:none !important; box-shadow:none !important;'
            }, TXT.INFO.pending);
        } else if (L.uci.get(TXT.CMD.openvpn, inst.id, 'enabled') === '1') {
            if (!isLiveRefresh) {
                statusBadge = E('span', {
                    'class': 'ifacebadge',
                    'style': 'font-weight:normal !important; padding:2px 8px; border-radius:3px; background:var(--background-color, transparent) !important; color:#e67e22 !important; border:1px solid #d35400; text-shadow:none !important; box-shadow:none !important;'
                }, TXT.INFO.creating);
            } else {
                statusBadge = E('span', {
                    'class': 'ifacebadge',
                    'style': 'font-weight:normal !important; padding:2px 8px; border-radius:3px; background:var(--background-color, transparent) !important; color:#e74c3c !important; border:1px solid #c0392b; text-shadow:none !important; box-shadow:none !important;'
                }, TXT.INFO.error);
            }
        } else {
            statusBadge = E('span', {
                'class': 'ifacebadge',
                'style': 'font-weight:normal !important; padding:2px 8px; border-radius:3px; background:var(--neutral-bg, #f1f2f6) !important; color:var(--text-color-light, #64748b) !important; border:1px solid var(--border-color, #cbd5e1); text-shadow:none !important; box-shadow:none !important;'
            }, TXT.INFO.disabled);
        }

        const localConnectionAddress = (role === 'server')
            ? netParams.localIp + ':' + netParams.localPort + protoStr
            : netParams.localIp + ':' + netParams.localPort;

        const transferDisplay = kernelStats.hasData
            ? formatStatusBytes(kernelStats.rxBytes) + ' / ' + formatStatusBytes(kernelStats.txBytes) + ' (' + kernelStats.rxPkts + ' / ' + kernelStats.txPkts + ')'
            : '0 B / 0 B (0 / 0)';

        const uptimeDisplay = calculateInstanceUptime(inst.startTime, systemUptime);
        const cipherLabel = String(netParams.cipher || 'AES-256-GCM');

        const rowStyleClass = (i % 2 === 0) ? 'tr cbi-section-table-row cbi-rowstyle-1' : 'tr cbi-section-table-row cbi-rowstyle-2';

        tableRows.push(E('tr', { 'class': rowStyleClass }, [
            E('td', { 'class': 'td' }, '#' + inst.instNum),
            E('td', { 'class': 'td', 'style': 'font-weight:bold; color:var(--text-color, #334155);' }, displayId),
            E('td', { 'class': 'td' }, typeBadge),
            E('td', { 'class': 'td' }, statusBadge),
            E('td', { 'class': 'td', 'style': 'font-family:var(--font-monospace, monospace); color:var(--text-color, #334155);' }, localConnectionAddress),
            E('td', { 'class': 'td' }, remoteIpNode),
            E('td', { 'class': 'td', 'style': 'font-family:var(--font-monospace, monospace); font-weight:bold; color:#10b981;' }, inst.isRunning ? cipherLabel : '-'),
            E('td', { 'class': 'td', 'style': 'font-family:var(--font-monospace, monospace); color:var(--text-color, #334155); white-space:nowrap;' }, inst.isRunning ? transferDisplay : '-'),
            E('td', { 'class': 'td', 'style': 'font-family:var(--font-monospace, monospace); color:var(--text-color, #334155);' }, inst.isRunning ? uptimeDisplay : '-')
        ]));
    }

    return E('table', { 'class': 'table cbi-section-table' }, [
        E('tr', { 'class': 'tr cbi-section-table-titles' }, [
            E('th', { 'class': 'th' }, TXT.TH.vpn),
            E('th', { 'class': 'th' }, TXT.TH.instance),
            E('th', { 'class': 'th' }, TXT.TH.type),
            E('th', { 'class': 'th' }, TXT.TH.status),
            E('th', { 'class': 'th' }, TXT.TH.local_ip_port),
            E('th', { 'class': 'th' }, TXT.TH.remote_ip_port),
            E('th', { 'class': 'th' }, TXT.TH.encryption),
            E('th', { 'class': 'th' }, TXT.TH.transfer_rx_tx),
            E('th', { 'class': 'th' }, TXT.TH.uptime)
        ])
    ].concat(tableRows.length > 0 ? tableRows : [
        E('tr', { 'class': 'tr' }, [
            E('td', { 'class': 'td', 'colspan': '9', 'style': 'text-align:center; font-style:italic; color:var(--text-color-light, #64748b);' }, TXT.TH.no_inst)
        ])
    ]));
};

/**
 * Refreshes the status table and syncs the main control box metrics continuously.
 */
const refreshLiveDashboard = function (sections, viewData, tableContainerElement, refreshMainCallback) {
    return refreshSystemTelemetry(viewData).then(function () {
        return Promise.all([
            L.resolveDefault(callServiceList(TXT.CMD.openvpn), {}),
            L.resolveDefault(L.uci.changes(), {})
        ]);
    }).then(function (results) {
        const [serviceData, uciChanges] = results;
        const instancesObj = serviceData.instances || {};
        const rawChanges = (uciChanges && uciChanges[TXT.CMD.openvpn]) ? uciChanges[TXT.CMD.openvpn] : null;
        const openvpnChanges = getOpenVpnChanges(rawChanges);
        const systemUptime = parseFloat(viewData.uptime) || 0;
        const devDataRaw = String(viewData.devData || '').trim();
        
        return readInstanceStatus(sections, instancesObj, systemUptime).then(function (updatedInstances) {

            // Status table: Update the live status table
            if (tableContainerElement && tableContainerElement.firstChild) {
                const freshTableNode = refreshStatusTable(updatedInstances, devDataRaw, systemUptime, true, openvpnChanges);
                tableContainerElement.replaceChild(freshTableNode, tableContainerElement.firstChild);
            }

            // Main view: Fire the callback method to trigger main control box updates
            if (typeof refreshMainCallback === 'function') {
                const calculatedState = getCurrentOpenVpnState(sections, updatedInstances, openvpnChanges);
                refreshMainCallback(sections, calculatedState, updatedInstances, devDataRaw);
            }
        });
    }).catch(function (err) {
        console.error(TXT.ID.error_dashboard_refresh, err.message);
    });
};

/**
 * Export the status functions to LuCI
 */ 
return L.Class.extend({
    readInstanceStatus: readInstanceStatus,
    refreshStatusTable: refreshStatusTable,
    refreshLiveDashboard: refreshLiveDashboard
});


