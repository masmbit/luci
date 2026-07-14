/*
 * Copyright (C) 2008-2026 The OpenWrt Project
 *
 * This is free software, licensed under the Apache License, Version 2.0.
 * See /LICENSE for more information.
 */

/* global E, URL, FileReader, Blob, sessionStorage */
'use strict';

var view = L.view;

/* Pure English comments, structural code compliant with OpenWrt LuCI ESLint guidelines */
const TXT = {
    INFO: {
        running: _('Running'),
        stopped: _('Stopped'),
        active: _('Active'),
        openvpn: _('OpenVPN')
    },
    BTN: {
        show: _('Show'),
        close: _('Close'),
        download: _('Download'),
        upload: _('Upload'),
        save_apply: _('Save & Apply'),
        add_client: _('Add Client Instance'),
        add_server: _('Add Server Instance'),
        save_config: _('Save Config'),
        del_instance: _('Delete Instance'),
        del_ready: _('Deleted - Save & Apply')
    },
    STATUS: {
        success: _('Success'),
        error: _('Error:'),
        saving: _('Saving...'),
        saved: _('Saved'),
        creating: _('Creating...'),
        clearing: _('Clearing...'),
        click_disable_enable: _('(Please Disable and Re-Enable OpenVPN to reload changes)'),
        click_save_apply: _('Please click "Save & Apply".'),
        log_cleared: _('Log Cleared'),
        log_clear: _('Clear Log'),
        loading_key: _('Loading key contents...'),
        file_location: _('File Location: '),
        instance_x: 'Instance #',
        key_info_ca: '• Certification Authority ',
        key_info_serever_crt: '• Server Certificate ',
        key_info_server_key: '• Private Server Key ',
        key_info_hd: '• Diffie- Hellman Parameters ',
        key_info_tls: '• TLS Crypt Secret '
    },
    MSG: {
        title_main: _('OpenVPN Server/Client'),
        title_status: _('Status'),
        title_mgmt: _('Instance Management'),
        title_log: _('LOG'),
        no_vpn_log: _('No active OpenVPN log entries found.'),
        key_upload: _('OpenVPN Key Upload'),
        edit_config: _('Edit Config file'),
        current_state: _('Current State:'),
        global_status: _('Global Status:'),
        confirm_del: _('Are you sure you want to delete '),
        manage_instance: _('Here you can manage multiple OpenVPN Server and Client instances dynamically.'),
        keygen_in_progress: _('Key generation in progress...'),
        keygen_wait: _('Please wait while secure cryptographic, router-unique default assets are being generated.'),
        process_take_few_minutes: _('This automated initialization process can take a few minutes on your device...'),
        keyfile_not_exist: _('Key file is empty or does not exist on disk yet.')
    },
    TH: {
        vpn: _('VPN'),
        instance: _('Instance'),
        type: _('Type'),
        status: _('Status'),
        remote: _('Remote IP / Port'),
        tx: _('Tx Pkts / Data'),
        rx: _('Rx Pkts / Data'),
        uptime: _('UpTime'),
        no_inst: _('No instances configured'),
        local_ip_port: _('Local IP / Port'),
        remote_ip_port: _('Remote IP / Port'),
        enabled: _('Enabled: '),
        instances: _('Instances: '),
        connected: _('Connected: '),
        active_pids: _('Active PIDs: '),
        aggregated_rx: _('Aggregated RX: '),
        aggregated_tx: _('Aggregated TX: ')
    },
    ICON: {
        success: '✅ ',
        error: '❌ ',
        loading: '⏳ ',
        warning: '⚠️ '
    },
    STYLE: {
        /* Shared system tokens mapping to native LuCI responsive themes (Light/Dark compliant) */
        class_text_title: 'cbi-value-title',
        class_text_descr: 'cbi-section-descr',
        class_fieldset: 'cbi-section-fieldset'
    },
    CFG: {
        modern_vpn_server: '# Modern OpenVPN Server Configuration Instance',
        modern_vpn_client: '# Modern OpenVPN Client Configuration Instance',
        config_instance: 'Configuration Instance',
        openvpn_pending_reactivation: 'TXT.CFG.openvpn_pending_reactivation',
        instance1: 'instance1',
        instance2: 'instance2',
        pconf: '.conf',
        vpn_port_str: '1194',
        vpn_port_int: 1194,
        ip_loopback: '127.0.0.1'
    },
    DIR: {
        openvpn: '/etc/openvpn/',
        keys: '/etc/openvpn/keys/',
        openvpn_status: '/var/run/openvpn.'
    },
    FILE: {
        client_def_conf: 'client.default.conf',
        server_def_conf: 'server.default.conf',
        instance1_conf: 'instance1.conf',
        instance2_conf: 'instance2.conf'
    },
    KEY: {
        pkey: '.key',
        pcrt: '.crt',
        ppem: '.pem',
        ca_def_crt: 'ca_default.crt',
        server_def_crt: 'server_default.crt',
        server_def_key: 'server_default.key',
        dh_def_pem: 'dh_default.pem',
        tls_def_key: 'tls-crypt_default.key',
        ca_: 'ca_',
        server_: 'server_',
        dh_: 'dh_',
        tls_crypt_: 'tls-crypt_',
        empty_info: '--- EMPTY OR BLANK KEY FILE ---'
    },
    CMD: {
        ubus_call_service_list_a: 'ubus call service list \'{"name":"openvpn"}\' | jsonfilter -e \'$.openvpn.instances.',
        ubus_call_service_list_b: '.running\' -e \'$.openvpn.instances.',
        logread: 'logread'
    },
    STAT: {
        pstatus: '.status',
        openvpn_client_list: 'OpenVPN CLIENT LIST',
        common_name: 'Common Name',
        routing_tbale: 'ROUTING TABLE',
        global_status: 'GLOBAL STATS',
        ACL_BLOCKED: 'ACL_BLOCKED',
        openvpn_log_stamp: 'openvpn_log_stamp'
    },
    def: 'default',
    server: 'server',
    client: 'client',
    role: 'role',
    remote: 'remote',
    port: 'port',
    openvpn: 'openvpn',
    enabled: 'enabled',
    disabled: 'disabled',
    warning: 'warning',
    config: 'config',
    number: 'number',
    string: 'string'
};

/**
 * Native LuCI2 RPC method declaration.
 * Replaces high-overhead 'sh -c ubus' execution chains with an atomic memory service call.
 */
var callServiceList = L.rpc.declare({
    object: 'service',
    method: 'list',
    params: ['name'],
    expect: { 'openvpn': {} }
});

/**
 * Hybrid log reader using high-performance RPC with automated fallback to logread utility.
 */
const callLogRead = function (options) {
    const pattern = (options && options.pattern) ? options.pattern : TXT.openvpn;

    const nativeRpcCall = L.rpc.declare({
        object: 'log',
        method: 'read',
        params: ['lines', 'stream', 'oneshot', 'pattern'],
        expect: { log: [] }
    });

    return L.resolveDefault(nativeRpcCall({ pattern: pattern }), [])
        .then(function (res) {
            if (Array.isArray(res) && res.length > 0) {
                return res.map(function (entry) { return entry.msg || ''; }).join('\n');
            }
            /* Fallback to logread binary if RPC log table returns empty or ACL is restricted */
            return L.resolveDefault(L.fs.exec(TXT.CMD.logread, ['-e', pattern]), '')
                .then(function (execRes) {
                    return execRes.stdout || execRes || '';
                });
        });
};

/**
 * Loads system context data, network devices, configuration templates,
 * and system logs using native LuCI APIs.
 */
const loadSystemContextData = function (contextObj) {
    return Promise.all([
        L.resolveDefault(L.fs.exec('mkdir', ['-p', TXT.DIR.keys]), ''),

        /* Check if the cryptographic key generation is physically completed */
        L.resolveDefault(L.fs.stat(TXT.DIR.keys + TXT.KEY.tls_def_key), null),

        /* Check if the background init.d process still holds an active keygen execution lock */
        L.resolveDefault(L.fs.stat('/var/run/openvpn.keygen.lock'), null),

        L.resolveDefault(L.fs.read('/proc/net/dev'), ''),
        L.resolveDefault(L.fs.read('/proc/uptime'), '0'),
        L.resolveDefault(L.fs.read(TXT.DIR.openvpn + TXT.FILE.server_def_conf), ''),
        L.resolveDefault(L.fs.read(TXT.DIR.openvpn + TXT.FILE.client_def_conf), ''),
        L.resolveDefault(callLogRead({ pattern: TXT.openvpn }), '')
    ]).then(function (results) {
        const tlsStat = results[1];
        const lockStat = results[2];

        /* The UI is only 'ready' if the key exists AND the background generation lock is gone */
        contextObj.keysReady = !!(tlsStat && tlsStat.size > 0 && !lockStat);

        contextObj.devData = results[3] || '';

        const parts = String(results[4]).trim().split(/\s+/);
        contextObj.uptime = (parts && parts[0]) ? parseFloat(parts[0]) : 0;

        contextObj.serverTemplate = results[5] || '';
        contextObj.clientTemplate = results[6] || '';
        contextObj.logread = results[7] || '';
    });
};


/**
 * Generates the configuration file content for an OpenVPN server instance.
 */
