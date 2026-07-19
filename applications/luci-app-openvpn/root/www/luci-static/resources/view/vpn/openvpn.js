/*
 * Copyright (C) 2008-2026 The OpenWrt Project
 * Copyright (C) 2026 masmbit
 * 
 * This is free software, licensed under the Apache License, Version 2.0.
 * See /LICENSE for more information.
 * 
 * 
 * luci-app-openvpn - architecture map
 * 
 * 1. --- TEXT & CONSTANTS --- ..... Global translations and constants
 * 2. --- HELPER & INIT --- ........ Router connections and file setup
 * 3. --- MAIN VIEW --- ............ Main OpenVPN dashboard
 * 4. --- SAVE AND RESTART --- ..... UCI saving and instance restart logic
 * 5. --- STATUS VIEW --- .......... Live statistics and traffic tables
 * 6. --- KEY EDITOR --- ........... Text area editor for key files
 * 7. --- KEY GENERATOR --- ........ Background key generation wizard
 * 8. --- OPENVPN INSTANCES --- .... Instance settings and creation buttons
 * 9. --- FIREWALL & LOG VIEW --- .. Active ports info and system log box
 * 10. -- LOCK SCREEN --- .......... Startup loading overlay and pollers
 * 11. -- VIEW ENTRYPOINT --- ...... Main entry where the page is generated
 * 
 */

/* global E, URL, FileReader, Blob, sessionStorage */
'use strict';

const view = L.view;

/*
 * --- TEXT & CONSTANTS ---
 */