const generateConfigContentServer = function (template, id, instNum) {
    if (!template) return '';

    const portMatch = template.match(/^port\s+(\d+)/m);
    const basePort = (portMatch && portMatch) ? parseInt(portMatch[1], 10) : TXT.CFG.vpn_port_int;
    const calculatedPort = basePort - 1 + instNum;
    const calculatedSubnet = 8 - 1 + instNum;

    const escapeRegExp = function (str) { return str.replace(/\./g, '\\.'); };

    return template
        .replace(new RegExp(escapeRegExp(TXT.KEY.ca_def_crt), 'g'), TXT.KEY.ca_ + id + TXT.KEY.pcrt)
        .replace(new RegExp(escapeRegExp(TXT.KEY.server_def_crt), 'g'), TXT.KEY.server_ + id + TXT.KEY.pcrt)
        .replace(new RegExp(escapeRegExp(TXT.KEY.server_def_key), 'g'), TXT.KEY.server_ + id + TXT.KEY.pkey)
        .replace(new RegExp(escapeRegExp(TXT.KEY.dh_def_pem), 'g'), TXT.KEY.dh_ + id + TXT.KEY.ppem)
        .replace(new RegExp(escapeRegExp(TXT.KEY.tls_def_key), 'g'), TXT.KEY.tls_crypt_ + id + TXT.KEY.pkey)
        /* Appends 'Instance #' formatting cleanly onto the generated config header line */
        .replace(TXT.CFG.modern_vpn_server, TXT.CFG.modern_vpn_server + ' #' + instNum)
        .replace(/^port\s+\d+/m, 'port ' + calculatedPort)
        .replace(/^server\s+10\.8\.0\.0/m, 'server 10.' + calculatedSubnet + '.0.0');
};

/**
 * Generates the configuration file content for an OpenVPN client instance.
 */
const generateConfigContentClient = function (template, id, instNum) {
    if (!template) return '';

    const remoteMatch = template.match(/^remote\s+(\S+)\s+(\d+)/m);
    const baseIp = (remoteMatch && remoteMatch) ? remoteMatch[1] : TXT.CFG.ip_loopback;
    const basePort = (remoteMatch && remoteMatch) ? parseInt(remoteMatch[2], 10) : TXT.CFG.vpn_port_int;

    const calculatedPort = basePort - 1 + instNum;
    let calculatedIp = baseIp;

    let ipParts = baseIp.split('.');
    if (ipParts.length === 4) {
        const lastOctet = parseInt(ipParts[3], 10);
        ipParts[3] = String(lastOctet - 1 + instNum);
        calculatedIp = ipParts.join('.');
    }

    const escapeRegExp = function (str) { return str.replace(/\./g, '\\.'); };

    return template
        .replace(new RegExp(escapeRegExp(TXT.KEY.ca_def_crt), 'g'), TXT.KEY.ca_ + id + TXT.KEY.pcrt)
        .replace(new RegExp(escapeRegExp(TXT.KEY.server_def_crt), 'g'), TXT.KEY.server_ + id + TXT.KEY.pcrt)
        .replace(new RegExp(escapeRegExp(TXT.KEY.server_def_key), 'g'), TXT.KEY.server_ + id + TXT.KEY.pkey)
        .replace(new RegExp(escapeRegExp(TXT.KEY.dh_def_pem), 'g'), TXT.KEY.dh_ + id + TXT.KEY.ppem)
        .replace(new RegExp(escapeRegExp(TXT.KEY.tls_def_key), 'g'), TXT.KEY.tls_crypt_ + id + TXT.KEY.pkey)
        /* Appends 'Instance #' formatting cleanly onto the generated config header line */
        .replace(TXT.CFG.modern_vpn_client, TXT.CFG.modern_vpn_client + ' #' + instNum)
        .replace(/^remote\s+\S+\s+\d+/m, 'remote ' + calculatedIp + ' ' + calculatedPort);
};

/**
 * Ensures a specific file exists on the local file system storage path.
 */
const ensureFileOnDisk = function (customPath, defaultPath, id, instNum, role, systemContext) {
    return L.fs.read(customPath)
        .then(function (existingContent) {
            return existingContent;
        })
        .catch(function () {
            /* FIXED: Enforce accurate template mapping matching the specific runtime profile role */
            if (customPath.indexOf(TXT.CFG.pconf) !== -1) {
                let configContent = '';

                if (role === TXT.client) {
                    configContent = generateConfigContentClient(systemContext.clientTemplate, id, instNum);
                } else {
                    configContent = generateConfigContentServer(systemContext.serverTemplate, id, instNum);
                }

                return L.fs.write(customPath, configContent).then(function () {
                    return configContent;
                });
            }

            /* Clone default system keys or certificates if available */
            if (defaultPath) {
                return L.resolveDefault(L.fs.read(defaultPath), '')
                    .then(function (defaultCertContent) {
                        return L.fs.write(customPath, defaultCertContent || '').then(function () {
                            return defaultCertContent;
                        });
                    });
            }

            return Promise.resolve('');
        });
};

/**
 * Synchronizes missing configuration files and loads real-time process data from procd and procfs.
 */
const syncAndLoadInstanceStatus = function (sections, contextObj) {
    return L.resolveDefault(callServiceList(TXT.openvpn), {}).then(function (serviceData) {
        const instancesObj = serviceData.instances || {};
        const instPromises = [];

        sections.forEach(function (s) {
            const id = s['.name'];
            const numMatch = id.match(/\d+$/);
            const instNum = numMatch ? parseInt(numMatch, 10) : 1;
            const role = L.uci.get(TXT.openvpn, id, TXT.role) || TXT.server;

            /* 1. Allocate core transaction files required across all server and client profiles */
            const filePromises = [
                ensureFileOnDisk(TXT.DIR.openvpn + id + TXT.CFG.pconf, null, id, instNum, role, contextObj),
                ensureFileOnDisk(TXT.DIR.keys + TXT.KEY.ca_ + id + TXT.KEY.pcrt, TXT.DIR.keys + TXT.KEY.ca_def_crt, id, instNum, role, contextObj),
                ensureFileOnDisk(TXT.DIR.keys + TXT.KEY.server_ + id + TXT.KEY.pcrt, TXT.DIR.keys + TXT.KEY.server_def_crt, id, instNum, role, contextObj),
                ensureFileOnDisk(TXT.DIR.keys + TXT.KEY.server_ + id + TXT.KEY.pkey, TXT.DIR.keys + TXT.KEY.server_def_key, id, instNum, role, contextObj),
                ensureFileOnDisk(TXT.DIR.keys + TXT.KEY.tls_crypt_ + id + TXT.KEY.pkey, TXT.DIR.keys + TXT.KEY.tls_def_key, id, instNum, role, contextObj)
            ];

            /* 2. DYNAMIC FILTER: Sync DH parameter file execution strictly for server profiles */
            if (role === TXT.server) {
                filePromises.push(
                    ensureFileOnDisk(TXT.DIR.keys + TXT.KEY.dh_ + id + TXT.KEY.ppem, TXT.DIR.keys + TXT.KEY.dh_def_pem, id, instNum, role, contextObj)
                );
            }

            const syncFilesPromise = Promise.all(filePromises);

            const instDataPromise = syncFilesPromise.then(function () {
                return L.resolveDefault(L.fs.read(TXT.DIR.openvpn + id + TXT.CFG.pconf), '');
            }).then(function (confContent) {
                const runtimeInstance = instancesObj[id] || {};
                const isRunning = (runtimeInstance.running === true);
                const pidVal = isRunning ? (runtimeInstance.pid || '-') : '-';
                const connectedClients = [];

                if (isRunning && pidVal !== '-') {
                    return L.resolveDefault(L.fs.stat('/proc/' + pidVal), null).then(function (statObj) {
                        let procStartTimestamp = 0;

                        /* Extract start timestamp safely for various LuCI architecture mtime types */
                        if (statObj && statObj.mtime) {
                            if (typeof statObj.mtime === 'object' && statObj.mtime.sec) {
                                procStartTimestamp = parseInt(statObj.mtime.sec, 10) || 0;
                            } else if (typeof statObj.mtime === 'number') {
                                procStartTimestamp = Math.floor(statObj.mtime);
                            } else if (typeof statObj.mtime === 'string') {
                                procStartTimestamp = parseInt(statObj.mtime, 10) || 0;
                            }
                        }

                        if (role === TXT.server) {
                            const statusFilePath = TXT.DIR.openvpn_status + id + TXT.STAT.pstatus;
                            return L.resolveDefault(L.fs.read(statusFilePath), '').then(function (statusContent) {
                                if (statusContent) {
                                    const lines = statusContent.split('\n');
                                    let insideClientList = false;

                                    for (let c = 0; c < lines.length; c++) {
                                        const line = lines[c].trim();
                                        if (line.indexOf(TXT.STAT.openvpn_client_list) !== -1 || line.indexOf(TXT.STAT.common_name) !== -1) {
                                            insideClientList = true;
                                            continue;
                                        }
                                        if (line.indexOf(TXT.STAT.routing_tbale) !== -1 || line.indexOf(TXT.STAT.global_status) !== -1) {
                                            insideClientList = false;
                                            break;
                                        }
                                        if (insideClientList && line.length > 0) {
                                            const ipMatch = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)/);
                                            if (ipMatch && ipMatch[1]) {
                                                connectedClients.push(String(ipMatch[1]).trim());
                                            }
                                        }
                                    }
                                }
                                return {
                                    id: id, instNum: instNum, role: role,
                                    confContent: String(confContent).trim(),
                                    isRunning: isRunning, pid: pidVal,
                                    startTime: procStartTimestamp,
                                    connectedClients: connectedClients
                                };
                            });
                        }

                        return {
                            id: id, instNum: instNum, role: role,
                            confContent: String(confContent).trim(),
                            isRunning: isRunning, pid: pidVal,
                            startTime: procStartTimestamp,
                            connectedClients: connectedClients
                        };
                    });
                }

                return {
                    id: id, instNum: instNum, role: role,
                    confContent: String(confContent).trim(),
                    isRunning: isRunning, pid: pidVal,
                    startTime: 0,
                    connectedClients: connectedClients
                };
            });

            instPromises.push(instDataPromise);
        });

        return Promise.all(instPromises);
    });
};

/**
 * Factory fallback initialization: Populates the UCI memory space and filesystem with default profiles asynchronously if empty.
 */
const initializeDefaultUciSections = function (systemContext) {
    const serverContent = generateConfigContentServer(systemContext.serverTemplate, TXT.CFG.instance1, 1);
    const clientContent = generateConfigContentClient(systemContext.clientTemplate, TXT.CFG.instance2, 2);

    /* Stage core OpenVPN section configurations in RAM staging buffer */
    L.uci.add(TXT.openvpn, TXT.openvpn, TXT.CFG.instance1);
    L.uci.set(TXT.openvpn, TXT.CFG.instance1, TXT.enabled, '0');
    L.uci.set(TXT.openvpn, TXT.CFG.instance1, TXT.role, TXT.server);
    L.uci.set(TXT.openvpn, TXT.CFG.instance1, TXT.config, TXT.DIR.openvpn + TXT.FILE.instance1_conf);

    L.uci.add(TXT.openvpn, TXT.openvpn, TXT.CFG.instance2);
    L.uci.set(TXT.openvpn, TXT.CFG.instance2, TXT.enabled, '0');
    L.uci.set(TXT.openvpn, TXT.CFG.instance2, TXT.role, TXT.client);
    L.uci.set(TXT.openvpn, TXT.CFG.instance2, TXT.config, TXT.DIR.openvpn + TXT.FILE.instance2_conf);

    /* Automatically generate dedicated, compact instance-bound firewall entries on factory boot */
    syncInstanceFirewallRule(TXT.server, TXT.CFG.instance1, null);
    syncInstanceFirewallRule(TXT.client, TXT.CFG.instance2, null);

    L.uci.save();
    L.uci.apply();

    /* ENFORCED ASYNC CHAIN: Wait for physical disk write operations to complete before returning */
    return Promise.all([
        L.fs.write(TXT.DIR.openvpn + TXT.FILE.instance1_conf, serverContent.trim() + '\n'),
        L.fs.write(TXT.DIR.openvpn + TXT.FILE.instance2_conf, clientContent.trim() + '\n')
    ]).then(function () {
        return [
            { '.name': TXT.CFG.instance1 },
            { '.name': TXT.CFG.instance2 }
        ];
    });
};

/**
 * Processes any pending configuration tasks left over from the previous browser session.
 * Synchronizes volatile staging layers instantly before the primary rendering thread boots.
 */
const processPendingSessionTask = function (sections) {
    /* 1. IMMEDIATE CHECK: Extract the pending reactivation token straight from browser memory */
    const reloadId = window.sessionStorage.getItem(TXT.CFG.openvpn_pending_reactivation);

    if (reloadId) {
        /* 2. FLUSH TOKEN: Instantly clear the storage thread to prevent infinite refresh loops */
        window.sessionStorage.removeItem(TXT.CFG.openvpn_pending_reactivation);

        /* 3. NATIVE UCI RE-ENABLEMENT: Re-enable the daemon section inside volatile RAM staging */
        if (L.uci.get(TXT.openvpn, reloadId)) {
            L.uci.set(TXT.openvpn, reloadId, TXT.enabled, '1');
            L.uci.save();
        }

        /* 4. ENFORCED MODAL TRIGGER: Force the LuCI Change-Tracker to throw the visual window */
        if (L.ui && L.ui.changes && typeof L.ui.changes.init === 'function') {
            L.ui.changes.init().then(function () {
                if (L.ui.changes.displayChanges && typeof L.ui.changes.displayChanges === 'function') {
                    L.ui.changes.displayChanges();
                }
            });
        }
    }

    /* 5. Return the clean sections mapping directly to the view lifecycle layer */
    return Promise.resolve(sections);
};

/**
 * Extracts and maps networking parameters (IP/Port) from configuration data strings.
 */