const TXT = {
    INFO: {
        running: _('Running'),
        stopped: _('Stopped'),
        active: _('Active'),
        openvpn: _('OpenVPN'),
        disabled: _('Disabled'),
        enable: _('Enable'),
        disable: _('Disable'),
        saved: _('Saved'),
        saving: _('Saving...'),
        creating: _('Creating...'),
        clearing: _('Clearing...'),
        error: _('Error:'),
        validated: _('Validated'),
        valid_until: _('Valid Until'),
        type: _('Type'),
        default: _('Default'),
        years: _('Years')
    },
    BTN: {
        show: _('Show'),
        close: _('Close'),
        download: _('Download'),
        upload: _('Upload'),
        save_apply: _('Save & Apply'),
        click_save_apply: _('Please click "Save & Apply".'),
        add_client: _('Add Client Instance'),
        add_server: _('Add Server Instance'),
        save_config: _('Save Config'),
        del_instance: _('Delete Instance'),
        del_ready: _('Deleted - Save & Apply')
    },
    STATUS: {
        status: _('Status'),        
        title_main: _('OpenVPN Server/Client'),
        title_instance: _('Instance Management'),
        title_log: _('LOG'), 
        log_cleared: _('Log Cleared'),
        log_clear: _('Clear Log'),
        loading_key: _('Loading key contents...'),
        file_location: _('File Location: '),
        instance_x: 'Instance #',
        key_info_ca: '• Certification Authority ',
        key_info_serever_crt: '• Server Certificate ',
        key_info_server_key: '• Private Server Key ',
        key_info_hd: '• Diffie- Hellman Parameters ',
        key_info_tls: '• TLS Crypt Secret ',
        no_changes_detected: _('No changes detected'),
        no_clients_connected: _('No clients connected'),
        no_vpn_configured: _('No OpenVPN instances configured yet. Use the buttons below to create an instance.'),
    },
    MSG: {       
        no_vpn_log: _('No active OpenVPN log entries found.'),
        openvpn_keys: _('OpenVPN Keys'),
        edit_config: _('Edit Config file'),
        current_state: _('Current State:'),
        global_status: _('Global Status:'),
        confirm_del: _('Are you sure you want to delete '),
        manage_instance: _('Here you can manage multiple OpenVPN Server and Client instances dynamically.'),
        keygen_in_progress: _('Key generation in progress...'),
        keygen_wait: _('Please wait while secure cryptographic, router-unique default assets are being generated.'),
        process_take_few_minutes: _('This automated initialization process can take a few minutes on your device...'),
        keyfile_not_exist: _('Key file is empty or does not exist on disk yet.'),        
        want_to_generate: _('What to generate?'),
        uploaded_file_invalid: _('Uploaded file is invalid or corrupt!'),
        // no translation
        session_storage_write_blocked: 'SessionStorage write blocked:',
        edit_save_unhandled_error: 'Editor save chain caught unhandled error context:',
        editor_validation_failed: 'Editor validation failed',
        key_verification_failed: 'Key verification failed',        
        key_type_mismatch: 'Key type mismatch',
        failed_write_openvpn_config: 'Failed to write OpenVPN configuration for ',
        failed_delete_openvpn_instance: 'Failed to delete OpenVPN instance ',
        failed_create_openvpn_instance: 'Failed to create OpenVPN instance ',
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
    FIREWALL: {
        firewall_info: _('Firewall & Routing Information'),
        automated_zone_setup: _('Automated Zone Setup: '),
        secure_firewall_for_all: _('A secure firewall zone for all '),
        devices_autocreated: _(' devices is created automatically.'),
        inbound_access: _('Inbound Access: '),
        wan_ports: _('WAN ports '),
        auto_open_secure_connection: _(' are opened automatically for secure OpenVPN connections.'),
        openvpn_tunnel_interface: _('OpenVPN tunnel interfaces (tun0, tun1, tun3, etc.)'),
        check_traffic_rules: _('Check Traffic Rules: '),
        network: _('Network '),
        firewall: _('Firewall '),
        traffic_rules: _('Traffic Rules'),
    },
    KEYGEN: {
        btn: _('KeyGen'),
        btn_generate: _('Generate'),
        title: _('OpenVPN Crypto Generator'),
        title_main: _('OpenVPN Instance Key Generator'),
        key_strength: _('Key Strength'),
        pure_ecc: _('Pure ECC'),
        pure_rsa: _('Pure RSA'),
        certificate: _('Certificate'),
        private_key: _('Private Key'),
        validity_days: _('Validity (Days)'), 
        unknown_asset: _('Unknown Asset'),
        not_applicable: _('Not applicable'),
        custom_cli: _('Custom CLI Options'),
        progress: _('Progress & Output'),
        ready: _('Ready for key generation.'),
        running: _('Crypto operation running. Please wait...'),
        file_saved: _('File successfully written: '),
        disk_err: _('Partition write error: '),
        warn_close: _('Warning: The generated key is not saved and will be lost. Close?'),
        opt_full_pki: _('Full PKI Suite (CA + Server Certificate + Private Server Key)'),
        opt_dh: _('Diffie-Hellman Parameters (Perfect Forward Secrecy)'),
        opt_tls: _('TLS Crypt Secret (Anti-DoS / Port-Scan Protection)'),
        dh_descr: _('Diffie-Hellman parameters enforce numeric prime bit boundaries exclusively.'),
        tls_descr: _('OpenVPN symmetric encryption engines utilize rigid fixed token matrices.'),
        strength_descr: _('Recommended: RSA-2048 + ECC-Prime256v1. RSA ensures CA compatibility, while ECC accelerates the data tunnel.'),
        pki_warn: _('CRITICAL: Regenerating the PKI Suite will immediately invalidate all existing client connections. You MUST re-export and distribute new client configs (.ovpn) after saving!'),
        pki_step1: _('Step 1/3: Generating Certificate Authority (CA)...'),
        pki_step2: _('Step 2/3: Generating Private Server Key...'),
        pki_step3: _('Step 3/3: Generating & Signing Server Certificate...'),
        pki_success: _('SUCCESS: Full PKI Suite generated successfully in RAM!'),
        pki_saved: _('PKI Suite components successfully saved to disk!'),
        error_no_data_to_save: _('No generated data available to save.'),
        error_polling_threshold: _('ERROR: Safety polling threshold exceeded boundaries. Process deadlocked.'),
        error_format_corruption: _('The saved key data contains structural format corruption!'),
        placeholder_pki: '-subj "/CN=CA" ; ; -subj "/CN=Server"',
        placeholder_dh: '-text',
        placeholder_tls: 'N/A - openvpn --genkey accepts no extra flags',
        log_separator_line: '\n\n--------------------------------------------------\n\n',
        log_id_workflow_sucessful: 'LOG: WORKFLOW_SUCCESSFUL',
        log_id_error: 'ERROR:',
        timeout: 600000     // 10-minute maximum waiting window to ensure full universal platform stability during heavy 4096-bit crypto operations
    },
    ICON: {
        success: '✅ ',
        error: '❌ ',
        loading: '⏳ ',
        warning: '⚠️ ',
        laptop: '💻 ',
        info: 'ℹ️ ',
        save: '💾 ',
        check: '✓ ',
        hint: '💡 ',
        arrow: '➔ ',
        next: '➡️ '
    },
    CFG: {
        modern_vpn_server: '# Modern OpenVPN Server Configuration Instance',
        modern_vpn_client: '# Modern OpenVPN Client Configuration Instance',
        config_instance: 'Configuration Instance',
        openvpn_pending_reactivation: 'TXT.CFG.openvpn_pending_reactivation',
        pconf: '.conf',
        vpn_port_str: '1194',
        vpn_port_int: 1194,
        ip_loopback: '127.0.0.1'
    },
    DIR: {
        openvpn: '/etc/openvpn/',
        keys: '/etc/openvpn/keys/',
        init_d_openvpn: '/etc/init.d/openvpn',       
    },
    FILE: {
        client_def_conf: 'client.default.conf',
        server_def_conf: 'server.default.conf',
        instance1_conf: 'instance1.conf',
        instance2_conf: 'instance2.conf',
        var_run_openvpn: '/var/run/openvpn.',
        temp_openvpn_keygen: '/tmp/openvpn.keygen.',
        proc_net_dev: '/proc/net/dev',
        proc_uptime: '/proc/uptime',
        vpn_enabled_img: '/luci-static/resources/icons/tunnel.svg',
        vpn_disabled_img: '/luci-static/resources/icons/tunnel_disabled.svg',
        loading_img: '/luci-static/resources/icons/loading.svg',
        openvpn_keygen_log: '/tmp/openvpn.keygen.log',
        openvpn_keygen_lock: '/var/run/openvpn.keygen.lock'
    },
    KEY: {
        bit_2048: '2048 Bit',
        bit_4096: '4096 Bit',
        rsa2048_ecc: 'RSA-2048 + ECC-Prime256v1',
        rsa4096_ecc: 'RSA-4096 + ECC-Prime256v1',
        rsa_2048_bit: 'RSA 2048 Bit',
        rsa_4096_bit: 'RSA 4096 Bit',
        ecc_prime256v1: 'ECC Prime256v1',
        diffie_hellman: 'Diffie-Hellman',
        tls_2048: 'TLS Symmetric Static Secret (2048 Bit)',
        ca_def_crt: 'ca_default.crt',
        server_def_crt: 'server_default.crt',
        server_def_key: 'server_default.key',
        dh_def_pem: 'dh_default.pem',
        tls_def_key: 'tls-crypt_default.key',
        tls_crypt_: 'tls-crypt_',
        empty_info: '--- EMPTY OR BLANK KEY FILE ---',
    },
    CMD: {
        logread: 'logread',
        mkdir: 'mkdir',
        keygen: 'keygen',
        openvpn: 'openvpn',
        firewall: 'firewall',
    },
    ID: {
        OpenVPN_CLIENT_LIST: 'OpenVPN CLIENT LIST',
        Common_Name: 'Common Name',
        ROUTING_TABLE: 'ROUTING TABLE',
        GLOBAL_STATS: 'GLOBAL STATS',
        ACL_BLOCKED: 'ACL_BLOCKED',
        openvpn_log_stamp: 'openvpn_log_stamp',
        openvpn_keygen_overlay: 'openvpn_keygen_overlay',
        main_control_box: 'main_control_box',
        keygen_bits_pki: 'keygen_bits_pki',
        keygen_bits_dh: 'keygen_bits_dh',
        keygen_bits_desc: 'keygen_bits_desc',
        central_keygen_mode: 'central_keygen_mode',
        row_keygen_years: 'row_keygen_years',
        keygen_years: 'keygen_years',
    },
};


/*
 * --- HELPER & INIT ---
 */

/**
 * Gets the active status of the OpenVPN service from ubus (replaces 'sh -c ubus' shell calls).
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
    const pattern = (options && options.pattern) ? options.pattern : TXT.CMD.openvpn;

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
 * Loads system telemetry, network metrics, logs, and configuration templates.
 */
const loadSystemTelemetry = function (viewData) {
    return Promise.all([
        L.resolveDefault(L.fs.exec(TXT.CMD.mkdir, ['-p', TXT.DIR.keys]), ''),
        L.resolveDefault(L.fs.stat(TXT.DIR.keys + TXT.KEY.tls_def_key), null),
        L.resolveDefault(L.fs.stat(TXT.FILE.openvpn_keygen_lock), null),
        L.resolveDefault(L.fs.read(TXT.FILE.proc_net_dev), ''),
        L.resolveDefault(L.fs.read(TXT.FILE.proc_uptime), '0'),
        L.resolveDefault(L.fs.read(TXT.DIR.openvpn + TXT.FILE.server_def_conf), ''),
        L.resolveDefault(L.fs.read(TXT.DIR.openvpn + TXT.FILE.client_def_conf), ''),
        L.resolveDefault(callLogRead({ pattern: TXT.CMD.openvpn }), '')
    ]).then(function (results) {
        // Unpack the results array into meaningful variables while skipping the first index cleanly
        const [, tlsStat, lockStat, rawDevData, rawUptime, serverTpl, clientTpl, logData] = results;

        // Unlock user interface only if keys exist on disk and background lock file is removed
        viewData.keysReady = !!(tlsStat && tlsStat.size > 0 && !lockStat);
        viewData.devData = rawDevData || '';

        // Extract and parse the system uptime seconds dynamically
        const parts = String(rawUptime).trim().split(/\s+/);
        viewData.uptime = (parts && parts[0]) ? parseFloat(parts[0]) : 0;

        viewData.serverTemplate = serverTpl || '';
        viewData.clientTemplate = clientTpl || '';
        viewData.logread = logData || '';
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
        .replace(new RegExp(escapeRegExp(TXT.KEY.ca_def_crt), 'g'), 'ca_' + id + '.crt')
        .replace(new RegExp(escapeRegExp(TXT.KEY.server_def_crt), 'g'), 'server_' + id + '.crt')
        .replace(new RegExp(escapeRegExp(TXT.KEY.server_def_key), 'g'), 'server_' + id + '.key')
        .replace(new RegExp(escapeRegExp(TXT.KEY.dh_def_pem), 'g'), 'dh_' + id + '.pem')
        .replace(new RegExp(escapeRegExp(TXT.KEY.tls_def_key), 'g'), 'tls-crypt_' + id + '.key')
        // Appends 'Instance #' formatting cleanly onto the generated config header line
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
        .replace(new RegExp(escapeRegExp(TXT.KEY.ca_def_crt), 'g'), 'ca_' + id + '.crt')
        .replace(new RegExp(escapeRegExp(TXT.KEY.server_def_crt), 'g'), 'server_' + id + '.crt')
        .replace(new RegExp(escapeRegExp(TXT.KEY.server_def_key), 'g'), 'server_' + id + '.key')
        .replace(new RegExp(escapeRegExp(TXT.KEY.dh_def_pem), 'g'), 'dh_' + id + '.pem')
        .replace(new RegExp(escapeRegExp(TXT.KEY.tls_def_key), 'g'), 'tls-crypt_' + id + '.key')
        // Appends 'Instance #' formatting cleanly onto the generated config header line
        .replace(TXT.CFG.modern_vpn_client, TXT.CFG.modern_vpn_client + ' #' + instNum)
        .replace(/^remote\s+\S+\s+\d+/m, 'remote ' + calculatedIp + ' ' + calculatedPort);
};

/**
 * Initializes a file on disk and generates defaults if it is missing.
 */
const initFile = function (customPath, defaultPath, id, instNum, role, viewData) {
    return L.fs.read(customPath)
        .then(function (existingContent) {
            return existingContent;
        })
        .catch(function () {
            // Create default configuration file if missing
            if (customPath.indexOf(TXT.CFG.pconf) !== -1) {
                let configContent = '';

                if (role === 'client') {
                    configContent = generateConfigContentClient(viewData.clientTemplate, id, instNum);
                } else {
                    configContent = generateConfigContentServer(viewData.serverTemplate, id, instNum);
                }

                return L.fs.write(customPath, configContent).then(function () {
                    return configContent;
                });
            }

            // FIXED: Flat chain design to prevent inner scope loss during asset cloning
            if (!defaultPath) {
                return Promise.resolve('');
            }

            return L.resolveDefault(L.fs.read(defaultPath), '').then(function (defaultCertContent) {
                const cleanContent = String(defaultCertContent || '').trim();

                if (cleanContent.length === 0) {
                    return '';
                }

                // Symmetrically write the verified payload straight to the target folder
                return L.fs.write(customPath, cleanContent).then(function () {
                    return cleanContent;
                });
            });
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
 * Synchronizes all required configuration and cryptographic files for an instance.
 */
const syncInstanceFiles = function (id, instNum, role, viewData) {
    const filePromises = [
        initFile(TXT.DIR.openvpn + id + TXT.CFG.pconf, null, id, instNum, role, viewData),
        initFile(TXT.DIR.keys + 'ca_' + id + '.crt', TXT.DIR.keys + TXT.KEY.ca_def_crt, id, instNum, role, viewData),
        initFile(TXT.DIR.keys + 'server_' + id + '.crt', TXT.DIR.keys + TXT.KEY.server_def_crt, id, instNum, role, viewData),
        initFile(TXT.DIR.keys + 'server_' + id + '.key', TXT.DIR.keys + TXT.KEY.server_def_key, id, instNum, role, viewData),
        initFile(TXT.DIR.keys + 'tls-crypt_' + id + '.key', TXT.DIR.keys + TXT.KEY.tls_def_key, id, instNum, role, viewData)
    ];

    if (role === 'server') {
        filePromises.push(
            initFile(TXT.DIR.keys + 'dh_' + id + '.pem', TXT.DIR.keys + TXT.KEY.dh_def_pem, id, instNum, role, viewData)
        );
    }

    return Promise.all(filePromises);
};

/**
 * Loads configuration and runtime status data for all instances.
 */
const loadInstanceData = function (sections, viewData) {
    return L.resolveDefault(callServiceList(TXT.CMD.openvpn), {}).then(function (serviceData) {
        const instancesObj = serviceData.instances || {};
        const instPromises = [];

        sections.forEach(function (s) {
            const id = s['.name'];
            const numMatch = id.match(/\d+$/);
            const instNum = numMatch ? parseInt(numMatch, 10) : 1;
            const role = L.uci.get(TXT.CMD.openvpn, id, 'role') || 'server';

            const instDataPromise = syncInstanceFiles(id, instNum, role, viewData).then(function () {
                return L.resolveDefault(L.fs.read(TXT.DIR.openvpn + id + TXT.CFG.pconf), '');
            }).then(function (confContent) {
                const runtimeInstance = instancesObj[id] || {};
                const isRunning = (runtimeInstance.running === true);
                const pidVal = isRunning ? (runtimeInstance.pid || '-') : '-';

                const baseResult = {
                    id: id, instNum: instNum, role: role,
                    confContent: String(confContent).trim(),
                    isRunning: isRunning, pid: pidVal,
                    startTime: 0, connectedClients: []
                };

                if (!isRunning || pidVal === '-') {
                    return baseResult;
                }

                return L.resolveDefault(L.fs.stat('/proc/' + pidVal), null).then(function (statObj) {
                    if (statObj && statObj.mtime) {
                        if (typeof statObj.mtime === 'object' && statObj.mtime.sec) {
                            baseResult.startTime = parseInt(statObj.mtime.sec, 10) || 0;
                        } else if (typeof statObj.mtime === 'number') {
                            baseResult.startTime = Math.floor(statObj.mtime);
                        } else if (typeof statObj.mtime === 'string') {
                            baseResult.startTime = parseInt(statObj.mtime, 10) || 0;
                        }
                    }

                    if (role !== 'server') {
                        return baseResult;
                    }

                    const statusFilePath = TXT.FILE.var_run_openvpn + id + '.status';
                    return L.resolveDefault(L.fs.read(statusFilePath), '').then(function (statusContent) {
                        baseResult.connectedClients = parseConnectedClients(statusContent);
                        return baseResult;
                    });
                });
            });

            instPromises.push(instDataPromise);
        });

        return Promise.all(instPromises);
    });
};


const initEmptyUciView = function () {
    return Promise.resolve([]);
};

/**
 * Processes pending reactivation tasks from the previous session reload.
 */
const processPendingSessionTask = function (sections) {
    // Read the pending reactivation request from the browser memory
    const reloadId = window.sessionStorage.getItem(TXT.CFG.openvpn_pending_reactivation);

    if (reloadId) {
        // Remove the token immediately to prevent endless refresh loops
        window.sessionStorage.removeItem(TXT.CFG.openvpn_pending_reactivation);

        // Re-enable the OpenVPN instance inside UCI staging memory
        if (L.uci.get(TXT.CMD.openvpn, reloadId)) {
            L.uci.set(TXT.CMD.openvpn, reloadId, 'enabled', '1');
            L.uci.save();
        }

        // Open the native LuCI review and apply window automatically
        if (L.ui && L.ui.changes && typeof L.ui.changes.init === 'function') {
            L.ui.changes.init().then(function () {
                if (L.ui.changes.displayChanges && typeof L.ui.changes.displayChanges === 'function') {
                    L.ui.changes.displayChanges();
                }
            });
        }
    }

    return Promise.resolve(sections);
};


/*
 * --- SAVE AND RESTART ---
 */


/**
 * Shows the LuCI changes modal and reboots the OpenVPN instance if active.
 */
const showSaveApplyOpenVPN = function (instance_id) {
    // OpenVPN requires a disable and re-enable cycle to load newly updated key files into memory.
    const needsReactivation = isInstanceEnabled(instance_id);

    if (needsReactivation) {
        // Disable running instance inside UCI staging memory
        if (L.uci.get(TXT.CMD.openvpn, instance_id)) {
            L.uci.set(TXT.CMD.openvpn, instance_id, 'enabled', '0');
        }

        // Cache reactivation request for the post-reload page hook
        try {
            window.sessionStorage.setItem(TXT.CFG.openvpn_pending_reactivation, instance_id);       // -> processPendingSessionTask() on reload
        } catch (err) {
            console.error(TXT.MSG.session_storage_write_blocked, err);
        }
    }

    // Commit changes to volatile staging buffer
    L.uci.save();

    // Instantiate and inject the native LuCI review and apply dialog layout
    if (L.ui && L.ui.changes && typeof L.ui.changes.init === 'function') {
        L.ui.changes.init().then(function () {
            if (L.ui.changes.displayChanges && typeof L.ui.changes.displayChanges === 'function') {
                L.ui.changes.displayChanges();

                // Inject custom warning notice container into the generated modal
                setTimeout(function () {
                    const modalNode = document.querySelector('.modal.uci-dialog') || document.querySelector('.modal');
                    if (modalNode) {
                        const infoNotice = E('div', {
                            'class': 'alert-message info',
                            'style': 'margin:15px 0 15px 0; padding:12px; font-weight:bold; font-size:12px; line-height:1.5; border-left:4px solid #00a8ff; background:var(--background-color, #f0fdf4); color:var(--text-color, #334155); border-radius:4px;'
                        }, TXT.ICON.warning + ' ' + _('Key data modified! Applying will temporarily stop the instance to load new credentials. After page reload, please click Apply once more to complete reactivation.'));

                        const titleHeader = modalNode.querySelector('h4');
                        if (titleHeader && titleHeader.nextSibling) {
                            modalNode.insertBefore(infoNotice, titleHeader.nextSibling);
                        } else {
                            modalNode.appendChild(infoNotice);
                        }
                    }
                }, 50);
            }
        });
    }
};


/*
 * --- MAIN VIEW ---
 */


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
 * Updates the visual styles and button labels of the main control box.
 */
const updateMainBoxVisuals = function (stateStr, badgeLabelNode, badgeImgNode, boxHeadNode, globalToggleBtn) {
    if (stateStr === '1') {
        badgeLabelNode.textContent = TXT.INFO.openvpn + ' (' + TXT.INFO.active + ')';
        badgeImgNode.src = TXT.FILE.vpn_enabled_img;
        boxHeadNode.style.setProperty('--zone-color-rgb', '144, 240, 144');
        boxHeadNode.style.backgroundColor = 'var(--zone-lan-bg, rgb(144, 240, 144))';

        // Update button to disable action
        if (globalToggleBtn) {
            globalToggleBtn.className = 'cbi-button cbi-button-negative important';
            globalToggleBtn.textContent = TXT.INFO.disable + ' ' + TXT.INFO.openvpn;
        }
    } else {
        badgeLabelNode.textContent = TXT.INFO.openvpn + ' (' + TXT.INFO.disabled + ')';
        badgeImgNode.src = TXT.FILE.vpn_disabled_img;
        boxHeadNode.style.setProperty('--zone-color-rgb', '240, 144, 144');
        boxHeadNode.style.backgroundColor = 'var(--zone-wan-bg, rgb(240, 144, 144))';

        // Update button to enable action
        if (globalToggleBtn) {
            globalToggleBtn.className = 'cbi-button cbi-button-positive important';
            globalToggleBtn.textContent = TXT.INFO.enable + ' ' + TXT.INFO.openvpn;
        }
    }
};

/**
 * Handles the main toggle button click event.
 */
const handleMainToggleClick = function (sections, ifaceBoxMasterNode, addServerBtn, addClientBtn, badgeLabelNode, badgeImgNode, boxHeadNode, applyNotice, globalToggleBtn) {
    const targetSections = sections || [];

    // Abort if no configuration sections exist
    if (targetSections.length === 0) return;

    ifaceBoxMasterNode.style.opacity = '0.4';
    globalToggleBtn.disabled = true;
    if (addServerBtn) addServerBtn.disabled = true;
    if (addClientBtn) addClientBtn.disabled = true;

    // Get next target state from the first instance name
    const firstSectionName = targetSections[0]['.name'];
    const nextState = isInstanceEnabled(firstSectionName) ? '0' : '1';

    // Set next state across all sections
    for (let k = 0; k < targetSections.length; k++) {
        if (targetSections[k] && targetSections[k]['.name']) {
            L.uci.set(TXT.CMD.openvpn, targetSections[k]['.name'], 'enabled', nextState);
        }
    }

    L.uci.save();
    updateMainBoxVisuals(nextState, badgeLabelNode, badgeImgNode, boxHeadNode, globalToggleBtn);
    applyNotice.style.display = 'inline-block';

    // Open native LuCI changes window
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
 * Renders the main control and setup wizard box for OpenVPN.
 */
const renderMainControlBox = function (initialRawState, sections, addServerBtn, addClientBtn, instances, devDataRaw) {
    const applyNotice = E('span', { 'class': 'text-danger', 'style': 'font-weight:bold; margin-left:15px; display:none;' }, TXT.ICON.warning + TXT.BTN.click_save_apply);

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

    // Format byte metrics for tooltip readability
    const formatTooltipBytes = function (b) {
        if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
        if (b >= 1024) return (b / 1024).toFixed(1) + ' KB';
        return b + ' B';
    };

    const globalToggleBtn = E('button', {
        'style': 'text-shadow:none !important; box-shadow:none !important; white-space:nowrap; margin-left:auto;'
    }, '');

    const labelText = initialRawState === '1' ? TXT.INFO.openvpn + ' (' + TXT.INFO.active + ')' : TXT.INFO.openvpn + ' (' + TXT.INFO.disabled + ')';
    const badgeLabelNode = E('strong', {}, labelText);
    const badgeImgNode = E('img', { 'class': 'middle', 'style': 'width:48px; height:48px; vertical-align:middle;' });

    const boxHeadNode = E('div', {
        'class': 'ifacebox-head',
        'style': 'padding:3px 8px; font-size:12px; color:var(--text-color, #334155); text-shadow:none !important;'
    }, [badgeLabelNode]);

    // Build the status summary tooltip overlay
    const tooltipBadgeNode = E('span', { 'class': 'cbi-tooltip ifacebadge large', 'style': 'text-align:left; font-weight:normal;' }, [
        E('img', { 'src': TXT.FILE.vpn_enabled_img, 'style': 'float:left; margin-right:10px; width:24px; height:24px;' }),
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

    const ifaceBoxMasterNode = E('div', {
        'class': 'ifacebox',
        'style': 'display:inline-block; width:160px; vertical-align:middle; margin:0; transition:opacity 0.15s ease-in-out; background:var(--background-color, #fafafa); border:1px solid var(--border-color, #cbd5e1); border-radius:4px; overflow:hidden;'
    }, [boxHeadNode, boxBodyNode]);

    updateMainBoxVisuals(initialRawState, badgeLabelNode, badgeImgNode, boxHeadNode, globalToggleBtn);

    // Bind master click action to the toggle button
    globalToggleBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        handleMainToggleClick(sections, ifaceBoxMasterNode, addServerBtn, addClientBtn, badgeLabelNode, badgeImgNode, boxHeadNode, applyNotice, globalToggleBtn);
    });

    return E('div', { 'style': 'margin-bottom:25px; width:100%;' }, [
        E('h2', { 'style': 'color:var(--text-color, #334155); font-weight:bold; margin:0 0 10px 0; padding:0;' }, TXT.STATUS.title_main),
        E('p', { 'style': 'font-style:normal; margin-bottom:20px; color:var(--text-color-light, #64748b);' }, TXT.MSG.manage_instance),

        E('fieldset', { 'class': 'class_fieldset', 'style': 'margin-bottom:5px; padding:0; border:0; background:transparent;' }, [
            E('div', { 'style': 'display:flex; align-items:flex-start; justify-content:space-between; padding:3px 0; margin:0; min-height:0; width:100%;' }, [
                E('div', { 'style': 'display:inline-flex; align-items:center;' }, [
                    ifaceBoxMasterNode, applyNotice
                ]),
                globalToggleBtn
            ])
        ])
    ]);
};


/*
 * --- STATUS VIEW ---
 */


/**
 * Extracts and maps networking parameters (IP/Port) from configuration data strings.
 */
const parseNetworkParams = function (role, confContent, isRunning) {
    const params = { localIp: '0.0.0.0', localPort: TXT.CFG.vpn_port_str, clientRemote: '-' };

    if (!confContent) return params;

    const lines = confContent.split(/[\r\n]+/);
    for (let j = 0; j < lines.length; j++) {
        const line = lines[j].trim();

        if (role === 'client' && line.indexOf('remote ') === 0) {
            const rParts = line.split(/\s+/);
            const remoteIp = (rParts.length >= 2) ? rParts[1] : TXT.CFG.ip_loopback;
            const remotePort = (rParts.length >= 3) ? rParts[2] : TXT.CFG.vpn_port_str;

            params.localIp = TXT.CFG.ip_loopback;
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
 * Generates responsive theme-compliant UI node elements for remote connections.
 */
const renderRemoteNode = function (role, isRunning, netParams, connectedClients) {
    if (role === 'client') {
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
        return E('span', { 'style': 'font-style:italic; color:var(--text-color-light, #a4b0be);' }, TXT.STATUS.no_clients_connected);
    }

    return E('span', {}, '-');
};

/**
 * Asynchronously refreshes the rows of the status table and updates master section tooltips.
 */
const updateLiveStatusTable = function (sections, viewData, tableContainerElement) {
    return loadSystemTelemetry(viewData).then(function () {
        return loadInstanceData(sections, viewData);
    }).then(function (updatedInstances) {
        const devDataRaw = String(viewData.devData || '').trim();
        const systemUptime = parseFloat(viewData.uptime) || 0;

        const freshTableNode = renderStatusTable(updatedInstances, devDataRaw, systemUptime);
        if (tableContainerElement && tableContainerElement.firstChild) {
            tableContainerElement.replaceChild(freshTableNode, tableContainerElement.firstChild);
        }

        const mainControlBox = document.getElementById(TXT.ID.main_control_box);
        if (mainControlBox && mainControlBox.firstChild) {
            // FIXED: Symmetrically applying your new isInstanceEnabled sub-function with a clean binary state fallback
            const initialRawState = (updatedInstances.length > 0 && isInstanceEnabled(updatedInstances[0].id)) ? '1' : '0';

            const mainControlBoxNode = renderMainControlBox(initialRawState, sections, null, null, updatedInstances, devDataRaw);
            mainControlBox.replaceChild(mainControlBoxNode, mainControlBox.firstChild);
        }
    }).catch(function (err) {
        console.error('LuCI Polling Error:', err);
    });
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
        const role = inst.role || 'server';
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


/*
 * --- KEY EDITOR ---
 */


/**
 * Show simple key editor that verifies and displays key metadata.
 */
const openKeyEditorModal = function (filename, instance_id, displayId) {
    const absolutePath = TXT.DIR.keys + filename;
    let hasSaved = false;

    const modalKeyTextArea = E('textarea', {
        'class': 'cbi-input-textarea',
        'style': 'width:100%; max-width:100%; resize:vertical; font-family:var(--font-monospace, monospace); font-size:12px; background:var(--background-color-dark, #222); color:var(--action-text, #fff) !important; padding:15px; border-radius:4px; border:1px solid var(--border-color, #cbd5e1); text-shadow:none !important;',
        'rows': '18',
        'wrap': 'off'
    }, TXT.STATUS.loading_key);

    const quickInfoBox = E('div', {
        'style': 'margin-bottom:12px; padding:10px 15px; border-left:4px solid var(--action-bg, #00a8ff); background:var(--background-color-light, #f8fafc); border-radius:0 4px 4px 0; font-size:12px; line-height:1.6; color:var(--text-color, #1e293b); display:none;'
    });

    // Update the quick info box content
    const quickInfoBoxUpdate = function (rawMeta) {
        let keyTypeInfo = TXT.KEYGEN.unknown_asset;
        let expirationInfo = TXT.KEYGEN.not_applicable;
        let isInvalid = false;

        // Parse expiration date
        const expiryMatch = rawMeta.match(/Not After\s*:\s*([^\n]+)/i);
        if (expiryMatch && expiryMatch[1]) {
            expirationInfo = expiryMatch[1].trim();
        }

        // Identify key type and strength
        if (rawMeta.indexOf('Public-Key: (2048 bit)') !== -1) {
            keyTypeInfo = TXT.KEY.rsa_2048_bit + ' (' + TXT.KEYGEN.certificate + ')';
        } else if (rawMeta.indexOf('Public-Key: (4096 bit)') !== -1) {
            keyTypeInfo = TXT.KEY.rsa_4096_bit + ' (' + TXT.KEYGEN.certificate + ')';
        } else if (rawMeta.indexOf('Public-Key: (256 bit)') !== -1 || rawMeta.indexOf('prime256v1') !== -1) {
            if (rawMeta.indexOf('Private-Key') !== -1) {
                keyTypeInfo = TXT.KEY.ecc_prime256v1 + ' (' + TXT.KEYGEN.private_key + ')';
            } else {
                keyTypeInfo = TXT.KEY.ecc_prime256v1 + ' (' + TXT.KEYGEN.certificate + ')';
            }
        } else if (rawMeta.indexOf('Private-Key: (2048 bit)') !== -1) {
            keyTypeInfo = TXT.KEY.rsa_2048_bit + ' (' + TXT.KEYGEN.private_key + ')';
        } else if (rawMeta.indexOf('Private-Key: (4096 bit)') !== -1) {
            keyTypeInfo = TXT.KEY.rsa_4096_bit + ' (' + TXT.KEYGEN.private_key + ')';
        } else if (rawMeta.indexOf('DH Parameters') !== -1 || rawMeta.indexOf('bit') !== -1) {
            const dhBits = rawMeta.match(/([0-9]+)\s*bit/i);
            keyTypeInfo = TXT.KEY.diffie_hellman + ' ' + (dhBits && dhBits[1] ? '(' + dhBits[1] + ' Bit)' : '');
        } else if (rawMeta.indexOf('Symmetric Static Secret') !== -1) {
            keyTypeInfo = TXT.KEY.tls_2048 + ' [' + TXT.INFO.validated + ']';
        } else if (rawMeta.indexOf('ERROR') !== -1) {
            keyTypeInfo = '<span style="color:var(--error-color, #ef4444); font-weight:bold;">' + TXT.ICON.warning + TXT.KEYGEN.error_format_corruption + '</span>';
            isInvalid = true;
        }

        // Apply styles and show box
        if (isInvalid) {
            quickInfoBox.style.borderLeftColor = 'var(--error-color, #ef4444)';
            quickInfoBox.innerHTML = keyTypeInfo;
        } else {
            quickInfoBox.style.borderLeftColor = 'var(--action-bg, #00a8ff)';
            quickInfoBox.innerHTML = '<strong>' + TXT.INFO.type + ':</strong> ' + keyTypeInfo +
                ' <span style="margin-left:20px;"><strong>' + TXT.INFO.valid_until + ':</strong> ' + expirationInfo + '</span>';
        }
        quickInfoBox.style.display = 'block';
    };

    // Read file and parse metadata
    L.resolveDefault(L.fs.read(absolutePath), '').then(function (content) {
        modalKeyTextArea.value = content ? content.trim() + '\n' : TXT.KEY.empty_info;

        if (!content || content.trim() === '') return;

        L.fs.exec(TXT.DIR.init_d_openvpn, ['keymeta', filename]).then(function (res) {
            if (res && res.code === 0 && res.stdout && res.stdout.trim() !== '') {
                quickInfoBoxUpdate(res.stdout);
            }
        });
    });

    const modalSaveApplyBtn = E('button', {
        'class': 'cbi-button cbi-button-save',
        'style': 'margin-right:10px;'
    }, TXT.BTN.save_apply);

    modalSaveApplyBtn.addEventListener('click', function () {
        modalSaveApplyBtn.disabled = true;
        modalSaveApplyBtn.textContent = TXT.INFO.saving;

        // Write file and re-validate key metadata
        L.fs.write(absolutePath, modalKeyTextArea.value.trim() + '\n')
            .then(function () {
                return L.fs.exec(TXT.DIR.init_d_openvpn, ['keymeta', filename]);
            })
            .then(function (res) {
                const keymeta = (res && res.stdout) ? res.stdout : '';

                // FIXED: Direct error-routing onto the local quickInfoBox element
                if (keymeta.indexOf('ERROR') !== -1) {
                    quickInfoBoxUpdate(keymeta);
                    modalSaveApplyBtn.disabled = false;
                    modalSaveApplyBtn.textContent = TXT.BTN.save_apply;
                    return Promise.reject(new Error(TXT.MSG.editor_validation_failed));
                }

                hasSaved = true;
                modalSaveApplyBtn.textContent = TXT.INFO.saved;

                setTimeout(function () {
                    modalSaveApplyBtn.disabled = false;
                    modalSaveApplyBtn.textContent = TXT.BTN.save_apply;
                    if (keymeta !== '') {
                        quickInfoBoxUpdate(keymeta);
                    }
                }, 1200);
            })
            .catch(function (err) {
                if (err.message !== TXT.MSG.editor_validation_failed) {
                    console.error(TXT.MSG.edit_save_unhandled_error, err);
                    modalSaveApplyBtn.disabled = false;
                    modalSaveApplyBtn.textContent = TXT.BTN.save_apply;
                }
            });
    });

    const modalDownloadKeyBtn = E('button', {
        'class': 'cbi-button cbi-button-apply',
        'style': 'margin-right:10px; background:var(--action-bg, #00a8ff) !important; color:var(--action-text, #fff) !important; text-shadow:none !important; border:1px solid var(--action-border, #0097e6) !important;'
    }, TXT.BTN.download);

    modalDownloadKeyBtn.addEventListener('click', function () {
        const blob = new Blob([modalKeyTextArea.value], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    const modalCloseEditBtn = E('button', {
        'class': 'cbi-button cbi-button-neutral'
    }, TXT.BTN.close);

    modalCloseEditBtn.addEventListener('click', function () {
        L.ui.hideModal();
        if (hasSaved) {
            showSaveApplyOpenVPN(instance_id);
        }
    });

    L.ui.showModal(displayId + ' - ' + filename, [
        E('div', { 'class': 'cbi-map' }, [
            E('div', { 'class': 'cbi-section' }, [
                E('div', { 'class': 'cbi-section-descr', 'style': 'margin-bottom:12px; font-style:italic; color:var(--text-color-light, #64748b);' }, TXT.STATUS.file_location + absolutePath),
                quickInfoBox,
                E('div', { 'style': 'margin-bottom:20px;' }, [modalKeyTextArea]),
                E('div', { 'style': 'text-align:right;' }, [modalSaveApplyBtn, modalDownloadKeyBtn, modalCloseEditBtn])
            ])
        ])
    ]);
};


/*
 * --- KEY GENERATOR ---
 */


/**
 * Opens the Key Generator modal window to generate keys and certificates.
 */
const openKeyGenModal = function (instance_id, displayId, role) {
    let is_generated = false;
    let hasSaved = false;
    const pki_payload = { ca: '', key: '', cert: '' };
    let single_payload = '';
    let active_mode = 'pki';

    // Dynamic filter: Render DH options strictly for server instances to prevent configuration errors
    const dh_option_html = (role === 'server') ? '<option value="dh">' + TXT.KEYGEN.opt_dh + '</option>' : '';

    // Pre-build responsive interactive UI elements using strict ES5 string matrix concatenation
    let options_html = '<div class="cbi-value">' +
        '<label class="cbi-value-title">' + TXT.MSG.want_to_generate + '</label>' +
        '<div class="cbi-value-field">' +
        '<select id="' + TXT.ID.central_keygen_mode +'" class="cbi-input-select">' +
        '<option value="pki" selected="selected">' + TXT.KEYGEN.opt_full_pki + '</option>' +
        dh_option_html +
        '<option value="tls">' + TXT.KEYGEN.opt_tls + '</option>' +
        '</select>' +
        '</div>' +
        '</div>' +

        '<div class="cbi-value">' +
        '<label class="cbi-value-title">' + TXT.KEYGEN.key_strength + '</label>' +
        '<div class="cbi-value-field">' +
        '<select id="' + TXT.ID.keygen_bits_pki +'" class="cbi-input-select">' +
        '<option value="rsa2048_ec" selected>' + TXT.KEY.rsa2048_ecc + ' (' + TXT.INFO.default + ')</option>' +
        '<option value="rsa4096_ec">' + TXT.KEY.rsa4096_ecc + '</option>' +
        '<option value="ec">' + TXT.KEY.ecc_prime256v1 + ' (' + TXT.KEYGEN.pure_ecc + ')</option>' +
        '<option value="2048">' + TXT.KEY.rsa_2048_bit + ' (' + TXT.KEYGEN.pure_rsa + ')</option>' +
        '<option value="4096">' + TXT.KEY.rsa_4096_bit + ' (' + TXT.KEYGEN.pure_rsa + ')</option>' +
        '</select>' +
        '<select id="' + TXT.ID.keygen_bits_dh +'" class="cbi-input-select" style="display:none;">' +
        '<option value="2048" selected>' + TXT.KEY.bit_2048 + ' (' + TXT.INFO.default + ')</option>' +
        '<option value="4096">' + TXT.KEY.bit_4096 + '</option>' +
        '</select>' +
        '<div id="' + TXT.ID.keygen_bits_desc + '" class="cbi-value-description" style="margin-top:4px; font-size:11px; color:var(--text-color-muted, #64748b);">' + TXT.KEYGEN.strength_descr + '</div>' +
        '</div>' +
        '</div>' +

        '<div class="cbi-value" id="' + TXT.ID.row_keygen_years +'">' +
        '<label class="cbi-value-title">' + TXT.KEYGEN.validity_days + '</label>' +
        '<div class="cbi-value-field">' +
        '<select id="' + TXT.ID.keygen_years + '" class="cbi-input-select">' +
        '<option value="10">10 ' + TXT.INFO.years + '</option>' +
        '<option value="20">20 ' + TXT.INFO.years + '</option>' +
        '<option value="50">50 ' + TXT.INFO.years + '</option>' +
        '<option value="100" selected="selected">100 ' + TXT.INFO.years + ' (' + TXT.INFO.default + ')</option>' +
        '</select>' +
        '</div>' +
        '</div>';


    const customCliInput = E('input', {
        'id': 'keygen_custom_cmd',
        'type': 'text',
        'class': 'cbi-input-text',
        'placeholder': '',
        'style': 'width:100%; margin-top:5px;'
    });

    const modalTextArea = E('textarea', {
        'id': 'keygen_output',
        'class': 'cbi-input-textarea',
        'style': 'width:100%; max-width:100%; resize:vertical; font-family:var(--font-monospace, monospace); font-size:12px; background:var(--background-color-dark, #222); color:var(--text-color-success, #0f0) !important; padding:15px; border-radius:4px; border:1px solid var(--border-color, #cbd5e1); text-shadow:none !important;',
        'rows': '12',
        'readonly': 'readonly'
    }, TXT.KEYGEN.ready);

    const warnContainer = E('div', {
        'class': 'cbi-value',
        'style': 'background:var(--background-color-danger, #fff5f5); border-left:4px solid var(--text-color-danger, #ff4d4d); padding:10px; margin-bottom:15px;'
    }, [
        E('div', { 'style': 'color:var(--text-color-danger, #ff4d4d); font-weight:bold;' }, TXT.KEYGEN.pki_warn)
    ]);

    const optionsContainer = E('div', { 'id': 'central_options_container' });
    optionsContainer.innerHTML = options_html;

    const modeSelect = optionsContainer.querySelector('#' + TXT.ID.central_keygen_mode);
    modeSelect.addEventListener('change', function (ev) {
        active_mode = ev.target.value;
        const rowYears = document.getElementById(TXT.ID.row_keygen_years);
        if (active_mode === 'pki') {
            warnContainer.style.display = 'block';
            if (rowYears) rowYears.style.display = 'flex';
        } else {
            warnContainer.style.display = 'none';
            if (rowYears) rowYears.style.display = 'none';
        }
        updateKeyStrengthDropdowns();
        updateCustomCliPlaceholder();
    });

    const modalGenBtn = E('button', {
        'class': 'cbi-button cbi-button-action',
        'style': 'margin-right:10px;'
    }, TXT.KEYGEN.btn_generate);

    /**
     * Updates the custom CLI field placeholder based on the active crypto mode.
     */
    const updateCustomCliPlaceholder = function () {
        if (!customCliInput) {
            return;
        }

        // Reset value on mode shift to prevent accidental syntax leaks
        customCliInput.value = '';

        if (active_mode === 'pki') {
            customCliInput.placeholder = TXT.KEYGEN.placeholder_pki;
            customCliInput.disabled = false;
            customCliInput.style.opacity = '0.5';
        } else if (active_mode === 'dh') {
            customCliInput.placeholder = TXT.KEYGEN.placeholder_dh;
            customCliInput.disabled = false;
            customCliInput.style.opacity = '0.5';
        } else if (active_mode === 'tls') {
            // OpenVPN symmetric engine takes zero custom CLI flags
            customCliInput.placeholder = TXT.KEYGEN.placeholder_tls;
            customCliInput.disabled = true;
            customCliInput.style.opacity = '0.2'; // Visually mute the field gracefully
        }
    };

    /**
     * Updates the visibility and text of the key strength dropdowns.
     */
    const updateKeyStrengthDropdowns = function () {
        const pkiSelect = document.getElementById(TXT.ID.keygen_bits_pki);
        const dhSelect = document.getElementById(TXT.ID.keygen_bits_dh);
        const descContainer = document.getElementById(TXT.ID.keygen_bits_desc);

        if (!pkiSelect || !dhSelect || !descContainer) {
            return;
        }

        if (active_mode === 'pki') {
            pkiSelect.style.display = 'inline-block';
            dhSelect.style.display = 'none';
            descContainer.textContent = TXT.KEYGEN.strength_descr;
        } else if (active_mode === 'dh') {
            pkiSelect.style.display = 'none';
            dhSelect.style.display = 'inline-block';
            descContainer.textContent = TXT.KEYGEN.dh_descr;
        } else if (active_mode === 'tls') {
            pkiSelect.style.display = 'none';
            dhSelect.style.display = 'none'; // Completely hidden because TLS-Crypt utilizes fixed 2048-bit keys automatically
            descContainer.textContent = TXT.KEYGEN.tls_descr;
        }
    };

    // Start the key generation process on button click
    modalGenBtn.addEventListener('click', function () {
        modalTextArea.value = TXT.KEYGEN.running + '\n';

        const selectedYears = document.getElementById(TXT.ID.keygen_years) ? parseInt(document.getElementById(TXT.ID.keygen_years).value, 10) : 100;
        const days = (selectedYears * 365).toString();
        const rawCustom = customCliInput.value.trim();

        // Get bits configuration based on active mode
        let rawBitsSelection = '2048'; // Default for TLS-Crypt
        if (active_mode === 'pki') {
            rawBitsSelection = document.getElementById(TXT.ID.keygen_bits_pki).value;
        } else if (active_mode === 'dh') {
            rawBitsSelection = document.getElementById(TXT.ID.keygen_bits_dh).value;
        }

        // Split custom arguments by semicolon for multi-stage fields
        const customArgsArray = rawCustom.split(';');

        let currentPkiStep = (active_mode === 'pki') ? 1 : 0;
        let backendType = active_mode;

        if (active_mode === 'tls') {
            backendType = 'tls-crypt';
        } else if (active_mode === 'pki') {
            backendType = 'ca';
        }

        // Use the full line if no semicolon exists
        const step1Custom = (customArgsArray && customArgsArray[0]) ? customArgsArray[0].trim() : rawCustom;

        // Parse RSA and ECC bits matrix
        let caBits = '2048';
        let bits = '2048';

        if (active_mode === 'pki') {
            if (rawBitsSelection === 'rsa2048_ec') {
                caBits = '2048';
                bits = 'ec';
            } else if (rawBitsSelection === 'rsa4096_ec') {
                caBits = '4096';
                bits = 'ec';
            } else if (rawBitsSelection === 'ec') {
                caBits = 'ec'; // Pure ECC mode
                bits = 'ec';
            } else {
                // Pure RSA modes (2048 or 4096)
                caBits = rawBitsSelection;
                bits = rawBitsSelection;
            }
        } else {
            // Standalone DH mode uses numeric bits directly
            bits = rawBitsSelection;
        }

        // Trigger the background generator action
        L.fs.exec(TXT.DIR.init_d_openvpn, [TXT.CMD.keygen, backendType, instance_id, caBits, days, step1Custom]);

        // Start polling configuration
        let pollCount = 0;
        let accumulatedPkiLog = '';
        if (active_mode === 'pki') {
            accumulatedPkiLog = TXT.ICON.arrow + TXT.KEYGEN.pki_step1 + '\n';
            modalTextArea.value = accumulatedPkiLog;
        } else {
            modalTextArea.value = TXT.ICON.arrow + TXT.KEYGEN.running + '\n';
        }

        const logPollerInterval = setInterval(function () {
            pollCount++;

            // Read the active log file
            L.fs.read(TXT.FILE.openvpn_keygen_log).then(function (logContent) {
                if (logContent && logContent.trim() !== '') {
                    // Replace text prefix with terminal icon
                    const beautifiedLog = logContent.replace(/\[CMD\]/g, TXT.ICON.laptop);

                    modalTextArea.value = accumulatedPkiLog + beautifiedLog;
                    modalTextArea.scrollTop = modalTextArea.scrollHeight;

                    // Check if current phase finished successfully
                    if (logContent.lastIndexOf(TXT.KEYGEN.log_id_workflow_sucessful) !== -1) {

                        let targetTmpFile = 'dh';
                        if (backendType === 'ca') {
                            targetTmpFile = 'ca';
                        } else if (backendType === 'server-key') {
                            targetTmpFile = 'server-key';
                        } else if (backendType === 'server-cert') {
                            targetTmpFile = 'server-cert';
                        } else if (backendType === 'tls-crypt') {
                            targetTmpFile = 'tls';
                        }

                        // Read the generated key file from RAM
                        L.fs.read(TXT.FILE.temp_openvpn_keygen + targetTmpFile + '.tmp').then(function (finalAsset) {
                            if (!finalAsset || finalAsset.trim() === '') {
                                return;
                            }

                            const finalBeautifiedLog = beautifiedLog.replace(TXT.KEYGEN.log_id_workflow_sucessful, '').trim();

                            if (active_mode === 'pki') {
                                if (currentPkiStep === 1) {
                                    pki_payload.ca = finalAsset;

                                    // Save CA cert with 0644 permissions
                                    L.fs.write(TXT.DIR.keys + 'ca_' + instance_id + '.crt', pki_payload.ca, 420).then(function () {
                                        currentPkiStep = 2;
                                        backendType = 'server-key';
                                        accumulatedPkiLog += finalBeautifiedLog + TXT.KEYGEN.log_separator_line + TXT.ICON.arrow + TXT.KEYGEN.pki_step2 + '\n';

                                        const step2Custom = (customArgsArray && customArgsArray[1]) ? customArgsArray[1].trim() : '';

                                        // Start Step 2: Server Private Key
                                        L.fs.exec(TXT.DIR.init_d_openvpn, [TXT.CMD.keygen, backendType, instance_id, bits, days, step2Custom]);
                                    });

                                } else if (currentPkiStep === 2) {
                                    pki_payload.key = finalAsset;
                                    currentPkiStep = 3;
                                    backendType = 'server-cert';
                                    accumulatedPkiLog += finalBeautifiedLog + TXT.KEYGEN.log_separator_line + TXT.ICON.arrow + TXT.KEYGEN.pki_step3 + '\n';;

                                    const step3Custom = (customArgsArray && customArgsArray[2]) ? customArgsArray[2].trim() : step1Custom;

                                    // Start Step 3: Server Certificate
                                    L.fs.exec(TXT.DIR.init_d_openvpn, [TXT.CMD.keygen, backendType, instance_id, bits, days, step3Custom]);

                                } else if (currentPkiStep === 3) {
                                    pki_payload.cert = finalAsset;
                                    clearInterval(logPollerInterval);
                                    is_generated = true;

                                    // Render final PKI output matrix
                                    modalTextArea.value = accumulatedPkiLog + finalBeautifiedLog + '\n\n' +
                                        TXT.ICON.success + ' ' + TXT.KEYGEN.pki_success + '\n\n' +
                                        '--- ca_' + instance_id + '.crt ---\n' + pki_payload.ca + '\n\n' +
                                        '--- server_' + instance_id + '.key ---\n' + pki_payload.key + '\n\n' +
                                        '--- server_' + instance_id + '.crt ---\n' + pki_payload.cert + '\n';
                                }
                            } else {
                                // Clear interval and render standalone DH or TLS output
                                clearInterval(logPollerInterval);
                                single_payload = finalAsset;
                                is_generated = true;

                                modalTextArea.value = accumulatedPkiLog + finalBeautifiedLog + TXT.KEYGEN.log_separator_line + single_payload;
                            }
                        });
                    }

                    // Stop interval if an error token is detected
                    if (logContent.indexOf(TXT.KEYGEN.log_id_error) !== -1) {
                        clearInterval(logPollerInterval);
                    }
                }

                // Stop polling on timeout thresholds
                if (pollCount > 3000) {
                    clearInterval(logPollerInterval);
                    modalTextArea.value += '\n' + TXT.KEYGEN.error_polling_threshold;
                }

            }).catch(function () {
                // Ignore folder initialization lag
            });
        }, 200);

    });


    const modalSaveBtn = E('button', {
        'class': 'cbi-button cbi-button-save',
        'style': 'margin-right:10px;'
    }, TXT.BTN.save_config);

    modalSaveBtn.addEventListener('click', function () {
        if (!is_generated) {
            modalTextArea.value += '\n' + TXT.ICON.warning + TXT.KEYGEN.error_no_data_to_save;
            modalTextArea.scrollTop = modalTextArea.scrollHeight;
            return;
        }

        modalSaveBtn.disabled = true;

        if (active_mode === 'pki') {
            // Write PKI certificates and keys sequentially to disk
            L.fs.write(TXT.DIR.keys + 'ca_' + instance_id + '.crt', pki_payload.ca.trim() + '\n').then(function () {
                return L.fs.write(TXT.DIR.keys + 'server_' + instance_id + '.key', pki_payload.key.trim() + '\n');
            }).then(function () {
                return L.fs.write(TXT.DIR.keys + 'server_' + instance_id + '.crt', pki_payload.cert.trim() + '\n');
            }).then(function () {
                // FIXED: Mark save context successful, clear memory markers, and update log text
                hasSaved = true;
                is_generated = false;
                modalTextArea.value += '\n\n' + TXT.ICON.save + TXT.KEYGEN.pki_saved;
                modalTextArea.scrollTop = modalTextArea.scrollHeight;
            }).catch(function (err) {
                modalSaveBtn.disabled = false;
                modalTextArea.value += '\n' + TXT.ICON.error + TXT.KEYGEN.disk_err + ' ' + err.message;
                modalTextArea.scrollTop = modalTextArea.scrollHeight;
            });
        } else {
            // Write standalone DH or TLS assets to disk
            const targetFile = (active_mode === 'dh') ? 'dh_' + instance_id + '.pem' : 'tls-crypt_' + instance_id + '.key';

            L.fs.write(TXT.DIR.keys + targetFile, single_payload.trim() + '\n').then(function () {
                // FIXED: Mark save context successful, clear memory markers, and update log text
                hasSaved = true;
                is_generated = false;
                modalTextArea.value += '' + TXT.ICON.save + TXT.KEYGEN.file_saved + ' ' + targetFile;
                modalTextArea.scrollTop = modalTextArea.scrollHeight;
            }).catch(function (err) {
                modalSaveBtn.disabled = false;
                modalTextArea.value += '\n' + TXT.ICON.error + TXT.KEYGEN.disk_err + ' ' + err.message;
                modalTextArea.scrollTop = modalTextArea.scrollHeight;
            });
        }
    });


    const modalCloseBtn = E('button', { 'class': 'cbi-button cbi-button-neutral' }, TXT.BTN.close);
    modalCloseBtn.addEventListener('click', function () {
        if (is_generated && !window.confirm(TXT.KEYGEN.warn_close)) return;

        L.ui.hideModal();

        if (hasSaved) {
            showSaveApplyOpenVPN(instance_id);
        }
    });

    L.ui.showModal(TXT.KEYGEN.title_main + ' (' + displayId + ')', [
        E('div', { 'class': 'cbi-map' }, [
            E('div', { 'class': 'cbi-section' }, [
                warnContainer,
                optionsContainer,

                // Group block for custom CLI parameter extensions
                E('div', { 'style': 'margin-top:20px; padding:0 10px;' }, [
                    E('label', {
                        'class': 'cbi-value-title',
                        'style': 'display:block; font-weight:bold; margin-bottom:5px; float:none; text-align:left; width:100%;'
                    }, [TXT.KEYGEN.custom_cli]),
                    E('div', { 'style': 'width:100%;' }, [customCliInput]),
                ]),

                // Group block for real-time progress text output
                E('div', { 'style': 'margin-top:20px; padding:0 10px;' }, [
                    E('label', {
                        'class': 'cbi-value-title',
                        'style': 'display:block; font-weight:bold; margin-bottom:8px; float:none; text-align:left; width:100%;'
                    }, [TXT.KEYGEN.progress]),
                    E('div', { 'style': 'width:100%;' }, [modalTextArea])
                ]),

                E('div', { 'style': 'text-align:right; margin-top:20px;' }, [modalGenBtn, modalSaveBtn, modalCloseBtn])
            ])
        ])
    ]);

    updateKeyStrengthDropdowns();
    updateCustomCliPlaceholder();
};


/*
 * --- OPENVPN INSTANCES  ---
 */


/**
 * Renders the control row with Show, Download, and Upload buttons for the key files
 */
const renderKeyButtons = function (label, filename, instance_id, displayId, default_key) {
    const randId = 'file_' + filename.replace(/\./g, '_');
    const fileInput = E('input', { 'type': 'file', 'id': randId, 'style': 'display:none;' });

    const showBtn = E('button', {
        'class': 'cbi-button cbi-button-apply important',
        'style': 'margin: 0 0 0 4px; text-shadow:none !important; box-shadow:none !important;'
    }, TXT.BTN.show);

    const downloadBtn = E('button', {
        'class': 'cbi-button cbi-button-save',
        'style': 'margin: 0 0 0 4px;'
    }, TXT.BTN.download);

    const uploadBtn = E('label', {
        'for': randId,
        'class': 'cbi-button cbi-button-neutral',
        'style': 'margin: 0 0 0 4px;'
    }, TXT.BTN.upload);

    const statusMsg = E('span', { 'style': 'font-weight:bold; margin-left:10px; font-size:11px;' }, '');

    // upload key
    fileInput.addEventListener('change', function (ev) {
        const files = ev.target.files;
        if (!files || files.length === 0) return;

        uploadBtn.classList.add('disabled');
        statusMsg.textContent = TXT.STATUS.saving;
        statusMsg.className = 'text-warning';
        const realPath = TXT.DIR.keys + filename;
        const tmpFilename = filename + '.tmp';
        const tmpPath = TXT.DIR.keys + tmpFilename;

        const reader = new FileReader();
        reader.onload = function (e) {

            // Step A: upload to .tmp file
            L.fs.write(tmpPath, e.target.result)
                .then(function () {
                    // Step B: check keymeta of .tmp file
                    return L.fs.exec(TXT.DIR.init_d_openvpn, ['keymeta', tmpFilename]);
                })
                .then(function (res) {
                    if (res && res.code === 0 && res.stdout && res.stdout.trim() !== '') {
                        const rawMeta = res.stdout;

                        // 1. timout or corrupted
                        if (rawMeta.indexOf('ERROR') !== -1) {
                            // remove .tmp file from flash mem
                            L.fs.remove(tmpPath);
                            statusMsg.className = 'text-danger';
                            statusMsg.textContent = TXT.ICON.error + ' ' + TXT.MSG.uploaded_file_invalid;
                            uploadBtn.classList.remove('disabled');
                            return Promise.reject(new Error(TXT.MSG.key_verification_failed));
                        }

                        let typeMismatch = false;

                        if (default_key === TXT.KEY.ca_def_crt || default_key === TXT.KEY.server_def_crt) {
                            if (rawMeta.indexOf('Public-Key') === -1) typeMismatch = true;
                        } else if (default_key === TXT.KEY.server_def_key) {
                            if (rawMeta.indexOf('Private-Key') === -1) typeMismatch = true;
                        } else if (default_key === TXT.KEY.dh_def_pem) {
                            if (rawMeta.indexOf('DH Parameters') === -1 && rawMeta.indexOf('bit') === -1) typeMismatch = true;
                        } else if (default_key === TXT.KEY.tls_def_key) {
                            if (rawMeta.indexOf('Symmetric Static Secret') === -1) typeMismatch = true;
                        }

                        // 2. key type mismatch
                        if (typeMismatch) {
                            // remove .tmp file from flash mem
                            L.fs.remove(tmpPath);
                            statusMsg.className = 'text-danger';
                            statusMsg.textContent = TXT.ICON.error + ' ' + _('Wrong key type! Please upload the correct cryptographic file.');
                            uploadBtn.classList.remove('disabled');
                            return Promise.reject(new Error('Key type mismatch'));
                        }
                    }

                    // Step C: key file ok
                    return L.fs.read(tmpPath).then(function (verifiedBlob) {
                        return L.fs.write(realPath, verifiedBlob).then(function () {
                            // Instantly remove the intermediate staging node from storage
                            return L.fs.remove(tmpPath);
                        });
                    });
                })
                .then(function () {
                    statusMsg.className = 'text-success';
                    statusMsg.textContent = TXT.ICON.success + TXT.INFO.saved + ' ' + TXT.ICON.warning + TXT.BTN.click_save_apply;

                    showSaveApplyOpenVPN(instance_id);

                    return Promise.resolve();
                })
                .catch(function (err) {
                    if (err.message !== TXT.MSG.key_verification_failed && err.message !== TXT.MSG.key_type_mismatch) {
                        statusMsg.className = 'text-danger';
                        statusMsg.textContent = TXT.ICON.error + TXT.INFO.error + ' ' + err.message;
                    }
                })
                .finally(function () {
                    uploadBtn.classList.remove('disabled');
                });
        };

        reader.readAsText(files[0]);
    });

    // show key
    showBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        openKeyEditorModal(filename, instance_id, displayId);
    });

    // download key
    downloadBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        L.resolveDefault(L.fs.read(TXT.DIR.keys + filename), '').then(function (content) {
            if (!content) {
                if (L.ui && L.ui.addNotification) {
                    L.ui.addNotification(null, E('p', TXT.MSG.keyfile_not_exist), 'warning');
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
            showBtn, downloadBtn, uploadBtn, fileInput, statusMsg
        ])
    ]);
};


/**
 * Extracts the OpenVPN port from configuration text.
 */
const parsePortFromConfig = function (role, content) {
    if (!content) return null;

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        // Skip empty lines and comments
        if (line.length === 0 || line.charAt(0) === '#' || line.charAt(0) === ';') {
            continue;
        }

        // Strip inline comments from line ends
        const hashIdx = line.indexOf('#');
        if (hashIdx !== -1) {
            line = line.substring(0, hashIdx).trim();
        }

        const semiIdx = line.indexOf(';');
        if (semiIdx !== -1) {
            line = line.substring(0, semiIdx).trim();
        }

        // Split spaces or tabs into clean tokens
        const tokens = line.split(/\s+/);
        if (tokens.length < 2) {
            continue;
        }

        const directive = tokens[0].toLowerCase();

        // Server profile: 'port [number]' syntax
        if (role === 'server' && directive === 'port') {
            const portNum = parseInt(tokens[1], 10);
            if (!isNaN(portNum) && portNum > 0 && portNum <= 65535) {
                return portNum;
            }
        }

        // Client profile: 'remote [host] [port]' syntax
        if (role === 'client' && directive === 'remote' && tokens.length >= 3) {
            const portNum = parseInt(tokens[2], 10);
            if (!isNaN(portNum) && portNum > 0 && portNum <= 65535) {
                return portNum;
            }
        }
    }

    return null;
};

/**
 * Checks if an OpenVPN instance is enabled.
 */
const isInstanceEnabled = function (id) {
    return L.uci.get(TXT.CMD.openvpn, id, 'enabled') === '1';     // id = instance1, instance2, ...
};

/**
 * Calculates the default port from the instance id
 */
const getPortFromId = function (instance_id) {
    const numMatch = instance_id.match(/\d+$/);      // instance_id = instance1, instance2, ...
    const instNum = numMatch ? parseInt(numMatch, 10) : 1;
    return TXT.CFG.vpn_port_int - 1 + instNum;
};

/**
 * Creates or updates the inbound firewall rule for an OpenVPN instance.
 */
const syncInstanceFirewallRule = function (role, instance_id, customPort) {
    const fwRuleSection = 'openvpn_rule_' + instance_id;
    let targetPort = customPort;

    // Use default port fallback if no custom port is provided
    if (!targetPort || isNaN(targetPort)) {
        targetPort = getPortFromId(instance_id);
    }

    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

    // Add or overwrite the dedicated firewall rule section
    L.uci.add(TXT.CMD.firewall, 'rule', fwRuleSection);
    L.uci.set(TXT.CMD.firewall, fwRuleSection, 'name', 'OpenVPN-' + roleLabel + '-' + instance_id);
    L.uci.set(TXT.CMD.firewall, fwRuleSection, 'src', 'wan');
    L.uci.set(TXT.CMD.firewall, fwRuleSection, 'dest_port', String(targetPort));
    L.uci.set(TXT.CMD.firewall, fwRuleSection, 'proto', 'udp');
    L.uci.set(TXT.CMD.firewall, fwRuleSection, 'target', 'ACCEPT');
};

/**
 * Purges a custom unique inbound firewall rule for a specific OpenVPN profile.
 */
const removeInstanceFirewallRule = function (instance_id) {
    L.uci.remove(TXT.CMD.firewall, 'openvpn_rule_' + instance_id);
};

/**
 * Saves the modified configuration text and handles the instance restart logic.
 */
const handleInstanceSave = function (instance_id, role, txtArea, sBtn, sNotice, originalConfContent, modificationBoxNode) {
    const newConfigContent = txtArea.value.trim() + '\n';
    const cleanOriginal = String(originalConfContent || '').trim() + '\n';
    const originalButtonText = sBtn.textContent;

    // Abort if no changes occurred
    if (newConfigContent === cleanOriginal) {
        sBtn.disabled = true;
        sBtn.textContent = TXT.ICON.info + TXT.STATUS.no_changes_detected;

        setTimeout(function () {
            sBtn.disabled = false;
            sBtn.textContent = originalButtonText;
        }, 1500);
        return;
    }

    sBtn.disabled = true;
    sBtn.textContent = TXT.ICON.loading + TXT.INFO.creating;

    let setFirewallRules = false;
    let currentPort = parsePortFromConfig(role, originalConfContent);

    if (!currentPort || isNaN(currentPort)) {
        currentPort = getPortFromId(instance_id);
    }

    const detectedPort = parsePortFromConfig(role, newConfigContent);
    if (currentPort !== detectedPort && detectedPort && !isNaN(detectedPort)) {
        setFirewallRules = true;
    }

    const isCurrentlyEnabled = isInstanceEnabled(instance_id);
    if (setFirewallRules || isCurrentlyEnabled) {
        if (sNotice) {
            sNotice.style.display = 'inline-block';
        }
    }

    // Write the configuration file directly to disk
    L.fs.write(TXT.DIR.openvpn + instance_id + TXT.CFG.pconf, newConfigContent).then(function () {

        if (setFirewallRules) {
            syncInstanceFirewallRule(role, instance_id, detectedPort);
        }

        // Trigger changes window and restart workflow if needed
        if (setFirewallRules || isCurrentlyEnabled) {
            showSaveApplyOpenVPN(instance_id);
        } else {
            // Save silently if instance is inactive and no port changed
            if (modificationBoxNode && typeof modificationBoxNode.setAttribute === 'function') {
                modificationBoxNode.setAttribute('data-original-content', newConfigContent);
            }
        }
        return Promise.resolve();
    }).then(function () {
        sBtn.textContent = TXT.ICON.success + TXT.INFO.saved;
    }).catch(function (err) {
        console.error(TXT.MSG.failed_write_openvpn_config + instance_id + ':', err);
        sBtn.textContent = TXT.ICON.error + TXT.INFO.error;
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
 * Deletes an OpenVPN instance and its firewall rules
 */
const handleInstanceDeletion = function (instance_id, displayId, dBtn, dNotice, sectionRootNode) {
    if (window.confirm(TXT.MSG.confirm_del + displayId + '?')) {
        dBtn.disabled = true;
        dNotice.style.display = 'inline-block';

        L.ui.changes.init().then(function () {
            L.uci.remove(TXT.CMD.openvpn, instance_id);
            removeInstanceFirewallRule(instance_id);
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
            console.error(TXT.MSG.failed_delete_openvpn_instance + instance_id + ':', err);
        }).finally(function () {
            dNotice.style.display = 'none';
            dBtn.disabled = false;
        });
    }
};

/**
 * Renders the configuration box for a single OpenVPN instance.
 */
const renderInstanceBox = function (s, idx, instances, currentVisualState) {
    const instance_id = s['.name'];
    let instObj = {};

    if (Array.isArray(instances)) {
        for (let i = 0; i < instances.length; i++) {
            if (instances[i].id === instance_id) {
                instObj = instances[i];
                break;
            }
        }
    }

    const role = instObj.role || 'server';
    const confContent = instObj.confContent || '';
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

    const numMatch = instance_id.match(/\d+$/);
    const instNum = numMatch ? parseInt(numMatch, 10) : (idx + 1);

    const displayId = TXT.STATUS.instance_x + instNum;
    const sectionHeadingText = displayId + ' - ' + roleLabel;

    const keygenBtn = E('button', {
        'class': 'cbi-button cbi-button-apply important',
        'style': 'float: right; margin: 10px 10px 0 0;'
    }, TXT.KEYGEN.btn);

    keygenBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        openKeyGenModal(instance_id, displayId, role);
    });

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
    }, TXT.ICON.warning + ' ' + TXT.BTN.click_save_apply);

    const dNotice = E('span', {
        'class': 'text-danger',
        'style': 'font-weight:bold; font-size:12px; display:none;'
    }, TXT.ICON.warning + ' ' + TXT.BTN.click_save_apply);

    const dBtn = E('button', {
        'class': 'btn cbi-button cbi-button-remove',
        'style': 'float:right;'
    }, TXT.BTN.del_instance);

    // Build the main container node
    const sectionRootNode = E('div', {
        'class': 'cbi-section',
        'id': 'modification_section_' + instance_id,
        'style': 'margin-bottom:25px; padding:25px 0 0 0; border:none; border-top:1px solid var(--border-color, #ced6e0); position:relative;'
    }, [
        E('h3', { 'style': 'margin:0 0 20px 0; font-weight:bold; font-size:16px; border-bottom:1px solid var(--border-color, #e2e8f0); padding-bottom:5px; color:var(--text-color, #334155)' }, sectionHeadingText),

        E('fieldset', { 'class': 'cbi-section-fieldset', 'style': 'margin-bottom:25px; padding:15px; border:1px solid var(--border-color, #cbd5e1); border-radius:4px; background:var(--background-color, transparent);' }, [
            E('legend', { 'style': 'font-weight:bold; font-size:13px; padding:0 8px; color:var(--text-color, #334155);' }, TXT.MSG.openvpn_keys),
            E('div', { 'class': 'cbi-section-node', 'style': 'padding:0 5px;' }, [
                // Clean ES5 compliant single-quote string concatenation
                renderKeyButtons(TXT.STATUS.key_info_ca + '(ca_' + instance_id + '.crt)', 'ca_' + instance_id + '.crt', instance_id, displayId, TXT.KEY.ca_def_crt),
                renderKeyButtons(TXT.STATUS.key_info_serever_crt + '(server_' + instance_id + '.crt)', 'server_' + instance_id + '.crt', instance_id, displayId, TXT.KEY.server_def_crt),
                renderKeyButtons(TXT.STATUS.key_info_server_key + '(server_' + instance_id + '.key)', 'server_' + instance_id + '.key', instance_id, displayId, TXT.KEY.server_def_key),

                // Show DH button only if instance is a server profile
                role === 'server' ? renderKeyButtons(TXT.STATUS.key_info_hd + '(dh_' + instance_id + '.pem)', 'dh_' + instance_id + '.pem', instance_id, displayId, TXT.KEY.dh_def_pem) : '',
                renderKeyButtons(TXT.STATUS.key_info_tls + '(tls-crypt_' + instance_id + '.key)', 'tls-crypt_' + instance_id + '.key', instance_id, displayId, TXT.KEY.tls_def_key),
                keygenBtn
            ])
        ]),

        E('fieldset', { 'class': 'cbi-section-fieldset', 'style': 'margin-bottom:20px; padding:15px; border:1px solid var(--border-color, #cbd5e1); border-radius:4px; background:var(--background-color, transparent);' }, [
            E('legend', { 'style': 'font-weight:bold; font-size:13px; padding:0 8px; color:var(--text-color, #334155);' }, TXT.MSG.edit_config),
            E('div', { 'class': 'class_text_descr', 'style': 'margin-bottom:12px; font-style:italic; padding-left:2px;' }, '(' + TXT.DIR.openvpn + instance_id + TXT.CFG.pconf + ')'),
            E('div', { 'style': 'padding:0 2px;' }, [txtArea])
        ]),

        E('div', { 'style': 'width:100%; display:block; margin-top:20px; overflow:hidden;' }, [sBtn, cNotice, dNotice, dBtn])
    ]);

    // Save original content for difference tracking
    sectionRootNode.setAttribute('data-original-content', confContent);

    sBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        const freshOriginalText = sectionRootNode.getAttribute('data-original-content') || '';
        handleInstanceSave(instance_id, role, txtArea, sBtn, cNotice, freshOriginalText, sectionRootNode);
    });

    dBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        handleInstanceDeletion(instance_id, displayId, dBtn, dNotice, sectionRootNode);
    });

    return sectionRootNode;
};

/**
 * Generates and registers a new OpenVPN profile instance using shared file sync.
 */
const addNewInstance = function (roleType, sections, viewData, btnNode, noticeNode) {
    const numMatch = (sections && sections.length > 0) ? sections[sections.length - 1]['.name'].match(/\d+$/) : null;
    const nextNum = numMatch ? (parseInt(numMatch, 10) + 1) : 1;
    const nextId = 'instance' + nextNum;

    if (btnNode) btnNode.disabled = true;
    if (noticeNode) noticeNode.style.display = 'inline-block';

    // FIXED: Radical simplification. syncInstanceFiles automatically triggers initFile,
    // which generates and writes the perfect configuration template on disk.
    return syncInstanceFiles(nextId, nextNum, roleType, viewData).then(function () {
        L.uci.add(TXT.CMD.openvpn, TXT.CMD.openvpn, nextId);

        let targetEnabledState = '0';
        if (sections) {
            if (sections.length === 0) {
                targetEnabledState = '1'; // Enable the first new instance automatically
            } else {
                const lastActiveId = sections[sections.length - 1]['.name'];
                if (isInstanceEnabled(lastActiveId)) {
                    targetEnabledState = '1'; // Match state if openvpn is active
                }
            }
        }

        L.uci.set(TXT.CMD.openvpn, nextId, 'enabled', targetEnabledState);
        L.uci.set(TXT.CMD.openvpn, nextId, 'role', roleType);
        L.uci.set(TXT.CMD.openvpn, nextId, 'config', TXT.DIR.openvpn + nextId + TXT.CFG.pconf);

        // Sync firewall rules for the new instance
        syncInstanceFirewallRule(roleType, nextId, null);

        L.uci.save();
        return Promise.resolve();
    }).then(function () {
        // Initialize LuCI changes tracker
        if (L.ui && L.ui.changes && typeof L.ui.changes.init === 'function') {
            return L.ui.changes.init();
        }
    }).then(function () {
        if (L.ui && L.ui.changes && typeof L.ui.changes.displayChanges === 'function') {
            L.ui.changes.displayChanges();
        }
    }).catch(function (err) {
        console.error(TXT.MSG.failed_create_openvpn_instance + nextId + ':', err.message);
    }).finally(function () {
        if (btnNode) btnNode.disabled = false;
    });
};

/**
 * Renders the creation box containing buttons to add new profiles.
 */
const renderInstanceCreationBox = function (sections, viewData, initialRawState) {
    const addServerBtn = E('button', { 'class': 'btn cbi-button cbi-button-positive important' }, TXT.BTN.add_server);
    const addClientBtn = E('button', { 'class': 'btn cbi-button cbi-button-action important' }, TXT.BTN.add_client);

    const addServerNotice = E('span', { 'class': 'text-danger', 'style': 'font-weight:bold; margin-left:10px; display:none;' }, TXT.ICON.warning + ' ' + TXT.BTN.click_save_apply);
    const addClientNotice = E('span', { 'class': 'text-danger', 'style': 'font-weight:bold; margin-left:10px; display:none;' }, TXT.ICON.warning + ' ' + TXT.BTN.click_save_apply);

    addServerBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        addNewInstance('server', sections, viewData, addServerBtn, addServerNotice);
    });

    addClientBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        addNewInstance('client', sections, viewData, addClientBtn, addClientNotice);
    });

    return E('div', { 'class': 'cbi-map' }, [
        E('div', { 'class': 'cbi-section' }, [
            E('h3', { 'style': 'color:var(--text-color, #334155); font-weight:bold;' }, TXT.STATUS.title_instance),
            E('div', { 'style': 'margin-top:10px; display:flex; align-items:center; flex-wrap:wrap; gap:10px;' }, [
                E('div', { 'style': 'display:inline-flex; align-items:center;' }, [addServerBtn, addServerNotice]),
                E('div', { 'style': 'display:inline-flex; align-items:center;' }, [addClientBtn, addClientNotice])
            ])
        ])
    ]);
};


/*
 * --- FIREWALL & LOG VIEW  ---
 */


/**
 * Renders the firewall information box displaying active ports.
 */
const renderFirewallInfoBox = function () {
    const customPortsMap = {};
    const allRules = L.uci.sections(TXT.CMD.firewall, 'rule') || [];

    // Scan all active openvpn firewall sections dynamically
    allRules.forEach(function (r) {
        const sectionName = r['.name'] || '';
        if (sectionName.indexOf('openvpn_') === 0 || sectionName.indexOf('openvpn_rule_') === 0) {
            const pVal = L.uci.get(TXT.CMD.firewall, sectionName, 'dest_port');
            let protoVal = L.uci.get(TXT.CMD.firewall, sectionName, 'proto') || 'udp';

            if (pVal) {
                const pNum = parseInt(pVal, 10);
                if (!isNaN(pNum)) {
                    protoVal = String(protoVal).toUpperCase();
                    // Store combined proto + port token to handle dual-stacks seamlessly
                    customPortsMap[protoVal + ' ' + pNum] = true;
                }
            }
        }
    });

    const activeRulesArray = Object.keys(customPortsMap).sort();

    return E('fieldset', {
        'class': 'class_fieldset',
        'style': 'margin-top:5px; padding:15px; border:1px solid var(--border-color, #cbd5e1); border-radius:4px; background:var(--background-color, #fafafa);'
    }, [
        E('legend', { 'style': 'font-weight:bold; font-size:13px; padding:0 8px; color:var(--text-color, #334155);' }, TXT.FIREWALL.firewall_info),
        E('p', { 'style': 'margin:0; font-size:13px; line-height:1.6; color:var(--text-color, #334155);' }, [
            E('strong', {}, TXT.ICON.check + TXT.FIREWALL.automated_zone_setup), TXT.FIREWALL.secure_firewall_for_all,
            E('code', { 'title': TXT.FIREWALL.openvpn_tunnel_interface, 'style': 'cursor:help; border-bottom:1px dashed var(--text-color-light, #64748b);' }, 'tun+'), TXT.FIREWALL.devices_autocreated,
            E('div', { 'style': 'margin-top: 8px;' }),
            E('strong', {}, TXT.ICON.check + TXT.FIREWALL.inbound_access), TXT.FIREWALL.wan_ports, activeRulesArray.length > 0 ? E('code', {}, activeRulesArray.join(', ')) : E('code', {}, 'None'), TXT.FIREWALL.auto_open_secure_connection,
            E('div', { 'style': 'margin-top: 8px;' }),
            E('strong', {}, TXT.ICON.hint + TXT.FIREWALL.check_traffic_rules), TXT.FIREWALL.network, TXT.ICON.arrow, TXT.FIREWALL.firewall,
            E('a', { 'href': L.url('admin/network/firewall/rules'), 'style': 'font-weight:bold; color:var(--action-bg, #00a8ff); text-decoration:none;' }, TXT.ICON.next + TXT.FIREWALL.traffic_rules)
        ])
    ]);
};

/**
 * Filters the visible logs by saving a timestamp cutoff in session storage.
 */
const handleLogFilter = function (clearLogBtn, logTextArea) {
    clearLogBtn.disabled = true;
    clearLogBtn.textContent = TXT.ICON.loading + TXT.INFO.clearing;

    callLogRead({ pattern: TXT.CMD.openvpn }).then(function (plainText) {
        if (plainText) {
            const lines = String(plainText).trim().split('\n');
            if (lines.length > 0) {
                const lastEntry = lines[lines.length - 1];
                if (lastEntry) {
                    sessionStorage.setItem(TXT.ID.openvpn_log_stamp, lastEntry.substring(0, 24));
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
 * Renders the terminal box for the OpenVPN protocol log output.
 */
const renderLogBox = function (logLines) {
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

    // Bind the timestamp filter logic on button click
    clearLogBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        handleLogFilter(clearLogBtn, logTextArea);
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
 * Filters log lines based on the session storage timestamp.
 */
const parseLogLines = function (viewData) {
    if (!viewData.logread) return '';

    const allLines = String(viewData.logread).trim().split('\n');
    const targetStamp = sessionStorage.getItem(TXT.ID.openvpn_log_stamp);

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


/*
 * --- LOCK SCREEN  ---
 */


/**
 * Renders the loading overlay for the initial default keys generation.
 */
const renderDefaultKeysOverlay = function (keysReady) {
    return E('div', {
        'id': TXT.ID.openvpn_keygen_overlay,
        'style': 'position:absolute; top:35px; left:0; width:100%; height:100%; padding:30px 15px; background:rgba(var(--background-color-rgb, 255, 255, 255), 0.9); z-index:9999; display:' + (keysReady ? 'none' : 'flex') + '; flex-direction:column; align-items:center; justify-content:flex-start; border-radius:4px;'
    }, [
        E('img', {
            'src': TXT.FILE.loading_img,
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

/**
 * Polls the system startup state until default crypto keys are fully ready.
 */
const pollDefaultKeysReady = function (sections, viewData, tableDOMContainer) {
    return loadSystemTelemetry(viewData).then(function () {
        const overlay = document.getElementById(TXT.ID.openvpn_keygen_overlay);

        if (viewData.keysReady) {
            if (overlay) {
                overlay.style.display = 'none';
            }
            L.Poll.stop(); // Stop the initial startup poll permanently
        } else if (overlay) {
            overlay.style.display = 'flex';
        }

        return updateLiveStatusTable(sections, viewData, tableDOMContainer);
    }).catch(function () {
        // Prevent lock screen freeze and stop polling during session drops
        const overlay = document.getElementById(TXT.ID.openvpn_keygen_overlay);
        if (overlay) {
            overlay.style.display = 'none';
        }
        L.Poll.stop();
    });
};


/*
 * --- VIEW ENTRYPOINT  ---
 */


/**
 * Main LuCI view extension wrapper (entrypoint)
 */
return view.extend({

    // Shared data container for the OpenVPN view context
    VIEW_DATA: {
        devData: '',
        uptime: 0,
        serverTemplate: '',
        clientTemplate: '',
        logread: '',
        keysReady: false
    },

    load: function () {
        L.uci.unload(TXT.CMD.openvpn);
        L.uci.unload(TXT.CMD.firewall);

        const viewData = this.VIEW_DATA;

        return Promise.all([
            L.uci.load(TXT.CMD.openvpn),
            L.uci.load(TXT.CMD.firewall)
        ]).then(function () {
            const sections = L.uci.sections(TXT.CMD.openvpn, TXT.CMD.openvpn) || [];

            if (sections.length === 0) {
                return loadSystemTelemetry(viewData).then(function () {
                    return initEmptyUciView();
                });
            }

            return Promise.resolve(sections);
        }).then(function (sections) {
            const safeSections = Array.isArray(sections) ? sections : [];
            return processPendingSessionTask(safeSections);
        }).then(function (sections) {
            const safeSections = Array.isArray(sections) ? sections : [];

            return loadSystemTelemetry(viewData).then(function () {
                return loadInstanceData(safeSections, viewData);
            }).then(function (instances) {
                return {
                    sections: safeSections,
                    instances: instances
                };
            });
        });
    },

    /**
     * Renders the main OpenVPN dashboard view.
     */
    render: function (data) {
        const safeData = data || {};
        const sections = safeData.sections || [];
        const viewData = this.VIEW_DATA;
        const instances = safeData.instances || [];
        const initialRawState = safeData.initialGlobalState || '0';
        const devDataRaw = String(viewData.devData || '').trim();

        const logLines = parseLogLines(viewData);
        const startupLockOverlay = renderDefaultKeysOverlay(viewData.keysReady);

        const masterServerBtn = E('button', { 'class': 'btn cbi-button cbi-button-positive important' }, TXT.BTN.add_server);
        const masterClientBtn = E('button', { 'class': 'btn cbi-button cbi-button-action important' }, TXT.BTN.add_client);

        // Dynamically build content block based on instance presence
        let middleSectionNode;

        if (sections.length === 0) {
            middleSectionNode = E('div', { 'class': 'cbi-map' }, [
                E('div', { 'class': 'cbi-section' }, [
                    E('h3', { 'style': 'color:var(--text-color, #334155); font-weight:bold;' }, TXT.STATUS.status),
                    E('div', { 'class': 'cbi-section-node' }, [
                        E('div', { 'class': 'alert-message info', 'style': 'margin:5px 0;' }, TXT.STATUS.no_vpn_configured)
                    ])
                ])
            ]);
        } else {
            const instanceSections = [];
            sections.forEach(function (s, idx) {
                instanceSections.push(renderInstanceBox(s, idx, instances, initialRawState));
            });

            const statusTable = E('div', { 'id': 'openvpn_live_table_wrapper' }, [
                renderStatusTable(instances, devDataRaw, parseFloat(viewData.uptime) || 0)
            ]);

            // Activate runtime interval polling strictly if sections exist
            L.Poll.add(L.bind(function () {
                return pollDefaultKeysReady(sections, viewData, statusTable);
            }, this), 5);

            // Combine live status table and instance modification rows sequentially
            middleSectionNode = E('div', {}, [
                E('div', { 'class': 'cbi-map' }, [
                    E('div', { 'class': 'cbi-section' }, [
                        E('h3', { 'style': 'color:var(--text-color, #334155); font-weight:bold;' }, TXT.STATUS.status),
                        E('div', { 'class': 'cbi-section-node' }, [statusTable])
                    ])
                ]),
                E('div', { 'class': 'cbi-section' }, instanceSections)
            ]);
        }

        // Return a unified, single, clean UI wrapper frame
        return E('div', { 'class': 'cbi-map', 'style': 'position:relative; min-height:300px;' }, [
            startupLockOverlay,

            E('div', { 'id': TXT.ID.main_control_box }, [
                renderMainControlBox(initialRawState, sections, masterServerBtn, masterClientBtn, instances, devDataRaw)
            ]),

            E('hr', { 'style': 'margin:15px 0; border:0; border-top:1px solid var(--border-color, #ced6e0);' }),

            middleSectionNode,

            E('hr', { 'style': 'margin:20px 0 30px 0; border:0; border-top:1px solid var(--border-color, #ced6e0);' }),
            renderInstanceCreationBox(sections, viewData, initialRawState),

            E('hr', { 'style': 'margin:25px 0 35px 0; border:0; border-top:1px solid var(--border-color, #ced6e0);' }),
            renderFirewallInfoBox(),

            E('hr', { 'style': 'margin:15px 0; border:0;' }),
            renderLogBox(logLines)
        ]);
    }

});