const parseNetworkParams = function (role, confContent, isRunning) {
    const params = { localIp: '0.0.0.0', localPort: TXT.CFG.vpn_port_str, clientRemote: '-' };

    if (!confContent) return params;

    const lines = confContent.split(/[\r\n]+/);
    for (let j = 0; j < lines.length; j++) {
        const line = lines[j].trim();

        if (role === TXT.client && line.indexOf('remote ') === 0) {
            const rParts = line.split(/\s+/);
            const remoteIp = (rParts.length >= 2) ? rParts[1] : TXT.CFG.ip_loopback;
            const remotePort = (rParts.length >= 3) ? rParts[2] : TXT.CFG.vpn_port_str;

            params.localIp = TXT.CFG.ip_loopback;
            params.localPort = isRunning ? 'dynamic' : '-';
            params.clientRemote = remoteIp + ':' + remotePort;
        } else if (role === TXT.server) {
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
 * Generates responsive theme-compliant UI node elements for remote connections.
 */
const renderRemoteNode = function (role, isRunning, netParams, connectedClients) {
    if (role === TXT.client) {
        return E('span', {
            'style': 'font-family:var(--font-monospace, monospace); color:var(--text-color, #334155);'
        }, netParams.clientRemote);
    }

    if (isRunning) {
        const activeClients = connectedClients || [];
        if (activeClients.length > 0) {
            const badges = [];
            for (let c = 0; c < activeClients.length; c++) {
                badges.push(E('div', {
                    'style': 'display:block; font-family:var(--font-monospace, monospace); font-size:11px; background:var(--background-color, #f1f2f6); padding:2px 6px; border-radius:3px; margin-bottom:2px; border:1px solid var(--border-color, #ced6e0); color:var(--text-color, #334155);'
                }, activeClients[c]));
            }
            return E('div', {}, badges);
        }
        return E('span', { 'style': 'font-style:italic; color:var(--text-color-light, #a4b0be);' }, _('No clients connected'));
    }

    return E('span', {}, '-');
};

/**
 * Renders the multi-instance real-time status and telemetry table.
 */
const renderStatusTable = function (instances, devDataRaw, systemUptime) {
    const tableRows = [];

    const formatBytes = function (b) {
        if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
        if (b >= 1024) return (b / 1024).toFixed(1) + ' KB';
        return b + ' B';
    };

    const formatUptime = function (procStartSeconds) {
        const startSec = parseInt(procStartSeconds, 10);
        if (isNaN(startSec) || startSec <= 0) return '-';

        const currentUnixTime = Math.floor(Date.now() / 1000);
        const diff = currentUnixTime - startSec;
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

    for (let i = 0; i < instances.length; i++) {
        const inst = instances[i];
        const role = inst.role || TXT.server;
        const tunDevice = 'tun' + (inst.instNum - 1);

        /* Execution of localized sub-parsers */
        const netParams = parseNetworkParams(role, inst.confContent, inst.isRunning);
        const kernelStats = parseKernelInterfaceData(tunDevice, devDataRaw);
        const remoteIpNode = renderRemoteNode(role, inst.isRunning, netParams, inst.connectedClients);

        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
        const displayId = inst.id.charAt(0).toUpperCase() + inst.id.slice(1);

        const typeBadge = E('span', {
            'class': 'ifacebadge',
            'style': 'font-weight:normal !important; padding:2px 6px; border-radius:3px; background:var(--background-color, transparent) !important; border:1px solid var(--border-color, #cbd5e1); color:var(--text-color, #334155);'
        }, roleLabel);

        let statusBadge;
        if (inst.isRunning) {
            statusBadge = E('span', {
                'class': 'ifacebadge',
                'style': 'font-weight:normal !important; padding:2px 8px; border-radius:3px; background:var(--background-color, transparent) !important; color:var(--action-bg, #00a8ff) !important; border:1px solid var(--action-border, #0097e6); text-shadow:none !important; box-shadow:none !important;'
            }, TXT.INFO.running + ' (PID: ' + inst.pid + ')');
        } else {
            statusBadge = E('span', {
                'class': 'ifacebadge',
                'style': 'font-weight:normal !important; padding:2px 8px; border-radius:3px; background:var(--neutral-bg, #f1f2f6) !important; color:var(--text-color-light, #64748b) !important; border:1px solid var(--border-color, #cbd5e1); text-shadow:none !important; box-shadow:none !important;'
            }, TXT.INFO.stopped);
        }

        const rowStyleClass = (i % 2 === 0) ? 'tr cbi-section-table-row cbi-rowstyle-1' : 'tr cbi-section-table-row cbi-rowstyle-2';

        tableRows.push(E('tr', { 'class': rowStyleClass }, [
            E('td', { 'class': 'td' }, '#' + inst.instNum),
            E('td', { 'class': 'td', 'style': 'font-weight:bold; color:var(--text-color, #334155);' }, displayId),
            E('td', { 'class': 'td' }, typeBadge),
            E('td', { 'class': 'td' }, statusBadge),
            E('td', { 'class': 'td', 'style': 'font-family:var(--font-monospace, monospace); color:var(--text-color, #334155);' }, netParams.localIp + ':' + netParams.localPort),
            E('td', { 'class': 'td' }, remoteIpNode),
            E('td', { 'class': 'td', 'style': 'font-family:var(--font-monospace, monospace); color:var(--text-color, #334155);' }, inst.isRunning ? (kernelStats.hasData ? kernelStats.txPkts + ' / ' + formatBytes(kernelStats.txBytes) : '0 / 0 B') : '-'),
            E('td', { 'class': 'td', 'style': 'font-family:var(--font-monospace, monospace); color:var(--text-color, #334155);' }, inst.isRunning ? (kernelStats.hasData ? kernelStats.rxPkts + ' / ' + formatBytes(kernelStats.rxBytes) : '0 / 0 B') : '-'),
            E('td', { 'class': 'td', 'style': 'font-family:var(--font-monospace, monospace); color:var(--text-color, #334155);' }, inst.isRunning ? formatUptime(inst.startTime) : '-')
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
            E('th', { 'class': 'th' }, TXT.TH.tx),
            E('th', { 'class': 'th' }, TXT.TH.rx),
            E('th', { 'class': 'th' }, TXT.TH.uptime)
        ])
    ].concat(tableRows.length > 0 ? tableRows : [
        E('tr', { 'class': 'tr' }, [
            E('td', { 'class': 'td', 'colspan': '9', 'style': 'text-align:center; font-style:italic; color:var(--text-color-light, #64748b);' }, TXT.TH.no_inst)
        ])
    ]));
};

/**
 * Opens a native LuCI modal overlay containing a text editor for cryptographic keys.
 */
const openKeyEditorModal = function (filename, displayId) {
    const absolutePath = TXT.DIR.keys + filename;

    const modalTextArea = E('textarea', {
        'class': 'cbi-input-textarea',
        'style': 'width:100%; font-family:var(--font-monospace, monospace); font-size:12px; background:var(--background-color-dark, #222); color:var(--action-text, #fff) !important; padding:15px; border-radius:4px; border:1px solid var(--border-color, #cbd5e1); text-shadow:none !important;',
        'rows': '18',
        'wrap': 'off'
    }, TXT.STATUS.loading_key);

    L.resolveDefault(L.fs.read(absolutePath), '').then(function (content) {
        modalTextArea.value = content ? content.trim() + '\n' : TXT.KEY.empty_info;
    });

    const modalSaveBtn = E('button', {
        'class': 'cbi-button cbi-button-save',
        'style': 'margin-right:10px;'
    }, TXT.BTN.save_apply);

    modalSaveBtn.addEventListener('click', function () {
        modalSaveBtn.disabled = true;
        modalSaveBtn.textContent = TXT.STATUS.saving;

        L.fs.write(absolutePath, modalTextArea.value.trim() + '\n')
            .then(function () {
                modalSaveBtn.textContent = TXT.STATUS.saved;
                setTimeout(function () {
                    modalSaveBtn.disabled = false;
                    modalSaveBtn.textContent = TXT.BTN.save_apply;
                }, 1500);
            });
    });

    const modalDownloadBtn = E('button', {
        'class': 'cbi-button cbi-button-apply',
        'style': 'margin-right:10px; background:var(--action-bg, #00a8ff) !important; color:var(--action-text, #fff) !important; text-shadow:none !important; border:1px solid var(--action-border, #0097e6) !important;'
    }, TXT.BTN.download);

    modalDownloadBtn.addEventListener('click', function () {
        const blob = new Blob([modalTextArea.value], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    const modalCloseBtn = E('button', {
        'class': 'cbi-button cbi-button-neutral'
    }, TXT.BTN.close);

    modalCloseBtn.addEventListener('click', L.ui.hideModal);

    L.ui.showModal(displayId + ' - ' + filename, [
        E('div', { 'class': 'cbi-map' }, [
            E('div', { 'class': 'cbi-section' }, [
                E('div', { 'class': 'cbi-section-descr', 'style': 'margin-bottom:12px; font-style:italic; color:var(--text-color-light, #64748b);' }, TXT.STATUS.file_location + absolutePath),
                E('div', { 'style': 'margin-bottom:20px;' }, [modalTextArea]),
                E('div', { 'style': 'text-align:right;' }, [modalSaveBtn, modalDownloadBtn, modalCloseBtn])
            ])
        ])
    ]);
};

/**
 * Renders an asynchronous file upload field row embedded with Show and Download triggers.
 */
const renderUploadRow = function (label, filename, displayId) {
    const randId = 'file_' + filename.replace(/\./g, '_');
    const fileInput = E('input', { 'type': 'file', 'id': randId, 'style': 'display:none;' });

    const browseBtn = E('label', {
        'for': randId,
        'class': 'cbi-button cbi-button-neutral',
        'style': 'margin: 0 0 0 4px;'
    }, TXT.BTN.upload);

    const showBtn = E('button', {
        'class': 'cbi-button cbi-button-apply important',
        'style': 'margin: 0 0 0 4px; text-shadow:none !important; box-shadow:none !important;'
    }, TXT.BTN.show);

    const downloadBtn = E('button', {
        'class': 'cbi-button cbi-button-save',
        'style': 'margin: 0 0 0 4px;'
    }, TXT.BTN.download);

    const statusMsg = E('span', { 'style': 'font-weight:bold; margin-left:10px; font-size:11px;' }, '');

    fileInput.addEventListener('change', function (ev) {
        const files = ev.target.files;
        if (!files || files.length === 0) return;

        browseBtn.classList.add('disabled');
        statusMsg.textContent = TXT.STATUS.saving;
        statusMsg.className = 'text-warning';

        const reader = new FileReader();
        reader.onload = function (e) {
            L.fs.write(TXT.DIR.keys + filename, e.target.result)
                .then(function () {
                    statusMsg.className = 'text-success';
                    statusMsg.textContent = TXT.ICON.success + TXT.STATUS.saved + ' ' + TXT.ICON.warning + TXT.STATUS.click_disable_enable;
                })
                .catch(function (err) {
                    statusMsg.className = 'text-danger';
                    statusMsg.textContent = TXT.ICON.error + TXT.STATUS.error + ' ' + err.message;
                })
                .finally(function () {
                    browseBtn.classList.remove('disabled');
                });
        };
        reader.readAsText(files);
    });

    showBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        openKeyEditorModal(filename, displayId);
    });

    downloadBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        L.resolveDefault(L.fs.read(TXT.DIR.keys + filename), '').then(function (content) {
            if (!content) {
                if (L.ui && L.ui.addNotification) {
                    L.ui.addNotification(null, E('p', TXT.MSG.keyfile_not_exist), TXT.warning);
                }
                return;
            }
            const blob = new Blob([content], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    });

    return E('div', {
        'style': 'display:flex; align-items:center; justify-content:space-between; padding:3px 0; margin:0; border-bottom:1px dashed var(--border-color, #ced6e0); min-height:0; width:100%;'
    }, [
        E('span', { 'style': 'font-size:13px; font-weight:normal; text-align:left; margin:0; padding:0; color:var(--text-color, #334155);' }, label),
        E('div', { 'style': 'display:inline-flex; align-items:center; margin:0; padding:0;' }, [
            showBtn, downloadBtn, browseBtn, fileInput, statusMsg
        ])
    ]);
};

/**
 * Structurally parses the active operational port from a raw configuration text block.
 * Covers all valid OpenVPN syntax variants, inline parameters, and whitespace layouts.
 */
const parsePortFromConfig = function (role, content) {
    if (!content) return null;

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        /* CASE 1: Skip empty rows or standard line comment triggers */
        if (line.length === 0 || line.charAt(0) === '#' || line.charAt(0) === ';') {
            continue;
        }

        /* CASE 2: Strip inline comments at the end of the line */
        const hashIdx = line.indexOf('#');
        if (hashIdx !== -1) {
            line = line.substring(0, hashIdx).trim();
        }

        const semiIdx = line.indexOf(';');
        if (semiIdx !== -1) {
            line = line.substring(0, semiIdx).trim();
        }

        /* CASE 3: Split consecutive spaces or tabs into a clean token array */
        const tokens = line.split(/\s+/);
        if (tokens.length < 2) {
            continue;
        }

        /* Normalize directive casing to prevent capitalization mismatch */
        const directive = tokens[0].toLowerCase();

        /* CASE 4: Server profiles matching 'port [number]' syntax boundaries */
        if (role === TXT.server && directive === TXT.port) {
            /* FIXED INDICES: Extract the port strictly from index 1 */
            const portNum = parseInt(tokens[1], 10);

            if (!isNaN(portNum) && portNum > 0 && portNum <= 65535) {
                return portNum;
            }
        }

        /* CASE 5: Client profiles matching 'remote [host] [port] [optional:proto]' syntax */
        if (role === TXT.client && directive === TXT.remote && tokens.length >= 3) {
            /* FIXED INDICES: Extract the port strictly from index 2 */
            const portNum = parseInt(tokens[2], 10);

            if (!isNaN(portNum) && portNum > 0 && portNum <= 65535) {
                return portNum;
            }
        }
    }

    return null;
};

/**
 * Calculates the index-shifted default port dynamically from an instance ID string.
 */
const getPortFromId = function (id) {
    const numMatch = id.match(/\d+$/);
    const instNum = numMatch ? parseInt(numMatch, 10) : 1;
    return TXT.CFG.vpn_port_int - 1 + instNum;
};

/**
 * Universally creates or updates a highly specific inbound firewall rule for a distinct OpenVPN instance ID.
 * Automatically extracts custom ports from disk configs or falls back to index-shifted defaults.
 */
const syncInstanceFirewallRule = function (role, id, customPort) {
    const fwRuleSection = 'openvpn_rule_' + id;
    let targetPort = customPort;

    /* If no parsed custom port is supplied, resolve the structural baseline fallback */
    if (!targetPort || isNaN(targetPort)) {
        targetPort = getPortFromId(id);
    }

    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

    /* Inject or overwrite the atomic named firewall rule section with the compact naming schema */
    L.uci.add('firewall', 'rule', fwRuleSection);
    L.uci.set('firewall', fwRuleSection, 'name', 'OpenVPN-' + roleLabel + '-' + id);
    L.uci.set('firewall', fwRuleSection, 'src', 'wan');
    L.uci.set('firewall', fwRuleSection, 'dest_port', String(targetPort));
    L.uci.set('firewall', fwRuleSection, 'proto', 'udp');
    L.uci.set('firewall', fwRuleSection, 'target', 'ACCEPT');
};

/**
 * Saves the modified configuration text area and coordinates native UCI staging mutations
 * strictly using centralized token keys to orchestrate active daemon environment reloads.
 */
const handleInstanceSave = function (id, role, txtArea, sBtn, sNotice, originalConfContent, modificationBoxNode) {
    const newConfigContent = txtArea.value.trim() + '\n';
    const cleanOriginal = String(originalConfContent || '').trim() + '\n';
    const originalButtonText = sBtn.textContent;

    /* 1. Abort instantly if no textual mutations occurred */
    if (newConfigContent === cleanOriginal) {
        sBtn.disabled = true;
        sBtn.textContent = 'ℹ️ ' + _('No changes detected');

        setTimeout(function () {
            sBtn.disabled = false;
            sBtn.textContent = originalButtonText;
        }, 1500);
        return;
    }

    sBtn.disabled = true;
    sBtn.textContent = TXT.ICON.loading + TXT.STATUS.creating;

    let setFirewallRules = false;
    let currentPort = parsePortFromConfig(role, originalConfContent);

    if (!currentPort || isNaN(currentPort)) {
        currentPort = getPortFromId(id);
    }

    const detectedPort = parsePortFromConfig(role, newConfigContent);
    if (currentPort !== detectedPort && detectedPort && !isNaN(detectedPort)) {
        setFirewallRules = true;
    }

    const isCurrentlyEnabled = (L.uci.get(TXT.openvpn, id, TXT.enabled) === '1');
    if (setFirewallRules || isCurrentlyEnabled) {
        if (sNotice) {
            sNotice.style.display = 'inline-block';
        }
    }

    let forceChangesWindow = false;

    /* Write the configuration file directly to the storage partition */
    L.fs.write(TXT.DIR.openvpn + id + TXT.CFG.pconf, newConfigContent).then(function () {

        if (setFirewallRules) {
            syncInstanceFirewallRule(role, id, detectedPort);
        }

        if (isCurrentlyEnabled) {
            /* CASE A: Instance is ACTIVE -> show changes window, 
               disable the instance immediately and re-enable the instance on reload (processPendingSessionTask) */
            if (L.uci.get(TXT.openvpn, id)) {
                L.uci.set(TXT.openvpn, id, TXT.enabled, '0');
            }

            try {
                window.sessionStorage.setItem(TXT.CFG.openvpn_pending_reactivation, id);
            } catch (e) {
                console.error('SessionStorage write blocked:', e);
            }

            forceChangesWindow = true;
        } else if (setFirewallRules) {
            /* CASE B: Port change need firewall rule update -> show changes window */
            forceChangesWindow = true;
        } else {
            /* CASE C: Instance is INACTIVE -> Save silently to disk, skip changes window */
            if (modificationBoxNode && typeof modificationBoxNode.setAttribute === 'function') {
                modificationBoxNode.setAttribute('data-original-content', newConfigContent);
            }
            forceChangesWindow = false;
        }

        /* Commit structural database entries securely to volatile staging buffer */
        L.uci.save();
        return Promise.resolve();
    }).then(function () {
        if (forceChangesWindow && L.ui && L.ui.changes && typeof L.ui.changes.init === 'function') {
            return L.ui.changes.init();
        }
    }).then(function () {
        sBtn.textContent = TXT.ICON.success + TXT.STATUS.saved;

        if (forceChangesWindow && L.ui && L.ui.changes && typeof L.ui.changes.displayChanges === 'function') {
            /* Open the native changes review modal window first */
            L.ui.changes.displayChanges();

            if (isCurrentlyEnabled) {
                /* FIXED DOM INJECTOR TASK: Wait 50ms for the genuine LuCI dialog wrapper to render */
                setTimeout(function () {
                    const modalNode = document.querySelector('.modal.uci-dialog') || document.querySelector('.modal');
                    if (modalNode) {
                        /* Create a professional notice box utilizing standard LuCI core notification styling */
                        const infoNotice = E('div', {
                            'class': 'alert-message info',
                            'style': 'margin:15px 0 15px 0; padding:12px; font-weight:bold; font-size:12px; line-height:1.5; border-left:4px solid #00a8ff; background:var(--background-color, #f0fdf4); color:var(--text-color, #334155); border-radius:4px;'
                        }, TXT.ICON.warning + ' ' + _('Configuration changed! Applying will temporarily stop the instance to load new settings. After page reload, please click Apply once more to complete reactivation.'));

                        /* Target the explicit sub-section container or insert right under the h4 title element */
                        const titleHeader = modalNode.querySelector('h4');
                        if (titleHeader && titleHeader.nextSibling) {
                            modalNode.insertBefore(infoNotice, titleHeader.nextSibling);
                        } else {
                            modalNode.appendChild(infoNotice);
                        }
                    }
                }, 50);
            }
        }
    }).catch(function (err) {
        console.error('LuCI Multi-UCI Save Pipeline Failed:', err);
        sBtn.textContent = TXT.ICON.error + TXT.STATUS.error;
    }).finally(function () {
        setTimeout(function () {
            sBtn.disabled = false;
            sBtn.textContent = originalButtonText;
            if (sNotice) {
                sNotice.style.display = 'none';
            }
        }, 1500);
    });
};

/**
 * Handles the cryptographic asset and section deletion sequence for an individual instance.
 */
const handleInstanceDeletion = function (id, displayId, dBtn, dNotice, sectionRootNode) {
    if (confirm(TXT.MSG.confirm_del + displayId + '?')) {
        dBtn.disabled = true;
        dNotice.style.display = 'inline-block';

        L.ui.changes.init().then(function () {
            L.uci.remove(TXT.openvpn, id);
            removeInstanceFirewallRule(id);
            L.uci.save();

            if (L.ui && L.ui.changes && typeof L.ui.changes.init === 'function') {
                return L.ui.changes.init().then(function () {
                    if (L.ui.changes.displayChanges && typeof L.ui.changes.displayChanges === 'function') {
                        L.ui.changes.displayChanges();
                    }
                });
            }
        }).then(function () {
            if (sectionRootNode) {
                sectionRootNode.style.opacity = '0.4';
                sectionRootNode.style.pointerEvents = 'none';
            }
            dBtn.textContent = TXT.ICON.success + TXT.BTN.del_ready;
        }).catch(function (err) {
            console.error('LuCI Instance Deletion Failed:', err);
        }).finally(function () {
            dNotice.style.display = 'none';
            dBtn.disabled = false;
        });
    }
};

/**
 * Renders a comprehensive configuration modification section for an individual OpenVPN instance.
 */
const renderInstanceModificationSection = function (s, idx, instances, currentVisualState) {
    const id = s['.name'];
    let instObj = {};

    if (Array.isArray(instances)) {
        for (let i = 0; i < instances.length; i++) {
            if (instances[i].id === id) {
                instObj = instances[i];
                break;
            }
        }
    }

    const role = instObj.role || TXT.server;
    const confContent = instObj.confContent || '';
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

    const numMatch = id.match(/\d+$/);
    const instNum = numMatch ? parseInt(numMatch, 10) : (idx + 1);

    const displayId = TXT.STATUS.instance_x + instNum;
    const sectionHeadingText = displayId + ' - ' + roleLabel;

    const txtArea = E('textarea', {
        'class': 'cbi-input-textarea',
        'style': 'width:100%; font-family:var(--font-monospace, monospace); font-size:12px; background:var(--background-color, #fafafa); color:var(--text-color, #334155); padding:12px; border-radius:4px; border:1px solid var(--border-color, #cbd5e1); text-shadow:none !important;',
        'rows': '15',
        'wrap': 'off'
    }, confContent);

    const sBtn = E('button', {
        'class': 'btn cbi-button cbi-button-save'
    }, TXT.BTN.save_config + ': ' + displayId);

    const cNotice = E('span', {
        'class': 'text-danger',
        'style': 'font-weight:bold; margin-left:15px; display:none;'
    }, TXT.ICON.warning + ' ' + TXT.STATUS.click_save_apply);

    const dNotice = E('span', {
        'class': 'text-danger',
        'style': 'font-weight:bold; font-size:12px; display:none;'
    }, TXT.ICON.warning + ' ' + TXT.STATUS.click_save_apply);

    const dBtn = E('button', {
        'class': 'btn cbi-button cbi-button-remove',
        'style': 'float:right;'
    }, TXT.BTN.del_instance);

    /* Generate the master wrapping block element tree container nodes */
    const sectionRootNode = E('div', {
        'class': 'cbi-section',
        'id': 'modification_section_' + id,
        'style': 'margin-bottom:25px; padding:25px 0 0 0; border:none; border-top:1px solid var(--border-color, #ced6e0); position:relative;'
    }, [
        E('h3', { 'style': 'margin:0 0 20px 0; font-weight:bold; font-size:16px; border-bottom:1px solid var(--border-color, #e2e8f0); padding-bottom:5px; color:var(--text-color, #334155)' }, sectionHeadingText),

        E('fieldset', { 'class': 'cbi-section-fieldset', 'style': 'margin-bottom:25px; padding:15px; border:1px solid var(--border-color, #cbd5e1); border-radius:4px; background:var(--background-color, transparent);' }, [
            E('legend', { 'style': 'font-weight:bold; font-size:13px; padding:0 8px; color:var(--text-color, #334155);' }, TXT.MSG.key_upload),
            E('div', { 'class': 'cbi-section-node', 'style': 'padding:0 5px;' }, [
                renderUploadRow(TXT.STATUS.key_info_ca + '(ca_' + id + TXT.KEY.pcrt + ')', TXT.KEY.ca_ + id + TXT.KEY.pcrt, displayId),
                renderUploadRow(TXT.STATUS.key_info_serever_crt + '(server_' + id + TXT.KEY.pcrt + ')', TXT.KEY.server_ + id + TXT.KEY.pcrt, displayId),
                renderUploadRow(TXT.STATUS.key_info_server_key + '(server_' + id + TXT.KEY.pkey + ')', TXT.KEY.server_ + id + TXT.KEY.pkey, displayId),
                /* DYNAMIC FILTER: Render DH upload row strictly for server profiles to prevent user confusion */
                role === TXT.server ? renderUploadRow(TXT.STATUS.key_info_hd + '(dh_' + id + TXT.KEY.ppem + ')', TXT.KEY.dh_ + id + TXT.KEY.ppem, displayId) : '',
                renderUploadRow(TXT.STATUS.key_info_tls + '(tls-crypt_' + id + TXT.KEY.pkey + ')', TXT.KEY.tls_crypt_ + id + TXT.KEY.pkey, displayId)
            ])
        ]),

        E('fieldset', { 'class': 'cbi-section-fieldset', 'style': 'margin-bottom:20px; padding:15px; border:1px solid var(--border-color, #cbd5e1); border-radius:4px; background:var(--background-color, transparent);' }, [
            E('legend', { 'style': 'font-weight:bold; font-size:13px; padding:0 8px; color:var(--text-color, #334155);' }, TXT.MSG.edit_config),
            E('div', { 'class': TXT.STYLE.class_text_descr, 'style': 'margin-bottom:12px; font-style:italic; padding-left:2px;' }, '(' + TXT.DIR.openvpn + id + TXT.CFG.pconf + ')'),
            E('div', { 'style': 'padding:0 2px;' }, [txtArea])
        ]),

        E('div', { 'style': 'width:100%; display:block; margin-top:20px; overflow:hidden;' }, [sBtn, cNotice, dNotice, dBtn])
    ]);

    /* =================================================================
     * CRITICAL PLACEMENT FIXED: Execute tracking registrations safely 
     * after sectionRootNode allocation loop is fully materialized in RAM
     * ================================================================= */
    sectionRootNode.setAttribute('data-original-content', confContent);

    sBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        const freshOriginalText = sectionRootNode.getAttribute('data-original-content') || '';
        handleInstanceSave(id, role, txtArea, sBtn, cNotice, freshOriginalText, sectionRootNode);
    });

    dBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        handleInstanceDeletion(id, displayId, dBtn, dNotice, sectionRootNode);
    });

    return sectionRootNode;
};


/**
 * Calculates aggregated traffic statistics for all active tun interfaces.
 */
const calculateTunnelTraffic = function (devDataRaw) {
    const traffic = { rx: 0, tx: 0 };
    if (!devDataRaw || devDataRaw.length === 0) return traffic;

    const devLines = devDataRaw.split('\n');
    for (let d = 0; d < devLines.length; d++) {
        if (devLines[d].indexOf('tun') !== -1) {
            const parts = devLines[d].replace(/.*:/, '').trim().split(/\s+/);
            if (parts.length >= 16) {
                traffic.rx += parseInt(parts, 10) || 0;
                traffic.tx += parseInt(parts, 10) || 0;
            }
        }
    }
    return traffic;
};

/**
 * Updates the visual theme states and asset sources of the network interface box and master toggle button.
 */
const updateVisualBoxState = function (stateStr, badgeLabelNode, badgeImgNode, boxHeadNode, globalToggleBtn) {
    if (stateStr === '1') {
        badgeLabelNode.textContent = TXT.INFO.openvpn + ' (' + TXT.INFO.active + ')';
        badgeImgNode.src = '/luci-static/resources/icons/tunnel.svg';
        boxHeadNode.style.setProperty('--zone-color-rgb', '144, 240, 144');
        boxHeadNode.style.backgroundColor = 'var(--zone-lan-bg, rgb(144, 240, 144))';

        /* Safely mutate button styles only if the node reference is available in the DOM context */
        if (globalToggleBtn) {
            globalToggleBtn.className = 'cbi-button cbi-button-negative important';
            globalToggleBtn.textContent = _('Disable') + ' ' + TXT.INFO.openvpn;
        }
    } else {
        badgeLabelNode.textContent = TXT.INFO.openvpn + ' (' + TXT.disabled + ')';
        badgeImgNode.src = '/luci-static/resources/icons/tunnel_disabled.svg';
        boxHeadNode.style.setProperty('--zone-color-rgb', '240, 144, 144');
        boxHeadNode.style.backgroundColor = 'var(--zone-wan-bg, rgb(240, 144, 144))';

        /* Safely mutate button styles only if the node reference is available in the DOM context */
        if (globalToggleBtn) {
            globalToggleBtn.className = 'cbi-button cbi-button-positive important';
            globalToggleBtn.textContent = _('Enable') + ' ' + TXT.INFO.openvpn;
        }
    }
};

/**
 * Handles the master toggle button click event to synchronize state across all instances.
 */
const handleMasterToggleClick = function (sections, ifaceBoxMasterNode, addServerBtn, addClientBtn, badgeLabelNode, badgeImgNode, boxHeadNode, applyNotice, globalToggleBtn) {
    ifaceBoxMasterNode.style.opacity = '0.4';
    globalToggleBtn.disabled = true;
    if (addServerBtn) addServerBtn.disabled = true;
    if (addClientBtn) addClientBtn.disabled = true;

    const targetSections = sections || [];
    const firstSectionName = (targetSections.length > 0) ? targetSections[0]['.name'] : TXT.CFG.instance1;
    const realLiveState = L.uci.get(TXT.openvpn, firstSectionName, TXT.enabled) || '0';
    const nextState = (realLiveState === '1') ? '0' : '1';

    for (let k = 0; k < targetSections.length; k++) {
        if (targetSections[k] && targetSections[k]['.name']) {
            L.uci.set(TXT.openvpn, targetSections[k]['.name'], TXT.enabled, nextState);
        }
    }

    L.uci.save();
    updateVisualBoxState(nextState, badgeLabelNode, badgeImgNode, boxHeadNode, globalToggleBtn);
    applyNotice.style.display = 'inline-block';

    if (L.ui && L.ui.changes && typeof L.ui.changes.init === 'function') {
        L.ui.changes.init()
            .then(L.bind(L.ui.changes.displayChanges, L.ui.changes))
            .finally(function () {
                ifaceBoxMasterNode.style.opacity = '1';
                globalToggleBtn.disabled = false;
                if (addServerBtn) addServerBtn.disabled = false;
                if (addClientBtn) addClientBtn.disabled = false;
            });
    } else {
        ifaceBoxMasterNode.style.opacity = '1';
        globalToggleBtn.disabled = false;
        if (addServerBtn) addServerBtn.disabled = false;
        if (addClientBtn) addClientBtn.disabled = false;
    }
};

/**
 * Renders the global responsive master interface control section with aggregated tooltips and a right-aligned toggle action button.
 */
const renderMasterControlSection = function (initialRawState, sections, addServerBtn, addClientBtn, instances, devDataRaw) {
    const applyNotice = E('span', { 'class': 'text-danger', 'style': 'font-weight:bold; margin-left:15px; display:none;' }, TXT.ICON.warning + TXT.STATUS.click_save_apply);

    const totalInstances = (sections && sections.length) ? sections.length : 0;
    let runningInstances = 0;
    const activePids = [];

    if (Array.isArray(instances)) {
        for (let i = 0; i < instances.length; i++) {
            if (instances[i].isRunning) {
                runningInstances++;
                if (instances[i].pid && instances[i].pid !== '-') {
                    activePids.push(instances[i].pid);
                }
            }
        }
    }

    const traffic = calculateTunnelTraffic(devDataRaw);

    const formatTooltipBytes = function (b) {
        if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
        if (b >= 1024) return (b / 1024).toFixed(1) + ' KB';
        return b + ' B';
    };

    const globalToggleBtn = E('button', {
        'style': 'text-shadow:none !important; box-shadow:none !important; white-space:nowrap; margin-left:auto;'
    }, '');

    const badgeLabelNode = E('strong', {}, initialRawState === '1' ? TXT.INFO.openvpn + ' (' + TXT.INFO.active + ')' : TXT.INFO.openvpn + ' (' + TXT.disabled + ')');
    const badgeImgNode = E('img', { 'class': 'middle', 'style': 'width:48px; height:48px; vertical-align:middle;' });

    const boxHeadNode = E('div', {
        'class': 'ifacebox-head',
        'style': 'padding:3px 8px; font-size:12px; color:var(--text-color, #334155); text-shadow:none !important;'
    }, [badgeLabelNode]);

    const tooltipBadgeNode = E('span', { 'class': 'cbi-tooltip ifacebadge large', 'style': 'text-align:left; font-weight:normal;' }, [
        E('img', { 'src': '/luci-static/resources/icons/tunnel.svg', 'style': 'float:left; margin-right:10px; width:24px; height:24px;' }),
        E('span', { 'class': 'left', 'style': 'display:block; overflow:hidden;' }, [
            E('span', { 'class': 'nowrap' }, [E('strong', {}, TXT.TH.type), 'OpenVPN Engine']), E('br'),
            E('span', { 'class': 'nowrap' }, [E('strong', {}, TXT.TH.enabled), initialRawState === '1' ? _('Yes') : _('No')]), E('br'),
            E('span', { 'class': 'nowrap' }, [E('strong', {}, TXT.TH.instances), String(totalInstances)]), E('br'),
            E('span', { 'class': 'nowrap' }, [E('strong', {}, TXT.TH.connected), runningInstances + '/' + totalInstances]), E('br'),
            E('span', { 'class': 'nowrap' }, [E('strong', {}, TXT.TH.active_pids), activePids.length > 0 ? activePids.join(', ') : '-']), E('br'),
            E('span', { 'class': 'nowrap' }, [E('strong', {}, TXT.TH.aggregated_rx), formatTooltipBytes(traffic.rx)]), E('br'),
            E('span', { 'class': 'nowrap' }, [E('strong', {}, TXT.TH.aggregated_tx), formatTooltipBytes(traffic.tx)])
        ])
    ]);

    const tooltipContainerNode = E('span', { 'class': 'cbi-tooltip-container' }, [
        badgeImgNode,
        tooltipBadgeNode
    ]);

    const boxBodyNode = E('div', {
        'class': 'ifacebox-body',
        'style': 'padding:12px; text-align:center; min-height:0; background:transparent !important;'
    }, [
        tooltipContainerNode
    ]);

    /* Restored native passive look by removing cursor:pointer and clickable behaviors */
    const ifaceBoxMasterNode = E('div', {
        'class': 'ifacebox',
        'style': 'display:inline-block; width:160px; vertical-align:middle; margin:0; transition:opacity 0.15s ease-in-out; background:var(--background-color, #fafafa); border:1px solid var(--border-color, #cbd5e1); border-radius:4px; overflow:hidden;'
    }, [boxHeadNode, boxBodyNode]);

    updateVisualBoxState(initialRawState, badgeLabelNode, badgeImgNode, boxHeadNode, globalToggleBtn);

    /* Exclusively bind the master click handler to the button element node */
    globalToggleBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        handleMasterToggleClick(sections, ifaceBoxMasterNode, addServerBtn, addClientBtn, badgeLabelNode, badgeImgNode, boxHeadNode, applyNotice, globalToggleBtn);
    });

    return E('div', { 'style': 'margin-bottom:25px; width:100%;' }, [
        E('h2', { 'style': 'color:var(--text-color, #334155); font-weight:bold; margin:0 0 10px 0; padding:0;' }, TXT.MSG.title_main),
        E('p', { 'style': 'font-style:normal; margin-bottom:20px; color:var(--text-color-light, #64748b);' }, TXT.MSG.manage_instance),

        E('fieldset', { 'class': TXT.STYLE.class_fieldset, 'style': 'margin-bottom:5px; padding:0; border:0; background:transparent;' }, [
            E('div', { 'style': 'display:flex; align-items:flex-start; justify-content:space-between; padding:3px 0; margin:0; min-height:0; width:100%;' }, [
                E('div', { 'style': 'display:inline-flex; align-items:center;' }, [
                    ifaceBoxMasterNode, applyNotice
                ]),
                globalToggleBtn
            ])
        ])
    ]);
};

/**
 * Purges a custom unique inbound firewall rule for a specific OpenVPN profile.
 */
const removeInstanceFirewallRule = function (id) {
    L.uci.remove('firewall', 'openvpn_rule_' + id);
};

/**
 * Asynchronously generates and registers a new OpenVPN profile instance based on role and live uci state.
 */
const addNewInstance = function (roleType, sections, systemContext, btnNode, noticeNode) {
    const numMatch = (sections && sections.length > 0) ? sections[sections.length - 1]['.name'].match(/\d+$/) : null;
    const nextNum = numMatch ? (parseInt(numMatch, 10) + 1) : 1;
    const nextId = 'instance' + nextNum;

    if (btnNode) btnNode.disabled = true;
    if (noticeNode) noticeNode.style.display = 'inline-block';

    let generatedConf = '';
    if (roleType === TXT.server) {
        generatedConf = generateConfigContentServer(systemContext.serverTemplate, nextId, nextNum);
    } else {
        generatedConf = generateConfigContentClient(systemContext.clientTemplate, nextId, nextNum);
    }

    /* Write the configuration payload flatly to the disk partition */
    return L.fs.write(TXT.DIR.openvpn + nextId + TXT.CFG.pconf, generatedConf.trim() + '\n').then(function () {
        L.uci.add(TXT.openvpn, TXT.openvpn, nextId);

        /* LIVE RESOLUTION: Safely check the real-time active state from the last known instance in the DOM list */
        let targetEnabledState = '0';
        if (sections && sections.length > 0) {
            const lastActiveId = sections[sections.length - 1]['.name'];
            if (L.uci.get(TXT.openvpn, lastActiveId, TXT.enabled) === '1') {
                targetEnabledState = '1';
            }
        }

        L.uci.set(TXT.openvpn, nextId, TXT.enabled, targetEnabledState);
        L.uci.set(TXT.openvpn, nextId, TXT.role, roleType);
        L.uci.set(TXT.openvpn, nextId, TXT.config, TXT.DIR.openvpn + nextId + TXT.CFG.pconf);

        /* Invoke the centralized firewall sync module to build the clean compact rule */
        syncInstanceFirewallRule(roleType, nextId, null);

        L.uci.save();
        return Promise.resolve();
    }).then(function () {
        /* Enforce native LuCI framework trackers to update and throw the visual window */
        if (L.ui && L.ui.changes && typeof L.ui.changes.init === 'function') {
            return L.ui.changes.init();
        }
    }).then(function () {
        if (L.ui && L.ui.changes && typeof L.ui.changes.displayChanges === 'function') {
            L.ui.changes.displayChanges();
        }
    }).catch(function (err) {
        console.error('LuCI Instance Creation Failed:', err);
    }).finally(function () {
        if (btnNode) btnNode.disabled = false;
    });
};

/**
 * Renders the dedicated system section containing action triggers to create new profiles.
 */
const renderInstanceCreationSection = function (sections, systemContext, initialRawState) {
    /* Instatiate genuine, dedicated button nodes exclusive to the creation scope mapping */
    const addServerBtn = E('button', { 'class': 'btn cbi-button cbi-button-positive important' }, TXT.BTN.add_server);
    const addClientBtn = E('button', { 'class': 'btn cbi-button cbi-button-action important' }, TXT.BTN.add_client);

    const addServerNotice = E('span', { 'class': 'text-danger', 'style': 'font-weight:bold; margin-left:10px; display:none;' }, TXT.ICON.warning + ' ' + TXT.STATUS.click_save_apply);
    const addClientNotice = E('span', { 'class': 'text-danger', 'style': 'font-weight:bold; margin-left:10px; display:none;' }, TXT.ICON.warning + ' ' + TXT.STATUS.click_save_apply);

    addServerBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        addNewInstance(TXT.server, sections, systemContext, addServerBtn, addServerNotice);
    });

    addClientBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        addNewInstance(TXT.client, sections, systemContext, addClientBtn, addClientNotice);
    });

    return E('div', { 'class': 'cbi-map' }, [
        E('div', { 'class': 'cbi-section' }, [
            E('h3', { 'style': 'color:var(--text-color, #334155); font-weight:bold;' }, TXT.MSG.title_mgmt),
            E('div', { 'style': 'margin-top:10px; display:flex; align-items:center; flex-wrap:wrap; gap:10px;' }, [
                E('div', { 'style': 'display:inline-flex; align-items:center;' }, [addServerBtn, addServerNotice]),
                E('div', { 'style': 'display:inline-flex; align-items:center;' }, [addClientBtn, addClientNotice])
            ])
        ])
    ]);
};



/**
 * Processes the log clearing timeline filter inside the session storage.
 */
const handleLogClear = function (clearLogBtn, logTextArea) {
    clearLogBtn.disabled = true;
    clearLogBtn.textContent = TXT.ICON.loading + TXT.STATUS.clearing;

    callLogRead({ pattern: TXT.openvpn }).then(function (plainText) {
        if (plainText) {
            const lines = String(plainText).trim().split('\n');
            if (lines.length > 0) {
                const lastEntry = lines[lines.length - 1];
                if (lastEntry) {
                    sessionStorage.setItem('openvpn_log_stamp', lastEntry.substring(0, 24));
                }
            }
        }
        logTextArea.value = TXT.MSG.no_vpn_log;
        clearLogBtn.textContent = TXT.ICON.success + TXT.STATUS.log_cleared;
        setTimeout(function () {
            clearLogBtn.disabled = false;
            clearLogBtn.textContent = TXT.STATUS.log_clear;
        }, 1500);
    });
};

/**
 * Renders the responsive dynamic firewall and routing information card displaying live ports.
 */
const renderFirewallHelpCard = function () {
    const globalServerPort = L.uci.get('firewall', 'openvpn_server_rule', 'dest_port') || '1194';
    const globalClientPort = L.uci.get('firewall', 'openvpn_client_rule', 'dest_port') || '1195';

    const serverPortNum = parseInt(globalServerPort, 10);
    const clientPortNum = parseInt(globalClientPort, 10);

    const customPortsMap = {};
    const allRules = L.uci.sections('firewall', 'rule') || [];

    allRules.forEach(function (r) {
        const sectionName = r['.name'] || '';
        if (sectionName.indexOf('openvpn_rule_instance') === 0) {
            const pVal = L.uci.get('firewall', sectionName, 'dest_port');
            if (pVal) {
                const pNum = parseInt(pVal, 10);
                /* Exclude global baseline ports and handle deduplication via object key map */
                if (!isNaN(pNum) && pNum !== serverPortNum && pNum !== clientPortNum) {
                    customPortsMap[pNum] = true;
                }
            }
        }
    });

    /* Extract unique keys, parse to numbers, and sort numerically ascending */
    const customPorts = Object.keys(customPortsMap).map(function (p) {
        return parseInt(p, 10);
    }).sort(function (a, b) {
        return a - b;
    });

    return E('fieldset', {
        'class': TXT.STYLE.class_fieldset,
        'style': 'margin-top:5px; padding:15px; border:1px solid var(--border-color, #cbd5e1); border-radius:4px; background:var(--background-color, #fafafa);'
    }, [
        E('legend', { 'style': 'font-weight:bold; font-size:13px; padding:0 8px; color:var(--text-color, #334155);' }, _('Firewall & Routing Information')),
        E('p', { 'style': 'margin:0; font-size:13px; line-height:1.6; color:var(--text-color, #334155);' }, [
            E('strong', {}, _('✓ Automated Zone Setup: ')), _('A secure firewall zone targeting all virtual '), E('code', {}, 'tun+'), _(' network devices is automatically managed by this application.'), E('br'),
            E('strong', {}, _('✓ Inbound Access: ')), _('WAN ports '),
            E('code', {}, 'UDP ' + globalServerPort), _(' (Server Global), '),
            E('code', {}, 'UDP ' + globalClientPort), _(' (Client Global)'),
            customPorts.length > 0 ? _(' as well as custom active instance ports ') : '',
            customPorts.length > 0 ? E('code', {}, 'UDP ' + customPorts.join(', ')) : '',
            _(' are automatically opened to accept secure external tunnels.'), E('br'),
            E('strong', {}, _('💡 Custom Port Note: ')), _('If you configure a custom instance utilizing a different port or TCP protocol, please verify that you manually append a corresponding inbound rule under '),
            E('a', { 'href': L.url('admin/network/firewall/rules'), 'style': 'font-weight:bold; color:var(--action-bg, #00a8ff); text-decoration:underline;' }, _('Network ➔ Firewall ➡️ Traffic Rules')), '.'
        ])
    ]);
};

/**
 * Renders the dedicated system log section containing the terminal framework.
 */
const renderSystemLogSection = function (logLines) {
    const logTextArea = E('textarea', {
        'class': 'cbi-input-textarea',
        'style': 'width:100%; font-family:var(--font-monospace, monospace); font-size:12px; background:var(--background-color-dark, #222); color:var(--action-text, #fff) !important; padding:15px; border-radius:4px; border:1px solid var(--border-color, #cbd5e1); text-shadow:none !important;',
        'rows': '10',
        'readonly': 'readonly',
        'wrap': 'off'
    }, logLines || TXT.MSG.no_vpn_log);

    const clearLogBtn = E('button', {
        'class': 'btn cbi-button cbi-button-remove',
        'style': 'margin-top: 10px; margin-bottom: 20px;'
    }, TXT.STATUS.log_clear);

    clearLogBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        handleLogClear(clearLogBtn, logTextArea);
    });

    return E('div', { 'class': 'cbi-map', 'id': 'system_log_section_node' }, [
        E('div', { 'class': 'cbi-section' }, [
            E('h3', { 'style': 'color:var(--text-color, #334155); font-weight:bold;' }, TXT.MSG.title_log),
            E('div', { 'class': 'cbi-value', 'style': 'padding:0; margin:0; width:100%;' }, [
                logTextArea,
                E('br'),
                clearLogBtn
            ])
        ])
    ]);
};

/**
 * Asynchronously refreshes the rows of the status table and updates master section tooltips.
 */
const updateLiveStatusTable = function (sections, contextObj, tableContainerElement) {
    return loadSystemContextData(contextObj).then(function () {
        return syncAndLoadInstanceStatus(sections, contextObj);
    }).then(function (updatedInstances) {
        const devDataRaw = String(contextObj.devData || '').trim();
        const systemUptime = parseFloat(contextObj.uptime) || 0;

        const freshTableNode = renderStatusTable(updatedInstances, devDataRaw, systemUptime);
        if (tableContainerElement && tableContainerElement.firstChild) {
            tableContainerElement.replaceChild(freshTableNode, tableContainerElement.firstChild);
        }

        const masterSectionWrapper = document.getElementById('system_master_control_wrapper');
        if (masterSectionWrapper && masterSectionWrapper.firstChild) {
            const initialRawState = updatedInstances.length > 0 ? (L.uci.get(TXT.openvpn, updatedInstances[0].id, TXT.enabled) || '0') : '0';

            const freshMasterControlNode = renderMasterControlSection(initialRawState, sections, null, null, updatedInstances, devDataRaw);
            masterSectionWrapper.replaceChild(freshMasterControlNode, masterSectionWrapper.firstChild);
        }
    }).catch(function (err) {
        console.error('LuCI Polling Error:', err);
    });
};

/**
 * Filters and buffers dynamic system log entries against session timeline stamps.
 */
const parseLogLines = function (systemContext) {
    if (!systemContext.logread) return '';

    const allLines = String(systemContext.logread).trim().split('\n');
    const targetStamp = sessionStorage.getItem('openvpn_log_stamp');

    if (targetStamp) {
        let allowedIdx = -1;
        for (let j = allLines.length - 1; j >= 0; j--) {
            if (allLines[j].indexOf(targetStamp) === 0) {
                allowedIdx = j;
                break;
            }
        }
        return (allowedIdx !== -1) ? allLines.slice(allowedIdx + 1).join('\n') : allLines.join('\n');
    }

    return allLines.join('\n');
};

/**
 * Renders the responsive theme-compliant cryptographic key generation status overlay.
 */
const renderKeygenOverlay = function (keysReady) {
    return E('div', {
        'id': 'openvpn_keygen_overlay',
        'style': 'position:absolute; top:35px; left:0; width:100%; height:100%; padding:30px 15px; background:rgba(var(--background-color-rgb, 255, 255, 255), 0.9); z-index:9999; display:' + (keysReady ? 'none' : 'flex') + '; flex-direction:column; align-items:center; justify-content:flex-start; border-radius:4px;'
    }, [
        E('img', {
            'src': '/luci-static/resources/icons/loading.svg',
            'style': 'width:64px; height:32px; margin-bottom:15px; vertical-align:middle;'
        }),
        E('h3', { 'style': 'margin:0 0 10px 0; font-weight:bold; color:var(--text-color, #334155); text-shadow:none !important;' }, TXT.MSG.keygen_in_progress),

        E('p', { 'style': 'margin:0; font-style:normal; font-size:13px; color:var(--text-color, #334155); text-align:center; line-height:1.6;' }, [
            TXT.MSG.keygen_wait, E('br'),
            TXT.MSG.process_take_few_minutes, E('br'), E('br'),
            TXT.STATUS.key_info_ca + '(' + TXT.KEY.ca_def_crt + ')', E('br'),
            TXT.STATUS.key_info_serever_crt + '(' + TXT.KEY.server_def_crt + ')', E('br'),
            TXT.STATUS.key_info_server_key + '(' + TXT.KEY.server_def_key + ')', E('br'),
            TXT.STATUS.key_info_hd + '(' + TXT.KEY.dh_def_pem + ')', E('br'),
            TXT.STATUS.key_info_tls + '(' + TXT.KEY.tls_def_key + ')'
        ])
    ]);
};

return view.extend({


    /**
     * Primary data collection lifecycle hook for the LuCI MVC controller layer.
     */
    load: function () {
        L.uci.unload(TXT.openvpn);
        L.uci.unload('firewall');

        return Promise.all([
            L.uci.load(TXT.openvpn),
            L.uci.load('firewall')
        ]).then(function () {
            let sections = L.uci.sections(TXT.openvpn, TXT.openvpn) || [];
            const contextObj = { devData: '', uptime: 0, serverTemplate: '', clientTemplate: '', logread: '', keysReady: false };

            /* If config is empty, run the async factory reset before proceeding to session trackers */
            if (sections.length === 0) {
                return loadSystemContextData(contextObj).then(function () {
                    return initializeDefaultUciSections(contextObj);
                });
            }

            return Promise.resolve(sections);
        }).then(function (sections) {
            /* 1. Run the instant session task check first */
            return processPendingSessionTask(sections);
        }).then(function (sections) {
            /* 2. Fetch live system context for the validated sections */
            const contextObj = { devData: '', uptime: 0, serverTemplate: '', clientTemplate: '', logread: '', keysReady: false };

            return loadSystemContextData(contextObj).then(function () {
                return syncAndLoadInstanceStatus(sections, contextObj);
            }).then(function (instances) {
                return {
                    sections: sections,
                    systemContext: contextObj,
                    instances: instances
                };
            });
        }).catch(function (err) {
            console.error('LuCI Lifecycle Controller Initialization Failed:', err);
            return Promise.reject(err);
        });
    },

    /**
     * Primary user interface orchestrator lifecycle hook for the LuCI MVC view canvas.
     */
    render: function (data) {
        const sections = data.sections;
        const systemContext = data.systemContext || {};
        const instances = data.instances || [];
        const initialRawState = data.initialGlobalState || '0';
        const devDataRaw = String(systemContext.devData || '').trim();

        const logLines = parseLogLines(systemContext);
        const keygenOverlayNode = renderKeygenOverlay(systemContext.keysReady);

        /* Separate standalone buttons for the master control block to prevent element clashing */
        const masterServerBtn = E('button', { 'class': 'btn cbi-button cbi-button-positive important' }, TXT.BTN.add_server);
        const masterClientBtn = E('button', { 'class': 'btn cbi-button cbi-button-action important' }, TXT.BTN.add_client);

        const instanceSections = [];
        sections.forEach(function (s, idx) {
            instanceSections.push(renderInstanceModificationSection(s, idx, instances, initialRawState));
        });

        const tableDOMContainer = E('div', { 'id': 'openvpn_live_table_wrapper' }, [
            renderStatusTable(instances, devDataRaw, parseFloat(systemContext.uptime) || 0)
        ]);

        L.Poll.add(L.bind(function () {
            return loadSystemContextData(systemContext).then(function () {
                const overlay = document.getElementById('openvpn_keygen_overlay');
                if (overlay) {
                    overlay.style.display = systemContext.keysReady ? 'none' : 'flex';
                }
                return updateLiveStatusTable(sections, systemContext, tableDOMContainer);
            });
        }, this), 5);

        return E('div', { 'class': 'cbi-map', 'style': 'position:relative; min-height:300px;' }, [
            keygenOverlayNode,

            E('div', { 'id': 'system_master_control_wrapper' }, [
                renderMasterControlSection(initialRawState, sections, masterServerBtn, masterClientBtn, instances, devDataRaw)
            ]),

            E('hr', { 'style': 'margin:15px 0; border:0; border-top:1px solid var(--border-color, #ced6e0);' }),

            E('div', { 'class': 'cbi-map' }, [
                E('div', { 'class': 'cbi-section' }, [
                    E('h3', { 'style': 'color:var(--text-color, #334155); font-weight:bold;' }, TXT.MSG.title_status),
                    E('div', { 'class': 'cbi-section-node' }, [tableDOMContainer])
                ])
            ]),

            E('div', { 'class': 'cbi-section' }, instanceSections),
            E('hr', { 'style': 'margin:20px 0 30px 0; border:0; border-top:1px solid var(--border-color, #ced6e0);' }),

            /* Clean decoupled creation section call without passing duplicate button variables */
            renderInstanceCreationSection(sections, systemContext, initialRawState),
            E('hr', { 'style': 'margin:25px 0; border:0; border-top:1px solid var(--border-color, #ced6e0);' }),

            renderFirewallHelpCard(),
            E('hr', { 'style': 'margin:25px 0; border:0; border-top:1px solid var(--border-color, #ced6e0);' }),

            renderSystemLogSection(logLines)
        ]);
    }

});




