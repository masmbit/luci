/*
 * Copyright (C) 2008-2026 The OpenWrt Project
 * Copyright (C) 2026 Manfred Jaider <masmbit@users.noreply.github.com>
 *
 * This is free software, licensed under the Apache License, Version 2.0.
 * See /LICENSE for more information.
 *
 * luci-app-openvpn : user interface for easy OpenVPN server and client configuration
 * /www/luci-static/resources/view/vpn/openvpn.js
 *
 * 1. --- TEXT & DEFINITIONS --- ....Global translations and system definitions
 * 2. --- HELPER & INIT --- ........ Router connections and file setup
 * 3. --- SAVE AND RESTART --- ..... UCI saving and instance restart logic
 * 4. --- OVPN PROFILES --- ........ Import and export .ovpn profiles
 * 5. --- MAIN VIEW --- ............ Main OpenVPN dashboard
 * 6. --- OPENVPN INSTANCES --- .... Instance settings and creation buttons
 * 7. --- FIREWALL & LOG VIEW --- .. Active ports info and system log box
 * 8. --- LOCK SCREEN --- .......... Startup loading overlay and pollers
 * 9. --- VIEW ENTRYPOINT --- ...... Main entry where the page is generated
 */

/* global E, URL, FileReader, Blob, sessionStorage, uqr, network */
'use strict';
'require uqr';
'require network';

const view = L.view;

/*
 * --- TEXT & DEFINITIONS ---
 */
const TXT = {
    INFO: {
        active: _('Active'),
        active_pids: _('Active PIDs: '),
        aggregated_rx: _('Aggregated RX: '),
        aggregated_tx: _('Aggregated TX: '),
        clearing: _('Clearing...'),
        connected: _('Connected: '),
        creating: _('Creating...'),
        disable: _('Disable'),
        disabled: _('Disabled'),
        download_profile: _('Download Profile'),
        enable: _('Enable'),
        enabled: _('Enabled: '),
        error: _('Error'),
        instance_x: _('Instance #'),
        instances: _('Instances: '),
        log_clear: _('Clear Log'),
        log_cleared: _('Log Cleared'),
        no: _('No'),
        no_changes_detected: _('No changes detected'),
        openvpn: _('OpenVPN'),
        pending: _('Pending...'),
        starting: _('Starting...'),
        status: _('Status'),
        title_instance: _('Instance Management'),
        title_log: _('LOG'),
        title_main: _('OpenVPN Server/Client'),
        type: _('Type'),
        wizard: _('Wizard'),
        yes: _('Yes')
    },
    BTN: {
        add_client: _('Add Client Instance'),
        add_server: _('Add Server Instance'),
        cancel: _('Cancel'),
        change: _('Change'),
        click_save_apply: _('Please click «Save & Apply».'),
        close: _('Close'),
        del_instance: _('Delete Instance'),
        del_ready: _('Deleted - Save & Apply'),
        download: _('Download'),
        download_ovpn: _('Download (.ovpn)'),
        enabled: _('Enabled'),
        generating: _('Generating...'),
        next: _('Next'),
        ok: _('OK'),
        processing: _('Processing...'),
        save_config: _('Save Config'),
        saving: _('Saving...'),
        saved: _('Saved'),
        show: _('Show'),
        upload: _('Upload'),
        use_fallback: _('Use Fallback')
    },
    MSG: {
        client_export: _('OpenVPN Client Export'),
        config_changed_reload: _('Configuration changed! Applying will temporarily restart the OpenVPN instance. Once the page has reloaded, click Apply a second time to complete the reactivation.'),
        confirm_del: _('Are you sure you want to delete '),
        download_only_available_window_open: _('Download and QR code link are only available while this window is open.'),
        edit_config: _('Edit Config file'),
        export_connection_address_qr_code: _('This is the address your VPN clients will use to connect from the internet. Scan the QR code with your phone camera or use the link below to download your connection profile.'),
        export_ovpn: _('Export (.ovpn)'),
        export_openvpn_connect_client_profile: _('Export OpenVPN Connect Client Profile'),
        import_ovpn: _('Import (.ovpn)'),
        import_openvpn_connect_client_profile: _('Import OpenVPN Connect Client Profile'),
        import_profile: _('Import Profile'),
        imported_client: _('Imported Client'),
        importing_profile: _('Importing profile...'),
        lan_to_lan_profile_selection: _('LAN-to-LAN Router Profile Selection'),
        manage_instance: _('Here you can manage multiple OpenVPN Server and Client instances dynamically.'),
        mobile_export: _('OpenVPN Connect Mobile Export'),
        no_active_log_entries: _('No active OpenVPN log entries found.'),
        no_vpn_configured: _('No OpenVPN instances configured yet. Use the buttons below to create an instance.'),
        no_vpn_log: _('No active OpenVPN log entries found.'),
        office_profile: _('Office Profile:'),
        placeholder_cn_mobile: _('e.g. my-smartphone'),
        please_assign_cn_name: _('Please assign a unique device name (Common Name) for this mobile profile:'),
        process_take_few_minutes: _('This automated initialization process can take a few minutes on your device...'),
        scan_qr_code_with_camera: _('Scan QR Code with Mobile Phone Camera:'),
        secure_temporary_profile_url: _('Secure Temporary Profile URL Field:'),
        select_profile_ovpn: _('Select Profile (.ovpn)'),
        select_remote_office_to_export: _('This server handles network rules for multiple remote offices. Please choose an existing office name or write a name to make a new connection profile.'),
        system_logs: _('System logs ...'),
        uploaded_file_invalid: _('Uploaded file is invalid or corrupt!'),
        vpn_client_address: _('VPN Client Connection Domain or Address:')
    },
    FIREWALL: {
        auto_open_secure_connection: _(' are opened automatically for secure OpenVPN connections.'),
        automated_zone_setup: _('Automated Zone Setup: '),
        check_traffic_rules: _('Check Traffic Rules: '),
        devices_autocreated: _(' devices is created automatically.'),
        firewall: _('Firewall '),
        firewall_info: _('Firewall & Routing Information'),
        inbound_access: _('Inbound Access: '),
        network: _('Network '),
        openvpn_tunnel_interface: _('OpenVPN tunnel interfaces (tun0, tun1, tun3, etc.)'),
        secure_firewall_for_all: _('A secure firewall zone for all '),
        traffic_rules: _('Traffic Rules'),
        wan_ports: _('WAN ports ')
    },
    KEY: {
        ca: _('Certification Authority'),
        client_certificate: _('Client Certificate'),
        client_connection_needs_server_key_and_config: _('A client connection needs the server keys and config. Select an .ovpn profile to import them automatically, or click Cancel to use the default settings.'),
        create_key_new_office: _('Create keys for a new office...'),
        dh: _('Diffie - Hellman Parameters'),
        key_verification_failed: _('Key verification failed'),
        keygen: _('KeyGen'),
        keygen_in_progress: _('Key generation in progress...'),
        keygen_wait: _('Please wait while secure cryptographic, router-unique default assets are being generated.'),
        keyfile_not_exist: _('Key file is empty or does not exist on disk yet.'),
        openvpn_keys: _('OpenVPN Keys'),
        please_select_valid_ovpn_profile: _('Please select a valid .ovpn file first or click cancel to utilize fallback keys.'),
        private_client_key: _('Private Client Key'),
        server_crt: _('Server Certificate'),
        server_key: _('Private Server Key'),
        tls: _('TLS Crypt Secret'),
    },
    WARNING: {
        import_parser_failed: _('Import Parser Failed: '),
        key_upload_nomatch: _('Warning: The uploaded file structure does not match the expected key type.'),
        key_upload_processing: _('Proceeding with invalid cryptographic keys will cause total connection failure and may lead to service instability or infinite daemon crash loops.'),
        key_upload_save_anyway: _('Do you want to proceed and save this file anyway?'),
        key_upload_title: _('Cryptographic Key Warning'),
        profile_link_without_qr_code: _('Profile link active (Native uqr framework (QR-Code) not loaded).'),
        reverting_to_fallback_config: _(' Reverting to fallback configuration.'),
        security_notice: _('Security Notice:')
    },
    ERROR: {
        build_profile: _('Failed to build profile: '),
        config_key_missing: _('Error: Configuration or cryptographic keys are missing on disk.'),
        invalid_file_parts_missing: _('Invalid file. Important parts are missing (CA, Cert, or Private Key).'),
        key_check_failed: _('Key check failed. One security key is broken or invalid.'),
        keygen_failed: _('Key generation failed.'),
        key_type_mismatch: _('Key type mismatch'),
        upload_key_empty: _('The uploaded file is empty.'),
        wrong_key_type: _('Wrong key type! Please upload the correct cryptographic file.')
    }
}

const CFG = Object.freeze({
    FILE: Object.freeze({
        dir_cfg: '/etc/openvpn/luci/',
        client_def_conf: 'client.default.conf',
        dir_keys: '/etc/openvpn/keys/',
        ca_def_crt: 'ca_default.crt',
        dh_def_pem: 'dh_default.pem',
        server_def_crt: 'server_default.crt',
        server_def_key: 'server_default.key',
        client_def_crt: 'client_default.crt',
        client_def_key: 'client_default.key',
        tls_def_key: 'tls-crypt_default.key',
        loading_img: '/luci-static/resources/icons/loading.svg',
        openvpn_keygen_lock: '/var/run/openvpn.keygen.lock',
        proc_net_dev: '/proc/net/dev',
        proc_uptime: '/proc/uptime',
        server_def_conf: 'server.default.conf',
        vpn_disabled_img: '/luci-static/resources/icons/tunnel_disabled.svg',
        vpn_enabled_img: '/luci-static/resources/icons/tunnel.svg'
    }),
    LIBEXEC: Object.freeze({
        luci_app_openvpn: '/usr/libexec/luci-app-openvpn',
        ovpnservice: 'ovpnservice',
        bestcrypto: 'bestcrypto',
        keymeta: 'keymeta',
        symlink: 'symlink',
        iroute: 'iroute',
        publicip: 'publicip',
        cleanipdns: 'cleanipdns',
        wgetddns: 'wgetddns',
        checkddns: 'checkddns',
        checkport: 'checkport',
        cleanup: 'cleanup',
        initkeys: 'initkeys'
    }),
    CMD: Object.freeze({
        openvpn: 'openvpn',
        firewall: 'firewall',
        logread: 'logread',
        mkdir: 'mkdir',
    }),
    ID: Object.freeze({
        main_control_box: 'main_control_box_luci_app_openvp',
        openvpn_pending_reactivation: 'openvpn_pending_reactivation',
        openvpn_keygen_overlay: 'openvpn_keygen_overlay',
        openvpn_log_stamp: 'openvpn_log_stamp'
    }),
    CONF: Object.freeze({
        modern_vpn_client: '# Modern OpenVPN Client Configuration Instance',
        modern_vpn_server: '# Modern OpenVPN Server Configuration Instance',
        remote_cert_tls_server: 'remote-cert-tls server',
        remote_cert_tls_server_comment: '#remote-cert-tls server',
        openvpn_instance1_status: 'openvpn.instance1.status',
        certificate_and_keys_comment: '# --- Certificates & Keys ---',
        data_ciphers_aes: 'data-ciphers AES-256-GCM:AES-128-GCM:CHACHA20-POLY1305',
        data_ciphers_chacha: 'data-ciphers CHACHA20-POLY1305:AES-256-GCM:AES-128-GCM',
        data_ciphers_comment: '# Prioritize CHACHA20 on devices without hardware AES acceleration',
        tcp_nodelay: 'tcp-nodelay',
        mssfix_1360: 'mssfix 1360'
    })
})

const ICON = Object.freeze({
    ARROW: '➔ ',
    CHECK: '✓ ',
    CHANGE: '✏️ ',
    OFFICE: '🏢 ',
    ERROR: '❌ ',
    PLUS: '➕ ',
    HINT: '💡 ',
    INFO: 'ℹ️ ',
    LOADING: '⏳ ',
    FORWARD: '➡️ ',
    SAVE: '💾 ',
    SUCCESS: '✅ ',
    WARNING: '⚠️ ',
    EXPORT: '📤 ',
    ROCKET: '🚀 ',
    POINT: '▪ ',
    BOX: '📦 ',
    MOBILE: '📱 ',
    IMPORT: '📥 ',
});

const OPENVPN = Object.freeze({
    ROLE: Object.freeze({
        SERVER: 'server',
        CLIENT: 'client',
    }),
    STRATEGY: Object.freeze({
        STANDARD: 'standard',
        REDIRECT: 'redirect',
        SITETOSITE: 'sitetosite'
    }),
    PROTO: Object.freeze({
        UDP: 'udp',
        TCP: 'tcp'
    }),
    PORT: Object.freeze({
        s1194: '1194',
        n1194: 1194,
    }),
    IP: Object.freeze({
        ZERO: '0.0.0.0',
        LOOPBACK: '127.0.0.1',
        SUBNET_SERVER: '10.8.0.0'
    }),
    CONN_TYPE: Object.freeze({
        DDNS: 'ddns'
    })
});


/**
 * --- HELPER & INIT ---
 */


/**
 * Strips all accidental Windows or Mac line breaks and trims spaces.
 */
const sanitizeInputLine = function (value) {
    return String(value || '').trim().replace(/[\r\n]/g, '');
};

/**
 * Normalizes all Windows and Mac line breaks into clean UNIX line breaks for textareas.
 */
const sanitizeInputText = function (value) {
    const rawText = value ? String(value).trim() : '';
    return rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

/**
 * Returns an empty list using a promise when there is no data to load.
 */
const initEmptyUciView = function () {
    return Promise.resolve([]);
};

// Wrapper for L.resolveDefault
function L_resolveDefault(value, fallback) {
    return L.resolveDefault(value, fallback);
}

/**
 * Wrapper for L.fs.read
 */
function L_fs_read(filepath) {
    return L.fs.read(filepath);
}

/**
 * Wrapper for L.fs.read
 */
function L_fs_write(filepath, content) {
    return L.fs.write(filepath, content);
}

/**
 * Wrapper for L.fs.exec
 */
function L_fs_exec(command, args) {
    return L.fs.exec(command, args);
}

/**
 * L.fs callbacks container
 */
const L_fs_Callbacks = ({
    L_resolveDefault: L_resolveDefault,
    L_fs_read: L_fs_read,
    L_fs_write: L_fs_write,
    L_fs_exec: L_fs_exec,
});

/**
 * Checks if an OpenVPN instance is enabled.
 */
const isInstanceEnabled = function (instance_id) {
    // instance_id = instance1, instance2, ...
    return L.uci.get(CFG.CMD.openvpn, instance_id, 'enabled') === '1';
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
 * Gets the active status of the OpenVPN service from ubus (replaces 'sh -c ubus' shell calls).
 */
const callServiceList = L.rpc.declare({
    object: 'service',
    method: 'list',
    params: ['name'],
    expect: { 'openvpn': {} }
});

/**
 * Memory buffer and timestamp to cache the public IP string
 */
var lastPublicIp = null;
var lastPublicIpTime = 0;

/**
 * Resolves the external public WAN IP with a 60-second local cache.
 */
const queryPublicIp = async function (force) {
    const currentHost = window.location.hostname;
    const currentTime = Date.now(); // Current time in milliseconds

    // Cache validation path (Math.abs protects against NTP time drops)
    if (force !== true && lastPublicIp !== null && Math.abs(currentTime - lastPublicIpTime) < 60000) {
        return lastPublicIp;
    }

    try {
        const res = await L.fs.exec(CFG.LIBEXEC.luci_app_openvpn, [CFG.LIBEXEC.publicip]);

        if (res && res.code === 0 && res.stdout) {
            const cleanIp = res.stdout.trim();
            if (cleanIp !== '') {
                // Update local memory cache variables
                lastPublicIp = cleanIp;
                lastPublicIpTime = currentTime;
                return cleanIp;
            }
        }
        return currentHost;

    } catch {
        return currentHost;
    }
};

/**
 * Combined DDNS resolution function (checks your custom target or the public OpenWrt DDNS system)
 */
const getDdnsOrPublicIp = async function (instObj) {
    let foundDomain = '';

    // 1. Get the dynamic domain name from the .conf file data object
    if (instObj && instObj.ddns) {
        foundDomain = instObj.ddns.trim();
    }

    // If no domain was passed, try to look up the host via OpenWrt's UCI system
    if (!foundDomain) {
        try {
            // Load the ddns configuration package asynchronously
            await L.uci.load('ddns');
            const ddnsSections = L.uci.sections('ddns', 'service') || [];

            // Modern, clean loop to find the first valid lookup_host
            for (const section of ddnsSections) {
                const host = L.uci.get('ddns', section['.name'], 'lookup_host');
                if (host && host.trim() !== '') {
                    foundDomain = host.trim();
                    // Found a valid host target, stop searching immediately
                    break;
                }
            }
        } catch {
            // Secure fallback if the ddns plugin package is missing on the system
            foundDomain = '';
        }
    }

    // 2. Resolve the domain we found or run the public IP fallback
    if (foundDomain) {
        try {
            // Call your all-in-one checkdns backend component inline
            const res = await L.fs.exec(CFG.LIBEXEC.luci_app_openvpn, [CFG.LIBEXEC.checkddns, foundDomain]);
            if (res && res.code === 0 && res.stdout) {
                const resolvedIp = res.stdout.trim();
                if (resolvedIp !== '') {
                    // Returns the validated IP address string
                    return resolvedIp;
                }
            }
        } catch {
            // Silent fallback if the backend script encounters a execution drop
        }
    }

    // 3. fallback if domain fails or is completely empty
    return await queryPublicIp(false);
};

/**
 * Clean any string from spaces, tabs, newlines, http(s)://, paths, ports and URL brackets
 */
const cleanIpOrDomain = async function (rawString) {
    if (!rawString) {
        return '';
    }

    try {
        const res = await L.fs.exec(CFG.LIBEXEC.luci_app_openvpn, [CFG.LIBEXEC.cleanipdns, rawString]);

        // Strict string type verification to prevent runtime browser crashes
        if (res && res.code === 0 && typeof res.stdout === 'string') {
            const cleaned = res.stdout.trim();
            if (cleaned !== '') {
                return cleaned;
            }
        }
        return rawString;

    } catch {
        return rawString;
    }
};

/**
 * Check a DDNS domain name or validate a raw public WAN IP address, and verify if it is online
 */
const checkDdns = async function (targetHost) {
    if (!targetHost) {
        return { success: false, stdout: '' };
    }
    try {
        const res = await L.fs.exec(CFG.LIBEXEC.luci_app_openvpn, [CFG.LIBEXEC.checkddns, targetHost]);

        // Enforces strict boolean conversion and strips trailing newlines safely
        const isSuccessful = (res && res.code === 0 && typeof res.stdout === 'string' && res.stdout.trim() !== '');

        return {
            success: isSuccessful,
            stdout: res ? (res.stdout || '').trim() : ''
        };

    } catch {
        return { success: false, stdout: '' };
    }
};

/**
 * Validate if a UDP or TCP port is open from the outside. Returns true or false.
 */
const checkPort = async function (targetHost, externalPort, internalPort, protocol) {
    if (!targetHost || !externalPort || !internalPort || !protocol) {
        return false;
    }
    const protoStr = protocol.toLowerCase();
    try {
        const res = await L.fs.exec(CFG.LIBEXEC.luci_app_openvpn, [CFG.LIBEXEC.checkport, targetHost, externalPort, internalPort, protoStr]);
        return (res && res.code === 0 && typeof res.stdout === 'string' && res.stdout.trim() === 'PORT_OPEN');

    } catch {
        return false;
    }
};

/**
 * Dispatches the background system task to update your dynamic DNS registration.
 */
const updateDdnsProvider = async function (updateUrl, domain) {
    if (!updateUrl) {
        return null;
    }
    try {
        const res = await L.fs.exec(CFG.LIBEXEC.luci_app_openvpn, [CFG.LIBEXEC.wgetddns, updateUrl, domain]);

        const responseText = String(res.stdout || res.stderr || '').trim();

        // Check if the response text starts with "Update successful" or "success"
        const isSuccess = responseText.toLowerCase().indexOf('success') !== -1;

        return {
            raw: responseText,
            isError: !isSuccess || res.code !== 0
        };

    } catch (err) {
        return {
            raw: String(err.message || err),
            isError: true
        };
    }
};

/**
 * Checks the router network structure to find double NAT, AP mode, real gateway IP
 * and collects all active subnets to prevent routing deadlocks.
 */
const checkNetworkStructure = async function () {
    const privateIpRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|fd|fc)/i;

    // We will collect all active subnet strings (e.g. "192.168.20.0") here
    let localSubnets = [];

    try {
        // 1. Fetch all local interfaces (LAN, Guest, etc.) asynchronously to protect them
        const devices = await network.getDevices();

        if (Array.isArray(devices)) {
            for (const dev of devices) {
                if (!dev) continue;
                const ipaddrs = dev.getIPAddrs ? dev.getIPAddrs() : [];

                for (const rawIp of ipaddrs) {
                    if (!rawIp) continue;
                    // Strip the subnet mask if it exists (e.g., "192.168.20.5/24" -> "192.168.20.5")
                    const ip = String(rawIp).split('/')[0];
                    const parts = ip.split('.');
                    if (parts.length === 4) {
                        localSubnets.push(parts[0] + '.' + parts[1] + '.' + parts[2] + '.0');
                    }
                }
            }
        }

        // 2. Fetch the WAN networks inline to find the gateway and double NAT state
        const wanNetworks = await network.getWANNetworks();

        let isDoubleNat = false;
        let isApMode = false;
        let gatewayIp = '';

        if (!wanNetworks || wanNetworks.length === 0) {
            isApMode = true;
            return { doubleNat: isDoubleNat, apMode: isApMode, gateway: OPENVPN.IP.ZERO, localSubnets: localSubnets };
        }

        // Process all found wide area network channels using modern loops
        for (const net of wanNetworks) {
            if (!net) continue;

            const gw4 = net.getGatewayAddr ? net.getGatewayAddr() : (net.data ? net.data.gateway : null);
            if (gw4 && gw4 !== OPENVPN.IP.ZERO) {
                gatewayIp = gw4;
            }

            // Evaluate WAN IPv4 addresses for Double-NAT tracking
            const ipaddrs = net.getIPAddrs ? net.getIPAddrs() : [];
            for (const rawWanIp of ipaddrs) {
                if (!rawWanIp) continue;

                // Strip the subnet mask before the regex and parts logic runs
                const ip = String(rawWanIp).split('/')[0];

                if (privateIpRegex.test(ip)) {
                    isDoubleNat = true;
                }

                // Also add the WAN side IP subnet to our protection blacklist
                const parts = ip.split('.');
                if (parts.length === 4) {
                    const wanSub = parts[0] + '.' + parts[1] + '.' + parts[2] + '.0';
                    if (localSubnets.indexOf(wanSub) === -1) {
                        localSubnets.push(wanSub);
                    }
                }
            }

            // Evaluate WAN IPv6 addresses for Local/Unique-Local tracking
            const ip6addrs = net.getIP6Addrs ? net.getIP6Addrs() : [];
            for (const rawWanIp6 of ip6addrs) {
                if (!rawWanIp6) continue;
                const ip6 = String(rawWanIp6).split('/')[0];
                if (privateIpRegex.test(ip6)) {
                    isDoubleNat = true;
                }
            }
        }

        if (!gatewayIp) {
            gatewayIp = OPENVPN.IP.ZERO;
        }

        // Return the full, rich network state mapping profile cleanly
        return {
            doubleNat: isDoubleNat,
            apMode: isApMode,
            gateway: gatewayIp,
            localSubnets: localSubnets
        };

    } catch {
        // Safe error fallback if either network system command breaks down
        return { doubleNat: false, apMode: false, gateway: OPENVPN.IP.ZERO, localSubnets: localSubnets };
    }
};

/**
 * network callbacks container
 */
const networkCallbacks = ({
    queryPublicIp: queryPublicIp,
    getDdnsOrPublicIp: getDdnsOrPublicIp,
    cleanIpOrDomain: cleanIpOrDomain,
    checkDdns: checkDdns,
    checkPort: checkPort,
    updateDdnsProvider: updateDdnsProvider,
    checkNetworkStructure: checkNetworkStructure
});

/**
 * Asynchronously loads system telemetry, network metrics, logs, and configuration templates
 */
const loadSystemTelemetry = async function (viewData) {
    try {
        // Execute all filesystem reads in parallel for maximum speed, then await the flat array results cleanly
        const results = await Promise.all([
            L.resolveDefault(L.fs.exec(CFG.CMD.mkdir, ['-p', CFG.FILE.dir_keys]), ''),
            L.resolveDefault(L.fs.stat(CFG.FILE.dir_keys + CFG.FILE.tls_def_key), null),
            L.resolveDefault(L.fs.stat(CFG.FILE.openvpn_keygen_lock), null),
            L.resolveDefault(L.fs.read(CFG.FILE.proc_net_dev), ''),
            L.resolveDefault(L.fs.read(CFG.FILE.proc_uptime), '0'),
            L.resolveDefault(L.fs.read(CFG.FILE.dir_cfg + CFG.FILE.server_def_conf), ''),
            L.resolveDefault(L.fs.read(CFG.FILE.dir_cfg + CFG.FILE.client_def_conf), ''),
            L.resolveDefault(callLogRead({ pattern: CFG.CMD.openvpn }), '')
        ]);

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

    } catch (err) {
        // Safe fallback block to log unexpected low-level operational failures
        console.error('Failed to load system telemetry data:', err);
    }
};

/**
 * Refreshes volatile runtime data from procfs
 */
const refreshSystemTelemetry = async function (viewData) {
    try {
        // Execute parallel hardware reads from procfs and await the results in a flat layout
        const results = await Promise.all([
            L.resolveDefault(L.fs.read(CFG.FILE.proc_net_dev), ''),
            L.resolveDefault(L.fs.read(CFG.FILE.proc_uptime), '0')
        ]);

        const [rawDevData, rawUptime] = results;

        viewData.devData = rawDevData || '';

        const parts = String(rawUptime).trim().split(/\s+/);
        viewData.uptime = (parts && parts[0]) ? parseFloat(parts[0]) : 0;

    } catch (err) {
        // Safe fallback layout to log unexpected hardware reading errors
        console.error('Failed to refresh system telemetry metrics:', err);
    }
};

/**
 * Checks the default key generation lock state: 'CFG.LIBEXEC.luci_app_openvpn -> generate_default_keys()'
 */
const checkDefaultKeysState = function (viewData) {
    return L.resolveDefault(L.fs.stat(CFG.FILE.openvpn_keygen_lock), null).then(function (lockStat) {
        // If the lock file is gone, keys are guaranteed to be fully written and ready
        viewData.keysReady = !lockStat;
    });
};

/**
 * Calculates a unique IPv4 server subnet string from the instance placement number
 */
const getServerSubnetFromInstNum = function (instNum) {
    const ipSegments = OPENVPN.IP.SUBNET_SERVER.split('.');
    // Increment the second segment (the 8 inside 10.8.0.0) correctly
    const calculatedOctet = parseInt(ipSegments[1], 10) - 1 + parseInt(instNum, 10);
    if (calculatedOctet > 0 && calculatedOctet <= 254) {
        ipSegments[1] = String(calculatedOctet);
        return ipSegments.join('.');
    }
    return OPENVPN.IP.SUBNET_SERVER;
};

/**
 * Calculates a unique IPv6 server subnet prefix offset from the instance placement number
 */
const getServerIpv6SubnetFromInstNum = function (instNum) {
    const parsedNum = parseInt(instNum, 10) || 1;
    const subnetOffset = parsedNum - 1;
    return 'fd00:db8:0:' + subnetOffset + '::/64';
};

/**
 * Executes a hardware cpu check to determine and return if the optimal cipher is AES
 */
const checkOptimalDataCipherAES = async function () {
    try {
        // Invoke the specialized hardware capability test from your shell backend utility
        const res = await L.fs.exec(CFG.LIBEXEC.luci_app_openvpn, [CFG.LIBEXEC.bestcrypto]);

        if (res && res.code === 0 && res.stdout) {
            if (res.stdout.trim() === 'AES') {
                return true;
            } else {
                return false;
            }
        }
        return true;

    } catch {
        return true;
    }
};

/**
 * Escapes dot characters to safely rewrite default crypto filenames into unique instance paths
 */
const escapeRegExp = function (str) {
    return str.replace(/\./g, '\\.');
};

// write in the server instance.conf: client-connect /usr/libexec/luci-app-openvpn iroute"
const clientConnectConfigCommand = 'client-connect "' + CFG.LIBEXEC.luci_app_openvpn + ' ' + CFG.LIBEXEC.iroute + '"';
const clientConnectConfigInfo = '# 4. luci-app-openvpn iroute checks client name and sends the correct route';

/**
 * Generate configuration file text for an OpenVPN server profile instance
 */
const generateConfigContentServer = async function (viewData, newInstanceItem, wizardParams) {
    if (!viewData.serverTemplate) {
        return '';
    }

    const id = newInstanceItem.id;
    const instNum = newInstanceItem.instNum;

    const chosenPort = (wizardParams && wizardParams.port) ? wizardParams.port : newInstanceItem.port;
    const chosenProto = (wizardParams && wizardParams.proto) ? wizardParams.proto : OPENVPN.PROTO.UDP;
    const displayName = (wizardParams && wizardParams.displayName) ? wizardParams.displayName.trim() : '';

    // Calculate the external client port target safely
    let externPortValue = chosenPort;
    if (wizardParams && wizardParams.portExtern) {
        externPortValue = wizardParams.portExtern;
    }

    // Save the correct port back into the shared object property
    newInstanceItem.port = chosenPort;

    // Calculate unique server subnets using helper functions
    const targetIpv4Subnet = getServerSubnetFromInstNum(instNum);
    const targetIpv6Subnet = getServerIpv6SubnetFromInstNum(instNum);
    const optimalDataCipherAES = await checkOptimalDataCipherAES();

    let config = viewData.serverTemplate
        .replace(new RegExp(escapeRegExp(CFG.FILE.ca_def_crt), 'g'), 'ca_' + id + '.crt')
        .replace(new RegExp(escapeRegExp(CFG.FILE.server_def_crt), 'g'), 'server_' + id + '.crt')
        .replace(new RegExp(escapeRegExp(CFG.FILE.server_def_key), 'g'), 'server_' + id + '.key')
        .replace(new RegExp(escapeRegExp(CFG.FILE.dh_def_pem), 'g'), 'dh_' + id + '.pem')
        .replace(new RegExp(escapeRegExp(CFG.FILE.tls_def_key), 'g'), 'tls-crypt_' + id + '.key')
        .replace(/^port\s+\d+/m, 'port ' + chosenPort)
        .replace(/^setenv\s+portextern\s+\d+/m, 'setenv portextern ' + externPortValue)
        .replace(/^proto\s+\S+/m, 'proto ' + chosenProto)
        .replace(/^server\s+10\.8\.0\.0/m, 'server ' + targetIpv4Subnet)
        .replace(/^server-ipv6\s+fd00:db8:0:1::\/64/m, 'server-ipv6 ' + targetIpv6Subnet)
        .replace(CFG.CONF.openvpn_instance1_status, 'openvpn.instance' + instNum + '.status');

    if (displayName) {
        config = config.replace(CFG.CONF.modern_vpn_server, CFG.CONF.modern_vpn_server + ' #' + instNum + ' (' + displayName + ')');
    } else {
        config = config.replace(CFG.CONF.modern_vpn_server, CFG.CONF.modern_vpn_server + ' #' + instNum);
    }

    if (!optimalDataCipherAES) {
        config = config.replace(CFG.CONF.data_ciphers_aes, CFG.CONF.data_ciphers_comment + "\n" + CFG.CONF.data_ciphers_chacha);
    }

    if (chosenProto === OPENVPN.PROTO.TCP) {
        // remove mssfix 1360 if running on TCP
        config = config.replace(CFG.CONF.mssfix_1360, '');
    } else {
        // remove ntcp-nodelay if running on UDP
        config = config.replace(CFG.CONF.tcp_nodelay, '');
    }

    // Option A: Mobile clients profile settings (Route all traffic over VPN)
    if (wizardParams && wizardParams.strategy === OPENVPN.STRATEGY.REDIRECT) {
        config += '\n# Mobile Devices Routing\n\n';
        if (config.indexOf('redirect-gateway def1') === -1) {
            config += 'push "redirect-gateway def1 bypass-dhcp"\n';
        }
        if (config.indexOf('redirect-gateway ipv6') === -1) {
            config += 'push "redirect-gateway ipv6"\n';
        }
        if (config.indexOf('block-outside-dns') === -1) {
            config += 'push "block-outside-dns"\n';
        }

        if (config.indexOf('dhcp-option DNS') === -1) {
            const localLanIp = L.uci.get('network', 'lan', 'ipaddr');
            if (localLanIp && localLanIp.trim()) {
                config += 'push "dhcp-option DNS ' + localLanIp.trim() + '"\n';
                config += 'push "dhcp-option DNS 9.9.9.9"\n';
                config += 'push "dhcp-option DNS 149.112.112.112"\n';
            } else {
                config += 'push "dhcp-option DNS 9.9.9.9"\n';
                config += 'push "dhcp-option DNS 149.112.112.112"\n';
            }
        }

        if (config.indexOf('dhcp-option DNS6') === -1) {
            config += 'push "dhcp-option DNS6 2620:fe::fe"\n';
            config += 'push "dhcp-option DNS6 2620:fe::9"\n';
        }
    }

    // Option B: Office network settings (Universal Multi-Client Site-to-Site LAN-LAN Setup)
    if (wizardParams && wizardParams.strategy === OPENVPN.STRATEGY.SITETOSITE) {
        config += '\n# Client Site-to-Site routing\n\n';

        // Load all registered client offices from the wizard array list
        const targetClients = Array.isArray(wizardParams.clients) ? wizardParams.clients : [];

        config += '# 1. Add routes to the router system\n';
        targetClients.forEach(function (b) {
            config += 'route ' + b.subnet + ' ' + b.mask + '\n';
        });
        config += '\n';

        config += '# 2. Enable script security to run shell commands\n';
        config += 'script-security 2\n\n';

        config += '# 3. Save names and networks of remote offices in variables\n';
        targetClients.forEach(function (client, index) {
            const num = index + 1;
            config += 'setenv CLIENT_CNAME_' + num + ' "' + client.commonName.trim() + '"\n';
            config += 'setenv CLIENT_ROUTE_' + num + ' "iroute ' + client.subnet + ' ' + client.mask + '"\n';
        });
        config += '\n';

        if (targetClients.length > 0) {
            config += clientConnectConfigInfo + '\n';
            config += clientConnectConfigCommand + '\n\n';
        }

        // Find local LAN network details of this server to push them back to clients
        const localLanIp = L.uci.get('network', 'lan', 'ipaddr');
        const localLanMask = L.uci.get('network', 'lan', 'netmask') || '255.255.255.0';

        if (localLanIp && localLanIp.trim()) {
            const lanSegments = localLanIp.trim().split('.');
            if (lanSegments.length === 4) {
                lanSegments[3] = '0';
                const localServerSubnet = lanSegments.join('.');

                config += '# 5. Send local network of this router to all clients\n';
                config += 'push "route ' + localServerSubnet + ' ' + localLanMask + '"\n';
            }
        }
    }

    if (wizardParams && wizardParams.ddnsOrPublicIp) {
        const targetHost = wizardParams.ddnsOrPublicIp.trim();
        const hasLetters = /[a-zA-Z]/.test(targetHost);

        if (wizardParams.connectionType === OPENVPN.CONN_TYPE.DDNS) {
            // Scenario A: Active internal dynamic DNS updater script mode
            config += '\n# Public Dynamic DNS (Autonomous background update routine)\n';
            config += 'setenv DDNS "' + targetHost + '"\n';
            config += 'setenv DDNS_PROVIDER "' + wizardParams.ddnsProvider + '"\n';
            config += 'setenv DDNS_URL "' + wizardParams.ddnsUrl + '"\n';
        } else if (hasLetters === true) {
            // Fallback: User provided a domain name but uses an external DDNS client
            config += '\n# Public Domain (Managed by an external DDNS client or provider)\n';
            config += 'setenv PUBLIC_DOMAIN ' + targetHost + '\n';
        } else if (wizardParams.isStaticIp === true) {
            // Line connection with permanent static public IP
            config += '\n# Public Static IP\n';
            config += 'setenv PUBLIC_STATIC_IP ' + targetHost + '\n';
        } else {
            // Temporary dynamic public IP address with standard connection warnings
            config += '\n# Public Dynamic IP\n';
            config += '# [WARNING] Value will change on ISP reconnection and your VPN connection will disconnect!\n';
            config += '# Please use a DDNS domain name to prevent this.\n';
            config += 'setenv PUBLIC_DYNAMIC_IP ' + targetHost + '\n';
        }
    }

    // BACKUP RULE: If for some reason the template didn't have the line, add it as fallback
    if (config.indexOf('setenv portextern') === -1) {
        config += '\nsetenv portextern ' + externPortValue + '\n';
    }

    return config.trim() + '\n';
};

/**
 * Finds the last active server ID, its configuration port number, and its protocol (udp/tcp)
 */
const getLastServerIdAndPort = function (currentId, defaultPort, viewData) {
    const result = { id: currentId, port: defaultPort, proto: OPENVPN.PROTO.UDP };

    if (!viewData || !Array.isArray(viewData.instances)) {
        return result;
    }

    const instances = viewData.instances;

    // Loop backwards directly through the structural instances array in RAM
    for (let i = instances.length - 1; i >= 0; i--) {
        const inst = instances[i];

        // Find the nearest previous server instance that is not the current one
        if (inst && inst.role === OPENVPN.ROLE.SERVER && inst.id !== currentId) {
            result.id = inst.id;
            if (inst.port && !isNaN(inst.port)) {
                result.port = parseInt(inst.port, 10);
            }
            if (inst.proto) {
                result.proto = inst.proto.toLowerCase();
            }
            break;
        }
    }
    return result;
};


/**
 * Calculates a unique loopback client IP address from the instance number
 */
const getClientIpFromInstNum = function (instNum) {
    const ipSegments = OPENVPN.IP.LOOPBACK.split('.');

    // Increment the last digit using the unique instance placement number
    const lastSegment = parseInt(ipSegments[3], 10) - 1 + parseInt(instNum, 10);

    if (lastSegment > 0 && lastSegment <= 254) {
        ipSegments[3] = String(lastSegment);
        return ipSegments.join('.');
    }
    return OPENVPN.IP.LOOPBACK;
};

/**
 * Generate configuration file text for an OpenVPN client profile instance
 */
const generateConfigContentClient = async function (viewData, newInstanceItem, wizardParams) {
    if (!viewData.clientTemplate) {
        return '';
    }

    const id = newInstanceItem.id;
    const instNum = newInstanceItem.instNum;

    const chosenPort = (wizardParams && wizardParams.port) ? wizardParams.port : newInstanceItem.port;
    const chosenProto = (wizardParams && wizardParams.proto) ? wizardParams.proto : newInstanceItem.proto;
    const remoteServer = (wizardParams && wizardParams.remoteServer) ? wizardParams.remoteServer.trim() : getClientIpFromInstNum(instNum);
    const displayName = (wizardParams && wizardParams.displayName) ? wizardParams.displayName.trim() : '';
    const optimalDataCipherAES = await checkOptimalDataCipherAES();

    // 1. Prepare base replacement variables for crypto paths
    let config = viewData.clientTemplate
        .replace(new RegExp(escapeRegExp(CFG.FILE.ca_def_crt), 'g'), 'ca_' + id + '.crt')
        .replace(new RegExp(escapeRegExp(CFG.FILE.client_def_crt), 'g'), 'client_' + id + '.crt')
        .replace(new RegExp(escapeRegExp(CFG.FILE.client_def_key), 'g'), 'client_' + id + '.key')
        .replace(new RegExp(escapeRegExp(CFG.FILE.tls_def_key), 'g'), 'tls-crypt_' + id + '.key');

    if (displayName) {
        config = config.replace(CFG.CONF.modern_vpn_client, CFG.CONF.modern_vpn_client + ' #' + instNum + ' (' + displayName + ')');
    } else {
        config = config.replace(CFG.CONF.modern_vpn_client, CFG.CONF.modern_vpn_client + ' #' + instNum);
    }

    if (!optimalDataCipherAES) {
        config = config.replace(CFG.CONF.data_ciphers_aes, CFG.CONF.data_ciphers_comment + "\n" + CFG.CONF.data_ciphers_chacha);
    }

    if (chosenProto === OPENVPN.PROTO.TCP) {
        // remove mssfix 1360 if running on TCP
        config = config.replace(CFG.CONF.mssfix_1360, '');
    } else {
        // remove ntcp-nodelay if running on UDP
        config = config.replace(CFG.CONF.tcp_nodelay, '');
    }

    // 2. Inject remote server connection paths and transport protocols
    config = config
        .replace(/^remote\s+\S+\s+\d+/m, 'remote ' + remoteServer + ' ' + chosenPort)
        .replace(/^proto\s+\S+/m, 'proto ' + chosenProto);

    if (wizardParams) {
        config = config.replace(CFG.CONF.remote_cert_tls_server_comment, CFG.CONF.remote_cert_tls_server);
    }

    return config.trim() + '\n';
};

/**
 * Compiles the final standalone .ovpn profile text with embedded keys
 */
const compileOvpnProfileText = async function (cname, targetHost, targetPort, proto, cryptoAssets, viewData, instNum) {

    const optimalDataCipherAES = await checkOptimalDataCipherAES();

    // remove crypto keys - ovpn profile comes with embedded keys
    let ovpn = viewData.clientTemplate
        .replace(CFG.CONF.modern_vpn_client, CFG.CONF.modern_vpn_client + ' #' + instNum + ' (' + cname + ')')
        .replace(CFG.CONF.certificate_and_keys_comment, '')
        .replace(/^ca\s+\S+\r?\n/m, '')
        .replace(/^cert\s+\S+\r?\n/m, '')
        .replace(/^key\s+\S+\r?\n/m, '')
        .replace(/^tls-crypt\s+\S+\r?\n/m, '')
        .replace(/^remote\s+\S+\s+\d+/m, 'remote ' + targetHost + ' ' + targetPort)
        .replace(/^proto\s+\S+/m, 'proto ' + proto)
        .replace(CFG.CONF.remote_cert_tls_server_comment, CFG.CONF.remote_cert_tls_server);

    if (!optimalDataCipherAES) {
        ovpn = ovpn.replace(CFG.CONF.data_ciphers_aes, CFG.CONF.data_ciphers_comment + "\n" + CFG.CONF.data_ciphers_chacha);
    }

    if (proto === OPENVPN.PROTO.TCP) {
        // remove mssfix 1360 if running on TCP
        ovpn = ovpn.replace(CFG.CONF.mssfix_1360, '');
    } else {
        // remove ntcp-nodelay if running on UDP
        ovpn = ovpn.replace(CFG.CONF.tcp_nodelay, '');
    }

    // Collapse three or more consecutive newlines down to exactly one empty line
    ovpn = ovpn.replace(/\n{3,}/g, '\n\n');
    ovpn += 'setenv client-cname ' + cname + '\n\n';

    if (cryptoAssets.ca && typeof cryptoAssets.ca.trim === 'function') {
        // SECURITY FILTER: Strip out the secret CA Private Key block from the ca asset string
        const rawCa = cryptoAssets.ca.trim();
        const cleanCa = rawCa.replace(/-----BEGIN[^\n]*PRIVATE KEY-----[\s\S]*?-----END[^\n]*PRIVATE KEY-----\n*/g, '');
        ovpn += '<ca>\n' + cleanCa.trim() + '\n</ca>\n\n';
    }
    if (cryptoAssets.cert && typeof cryptoAssets.cert.trim === 'function') {
        ovpn += '<cert>\n' + cryptoAssets.cert.trim() + '\n</cert>\n\n';
    }
    if (cryptoAssets.key && typeof cryptoAssets.key.trim === 'function') {
        ovpn += '<key>\n' + cryptoAssets.key.trim() + '\n</key>\n\n';
    }
    if (cryptoAssets.tlsCrypt && typeof cryptoAssets.tlsCrypt.trim === 'function' && cryptoAssets.tlsCrypt.trim()) {
        ovpn += '<tls-crypt>\n' + cryptoAssets.tlsCrypt.trim() + '\n</tls-crypt>\n';
    }

    return ovpn;
};


/**
 * Checks and creates all configuration and key files for an instance
 */
const syncInstanceFiles = async function (newInstanceItem, viewData, wizardParams) {
    const id = newInstanceItem.id;
    const calculatedPort = viewData.statusClass.calcPortFromId(id, newInstanceItem.instNum);
    const rolePrefix = newInstanceItem.role + '_';

    if (!wizardParams && newInstanceItem.role === OPENVPN.ROLE.CLIENT) {
        // Get loopback server data if simple new client instance
        const serverData = getLastServerIdAndPort(id, calculatedPort, viewData);
        newInstanceItem.loopbackServerId = serverData.id;
        newInstanceItem.port = serverData.port;
        newInstanceItem.proto = serverData.proto;
    } else if (!wizardParams && newInstanceItem.role === OPENVPN.ROLE.SERVER) {
        newInstanceItem.port = calculatedPort;
    } else if (wizardParams && wizardParams.port) {
        // Ensure the wizard port is also mirrored inside the object property instantly
        newInstanceItem.port = parseInt(wizardParams.port, 10);
        if (wizardParams.proto) {
            newInstanceItem.proto = wizardParams.proto;
        }
    }

    // Push all tasks into an array to fire them simultaneously
    const filePromises = [
        initFile(CFG.FILE.dir_cfg + id + '.conf', null, newInstanceItem, viewData, wizardParams),
        initFile(CFG.FILE.dir_keys + 'ca_' + id + '.crt', CFG.FILE.dir_keys + CFG.FILE.ca_def_crt, newInstanceItem, viewData, wizardParams),
        initFile(CFG.FILE.dir_keys + rolePrefix + id + '.crt', CFG.FILE.dir_keys + CFG.FILE.server_def_crt, newInstanceItem, viewData, wizardParams),
        initFile(CFG.FILE.dir_keys + rolePrefix + id + '.key', CFG.FILE.dir_keys + CFG.FILE.server_def_key, newInstanceItem, viewData, wizardParams),
        initFile(CFG.FILE.dir_keys + 'tls-crypt_' + id + '.key', CFG.FILE.dir_keys + CFG.FILE.tls_def_key, newInstanceItem, viewData, wizardParams)
    ];

    if (newInstanceItem.role === OPENVPN.ROLE.SERVER) {
        filePromises.push(
            initFile(CFG.FILE.dir_keys + 'dh_' + id + '.pem', CFG.FILE.dir_keys + CFG.FILE.dh_def_pem, newInstanceItem, viewData, wizardParams)
        );
    }

    // We wait for all parallel file transmissions
    return await Promise.all(filePromises);
};

/**
 * Reads a file or creates it with default text if missing
 */
const initFile = async function (customPath, defaultPath, newInstanceItem, viewData, wizardParams) {
    try {
        // Try to read the file from the disk
        const existingContent = await L.fs.read(customPath);
        return existingContent;

    } catch {

        // STEP 1: If the missing file is a configuration profile (.conf), compile it now
        if (customPath.indexOf('.conf') !== -1) {
            let configContent = '';

            if (newInstanceItem.role === OPENVPN.ROLE.CLIENT) {
                configContent = await generateConfigContentClient(viewData, newInstanceItem, wizardParams);
            } else {
                configContent = await generateConfigContentServer(viewData, newInstanceItem, wizardParams);
            }

            // Write the new config file and return its content inline
            await L.fs.write(customPath, configContent);
            return configContent;
        }

        // If no default fallback path is given, stop here safely
        if (!defaultPath) {
            return '';
        }

        // STEP 2: For local loopback tests, copy the server's keys so the client certificates match perfectly.
        let sourcePath = defaultPath;
        if (!wizardParams && newInstanceItem.role === OPENVPN.ROLE.CLIENT && newInstanceItem.loopbackServerId && newInstanceItem.loopbackServerId !== newInstanceItem.id) {
            // Example: Change "ca_instance2.crt" to search for "ca_instance1.crt" on the disk
            const fileName = customPath.substring(customPath.lastIndexOf('/') + 1);
            const serverFileName = fileName.replace(newInstanceItem.id, newInstanceItem.loopbackServerId);
            sourcePath = customPath.substring(0, customPath.lastIndexOf('/') + 1) + serverFileName;
        }

        // STEP 3: Read the selected source file with a safe fallback to an empty string
        let sourceContent = '';
        try {
            const rawSource = await L.fs.read(sourcePath);
            sourceContent = String(rawSource || '').trim();
        } catch {
            sourceContent = '';
        }

        // SAFETY FALLBACK: If the local file was empty or missing, fall back to default files
        if (sourceContent.length === 0 && sourcePath !== defaultPath) {
            let fallbackContent = '';
            try {
                const rawFallback = await L.fs.read(defaultPath);
                fallbackContent = String(rawFallback || '').trim();
            } catch {
                fallbackContent = '';
            }

            if (fallbackContent.length === 0) return '';

            await L.fs.write(customPath, fallbackContent);
            return fallbackContent;
        }

        if (sourceContent.length === 0) return '';

        // Write the verified clean content to the destination folder
        await L.fs.write(customPath, sourceContent);
        return sourceContent;
    }
};

/**
 * Asynchronously loads the settings and running state for all profiles
 */
const loadInstanceData = async function (viewData) {
    const sections = viewData.sections || [];

    try {
        // Get openvpn service data and system stats at the same time in parallel
        const results = await Promise.all([
            L.resolveDefault(callServiceList(CFG.CMD.openvpn), {}),
            refreshSystemTelemetry(viewData)
        ]);

        const serviceData = results[0];
        const instancesObj = serviceData.instances || {};
        const syncPromises = [];

        const systemUptime = parseFloat(viewData.uptime) || 0;

        sections.forEach(function (s, idx) {
            const id = s['.name'];
            const instNum = viewData.statusClass.getInstanceNumber(id, idx + 1);
            const role = L.uci.get(CFG.CMD.openvpn, id, 'role') || OPENVPN.ROLE.SERVER;

            // Initialize a clean newInstanceItem template for the synchronization loop
            const newInstanceItem = Object.assign({}, viewData.statusClass.INSTANCE_TEMPLATE, {
                id: id,
                instNum: instNum,
                role: role
            });

            syncPromises.push(syncInstanceFiles(newInstanceItem, viewData, null));
        });

        // Await all files to be synchronized in parallel before reading status structures
        await Promise.all(syncPromises);

        return viewData.statusClass.readInstanceStatus(sections, instancesObj, systemUptime);

    } catch (err) {
        console.error('Failed to load instance configuration data engine:', err);
        return viewData.statusClass.readInstanceStatus(sections, {}, 0);
    }
};


/**
 * --- SAVE AND RESTART ---
 */


/**
 * Processes pending reactivation tasks from the previous session reload
 */
const processPendingSessionTask = async function () {
    // Read the pending reactivation request from the browser memory
    const reloadId = window.sessionStorage.getItem(CFG.ID.openvpn_pending_reactivation);

    if (reloadId) {
        // Remove the token immediately to prevent endless refresh loops
        window.sessionStorage.removeItem(CFG.ID.openvpn_pending_reactivation);

        // Re-enable the OpenVPN instance inside UCI staging memory
        if (L.uci.get(CFG.CMD.openvpn, reloadId)) {
            L.uci.set(CFG.CMD.openvpn, reloadId, 'enabled', '1');
            L.uci.save();
        }

        // Open the native LuCI review and apply window automatically
        if (L.ui && L.ui.changes && typeof L.ui.changes.init === 'function') {
            try {
                // Wait for the modal engine initialization
                await L.ui.changes.init();

                if (L.ui.changes.displayChanges && typeof L.ui.changes.displayChanges === 'function') {
                    L.ui.changes.displayChanges();
                }
            } catch {
                // Silent fallback safety if the LuCI modal framework drops out
            }
        }
    }
};

/**
 * Shows the LuCI changes modal and restarts the OpenVPN instance safely
 */
const showSaveApplyOpenVPN = async function (instance_id) {
    // OpenVPN needs a full stop and start cycle to load new key files into memory
    const needsReactivation = isInstanceEnabled(instance_id);

    if (needsReactivation) {
        // Set enabled to 0 in memory first to stop the running tunnel
        if (L.uci.get(CFG.CMD.openvpn, instance_id)) {
            L.uci.set(CFG.CMD.openvpn, instance_id, 'enabled', '0');
        }

        // Save a reload task in the browser session storage to turn it back on later
        try {
            window.sessionStorage.setItem(CFG.ID.openvpn_pending_reactivation, instance_id);
        } catch (err) {
            console.error('Session storage write blocked:', err);
        }
    }

    // Save all current modifications to the uci memory buffer
    L.uci.save();

    // Open the standard LuCI review and apply changes window
    if (L.ui && L.ui.changes && typeof L.ui.changes.init === 'function') {
        try {
            // Wait for the modal engine initialization
            await L.ui.changes.init();

            if (L.ui.changes.displayChanges && typeof L.ui.changes.displayChanges === 'function') {
                L.ui.changes.displayChanges();

                // requestAnimationFrame guarantees the DOM node is fully accessible before injection runs.
                window.requestAnimationFrame(function () {
                    const modalNode = document.querySelector('.modal.uci-dialog') || document.querySelector('.modal');
                    if (modalNode) {
                        const infoNotice = E('div', {
                            'class': 'alert-message info',
                            'style': 'margin:15px 0 15px 0; padding:12px; font-weight:bold; font-size:12px; line-height:1.5; ' +
                                'border-left:4px solid var(--action-bg, #00a8ff); ' +
                                'background:color-mix(in srgb, var(--sysstat-text-blue, #3b82f6) 6%, transparent); ' +
                                'color:var(--text-color, #334155); border-radius:4px;'
                        }, ICON.WARNING + TXT.MSG.config_changed_reload);

                        const titleHeader = modalNode.querySelector('h4');
                        if (titleHeader && titleHeader.nextSibling) {
                            modalNode.insertBefore(infoNotice, titleHeader.nextSibling);
                        } else {
                            modalNode.appendChild(infoNotice);
                        }
                    }
                });
            }
        } catch {
            // Silent fallback on failure
        }
    }
};


/**
 * --- OVPN PROFILES ---
 */


/**
 * Reads a profile file, tests keys with keymeta, and saves them to the router.
 */
const importOvpnClientProfile = async function (ovpnContent, instanceId) {
    if (!ovpnContent || !ovpnContent.trim()) {
        throw new Error(ICON.ERROR + TXT.ERROR.upload_key_empty);
    }

    // Fix line endings for Windows, Mac, and Linux instantly
    const content = sanitizeInputText(ovpnContent);

    // Setup clean variables for the router files
    let caContent = '';
    let certContent = '';
    let keyContent = '';
    let tlsCryptContent = '';

    // Try to find native OpenVPN XML tags in the text profile
    const caXml = content.match(/<ca>([\s\S]*?)<\/ca>/);
    const certXml = content.match(/<cert>([\s\S]*?)<\/cert>/);
    const keyXml = content.match(/<key>([\s\S]*?)<\/key>/);
    const tlsCryptXml = content.match(/<tls-crypt>([\s\S]*?)<\/tls-crypt>/);

    const blocksToScan = [];
    let isXmlSource = false;

    // CHECK PATH: Test if we have XML tags or if we must scan raw PEM blocks
    const hasValidCaXml = (caXml && caXml[1] && caXml[1].trim());
    const hasValidCertXml = (certXml && certXml[1] && certXml[1].trim());
    const hasValidKeyXml = (keyXml && keyXml[1] && keyXml[1].trim());

    if (hasValidCaXml || hasValidCertXml || hasValidKeyXml) {
        isXmlSource = true; // Yes, this file has valid XML tags

        if (hasValidCaXml) { blocksToScan.push({ type: 'ca', text: caXml[1].trim() }); }
        if (hasValidCertXml) { blocksToScan.push({ type: 'cert', text: certXml[1].trim() }); }
        if (hasValidKeyXml) { blocksToScan.push({ type: 'key', text: keyXml[1].trim() }); }
        if (tlsCryptXml && tlsCryptXml[1] && tlsCryptXml[1].trim()) {
            blocksToScan.push({ type: 'tlscrypt', text: tlsCryptXml[1].trim() });
        }
    } else {
        // Fallback: This is a pure keys.crt bundle. Get PEM text blocks using regex.
        const certArray = content.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || [];
        const keyArray = content.match(/-----BEGIN[^\n]*?PRIVATE KEY-----[\s\S]*?-----END[^\n]*?PRIVATE KEY-----/g) || [];
        const tlsCryptArray = content.match(/-----BEGIN OpenVPN Static key V1-----[\s\S]*?-----END OpenVPN Static key V1-----/g) || [];

        const combinedPem = [].concat(certArray, keyArray, tlsCryptArray);
        for (let i = 0; i < combinedPem.length; i++) {
            if (combinedPem[i]) {
                blocksToScan.push({ type: 'unknown', text: combinedPem[i].trim() });
            }
        }
    }

    // SCAN LOOP: Test every single key block with the keymeta tool in the backend
    for (let i = 0; i < blocksToScan.length; i++) {
        const currentItem = blocksToScan[i];
        const currentBlock = currentItem ? currentItem.text : '';
        if (!currentBlock) {
            continue;
        }

        // Save the current block to a quick temporary file
        const tmpFile = 'tmp_import_scan_' + i + '.pem';
        await L.fs.write(CFG.FILE.dir_keys + tmpFile, currentBlock + '\n');

        // Run keymeta to check if this key is good or bad
        const res = await L.fs.exec(CFG.LIBEXEC.luci_app_openvpn, [CFG.LIBEXEC.keymeta, tmpFile]);
        await L.fs.remove(CFG.FILE.dir_keys + tmpFile);

        const metaReport = (res && res.stdout) ? res.stdout.toUpperCase() : '';

        // Stop instantly if keymeta finds an error or trash text inside the file
        if (metaReport.indexOf('ERROR') !== -1 || !metaReport.trim()) {
            throw new Error(ICON.ERROR + TXT.ERROR.key_check_failed);
        }

        // SORTING: Place keys into correct variables using their real crypto type from keymeta
        if (isXmlSource === true && currentItem.type !== 'unknown') {
            // Trust the XML tags because keymeta verified that the content is good!
            if (currentItem.type === 'ca') { caContent = currentBlock; }
            else if (currentItem.type === 'cert') { certContent = currentBlock; }
            else if (currentItem.type === 'key') { keyContent = currentBlock; }
            else if (currentItem.type === 'tlscrypt') { tlsCryptContent = currentBlock; }
        } else {
            // Sorting path for pure keys.crt files based on actual crypto traits
            if (metaReport.indexOf('AUTHORITY') !== -1 || metaReport.indexOf('CA:TRUE') !== -1) {
                caContent = currentBlock;
            }
            else if (metaReport.indexOf('STANDARD CERTIFICATE') !== -1 || metaReport.indexOf('PUBLIC-KEY') !== -1) {
                certContent = currentBlock;
            }
            else if (metaReport.indexOf('PRIVATE-KEY') !== -1) {
                keyContent = currentBlock;
            }
            else if (metaReport.indexOf('STATIC KEY') !== -1 || metaReport.indexOf('SYMMETRIC') !== -1) {
                tlsCryptContent = currentBlock;
            }
        }
    }

    // Safety check: Every profile needs at least a CA, a Cert, and a Private Key
    if (!caContent || !certContent || !keyContent) {
        throw new Error(ICON.ERROR + TXT.ERROR.invalid_file_parts_missing);
    }

    // Helper function to remove XML text tags before saving to disk
    const stripXmlTags = function (str) {
        return str.replace(/<\/?(ca|cert|key|tls-crypt)>/g, '').trim();
    };

    // Save clean, verified keys to the router folders in parallel
    await Promise.all([
        L.fs.write(CFG.FILE.dir_keys + 'ca_' + instanceId + '.crt', stripXmlTags(caContent) + '\n'),
        L.fs.write(CFG.FILE.dir_keys + 'client_' + instanceId + '.crt', stripXmlTags(certContent) + '\n'),
        L.fs.write(CFG.FILE.dir_keys + 'client_' + instanceId + '.key', stripXmlTags(keyContent) + '\n'),
        tlsCryptContent ? L.fs.write(CFG.FILE.dir_keys + 'tls-crypt_' + instanceId + '.key', stripXmlTags(tlsCryptContent) + '\n') : Promise.resolve()
    ]);

    // Look for connection data to choose between a full setup or key rotation
    const remoteMatch = content.match(/^remote\s+(\S+)\s+(\d+)/m);
    const protoMatch = content.match(/^proto\s+(\S+)/m);
    const cnameMatch = content.match(/^setenv\s+client-cname\s+([^\n]+)/m);

    if (!remoteMatch) {
        return {
            isCryptoUpdateOnly: true,
            remoteServer: '',
            port: '',
            proto: '',
            cname: ''
        };
    }

    return {
        isCryptoUpdateOnly: false,
        remoteServer: remoteMatch[1].trim(),
        port: parseInt(remoteMatch[2], 10) || OPENVPN.PORT.n1194,
        proto: protoMatch ? protoMatch[1].trim().toLowerCase() : OPENVPN.PROTO.UDP,
        cname: cnameMatch ? cnameMatch[1].trim() : ''
    };
};

/**
 * Displays the mobile QR code vector for OpenVPN profiles
 */
const renderClientOvpnProfileQr = function (containerNode, downloadUrl) {
    containerNode.innerHTML = '';

    if (typeof uqr !== 'undefined' && typeof uqr.renderSVG === 'function') {
        try {
            // Clean standard pixel size. Generates perfect native grid coordinates.
            const rawSvgString = uqr.renderSVG(downloadUrl, {
                ecc: 'M',
                pixelSize: 4,
                whiteColor: 'white',
                blackColor: 'black'
            });

            // Inject the raw SVG string straight into the elastic box
            containerNode.innerHTML = rawSvgString;

            // Remove any forced 100% stretching so the SVG stays at its true natural size
            const svgElement = containerNode.querySelector('svg');
            if (svgElement) {
                svgElement.style.display = 'block';
                svgElement.style.margin = '0 auto';
                svgElement.style.width = '';
                svgElement.style.height = '';
                svgElement.style.shapeRendering = 'crispEdges';
            }
        } catch (e) {
            console.error('Native uqr framework (QR-Code) execution failed:', e);
        }
    } else {
        containerNode.appendChild(E('div', { 'style': 'color: var(--text-color-light, #64748b); font-size:12px; padding:20px;' }, [
            E('strong', {}, ICON.WARNING + TXT.WARNING.profile_link_without_qr_code)
        ]));
    }
};

/**
 * Displays the mobile layout container for OpenVPN profiles
 */
const renderClientOvpnProfileModal = function (ipFieldWrapper, urlContainer, qrContainer, dlBtn, closeBtn) {
    return E('div', { 'class': 'cbi-map' }, [
        E('div', { 'class': 'cbi-section' }, [
            E('div', { 'class': 'cbi-section-descr', 'style': 'margin-bottom:15px; border-bottom:1px solid var(--border-color, #e2e8f0); padding-bottom:8px;' },
                TXT.MSG.export_connection_address_qr_code
            ),
            E('div', { 'style': 'display:flex; flex-direction:column; align-items:center; width:100%; text-align:center; margin-bottom:15px; background:var(--background-panel, rgba(0,0,0,0.01)); padding:12px; border:1px solid var(--border-color, #e2e8f0); border-radius:4px;' }, [
                E('strong', { 'style': 'display:block; font-size:12px; color:var(--text-color-light, #64748b); text-transform:uppercase; letter-spacing:0.5px;' }, TXT.MSG.vpn_client_address),
                ipFieldWrapper
            ]),
            E('div', { 'style': 'display:flex; flex-direction:column; align-items:center; gap:15px; background:var(--background-panel, rgba(0,0,0,0.02)); padding:20px; border-radius:6px; border:1px solid var(--border-color, #e2e8f0); margin-bottom:15px;' }, [
                E('div', { 'style': 'width:100%; text-align:center;' }, [
                    E('strong', { 'style': 'display:block; margin-bottom:6px; font-size:12px; color:var(--text-color-light, #64748b); text-transform:uppercase; letter-spacing:0.5px;' }, TXT.MSG.secure_temporary_profile_url),
                    urlContainer
                ]),
                E('div', { 'style': 'width:100%; text-align:center; margin-top:5px;' }, [
                    E('strong', { 'style': 'display:block; margin-bottom:2px; font-size:12px; color:var(--text-color-light, #64748b); text-transform:uppercase; letter-spacing:0.5px;' }, TXT.MSG.scan_qr_code_with_camera),
                    qrContainer
                ]),
                E('div', { 'style': 'width:100%; text-align:center; margin-top:8px; font-size:12px; color:var(--text-color-light, #475569); padding-top:10px; border-top:1px dashed var(--border-color, #e2e8f0); font-weight:500;' }, [
                    E('span', { 'style': 'color: var(--danger-text, #e11d48); font-weight:bold; margin-right:4px;' }, ICON.WARNING + TXT.WARNING.security_notice + ' '),
                    TXT.MSG.download_only_available_window_open
                ])
            ]),
            E('div', { 'style': 'text-align:right; border-top:1px solid var(--border-color, #e2e8f0); padding-top:12px; margin-top:15px;' }, [
                dlBtn, E('span', { 'style': 'margin-right:10px;' }), closeBtn
            ])
        ])
    ]);
};

/**
 * Creates the basic screen elements for the mobile QR window
 */
const createQrBoxElements = function (initialHost) {
    // Create the link field that users can click to open or download files
    const urlOutput = E('a', {
        'target': '_blank', 'download': '', 'onclick': 'event.stopPropagation();',
        'style': 'display:block; width:100%; font-family:var(--font-monospace, monospace); font-size:13px; color:var(--action-bg, #00a8ff); font-weight:bold; text-align:center; text-decoration:underline; padding:8px; background:var(--background-field, #f8fafc); border:1px dashed var(--border-color, #cbd5e1); border-radius:4px; word-break:break-all;'
    }, ['']);

    // Create a clean white card box that changes its size automatically
    const qrContainer = E('div', {
        'style': 'text-align:center; padding:12px; background:#ffffff; border:1px solid var(--border-color, #e2e8f0); border-radius:6px; display:inline-block; box-sizing:border-box; width:auto; height:auto; min-width:140px; min-height:140px; box-shadow:0 1px 3px rgba(0,0,0,0.05); margin-top:5px;'
    }, [E('em', {}, TXT.BTN.generating)]);

    const dlBtn = E('button', { 'class': 'cbi-button cbi-button-action important' }, ICON.SAVE + TXT.BTN.download_ovpn);
    const closeBtn = E('button', { 'class': 'cbi-button cbi-button-neutral' }, TXT.BTN.close);

    const labelNode = E('span', { 'style': 'font-weight:bold; font-size:15px; color:var(--text-color, #334155); margin-right:15px;' }, [initialHost]);
    const inputNode = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': initialHost, 'style': 'display:none; width:180px; font-weight:bold; font-size:13px; text-align:center; padding:4px;' });
    const editBtn = E('button', { 'class': 'cbi-button cbi-button-neutral', 'style': 'padding:2px 10px; font-size:11px;' }, [ICON.CHANGE + TXT.BTN.change]);

    const ipWrapper = E('div', { 'style': 'display:flex; flex-direction:row; align-items:center; justify-content:center; width:100%; margin-top:5px;' }, [labelNode, inputNode, editBtn]);

    return {
        nodes: { url: urlOutput, qr: qrContainer, label: labelNode, input: inputNode, edit: editBtn, wrapper: ipWrapper },
        buttons: { download: dlBtn, close: closeBtn }
    };
};

/**
 * Setup all click actions and update the view when things change
 */
const setupQrBoxEvents = function (elements, ovpnParams, cryptoAssets, viewData) {

    // Update data, links and the QR code asynchronously when the host changes
    const refreshModalState = async function () {
        try {
            const activeHost = elements.nodes.input.value ? sanitizeInputLine(elements.nodes.input.value) : window.location.hostname;
            const instNumber = viewData.statusClass.getInstanceNumber(ovpnParams.nextId);

            // 1. Await the dynamic profile compilation text block
            const fullProfileText = await compileOvpnProfileText(ovpnParams.displayId, activeHost, ovpnParams.port, ovpnParams.proto, cryptoAssets, viewData, instNumber);
            const sanitizedFileName = ovpnParams.displayId.replace(/\s+/g, '_');
            const downloadUrl = window.location.protocol + '//' + window.location.host + '/' + sanitizedFileName + '_client.ovpn';

            elements.nodes.url.href = downloadUrl;
            elements.nodes.url.textContent = downloadUrl;

            // 2. Write the compiled text payload directly into the RAM configuration folder
            await L.fs.write(ovpnParams.exportPath, fullProfileText);

            // 3. Trigger the backend symlink engine execution pipeline
            await L.fs.exec(CFG.LIBEXEC.luci_app_openvpn, [CFG.LIBEXEC.symlink, instNumber.toString(), 'create', ovpnParams.displayId]);

            // 4. Render the vector graphic directly into the visible workspace panel
            renderClientOvpnProfileQr(elements.nodes.qr, downloadUrl);

        } catch (e) {
            console.error('Failed to process and link profile export assets:', e);
        }
    };

    elements.nodes.input.addEventListener('input', refreshModalState);

    // Show or hide the text input box when clicking the change button
    elements.nodes.edit.addEventListener('click', function (ev) {
        ev.preventDefault();
        if (elements.nodes.input.style.display === 'none') {
            elements.nodes.label.style.display = 'none';
            elements.nodes.input.style.display = 'inline-block';
            elements.nodes.input.focus();
            elements.nodes.edit.textContent = TXT.BTN.ok;
            elements.nodes.edit.className = 'cbi-button cbi-button-action important';
        } else {
            const typedVal = sanitizeInputLine(elements.nodes.input.value);
            const activeMutationHost = typedVal || window.location.hostname;
            elements.nodes.label.textContent = activeMutationHost;

            elements.nodes.input.style.display = 'none';
            elements.nodes.label.style.display = 'inline-block';
            elements.nodes.edit.textContent = ICON.CHANGE + TXT.BTN.change;
            elements.nodes.edit.className = 'cbi-button cbi-button-neutral';

            refreshModalState();
        }
    });

    // Download the profile file directly to a computer
    elements.buttons.download.addEventListener('click', function () {
        const activeHost = elements.nodes.input.value ? sanitizeInputLine(elements.nodes.input.value) : window.location.hostname;
        const instNumber = viewData.statusClass.getInstanceNumber(ovpnParams.nextId);
        compileOvpnProfileText(ovpnParams.displayId, activeHost, ovpnParams.port, ovpnParams.proto, cryptoAssets, viewData, instNumber).then(function (fullProfileText) {
            const blob = new Blob([fullProfileText], { type: 'application/x-openvpn-profile' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = ovpnParams.displayId.replace(/\s+/g, '_') + '_client.ovpn';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    });

    // Delete temporary files and close the window when clicking the close button
    elements.buttons.close.addEventListener('click', function () {
        const instNumber = viewData.statusClass.getInstanceNumber(ovpnParams.nextId);
        L.fs.remove(ovpnParams.exportPath).then(function () {
            return L.fs.exec(CFG.LIBEXEC.luci_app_openvpn, [CFG.LIBEXEC.symlink, instNumber.toString(), 'delete', ovpnParams.displayId]);
        }).then(function () {
            L.ui.hideModal();
            if (ovpnParams.saveApplyOpenVPN == true) {
                showSaveApplyOpenVPN(ovpnParams.instance_id);
            }
        }).catch(function (err) {
            console.error("Error on delete symlink:", err);
            L.ui.hideModal();
        });
    });

    // Run the first update when the view loads
    refreshModalState();
};

/**
 * Universal data structure template for packing generated OpenVPN profile assets
 */
const SERVER_FILES_TEMPLATE = {
    conf: '',
    ca: '',
    cert: '',
    key: '',
    tlsCrypt: ''
};

/**
 * Opens a simplified modal for mobile apps clients with a dynamic targetCnName input field and triggers asynchronous client_pki cryptographic generation.
 */
const openMobileExportModal = function (instance_id, nextId, files, finalHost, triggerStandardExportFlow, viewData) {
    // 1. Create UI Input elements
    const cnInput = E('input', {
        'type': 'text',
        'class': 'cbi-input-text',
        'style': 'width:100%; font-weight:bold;',
        'placeholder': TXT.MSG.placeholder_cn_mobile
    });

    // Remove the invalid styling marker automatically as soon as the user starts typing
    cnInput.addEventListener('input', function () {
        cnInput.classList.remove('cbi-input-invalid');
    });

    const modalConfirmBtn = E('button', { 'class': 'cbi-button cbi-button-action important' }, [TXT.BTN.next + ' ' + ICON.FORWARD]);
    const modalCancelBtn = E('button', { 'class': 'cbi-button cbi-button-neutral', 'style': 'margin-right:10px;' }, [TXT.BTN.cancel]);

    const statusFeedbackNode = E('textarea', {
        'class': 'cbi-input-textarea',
        'style': 'width:100%; max-width:100%; resize:none; font-family:monospace; font-size:11px; display:none; background:#111; color: var(--success-text, #00ff00); padding:10px; margin-top:12px;',
        'rows': '8', 'readonly': 'readonly'
    });

    let forgedAssetsBundle = null;
    let finalizedCnName = '';
    let saveApplyOpenVPN = false;

    // 2. Render Modal Frame Layout
    L.ui.showModal(ICON.MOBILE + ' ' + TXT.MSG.export_openvpn_connect_client_profile, [
        E('div', { 'class': 'cbi-map' }, [
            E('div', { 'class': 'cbi-section' }, [
                E('div', { 'id': 'mobile-description-node', 'class': 'cbi-section-descr', 'style': 'margin-bottom:12px; font-size:12px; color:var(--text-color-light, #64748b);' }, [
                    TXT.MSG.please_assign_cn_name
                ]),
                E('div', { 'class': 'cbi-value', 'style': 'border:none; padding:0;' }, [
                    E('div', { 'class': 'cbi-value-field', 'style': 'width:100%; margin:0; padding:0;' }, [
                        cnInput,
                        statusFeedbackNode
                    ])
                ]),
                E('div', { 'style': 'text-align:right; margin-top:15px; border-top:1px solid var(--border-color, #cbd5e1); padding-top:12px;' }, [
                    modalCancelBtn, modalConfirmBtn
                ])
            ])
        ])
    ]);

    modalCancelBtn.addEventListener('click', L.ui.hideModal);

    // 3. Form submission and core validation loop
    modalConfirmBtn.addEventListener('click', function (ev) {
        ev.preventDefault();

        // Next Step Action Layer: If keys are already generated, dispatch directly to download frame
        if (forgedAssetsBundle && finalizedCnName) {
            L.ui.hideModal();
            triggerStandardExportFlow(forgedAssetsBundle, finalizedCnName, saveApplyOpenVPN);
            return;
        }

        // Reset previous validation state red lines
        cnInput.classList.remove('cbi-input-invalid');

        // Form Validation Check Routine
        const rawCn = sanitizeInputLine(cnInput.value);
        const cleanCn = viewData.wizardClass.getValidCommonName(rawCn);
        if (!rawCn || !cleanCn) {
            cnInput.classList.add('cbi-input-invalid'); // Mark field red
            return;
        }

        finalizedCnName = cleanCn;

        const descNode = document.getElementById('mobile-description-node');
        if (descNode) { descNode.style.display = 'none'; }
        cnInput.style.display = 'none';
        modalConfirmBtn.disabled = true;
        modalConfirmBtn.textContent = ICON.LOADING + ' ' + TXT.BTN.processing;
        modalCancelBtn.style.display = 'none';
        statusFeedbackNode.style.display = 'block';

        // 4. client_pki asynchronous keygen
        viewData.keygenClass.executeAsynchronousKeyGen(nextId, 'client_pki', 'rsa2048_ec', '100', finalizedCnName, '', statusFeedbackNode, L_fs_Callbacks, async function (keygenSuccess, pkiPayload) {
            if (!keygenSuccess || !pkiPayload) {
                modalCancelBtn.style.display = 'inline-block';
                modalConfirmBtn.disabled = false;
                modalConfirmBtn.textContent = TXT.BTN.next + ' ' + ICON.FORWARD;
                statusFeedbackNode.value += '\n' + ICON.ERROR + ' ' + TXT.ERROR.keygen_failed;
                return;
            }
            forgedAssetsBundle = Object.assign({}, SERVER_FILES_TEMPLATE, {
                conf: files.conf,
                ca: pkiPayload.ca,
                cert: pkiPayload.cert,
                key: pkiPayload.key,
                tlsCrypt: files.tlsCrypt
            });

            // Unlock UI
            modalConfirmBtn.disabled = false;
            modalConfirmBtn.className = 'cbi-button cbi-button-save important';
            modalConfirmBtn.textContent = TXT.INFO.download_profile + ' ' + ICON.EXPORT;
        }, 'fresh');
    });
};

/**
 * Opens the selection modal for site-to-site clients and handles configuration updates
 */
const openSiteToSiteExportModal = function (instance_id, nextId, files, activeBranchNames, initialHost, triggerStandardExportFlow, viewData, instanceSaveParams) {

    // Create the branch selection dropdown menu - existing clients are listed FIRST
    const selectDropdown = E('select', { 'class': 'cbi-input-select', 'style': 'width:100%; font-weight:bold;' });
    activeBranchNames.forEach(function (name) {
        selectDropdown.appendChild(E('option', { 'value': name }, [ICON.OFFICE + TXT.MSG.office_profile + ' ' + name]));
    });
    selectDropdown.appendChild(E('option', { 'value': 'create_new_client' }, [ICON.PLUS + TXT.KEY.create_key_new_office]));

    const subnetInputs = viewData.wizardClass.renderSubnetInputs();

    // Wrap the component row node into a display-controlled container box
    const inputRowContainer = E('div', { 'style': 'margin-top:4px; display:none;' }, [subnetInputs.node]);

    // Pre-select behavior layout alignments
    if (activeBranchNames.length === 0) {
        selectDropdown.value = 'create_new_client';
        inputRowContainer.style.display = 'block';
    }

    selectDropdown.addEventListener('change', function (e) {
        inputRowContainer.style.display = (e.target.value === 'create_new_client') ? 'block' : 'none';
    });

    const modalConfirmBtn = E('button', { 'class': 'cbi-button cbi-button-action important' }, [TXT.BTN.next + ' ' + ICON.FORWARD]);
    const modalCancelBtn = E('button', { 'class': 'cbi-button cbi-button-neutral', 'style': 'margin-right:10px;' }, [TXT.BTN.cancel]);

    const statusFeedbackNode = E('textarea', {
        'class': 'cbi-input-textarea',
        'style': 'width:100%; max-width:100%; resize:none; font-family:monospace; font-size:11px; display:none; background:#111; color: var(--success-text, #00ff00); padding:10px; margin-top:12px;',
        'rows': '8', 'readonly': 'readonly'
    });

    let forgedAssetsBundle = null;
    let finalizedCnName = '';
    let saveApplyOpenVPN = false;

    L.ui.showModal(ICON.BOX + TXT.MSG.lan_to_lan_profile_selection, [
        E('div', { 'class': 'cbi-map' }, [
            E('div', { 'class': 'cbi-section' }, [
                E('div', { 'id': 's2s-description-node', 'class': 'cbi-section-descr', 'style': 'margin-bottom:12px; font-size:12px; color:var(--text-color-light, #64748b);' }, [
                    TXT.MSG.select_remote_office_to_export
                ]),
                E('div', { 'class': 'cbi-value', 'style': 'border:none; padding:0;' }, [
                    E('div', { 'class': 'cbi-value-field', 'style': 'width:100%; margin:0; padding:0;' }, [
                        selectDropdown,
                        inputRowContainer,
                        statusFeedbackNode
                    ])
                ]),
                E('div', { 'style': 'text-align:right; margin-top:15px; border-top:1px solid var(--border-color, #cbd5e1); padding-top:12px;' }, [
                    modalCancelBtn, modalConfirmBtn
                ])
            ])
        ])
    ]);

    modalCancelBtn.addEventListener('click', L.ui.hideModal);

    modalConfirmBtn.addEventListener('click', function (ev) {
        ev.preventDefault();

        if (forgedAssetsBundle && finalizedCnName) {
            L.ui.hideModal();
            triggerStandardExportFlow(forgedAssetsBundle, finalizedCnName, saveApplyOpenVPN);
            return;
        }

        const targetMode = selectDropdown.value;
        let targetCnName = '';
        let targetSub = '';
        let targetMask = '';
        let isNewClient = false;

        if (targetMode === 'create_new_client') {
            const validatedNetworkData = subnetInputs.validateAndFetchData();

            // If validation fails, rows are automatically highlighted in red inside the DOM, abort stream instantly
            if (!validatedNetworkData) {
                return;
            }

            targetCnName = validatedNetworkData.commonName;
            targetSub = validatedNetworkData.subnet;
            targetMask = validatedNetworkData.mask;
            isNewClient = true;
        } else {
            targetCnName = targetMode;
        }

        finalizedCnName = targetCnName;

        // UI-TRANSITION: Hide fields, render status terminal outputs box
        const descNode = document.getElementById('s2s-description-node');
        if (descNode) { descNode.style.display = 'none'; }
        selectDropdown.style.display = 'none';
        inputRowContainer.style.display = 'none';

        modalConfirmBtn.disabled = true;
        modalConfirmBtn.textContent = ICON.LOADING + TXT.BTN.processing;
        modalCancelBtn.style.display = 'none';
        statusFeedbackNode.style.display = 'block';

        viewData.keygenClass.executeAsynchronousKeyGen(nextId, 'client_pki', 'rsa2048_ec', '100', targetCnName, '', statusFeedbackNode, L_fs_Callbacks, async function (keygenSuccess, pkiPayload) {
            if (!keygenSuccess || !pkiPayload) {
                modalCancelBtn.style.display = 'inline-block';
                modalConfirmBtn.disabled = false;
                modalConfirmBtn.textContent = TXT.BTN.next + ' ' + ICON.FORWARD;
                statusFeedbackNode.value += '\n' + ICON.ERROR + TXT.ERROR.keygen_failed;
                return;
            }

            let activeConfigContentText = files;

            if (isNewClient === true) {
                const currentConfigText = await L.fs.read(CFG.FILE.dir_cfg + nextId + '.conf');
                const countMatches = currentConfigText.match(/setenv\s+CLIENT_CNAME_/g);
                const nextIndexNum = countMatches ? (countMatches.length + 1) : 1;

                const lines = currentConfigText.split('\n');
                let routeSectionFound = false;
                let envSectionFound = false;

                for (let l = 0; l < lines.length; l++) {
                    // Append the network route configuration block inside the routing section
                    if (lines[l].indexOf('route ') === 0 && !routeSectionFound) {
                        let scanAhead = l;
                        while (scanAhead < lines.length && (
                            lines[scanAhead].indexOf('route ') === 0)) {
                            scanAhead++;
                        }
                        // Inject the new client credentials sequentially into the finalized configuration matrix
                        lines[scanAhead - 1] += '\nroute ' + targetSub + ' ' + targetMask;
                        routeSectionFound = true;
                    }
                    // Scan ahead to locate the exact end of the environmental variable stack
                    if (lines[l].indexOf('setenv CLIENT_CNAME_') === 0 && !envSectionFound) {
                        let scanAhead = l;
                        while (scanAhead < lines.length && (
                            lines[scanAhead].indexOf('setenv CLIENT_CNAME_') === 0 ||
                            lines[scanAhead].indexOf('setenv CLIENT_ROUTE_') === 0)) {
                            scanAhead++;
                        }
                        // Inject the new client credentials sequentially into the finalized configuration matrix
                        lines[scanAhead - 1] += '\nsetenv CLIENT_CNAME_' + nextIndexNum + ' "' + targetCnName + '"\nsetenv CLIENT_ROUTE_' + nextIndexNum + ' "iroute ' + targetSub + ' ' + targetMask + '"';
                        envSectionFound = true;
                    }
                    if (routeSectionFound && envSectionFound) {
                        break;
                    }
                }

                // Compile the structural layout back into a centralized string format
                let finalUpdatedConfig = lines.join('\n');

                // Enforce the routing backend directive safely if it is missing from the template
                if (finalUpdatedConfig.indexOf(clientConnectConfigCommand) === -1) {
                    finalUpdatedConfig += '\n' + clientConnectConfigInfo + '\n';
                    finalUpdatedConfig += clientConnectConfigCommand + '\n\n';
                }

                // add new client in server.conf
                await L.fs.write(CFG.FILE.dir_cfg + instance_id + '.conf', finalUpdatedConfig);

                saveApplyOpenVPN = true;
            }

            forgedAssetsBundle = Object.assign({}, SERVER_FILES_TEMPLATE, {
                conf: activeConfigContentText,
                ca: pkiPayload.ca,
                cert: pkiPayload.cert,
                key: pkiPayload.key,
                tlsCrypt: files.tlsCrypt
            });

            modalConfirmBtn.disabled = false;
            modalConfirmBtn.className = 'cbi-button cbi-button-save important';
            modalConfirmBtn.textContent = TXT.INFO.download_profile + ICON.EXPORT;

        }, 'fresh');

    });
};

/**
 * Exporter for OpenVPN profiles with embedded client crypto data
 */
const downloadClientOvpnProfile = async function (instance_id, instObj, customUciName, viewData, instanceSaveParams) {
    const nextId = instance_id;
    const displayId = customUciName || instance_id;
    const currentRole = instObj.role || 'client';
    const rolePrefix = currentRole + '_';

    try {
        // Read all 5 crypto files simultaneously in parallel
        const readSafe = async function (path) {
            try {
                const content = await L.fs.read(path);
                return content;
            } catch {
                return '';
            }
        };

        // Read all 5 crypto files simultaneously in parallel
        const rawFilesArray = await Promise.all([
            readSafe(CFG.FILE.dir_cfg + nextId + '.conf'),
            readSafe(CFG.FILE.dir_keys + 'ca_' + nextId + '.crt'),
            readSafe(CFG.FILE.dir_keys + rolePrefix + nextId + '.crt'),
            readSafe(CFG.FILE.dir_keys + rolePrefix + nextId + '.key'),
            readSafe(CFG.FILE.dir_keys + 'tls-crypt_' + nextId + '.key')
        ]);

        // Validate that we actually have the configuration and the required keys
        if (!rawFilesArray || rawFilesArray.length < 5 || !rawFilesArray[0]) {
            L.ui.addNotification(null, E('p', {}, TXT.ERROR.config_key_missing), 'error');
            return;
        }

        const serverAssets = Object.assign({}, SERVER_FILES_TEMPLATE, {
            conf: rawFilesArray[0],
            ca: rawFilesArray[1],
            cert: rawFilesArray[2],
            key: rawFilesArray[3],
            tlsCrypt: rawFilesArray[4]
        });;

        // Check if this server configuration uses the environment routing variable system
        const isSiteToSite = serverAssets.conf.indexOf('CLIENT_CNAME_') !== -1;

        // Read connection parameters instantly from your clean instObj RAM cache!
        const serverProto = instObj.proto || OPENVPN.PROTO.UDP;
        const internalPort = instObj.port || OPENVPN.PORT.s1194;

        // Read the custom client port range directly from the template schema
        const currentPort = instObj.portExtern || internalPort;

        // Match both the variable type [1] and the target value [2] using capturing groups
        const ddnsMetaMatch = serverAssets.conf.match(/^setenv\s+(DDNS|PUBLIC_DOMAIN|PUBLIC_STATIC_IP|PUBLIC_DYNAMIC_IP)\s+"?(\S+?)"?$/m);

        const configIpType = ddnsMetaMatch ? ddnsMetaMatch[1] : '';
        const savedHost = ddnsMetaMatch ? ddnsMetaMatch[2].trim() : '';
        let finalHost = '';

        // If it is a permanent domain name or verified static IP, never overwrite it
        if (configIpType === 'DDNS' || configIpType === 'PUBLIC_DOMAIN' || configIpType === 'PUBLIC_STATIC_IP') {
            finalHost = savedHost;
        } else {
            // For unverified dynamic IPs, try to get the public IP via our flat cache engine
            try {
                const liveDetectedIp = await getDdnsOrPublicIp(instObj, false);
                finalHost = liveDetectedIp || savedHost || window.location.hostname;
            } catch {
                finalHost = savedHost || window.location.hostname;
            }
        }

        const exportStaticPath = CFG.FILE.dir_cfg + nextId + '.ovpn';

        const ovpnDownloadParams = {
            nextId: nextId,
            displayId: displayId,
            port: currentPort,
            proto: serverProto,
            exportPath: exportStaticPath,
            instance_id: instance_id,
            saveApplyOpenVPN: false
        };

        // --- TYPE A: Flow for standard devices (Mobile Apps) ---
        const triggerStandardExportFlow = function (finalCryptoBundle, overrideCn, saveApplyOpenVPN) {
            const ovpnParamsUpdated = Object.assign({}, ovpnDownloadParams);
            let title;
            if (overrideCn) {
                title = ICON.OFFICE + TXT.MSG.client_export;
                ovpnParamsUpdated.displayId = overrideCn;
            } else {
                title = ICON.MOBILE + TXT.MSG.mobile_export;
            }
            if (saveApplyOpenVPN) {
                ovpnParamsUpdated.saveApplyOpenVPN = saveApplyOpenVPN;
            }
            const ui = createQrBoxElements(finalHost);
            setupQrBoxEvents(ui, ovpnParamsUpdated, finalCryptoBundle, viewData);
            L.ui.showModal(title + ': ' + ovpnParamsUpdated.displayId, [
                renderClientOvpnProfileModal(ui.nodes.wrapper, ui.nodes.url, ui.nodes.qr, ui.buttons.download, ui.buttons.close)
            ]);
        };

        // If it is a standard mobile server, open the Mobile Export modal to generate unique client_pki keys first
        if (!isSiteToSite) {
            openMobileExportModal(instance_id, nextId, serverAssets, finalHost, triggerStandardExportFlow, viewData);
            return;
        }

        // Parse existing office names safely from the configuration content string rows
        const activeBranchNames = [];
        const nameRegex = /setenv\s+CLIENT_CNAME_\d+\s+"([^"]+)"/g;
        let regexMatch = nameRegex.exec(serverAssets.conf);

        while (regexMatch !== null) {
            if (regexMatch && regexMatch[1]) {
                const cleanName = regexMatch[1].trim();
                if (cleanName && activeBranchNames.indexOf(cleanName) === -1) {
                    activeBranchNames.push(cleanName);
                }
            }
            regexMatch = nameRegex.exec(serverAssets.conf);
        }

        // --- TYPE B: Open the clean isolated Site-to-Site Selection Modal UI Sub-Routine ---
        openSiteToSiteExportModal(instance_id, nextId, serverAssets, activeBranchNames, finalHost, triggerStandardExportFlow, viewData, instanceSaveParams);

    } catch (err) {
        // Central error interception handler cleanly logs all file system crashes
        L.ui.addNotification(null, E('p', {}, TXT.ERROR.build_profile + ' ' + err.message), 'error');
    }
};


/**
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
 * Updates the visual styles, backgrounds, and action buttons based on the operational three-way state.
 */
const updateMainBoxVisuals = function (stateStr, badgeLabelNode, badgeImgNode, boxHeadNode, btnEnableOpenVPN) {
    const badgeTextColor = 'var(--text-color-dark, #ffffff)';

    if (stateStr === 'active') {
        // STATE 1: System is active and running cleanly (Green)
        badgeLabelNode.textContent = TXT.INFO.openvpn + ' (' + TXT.INFO.active + ')';
        badgeImgNode.src = CFG.FILE.vpn_enabled_img;
        boxHeadNode.style.setProperty('--zone-color-rgb', '46, 204, 113');
        boxHeadNode.style.backgroundColor = 'var(--zone-lan-bg, rgb(46, 204, 113))';
        boxHeadNode.style.color = badgeTextColor;

        if (btnEnableOpenVPN) {
            btnEnableOpenVPN.className = 'cbi-button cbi-button-negative important';
            btnEnableOpenVPN.textContent = TXT.INFO.disable + ' ' + TXT.INFO.openvpn;
        }
    } else if (stateStr === 'pending') {
        // STATE 2: UCI modified via checkbox but changes are not yet applied (Orange)
        badgeLabelNode.textContent = TXT.INFO.openvpn + ' (' + TXT.INFO.pending + ')';
        badgeImgNode.src = CFG.FILE.vpn_disabled_img;
        boxHeadNode.style.setProperty('--zone-color-rgb', '230, 126, 34');
        boxHeadNode.style.backgroundColor = 'rgb(230, 126, 34)';
        boxHeadNode.style.color = badgeTextColor;

        if (btnEnableOpenVPN) {
            // Keep button as Disable since the system is transitioning into an active state intent
            btnEnableOpenVPN.className = 'cbi-button cbi-button-negative important';
            btnEnableOpenVPN.textContent = TXT.INFO.disable + ' ' + TXT.INFO.openvpn;
        }
    } else if (stateStr === 'error') {
        // STATE 3: UCI is enabled but processes are dead/crashed (Severe Red Alert)
        badgeLabelNode.textContent = TXT.INFO.openvpn + ' (' + TXT.INFO.error + ')';
        badgeImgNode.src = CFG.FILE.vpn_disabled_img;
        boxHeadNode.style.setProperty('--zone-color-rgb', '231, 76, 60');
        boxHeadNode.style.backgroundColor = 'var(--zone-wan-bg, rgb(231, 76, 60))';
        boxHeadNode.style.color = badgeTextColor;

        if (btnEnableOpenVPN) {
            btnEnableOpenVPN.className = 'cbi-button cbi-button-negative important';
            btnEnableOpenVPN.textContent = TXT.INFO.disable + ' ' + TXT.INFO.openvpn;
        }
    } else {
        // STATE 4: User intentionally disabled everything (Neutral Grey/Slate)
        badgeLabelNode.textContent = TXT.INFO.openvpn + ' (' + TXT.INFO.disabled + ')';
        badgeImgNode.src = CFG.FILE.vpn_disabled_img;
        boxHeadNode.style.setProperty('--zone-color-rgb', '148, 163, 184');
        boxHeadNode.style.backgroundColor = 'rgb(148, 163, 184)';
        boxHeadNode.style.color = badgeTextColor;

        if (btnEnableOpenVPN) {
            btnEnableOpenVPN.className = 'cbi-button cbi-button-positive important';
            btnEnableOpenVPN.textContent = TXT.INFO.enable + ' ' + TXT.INFO.openvpn;
        }
    }
};

/**
 * Handles the main toggle button click event to cycle all instances.
 */
const handelEnableOpenVPN = function (sections, ifaceBoxMasterNode, addServerBtn, addClientBtn, badgeLabelNode, badgeImgNode, boxHeadNode, applyNotice, btnEnableOpenVPN) {
    const targetSections = sections || [];

    if (targetSections.length === 0) return;

    ifaceBoxMasterNode.style.opacity = '0.4';
    btnEnableOpenVPN.disabled = true;
    if (addServerBtn) addServerBtn.disabled = true;
    if (addClientBtn) addClientBtn.disabled = true;

    const unlockUI = function () {
        ifaceBoxMasterNode.style.opacity = '1';
        btnEnableOpenVPN.disabled = false;
        if (addServerBtn) addServerBtn.disabled = false;
        if (addClientBtn) addClientBtn.disabled = false;
    };

    const nextState = isAnyInstanceEnabled(targetSections) ? '0' : '1';

    for (let k = 0; k < targetSections.length; k++) {
        if (targetSections[k] && targetSections[k]['.name']) {
            L.uci.set(CFG.CMD.openvpn, targetSections[k]['.name'], 'enabled', nextState);
        }
    }

    L.uci.save();
    updateMainBoxVisuals(nextState, badgeLabelNode, badgeImgNode, boxHeadNode, btnEnableOpenVPN);

    const mainControlBox = document.getElementById(CFG.ID.main_control_box);
    if (mainControlBox) {
        mainControlBox.setAttribute('data-current-state', nextState);
        mainControlBox.setAttribute('data-toggle-triggered', nextState);
    }
    applyNotice.style.display = 'inline-block';

    // Invoke native LuCI core components to render the changes overlay tracking frame
    if (L.ui && L.ui.changes && typeof L.ui.changes.init === 'function') {
        L.ui.changes.init()
            .then(L.bind(L.ui.changes.displayChanges, L.ui.changes))
            .finally(unlockUI);
    } else {
        unlockUI();
    }
};

/**
 * LuCI "Save & Apply" button Hook: Stop/Start openvpn service
 */
if (L.ui && L.ui.changes && typeof L.ui.changes.apply === 'function') {

    const nativeLuCiApply = L.ui.changes.apply;

    L.ui.changes.apply = function () {
        const hookArgs = arguments;
        const mainControlBox = document.getElementById(CFG.ID.main_control_box);

        // 1. Read our isolated custom attribute string ('0', '1' or null)
        const toggleActionFlag = mainControlBox ? mainControlBox.getAttribute('data-toggle-triggered') : null;

        // Fallback Path A: Pass through instantly if the master toggle was NOT the cause
        if (toggleActionFlag === null) {
            return nativeLuCiApply.apply(this, hookArgs);
        }

        // 2. Map the state string safely to the corresponding init.d backend command
        let targetAction = 'restart';
        if (toggleActionFlag === '0') {
            targetAction = 'stop';
        }

        // 3. DETACHED PRIVILEGED TRIGGER: Fires parallel to the main LuCI execution thread
        setTimeout(function () {
            // Fire the privileged script execution path
            L.fs.exec(CFG.LIBEXEC.luci_app_openvpn, [CFG.LIBEXEC.ovpnservice, targetAction])
                .catch(function () {
                    // SILENT CATCH: We catch the connection drop caused by LuCI's immediate page reload.
                    // This prevents the "No related RPC reply" uncaught promise error from freezing the UI.
                    return true;
                });
        }, 0);


        // 4. Clean up the DOM state flag immediately in the active frame
        if (mainControlBox) {
            mainControlBox.removeAttribute('data-toggle-triggered');
        }

        // 5. UNBLOCKED MAIN PATH: Preserves strict 'this' binding contexts for UI overlays
        return nativeLuCiApply.apply(this, hookArgs);
    };
}

/**
 * Formats a raw byte metric into a human-readable data size string.
 */
const formatStatusBytes = function (b) {
    if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
    if (b >= 1024) return (b / 1024).toFixed(1) + ' KB';
    return b + ' B';
};

/**
 * Refreshes only the numeric live metrics inside the main control box tooltip.
 */
const updateMainBoxTooltip = function (initialRawState, totalInstances, updatedInstances, devDataRaw) {
    let runningInstances = 0;
    const activePids = [];

    if (Array.isArray(updatedInstances)) {
        for (let i = 0; i < updatedInstances.length; i++) {
            if (updatedInstances[i].isRunning) {
                runningInstances++;
                if (updatedInstances[i].pid && updatedInstances[i].pid !== '-') {
                    activePids.push(updatedInstances[i].pid);
                }
            }
        }
    }

    const traffic = calculateTunnelTraffic(devDataRaw);

    // Safely update individual text rows by their dedicated DOM descriptor IDs
    const elEnabled = document.getElementById('mcb_val_enabled');
    const elConnected = document.getElementById('mcb_val_connected');
    const elPids = document.getElementById('mcb_val_pids');
    const elRx = document.getElementById('mcb_val_rx');
    const elTx = document.getElementById('mcb_val_tx');

    // Dynamic session-state evaluation matching your new operational states
    if (elEnabled) elEnabled.textContent = (initialRawState !== 'disabled') ? TXT.INFO.yes : TXT.INFO.no;
    if (elConnected) elConnected.textContent = runningInstances + '/' + totalInstances;
    if (elPids) elPids.textContent = (activePids.length > 0) ? activePids.join(', ') : '-';

    // Reusing centralized formatStatusBytes sub-routine
    if (elRx) elRx.textContent = formatStatusBytes(traffic.rx);
    if (elTx) elTx.textContent = formatStatusBytes(traffic.tx);
};

/**
 * Open Wizard normally
 */
const openWizardBtnClick = function (viewData, totalInstances, hideClient) {
    if (!totalInstances) {
        totalInstances = (viewData.sections && viewData.sections.length) ? viewData.sections.length : 0;
    }
    const wizardData = Object.assign({}, viewData.wizardClass.WIZARD_DATA_TEMPLATE, {
        viewData: viewData,
        addNewInstanceCallback: addNewInstance,
        networkCallbacks: networkCallbacks,
        showSaveApplyOpenVPNCallback: showSaveApplyOpenVPN,
        importOvpnClientProfileCallback: importOvpnClientProfile,
        instanceNumber: totalInstances + 1,
        overwrite: false,
        forcedScenario: null,
    });
    viewData.wizardClass.openWizardModal(wizardData, hideClient);
}

/**
 * Renders the main control and setup wizard box for OpenVPN
 */
const renderMainControlBox = function (initialRawState, addServerBtn, addClientBtn, devDataRaw, viewData) {
    const applyNotice = E('span', { 'class': 'text-danger', 'style': 'font-weight:bold; margin-left:15px; display:none;' }, ICON.WARNING + TXT.BTN.click_save_apply);
    const totalInstances = (viewData.sections && viewData.sections.length) ? viewData.sections.length : 0;

    const btnEnableOpenVPN = E('button', {
        'style': 'text-shadow:none !important; box-shadow:none !important; white-space:nowrap;'
    }, '');

    // Show Wizard button
    const openWizardBtn = E('button', {
        'class': 'cbi-button cbi-button-apply important',
        'style': 'text-shadow: none !important; ' +
            'box-shadow: 0 4px 6px -1px color-mix(in srgb, var(--action-bg, #00a8ff) 20%, transparent) !important; ' +
            'white-space: nowrap; ' +
            'padding: 6px 16px; ' +
            'font-weight: bold; ' +
            // FLEXBOX: keep icon in the middle
            'display: inline-flex; ' +
            'align-items: center; ' +
            'justify-content: center; ' +
            'gap: 8px;'
    }, [
        E('span', { 'style': 'font-size: 16px; line-height: 1;' }, ICON.ROCKET),
        E('span', {}, TXT.INFO.wizard + ' ...')
    ]);

    // Right control container with a crisp vertical layout to stack buttons
    const rightControlContainer = E('div', {
        'style': 'display:flex; flex-direction:column; gap:25px; align-items:stretch; margin-left:auto;'
    }, [
        openWizardBtn,
        btnEnableOpenVPN
    ]);

    // Set dynamic badge label based on the calculated three-way status
    let labelText = TXT.INFO.openvpn + ' (' + TXT.INFO.disabled + ')';
    if (initialRawState === 'active') {
        labelText = TXT.INFO.openvpn + ' (' + TXT.INFO.active + ')';
    } else if (initialRawState === 'error') {
        labelText = TXT.INFO.openvpn + ' (' + TXT.INFO.error + ')';
    } else if (initialRawState === 'pending') {
        labelText = TXT.INFO.openvpn + ' (' + TXT.INFO.starting + ')';
    }

    const badgeLabelNode = E('strong', {}, labelText);
    const badgeImgNode = E('img', { 'class': 'middle', 'style': 'width:48px; height:48px; vertical-align:middle;' });

    const boxHeadNode = E('div', {
        'class': 'ifacebox-head',
        'style': 'padding:3px 8px; font-size:12px; text-shadow:none !important;'
    }, [badgeLabelNode]);

    // Build the status summary tooltip overlay frame with completely empty placeholder text targets
    const tooltipBadgeNode = E('span', { 'class': 'cbi-tooltip ifacebadge large', 'style': 'text-align:left; font-weight:normal;' }, [
        E('img', { 'src': CFG.FILE.vpn_enabled_img, 'style': 'float:left; margin-right:10px; width:24px; height:24px;' }),
        E('span', { 'class': 'left', 'style': 'display:block; overflow:hidden;' }, [
            E('span', { 'class': 'nowrap' }, [E('strong', {}, TXT.INFO.type), 'OpenVPN Engine']), E('br'),
            E('span', { 'class': 'nowrap' }, [E('strong', {}, TXT.INFO.enabled), E('span', { 'id': 'mcb_val_enabled' }, '')]), E('br'),
            E('span', { 'class': 'nowrap' }, [E('strong', {}, TXT.INFO.instances), String(totalInstances)]), E('br'),
            E('span', { 'class': 'nowrap' }, [E('strong', {}, TXT.INFO.connected), E('span', { 'id': 'mcb_val_connected' }, '')]), E('br'),
            E('span', { 'class': 'nowrap' }, [E('strong', {}, TXT.INFO.active_pids), E('span', { 'id': 'mcb_val_pids' }, '')]), E('br'),
            E('span', { 'class': 'nowrap' }, [E('strong', {}, TXT.INFO.aggregated_rx), E('span', { 'id': 'mcb_val_rx' }, '')]), E('br'),
            E('span', { 'class': 'nowrap' }, [E('strong', {}, TXT.INFO.aggregated_tx), E('span', { 'id': 'mcb_val_tx' }, '')])
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

    // Apply corporate styles, action labels, and colors directly
    updateMainBoxVisuals(initialRawState, badgeLabelNode, badgeImgNode, boxHeadNode, btnEnableOpenVPN);

    btnEnableOpenVPN.addEventListener('click', function (ev) {
        ev.preventDefault();
        handelEnableOpenVPN(viewData.sections, ifaceBoxMasterNode, addServerBtn, addClientBtn, badgeLabelNode, badgeImgNode, boxHeadNode, applyNotice, btnEnableOpenVPN);
    });

    // Bind click handler to bridge execution flow into the separate wizard module class
    openWizardBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        openWizardBtnClick(viewData, totalInstances, false)
    });


    window.requestAnimationFrame(function () {
        // Pass viewData.instances straight through to the tooltip update layout
        updateMainBoxTooltip(initialRawState, totalInstances, viewData.instances, devDataRaw);
    });

    return E('div', { 'style': 'margin-bottom:25px; width:100%;' }, [
        E('h2', { 'style': 'color:var(--text-color, #334155); font-weight:bold; margin:0 0 10px 0; padding:0;' }, TXT.INFO.title_main),
        E('p', { 'style': 'font-style:normal; margin-bottom:20px; color:var(--text-color-light, #64748b);' }, TXT.MSG.manage_instance),
        E('fieldset', { 'class': 'class_fieldset', 'style': 'margin-bottom:5px; padding:0; border:0; background:transparent;' }, [
            E('div', { 'style': 'display:flex; align-items:flex-start; justify-content:space-between; padding:3px 0; margin:0; min-height:0; width:100%;' }, [
                E('div', { 'style': 'display:inline-flex; align-items:center;' }, [
                    ifaceBoxMasterNode, applyNotice
                ]),
                rightControlContainer
            ])
        ])
    ]);
};


/**
 * Refreshes the main control box and tooltip
 */
const refreshMainBoxVisuals = function (calculatedState, devDataRaw, viewData) {
    const totalInstances = viewData.sections.length;

    // 2. Push fresh metrics straight into the open tooltip elements
    updateMainBoxTooltip(calculatedState, totalInstances, viewData.instances, devDataRaw);

    // 3. Update the main control box state frame color only if state shifted
    const mainControlBox = document.getElementById(CFG.ID.main_control_box);
    if (mainControlBox && mainControlBox.firstChild) {
        const currentDomState = mainControlBox.getAttribute('data-current-state');

        if (currentDomState !== calculatedState) {
            const mainControlBoxNode = renderMainControlBox(calculatedState, null, null, devDataRaw, viewData);
            mainControlBox.replaceChild(mainControlBoxNode, mainControlBox.firstChild);
            mainControlBox.setAttribute('data-current-state', calculatedState);
        }
    }
};


/**
 * --- OPENVPN INSTANCES  ---
 */


/**
 * Get the next instance number of a new instance
 */
const getNextInstanceNumber = function (viewData) {
    const numMatch = (viewData.sections && viewData.sections.length > 0)
        ? viewData.sections[viewData.sections.length - 1]['.name'].match(/\d+$/)
        : null;

    return numMatch ? (parseInt(numMatch, 10) + 1) : 1;
}

/**
 * Renders the control row with Show, Download, and Upload buttons for the key files
 */
const renderKeyButtons = function (label, filename, instance_id, displayId, default_key, role, viewData, last_button) {
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

    // upload key file
    fileInput.addEventListener('change', function (ev) {
        const files = ev.target.files;
        if (!files || files.length === 0) return;

        uploadBtn.classList.add('disabled');
        statusMsg.textContent = TXT.BTN.saving;
        statusMsg.className = 'text-warning';
        const realPath = CFG.FILE.dir_keys + filename;
        const tmpFilename = filename + '.tmp';
        const tmpPath = CFG.FILE.dir_keys + tmpFilename;

        const reader = new FileReader();
        reader.onload = function (e) {

            // Standardize line endings instantly (Supports UNIX \n, Windows \r\n, and Mac \r)
            const sanitizedResult = sanitizeInputText(e.target.result);

            // Step 1: Upload to temporary file (Using our clean sanitized text string)
            L.fs.write(tmpPath, sanitizedResult)
                .then(function () {
                    // Step 2: Validate cryptographic metadata
                    return L.fs.exec(CFG.LIBEXEC.luci_app_openvpn, [CFG.LIBEXEC.keymeta, tmpFilename]);
                })
                .then(function (res) {
                    let rawMeta = '';
                    if (res && res.code === 0 && res.stdout) {
                        rawMeta = res.stdout;
                    }

                    // Check for syntax errors or corrupted format
                    if (rawMeta.indexOf('ERROR') !== -1 || rawMeta.trim() === '') {
                        L.fs.remove(tmpPath);
                        statusMsg.className = 'text-danger';
                        statusMsg.textContent = ICON.ERROR + ' ' + TXT.MSG.uploaded_file_invalid;
                        uploadBtn.classList.remove('disabled');
                        return Promise.reject(new Error(TXT.KEY.key_verification_failed));
                    }

                    let typeMismatch = false;

                    if (default_key === CFG.FILE.ca_def_crt || default_key === CFG.FILE.server_def_crt) {
                        if (rawMeta.indexOf('Public-Key') === -1) typeMismatch = true;
                    } else if (default_key === CFG.FILE.server_def_key) {
                        if (rawMeta.indexOf('Private-Key') === -1) typeMismatch = true;
                    } else if (default_key === CFG.FILE.dh_def_pem) {
                        if (rawMeta.indexOf('DH Parameters') === -1) typeMismatch = true;
                    } else if (default_key === CFG.FILE.tls_def_key) {
                        if (rawMeta.indexOf('Symmetric Static Secret') === -1) typeMismatch = true;
                    }

                    // Step 3: Show warning modal if key type mismatch occurs
                    if (typeMismatch) {
                        return new Promise(function (resolve, reject) {
                            L.showModal(ICON.WARNING + TXT.WARNING.key_upload_title, E('div', { 'class': 'cbi-modal' }, [
                                E('p', { 'style': 'margin-bottom: 12px; font-size: 13px; line-height: 1.4;' },
                                    TXT.WARNING.key_upload_nomatch
                                ),
                                E('p', { 'style': 'margin-bottom: 16px; font-size: 13px; color: var(--text-color-light, #64748b); line-height: 1.4;' },
                                    TXT.WARNING.key_upload_processing
                                ),
                                E('p', { 'style': 'font-weight: bold; color: var(--zone-wan-bg, #e74c3c); margin-bottom: 20px; font-size: 13px;' },
                                    TXT.WARNING.key_upload_save_anyway
                                ),
                                E('div', { 'class': 'right' }, [
                                    E('button', {
                                        'class': 'btn cbi-button-action important',
                                        'style': 'margin-right: 10px;',
                                        'click': function () {
                                            L.hideModal();
                                            L.fs.remove(tmpPath);
                                            statusMsg.className = 'text-danger';
                                            statusMsg.textContent = ICON.ERROR + ' ' + TXT.ERROR.wrong_key_type;
                                            uploadBtn.classList.remove('disabled');
                                            reject(new Error(TXT.ERROR.key_type_mismatch));
                                        }
                                    }, TXT.INFO.no),
                                    E('button', {
                                        'class': 'btn cbi-button-neutral',
                                        'click': function () {
                                            L.hideModal();
                                            resolve();
                                        }
                                    }, TXT.INFO.yes)
                                ])
                            ]));
                        });
                    }

                    return Promise.resolve();
                })
                .then(function () {
                    // Step 4: Move validated temporary file to real path
                    return L.fs.read(tmpPath).then(function (verifiedBlob) {
                        return L.fs.write(realPath, verifiedBlob).then(function () {
                            return L.fs.remove(tmpPath);
                        });
                    });
                })
                .then(function () {
                    statusMsg.className = 'text-success';
                    statusMsg.textContent = ICON.SUCCESS + TXT.BTN.saved + ' ' + ICON.WARNING + TXT.BTN.click_save_apply;

                    showSaveApplyOpenVPN(instance_id);
                })
                .catch(function (err) {
                    if (err.message !== TXT.KEY.key_verification_failed && err.message !== TXT.ERROR.key_type_mismatch) {
                        statusMsg.className = 'text-danger';
                        statusMsg.textContent = ICON.ERROR + ' ' + TXT.INFO.error + ': ' + err.message;
                    }
                })
                .finally(function () {
                    uploadBtn.classList.remove('disabled');
                });
        };

        reader.readAsText(files[0]);
    });

    // show key file
    showBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        viewData.keygenClass.openKeyEditorModal(filename, instance_id, displayId, role, showSaveApplyOpenVPN, L_fs_Callbacks);
    });

    // download key file
    downloadBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        L.resolveDefault(L.fs.read(CFG.FILE.dir_keys + filename), '').then(function (content) {
            if (!content) {
                if (L.ui && L.ui.addNotification) {
                    L.ui.addNotification(null, E('p', TXT.KEY.keyfile_not_exist), 'warning');
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

    let borderStyle;
    if (last_button) {
        borderStyle = "border:0;"
    } else {
        borderStyle = "border-bottom:1px dashed var(--border-color, #ced6e0);"
    }

    return E('div', {
        'style': 'display:flex; align-items:center; justify-content:space-between; padding:3px 0; margin:0; ' + borderStyle + ' min-height:0; width:100%;'
    }, [
        E('span', { 'style': 'font-size:13px; font-weight:normal; text-align:left; margin:0; padding:0; color:var(--text-color, #334155);' }, label),
        E('div', { 'style': 'display:inline-flex; align-items:center; margin:0; padding:0;' }, [
            showBtn, downloadBtn, uploadBtn, fileInput, statusMsg
        ])
    ]);
};

/**
 * Saves the modified configuration text and handles the instance restart logic
 */
const handleInstanceSave = async function (instance_id, role, txtArea, sBtn, sNotice, originalConfContent, modificationBoxNode, viewData, clientUpdateOnly) {
    // Clean and standardize all line endings instantly (Supports UNIX \n, Windows \r\n, and Mac \r)
    const newConfigContent = sanitizeInputText(txtArea.value) + '\n';
    const cleanOriginal = String(originalConfContent || '').trim() + '\n';
    const originalButtonText = sBtn.textContent;

    // Abort if no changes occurred inside the text area field
    if (newConfigContent === cleanOriginal) {
        sBtn.disabled = true;
        sBtn.textContent = ICON.INFO + TXT.INFO.no_changes_detected;

        setTimeout(function () {
            sBtn.disabled = false;
            sBtn.textContent = originalButtonText;
        }, 1500);
        return;
    }

    sBtn.disabled = true;
    sBtn.textContent = ICON.LOADING + TXT.INFO.creating;

    let setFirewallRules = false;

    let currentPort = viewData.statusClass.parsePortFromConfig(role, originalConfContent);
    if (!currentPort || isNaN(currentPort)) {
        currentPort = viewData.statusClass.calcPortFromId(instance_id);
    }
    const detectedPort = viewData.statusClass.parsePortFromConfig(role, newConfigContent);
    if (currentPort !== detectedPort && detectedPort && !isNaN(detectedPort)) {
        setFirewallRules = true;
    }

    const detectedProto = viewData.statusClass.parseProtoFromConfig(newConfigContent);
    const isCurrentlyEnabled = isInstanceEnabled(instance_id);

    if (setFirewallRules || isCurrentlyEnabled) {
        if (sNotice) {
            sNotice.style.display = 'inline-block';
        }
    }

    try {
        // Step 1: Write the finalized configuration file directly to the disk memory
        await L.fs.write(CFG.FILE.dir_cfg + instance_id + '.conf', newConfigContent);

        // Update the local instance port property inside the RAM cache instantly
        if (Array.isArray(viewData.instances)) {
            for (const instance of viewData.instances) {
                if (instance && instance.id === instance_id) {
                    instance.confContent = newConfigContent;
                    instance.port = detectedPort || currentPort;
                    break;
                }
            }
        }

        // Step 2: Handle asymmetric firewall rule sync inline if required
        if (setFirewallRules === true) {
            await syncInstanceFirewallRule(role, instance_id, detectedPort, detectedProto, viewData);
        }

        // Step 3: Trigger changes system banner and restart workflow if needed
        if (setFirewallRules || isCurrentlyEnabled) {
            showSaveApplyOpenVPN(instance_id);
        } else {
            if (modificationBoxNode && typeof modificationBoxNode.setAttribute === 'function') {
                modificationBoxNode.setAttribute('data-original-content', newConfigContent);
            }
        }

        // Compilation finished successfully
        sBtn.textContent = ICON.SUCCESS + TXT.BTN.saved;

    } catch (err) {
        // Universal catch block intercepts all disk or firewall RPC failures
        console.error('Failed to write OpenVPN configuration for ' + instance_id + ':', err);
        sBtn.textContent = ICON.ERROR + TXT.INFO.error;

    } finally {
        setTimeout(function () {
            sBtn.disabled = false;
            sBtn.textContent = originalButtonText;
            if (sNotice) {
                sNotice.style.display = 'none';
            }
        }, 1500);
    }
};

/**
 * Deletes an OpenVPN instance and its firewall rules
 */
const handleInstanceDeletion = function (instance_id, displayId, dBtn, dNotice, sectionRootNode) {
    if (window.confirm(TXT.MSG.confirm_del + displayId + '?')) {
        dBtn.disabled = true;
        dNotice.style.display = 'inline-block';

        L.ui.changes.init().then(function () {
            L.uci.remove(CFG.CMD.openvpn, instance_id);
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
            dBtn.textContent = ICON.SUCCESS + TXT.BTN.del_ready;
        }).catch(function (err) {
            console.error('Failed to delete OpenVPN instance ' + instance_id + ':', err);
        }).finally(function () {
            dNotice.style.display = 'none';
            dBtn.disabled = false;
        });
    }
};

/**
 * Shows the collapsible box containing all cryptographic key files, keeping control buttons always visible.
 */
const renderKeysBox = function (instance_id, displayId, role, ovpnProfileBtn, keygenBtn, viewData) {
    const isServer = (role === OPENVPN.ROLE.SERVER);
    const certLabel = isServer ? TXT.KEY.server_crt : TXT.KEY.client_certificate;
    const keyLabel = isServer ? TXT.KEY.server_key : TXT.KEY.private_client_key;
    const rolePrefix = role + '_';

    // 1. Create the detailed content wrapper for the key lines (Hidden by default)
    const keysContentContainer = E('div', {
        'style': 'margin-bottom:10px; display:none;'
    }, [
        renderKeyButtons(ICON.POINT + TXT.KEY.ca + ' (ca_' + instance_id + '.crt)', 'ca_' + instance_id + '.crt', instance_id, displayId, CFG.FILE.ca_def_crt, role, viewData, false),
        renderKeyButtons(ICON.POINT + certLabel + ' (' + rolePrefix + instance_id + '.crt)', rolePrefix + instance_id + '.crt', instance_id, displayId, CFG.FILE.server_def_crt, role, viewData, false),
        renderKeyButtons(ICON.POINT + keyLabel + ' (' + rolePrefix + instance_id + '.key)', rolePrefix + instance_id + '.key', instance_id, displayId, CFG.FILE.server_def_key, role, viewData, false),
        (role === OPENVPN.ROLE.SERVER) ? renderKeyButtons(ICON.POINT + TXT.KEY.dh + ' (dh_' + instance_id + '.pem)', 'dh_' + instance_id + '.pem', instance_id, displayId, CFG.FILE.dh_def_pem, role, viewData, false) : '',
        renderKeyButtons(ICON.POINT + TXT.KEY.tls + ' (tls-crypt_' + instance_id + '.key)', 'tls-crypt_' + instance_id + '.key', instance_id, displayId, CFG.FILE.tls_def_key, role, viewData, true)
    ]);

    // Generate the compact inline summary string for the collapsed state
    let summaryTextString = ICON.POINT + TXT.KEY.ca + ' (ca_' + instance_id + '.crt) | ' +
        ICON.POINT + certLabel + ' (' + rolePrefix + instance_id + '.crt) | ' +
        ICON.POINT + keyLabel + ' (' + rolePrefix + instance_id + '.key) | ';

    if (role === OPENVPN.ROLE.SERVER) {
        summaryTextString += ICON.POINT + TXT.KEY.dh + ' (dh_' + instance_id + '.pem) | ';
    }
    summaryTextString += ICON.POINT + TXT.KEY.tls + ' (tls-crypt_' + instance_id + '.key)';

    // 2. Create the element node for the inline flat text string view (Visible by default)
    const inlineSummaryLine = E('div', {
        'style': 'width:100%; display:block; font-size:11px; font-family:var(--font-monospace, monospace); color:var(--text-color-light, #64748b); padding:4px 5px; margin-bottom:8px; white-space:normal; word-break:break-all;'
    }, summaryTextString);

    // 3. Create a dynamic text indicator (arrow) to show the toggle state
    const toggleArrow = E('span', {
        'style': 'margin-right:8px; font-size:11px; cursor:pointer; user-select:none;'
    }, '▶ ');

    // 4. Assemble the interactive clickable title bar header
    const clickableTitle = E('legend', {
        'style': 'font-weight:bold; font-size:13px; padding:0 8px; color:var(--text-color, #334155); cursor:pointer; user-select:none;',
        'click': function () {
            const isHidden = (keysContentContainer.style.display === 'none');

            if (isHidden) {
                keysContentContainer.style.display = 'block';
                inlineSummaryLine.style.display = 'none'; // Hide text row when box expands
                toggleArrow.textContent = '▼ ';
            } else {
                keysContentContainer.style.display = 'none';
                inlineSummaryLine.style.display = 'block'; // Show text row when box collapses
                toggleArrow.textContent = '▶ ';
            }
        }
    }, [
        toggleArrow,
        TXT.KEY.openvpn_keys
    ]);

    // 5. Return the finalized structural component layout frame
    return E('fieldset', {
        'class': 'cbi-section-fieldset',
        'style': 'margin-bottom:20px; padding:15px; border:1px solid var(--border-color, #cbd5e1); border-radius:4px; background:var(--background-color, transparent);'
    }, [
        clickableTitle,
        E('div', { 'class': 'cbi-section-node', 'style': 'padding:0 5px;' }, [
            // Structural layout sorting slots
            keysContentContainer,
            inlineSummaryLine,

            // The action buttons container remains outside the collapsible block (always visible)
            E('div', { 'style': 'width:100%; display:block; overflow:hidden; border-top:1px dashed var(--border-color, #cbd5e1); padding-top:5px; margin-top:0px;' }, [
                ovpnProfileBtn,
                ((role === OPENVPN.ROLE.SERVER) ? keygenBtn : '')
            ])
        ])
    ]);
};

/**
 * Shows the collapsible fieldset text box for editing the configuration file
 */
const renderConfigEditor = function (instance_id, txtArea) {
    // 1. Create the content wrapper that will be hidden or shown
    const contentContainer = E('div', {
        'style': 'padding:0 2px; display:none;'
    }, [txtArea]);

    // Matches the exact style of inlineSummaryLine and stays ALWAYS visible
    const configPathLine = E('div', {
        'style': 'width:100%; display:block; font-size:11px; font-family:var(--font-monospace, monospace); color:var(--text-color-light, #64748b); padding:4px 2px; margin-bottom:10px; white-space:normal; word-break:break-all; font-style:italic;'
    }, ICON.POINT + CFG.FILE.dir_cfg + instance_id + '.conf');

    // 2. Create a dynamic text indicator (arrow) to show the state
    const toggleArrow = E('span', {
        'style': 'margin-right:8px; font-size:11px; cursor:pointer; user-select:none; transition:transform 0.2s;'
    }, '▶ ');

    // 3. Assemble the interactive clickable title bar header
    const clickableTitle = E('legend', {
        'style': 'font-weight:bold; font-size:13px; padding:0 8px; color:var(--text-color, #334155); cursor:pointer; user-select:none;',
        'click': function () {
            const isHidden = (contentContainer.style.display === 'none');

            if (isHidden) {
                contentContainer.style.display = 'block';
                toggleArrow.textContent = '▼ ';
            } else {
                contentContainer.style.display = 'none';
                toggleArrow.textContent = '▶ ';
            }
        }
    }, [
        toggleArrow,
        TXT.MSG.edit_config
    ]);

    // 4. Return the finalized structural component frame fieldset
    return E('fieldset', {
        'class': 'cbi-section-fieldset',
        'style': 'margin-bottom:20px; padding:15px; border:1px solid var(--border-color, #cbd5e1); border-radius:4px; background:var(--background-color, transparent);'
    }, [
        clickableTitle,
        E('div', { 'class': 'cbi-section-node', 'style': 'padding:0 5px;' }, [
            configPathLine, // Always stays on top of the elements container block
            contentContainer
        ])
    ]);
};

/**
 * Renders the configuration box for a single OpenVPN instance
 */
const renderInstanceBox = function (s, idx, viewData) {
    const instance_id = s['.name'];
    let instObj = {};
    if (Array.isArray(viewData.instances)) {
        for (let i = 0; i < viewData.instances.length; i++) {
            if (viewData.instances[i].id === instance_id) {
                instObj = viewData.instances[i];
                break;
            }
        }
    }
    const role = instObj.role || OPENVPN.ROLE.SERVER;
    const confContent = instObj.confContent || '';
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    const instNum = viewData.statusClass.getInstanceNumber(instance_id, idx + 1);
    const customDisplayName = L.uci.get(CFG.CMD.openvpn, instance_id, 'displayname') || '';
    const displayId = customDisplayName || (TXT.INFO.instance_x + instNum);
    instObj.displayName = displayId;

    const sectionHeadingText = customDisplayName
        ? customDisplayName + ' (' + roleLabel + ')'
        : displayId + ' - ' + roleLabel;

    // Create the name text input field
    const nameInput = E('input', {
        'type': 'text',
        'class': 'cbi-input-text',
        'placeholder': TXT.INFO.instance_x + instNum,
        'value': customDisplayName,
        'style': 'width: 140px; margin-right: 15px; padding: 2px 6px; font-size: 12px; border-radius: 3px; border: 1px solid var(--border-color, #cbd5e1); background: var(--background-color, #ffffff); color: var(--text-color, #334155);'
    });

    nameInput.addEventListener('change', function (ev) {
        const cleanName = sanitizeInputLine(ev.target.value);
        L.uci.set(CFG.CMD.openvpn, instance_id, 'displayname', cleanName ? cleanName : null);
        L.uci.save();
        instObj.displayName = cleanName || (TXT.INFO.instance_x + instNum);
        if (L.ui && L.ui.changes && typeof L.ui.changes.init === 'function') {
            L.ui.changes.init().then(function () {
                if (typeof L.ui.changes.displayChanges === 'function') L.ui.changes.displayChanges();
            });
        }
    });

    // Create the activation checkbox flag
    const isEnabled = isInstanceEnabled(instance_id);
    const instanceCheckbox = E('input', {
        'type': 'checkbox',
        'id': 'cb_enabled_' + instance_id,
        'style': 'margin-right: 6px; cursor: pointer; width: 16px; height: 16px; vertical-align: middle;',
        'checked': isEnabled ? 'checked' : null
    });

    instanceCheckbox.addEventListener('change', function (ev) {
        L.uci.set(CFG.CMD.openvpn, instance_id, 'enabled', ev.target.checked ? '1' : '0');
        L.uci.save();
        if (L.ui && L.ui.changes && typeof L.ui.changes.init === 'function') {
            L.ui.changes.init().then(function () {
                if (typeof L.ui.changes.displayChanges === 'function') L.ui.changes.displayChanges();
            });
        }
    });

    const checkboxContainer = E('label', {
        'for': 'cb_enabled_' + instance_id,
        'style': 'display: inline-flex; align-items: center; cursor: pointer; font-size: 13px; font-weight: bold; color: var(--text-color, #334155);'
    }, [instanceCheckbox, E('span', {}, TXT.BTN.enabled)]);

    // Create the key generator button
    const keygenBtn = E('button', {
        'class': 'cbi-button cbi-button-apply important',
        'style': 'float: right; margin: 10px 10px 0 0;'
    }, TXT.KEY.keygen);

    keygenBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        viewData.keygenClass.openKeyGenModal(instance_id, instObj.displayName, role, viewData, showSaveApplyOpenVPN, L_fs_Callbacks);
    });

    // Create the main configuration text box field
    const txtArea = E('textarea', {
        'class': 'cbi-input-textarea',
        'style': 'width:100%; font-family:var(--font-monospace, monospace); font-size:12px; background:var(--background-color, #fafafa); color:var(--text-color, #334155); padding:12px; border-radius:4px; border:1px solid var(--border-color, #cbd5e1); text-shadow:none !important;',
        'rows': '15',
        'wrap': 'off'
    }, confContent);

    // Instantiate the independent alert component directly from the wizard module class
    const portForwardingAlert = viewData.wizardClass.renderPortForwardingAlert(true, networkCallbacks);

    const runLiveDashboardPortCheck = function () {
        portForwardingAlert.check(
            instObj.proto || OPENVPN.PROTO.UDP,
            role,                   // Directly uses 'server' or 'client'
            instObj.port || OPENVPN.PORT.s1194,
            instObj.portExtern || OPENVPN.PORT.s1194,
            false, false
        );
    };
    // Trigger the port warning test instantly on interface instantiation
    runLiveDashboardPortCheck();

    // Listen to manual typing inside the configuration text area field to update ports on the fly
    txtArea.addEventListener('input', runLiveDashboardPortCheck);

    const sBtn = E('button', { 'class': 'btn cbi-button cbi-button-save' }, TXT.BTN.save_config + ': ' + displayId);
    const cNotice = E('span', { 'class': 'text-danger', 'style': 'font-weight:bold; margin-left:15px; display:none;' }, ICON.WARNING + ' ' + TXT.BTN.click_save_apply);
    const dNotice = E('span', { 'class': 'text-danger', 'style': 'font-weight:bold; font-size:12px; display:none;' }, ICON.WARNING + ' ' + TXT.BTN.click_save_apply);
    const dBtn = E('button', { 'class': 'btn cbi-button cbi-button-remove', 'style': 'float:right;' }, TXT.BTN.del_instance);

    let ovpnProfileBtn = '';
    if (role === OPENVPN.ROLE.SERVER) {
        ovpnProfileBtn = E('button', {
            'class': 'btn cbi-button cbi-button-positive important',
            'style': 'float: right; margin: 10px 10px 0 0;'
        }, TXT.MSG.export_ovpn);
        ovpnProfileBtn.addEventListener('click', function (ev) {
            ev.preventDefault();
            const instanceSaveParams = {
                role: role,
                txtArea: txtArea,
                sBtn: sBtn,
                cNotice: cNotice,
                sectionRootNode: sectionRootNode
            };
            downloadClientOvpnProfile(instance_id, instObj, customDisplayName, viewData, instanceSaveParams);
        });
    } else {
        ovpnProfileBtn = E('button', {
            'class': 'btn cbi-button cbi-button-positive important',
            'style': 'float: right; margin: 10px 10px 0 0;'
        }, TXT.MSG.import_ovpn);
        ovpnProfileBtn.addEventListener('click', function (ev) {
            ev.preventDefault();
            const wizardData = Object.assign({}, viewData.wizardClass.WIZARD_DATA_TEMPLATE, {
                viewData: viewData,
                addNewInstanceCallback: addNewInstance,
                networkCallbacks: networkCallbacks,
                showSaveApplyOpenVPNCallback: showSaveApplyOpenVPN,
                importOvpnClientProfileCallback: importOvpnClientProfile,
                instanceNumber: instNum,
                overwrite: true,
                forcedScenario: 'sitetosite_client'
            });
            viewData.wizardClass.openWizardModal(wizardData);
        });
    }

    // Build the main frame section layout
    const sectionRootNode = E('div', {
        'class': 'cbi-section',
        'id': 'modification_section_' + instance_id,
        'style': 'margin:40px 0; border:1px solid var(--border-color, #e2e8f0); border-radius:6px; background:var(--background-color, transparent); overflow:hidden; position:relative;'
    }, [
        E('div', {
            'style': 'display: flex; align-items: center; justify-content: space-between; background: var(--background-color-muted, #f8fafc); border-bottom: 1px solid var(--border-color, #e2e8f0); padding: 10px 20px; margin: 0;'
        }, [
            E('h3', { 'style': 'margin: 0; font-weight: bold; font-size: 16px; border: none; padding: 0; color: var(--text-color, #334155);' }, sectionHeadingText),
            E('div', { 'style': 'display: inline-flex; align-items: center;' }, [nameInput, checkboxContainer])
        ]),

        // BODY WRAPPER: Implements a clean unified padding area exclusively for the lower configuration elements
        E('div', { 'style': 'padding: 20px;' }, [

            portForwardingAlert.node,

            renderKeysBox(instance_id, displayId, role, ovpnProfileBtn, keygenBtn, viewData),

            renderConfigEditor(instance_id, txtArea),

            E('div', { 'style': 'width:100%; display:block; margin-top:20px; overflow:hidden;' }, [sBtn, cNotice, dNotice, dBtn])
        ])
    ]);

    sectionRootNode.setAttribute('data-original-content', confContent);

    sBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        const freshOriginalText = sectionRootNode.getAttribute('data-original-content') || '';
        handleInstanceSave(instance_id, role, txtArea, sBtn, cNotice, freshOriginalText, sectionRootNode, viewData);
    });

    dBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        handleInstanceDeletion(instance_id, displayId, dBtn, dNotice, sectionRootNode);
    });

    return sectionRootNode;
};

/**
 * Subroutine of addNewInstance to create a new OpenVPN instance and its firewall rules safely.
 */
const createInstance = async function (newInstanceItem, viewData, wizardParams) {

    // Use await to generate all initial configuration and key assets lineary
    await syncInstanceFiles(newInstanceItem, viewData, wizardParams);

    // Add the new section row identity block into the local UCI cache matrix
    L.uci.add(CFG.CMD.openvpn, CFG.CMD.openvpn, newInstanceItem.id);

    let targetEnabledState = '0';
    if (wizardParams) {
        targetEnabledState = '1';
    } else if (viewData.sections) {
        if (viewData.sections.length === 0) {
            targetEnabledState = '1';
        } else {
            const lastActiveId = viewData.sections[viewData.sections.length - 1]['.name'];
            if (isInstanceEnabled(lastActiveId)) {
                targetEnabledState = '1';
            }
        }
    }

    L.uci.set(CFG.CMD.openvpn, newInstanceItem.id, 'enabled', targetEnabledState);
    L.uci.set(CFG.CMD.openvpn, newInstanceItem.id, 'role', newInstanceItem.role);
    L.uci.set(CFG.CMD.openvpn, newInstanceItem.id, 'config', CFG.FILE.dir_cfg + newInstanceItem.id + '.conf');

    if (newInstanceItem.role === OPENVPN.ROLE.SERVER) {
        L.uci.set(CFG.CMD.openvpn, newInstanceItem.id, 'status', 'openvpn.' + newInstanceItem.id + '.status');
        L.uci.set(CFG.CMD.openvpn, newInstanceItem.id, 'status_version', '1'); // Enforces CSV matrix structure
    }

    if ((wizardParams) && (wizardParams.displayName)) {
        L.uci.set(CFG.CMD.openvpn, newInstanceItem.id, 'displayname', wizardParams.displayName);
    }

    // Push the item into viewData.instances right before saving to keep browser RAM synchronous
    if (Array.isArray(viewData.instances)) {
        viewData.instances.push(newInstanceItem);
    }

    // Await the firewall zone bridge creations before closing the transaction layer
    await syncInstanceFirewallRule(newInstanceItem.role, newInstanceItem.id, newInstanceItem.port, newInstanceItem.proto, viewData);

    L.uci.save();
}

/**
 * Core routine to create a new OpenVPN instance and its firewall rules safely.
 */
const addNewInstance = async function (roleType, viewData, wizardParams, optionalShowBtnCancel) {

    const nextNum = getNextInstanceNumber(viewData);
    const nextId = 'instance' + nextNum;

    const newInstanceItem = Object.assign({}, viewData.statusClass.INSTANCE_TEMPLATE, {
        id: nextId,
        instNum: nextNum,
        role: roleType,
    });

    // Trigger the automated key allocation modal for ALL server installations
    if ((newInstanceItem.role === OPENVPN.ROLE.SERVER) || ((wizardParams) && (wizardParams.role === OPENVPN.ROLE.SERVER))) {

        const callbacks = ({
            openWizardBtnClick: openWizardBtnClick,
            L_fs_Callbacks: L_fs_Callbacks,
            showSaveApplyOpenVPN: showSaveApplyOpenVPN,
            createInstance: createInstance,
        });

        viewData.keygenClass.openAutomatedPostKeyGenModal(newInstanceItem, viewData, wizardParams, callbacks, optionalShowBtnCancel);

    } else {
        await createInstance(newInstanceItem, viewData, wizardParams);
        showSaveApplyOpenVPN(newInstanceItem.id);
    }

    return newInstanceItem.id;
};

/**
 * Opens a window to import a client profile or use default files
 */
const openManualClientImportModal = function (viewData) {

    const fileInput = E('input', {
        'type': 'file',
        'accept': '.ovpn',
        'style': 'width:100%; font-weight:bold; margin-top:10px;'
    });

    const infoText = E('div', { 'class': 'cbi-value-description', 'style': 'margin-bottom:15px; line-height:1.5;' },
        TXT.KEY.client_connection_needs_server_key_and_config
    );

    const importBtn = E('button', {
        'class': 'cbi-button cbi-button-action important',
        'style': 'margin-right:10px;'
    }, TXT.MSG.import_profile);

    const fallbackBtn = E('button', {
        'class': 'cbi-button cbi-button-neutral',
        'style': 'margin-right:10px;'
    }, TXT.BTN.use_fallback);

    const cancelBtn = E('button', {
        'class': 'cbi-button cbi-button-neutral'
    }, TXT.BTN.cancel);

    const nextNum = getNextInstanceNumber(viewData);
    const targetInstanceId = 'instance' + nextNum;

    // Reverts to the default standard loopback configuration
    const loadDefaultFallbackKeys = function () {
        L.ui.hideModal();
        addNewInstance(OPENVPN.ROLE.CLIENT, viewData, null);
    };

    // Pure cancel event: just closes the modal layout without creating any instance
    const handlePureCancel = function () {
        L.ui.hideModal();
    };

    // Attach the asynchronous click handler to manage file processing safely
    importBtn.addEventListener('click', function () {
        const files = fileInput.files;
        if (!files || files.length === 0) {
            L.ui.addNotification(null, E('p', {}, TXT.KEY.please_select_valid_ovpn_profile), 'warning');
            return;
        }

        // Enforce strict double-click protection by disabling the element immediately
        importBtn.disabled = true;

        // Render the native OpenWrt loading spinner dynamically inside the button layout
        importBtn.textContent = '';
        importBtn.appendChild(E('span', {}, [ICON.LOADING, TXT.MSG.importing_profile]));

        const reader = new FileReader();
        reader.onload = function (e) {
            const fileText = sanitizeInputText(e.target.result);

            // Execute the internal profile parser to distribute keys into system folders
            importOvpnClientProfile(fileText, targetInstanceId)
                .then(function (extractedParams) {
                    L.ui.hideModal();

                    // Safely merge the structural database template with our new parsed parameters
                    const wizardParams = Object.assign({}, viewData.wizardClass.WIZARD_PARAMS_TEMPLATE, {
                        role: OPENVPN.ROLE.CLIENT,
                        port: extractedParams.port,
                        proto: extractedParams.proto,
                        displayName: extractedParams.cname || TXT.MSG.imported_client,
                        strategy: OPENVPN.STRATEGY.STANDARD,
                        remoteServer: extractedParams.remoteServer,
                        isApMode: false,
                        ddnsOrPublicIp: '',
                        importedRawOvpn: fileText || ''
                    });

                    return addNewInstance(OPENVPN.ROLE.CLIENT, viewData, wizardParams);
                })
                .catch(function (parseErr) {
                    // Restore the structural integrity of the UI element upon failure
                    importBtn.disabled = false;
                    importBtn.textContent = TXT.MSG.import_profile;

                    L.ui.addNotification(null, E('p', {}, TXT.WARNING.import_parser_failed + parseErr.message + TXT.WARNING.reverting_to_fallback_config), 'warning');
                    loadDefaultFallbackKeys();
                });
        };
        reader.readAsText(files[0]);
    });

    // Connect the buttons to their independent functions
    fallbackBtn.addEventListener('click', loadDefaultFallbackKeys);
    cancelBtn.addEventListener('click', handlePureCancel);

    // Render the complete client import window layout
    L.ui.showModal(ICON.IMPORT + TXT.MSG.import_openvpn_connect_client_profile, [
        E('div', { 'class': 'cbi-map' }, [
            E('div', { 'class': 'cbi-section' }, [
                infoText,
                E('div', { 'class': 'cbi-value' }, [
                    E('label', { 'class': 'cbi-value-title' }, TXT.MSG.select_profile_ovpn),
                    E('div', { 'class': 'cbi-value-field' }, [fileInput])
                ]),
                E('div', { 'style': 'text-align:right; margin-top:20px; border-top:1px solid var(--border-color, #cbd5e1); padding-top:12px;' }, [
                    importBtn,
                    fallbackBtn,
                    cancelBtn
                ])
            ])
        ])
    ]);
};

/**
 * Renders the creation box containing buttons to add new profiles
 */
const renderInstanceCreationBox = function (viewData) {
    const addServerBtn = E('button', { 'class': 'btn cbi-button cbi-button-positive important' }, TXT.BTN.add_server);
    const addClientBtn = E('button', { 'class': 'btn cbi-button cbi-button-action important' }, TXT.BTN.add_client);

    const addServerNotice = E('span', { 'class': 'text-danger', 'style': 'font-weight:bold; margin-left:10px; display:none;' }, ICON.WARNING + ' ' + TXT.BTN.click_save_apply);
    const addClientNotice = E('span', { 'class': 'text-danger', 'style': 'font-weight:bold; margin-left:10px; display:none;' }, ICON.WARNING + ' ' + TXT.BTN.click_save_apply);

    // Start the regular server creation flow when clicking the server button
    addServerBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        addNewInstance(OPENVPN.ROLE.SERVER, viewData, null, true);
    });

    // Start the import modal flow directly when clicking the client button
    addClientBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        openManualClientImportModal(viewData);
    });

    return E('div', { 'class': 'cbi-map' }, [
        E('div', { 'class': 'cbi-section' }, [
            E('h3', { 'style': 'color:var(--text-color, #334155); font-weight:bold;' }, TXT.INFO.title_instance),
            E('div', { 'style': 'margin-top:10px; display:flex; align-items:center; flex-wrap:wrap; gap:10px;' }, [
                E('div', { 'style': 'display:inline-flex; align-items:center;' }, [addServerBtn, addServerNotice]),
                E('div', { 'style': 'display:inline-flex; align-items:center;' }, [addClientBtn, addClientNotice])
            ])
        ])
    ]);
};


/**
 * --- FIREWALL & LOG VIEW  ---
 */


/**
 * Creates or updates the inbound firewall rule for an OpenVPN instance (Asynchronous)
 */
const syncInstanceFirewallRule = async function (role, instance_id, customPort, customProto, viewData) {
    const fwRuleSection = 'openvpn_rule_' + instance_id;
    const fwZoneSection = 'openvpn_zone_' + instance_id;
    const fwForwardLanSection = 'openvpn_fwd_lan_' + instance_id;
    const fwForwardVpnSection = 'openvpn_fwd_vpn_' + instance_id;

    let targetPort = customPort;
    if (!targetPort || isNaN(targetPort)) {
        targetPort = viewData.statusClass.calcPortFromId(instance_id);
    }

    let targetProto = customProto;
    if (!targetProto || (targetProto !== OPENVPN.PROTO.UDP && targetProto !== OPENVPN.PROTO.TCP)) {
        targetProto = OPENVPN.PROTO.UDP;
    }

    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

    // 1. Always create the inbound rule on the WAN interface to allow the tunnel connection
    L.uci.add(CFG.CMD.firewall, 'rule', fwRuleSection);
    L.uci.set(CFG.CMD.firewall, fwRuleSection, 'name', 'OpenVPN-' + roleLabel + '-' + instance_id);
    L.uci.set(CFG.CMD.firewall, fwRuleSection, 'src', 'wan');
    L.uci.set(CFG.CMD.firewall, fwRuleSection, 'dest_port', String(targetPort));
    L.uci.set(CFG.CMD.firewall, fwRuleSection, 'proto', targetProto);
    L.uci.set(CFG.CMD.firewall, fwRuleSection, 'target', 'ACCEPT');

    // 2. Process routing table adjustments based on the current instance role mapping
    if (role === OPENVPN.ROLE.SERVER) {
        // Example: instance1 -> tun0, instance2 -> tun1

        const deviceName = 'tun' + (viewData.statusClass.getInstanceNumber(instance_id) - 1).toString();
        const zoneName = 'vpn_zone_' + instance_id;

        try {
            // Inline tracking pauses the engine until the network structure scan finishes
            const networkState = await checkNetworkStructure();

            // Create a separate, secure firewall zone for the VPN tunnel network
            L.uci.add(CFG.CMD.firewall, 'zone', fwZoneSection);
            L.uci.set(CFG.CMD.firewall, fwZoneSection, 'name', zoneName);
            L.uci.set(CFG.CMD.firewall, fwZoneSection, 'device', deviceName);
            L.uci.set(CFG.CMD.firewall, fwZoneSection, 'input', 'ACCEPT');
            L.uci.set(CFG.CMD.firewall, fwZoneSection, 'output', 'ACCEPT');
            L.uci.set(CFG.CMD.firewall, fwZoneSection, 'forward', 'ACCEPT');
            L.uci.set(CFG.CMD.firewall, fwZoneSection, 'mtu_fix', '1');
            L.uci.set(CFG.CMD.firewall, fwZoneSection, 'masq', '1');

            // Resolve the main LAN zone safely
            const fwSections = L.uci.sections(CFG.CMD.firewall, 'zone') || [];
            let lanSectionId = null;

            for (let z = 0; z < fwSections.length; z++) {
                if (fwSections[z] && fwSections[z].name === 'lan') {
                    lanSectionId = fwSections[z]['.name'];
                    break;
                }
            }

            // Apply masquerade rules targeting the explicit LAN configuration sector securely
            if (lanSectionId) {
                if (networkState.apMode === true || networkState.doubleNat === true) {
                    L.uci.set(CFG.CMD.firewall, lanSectionId, 'masq', '1');
                } else {
                    L.uci.set(CFG.CMD.firewall, lanSectionId, 'masq', '0');
                }
            }

            // Allow data traffic to flow from your local LAN into the VPN tunnel zone
            L.uci.add(CFG.CMD.firewall, 'forwarding', fwForwardLanSection);
            L.uci.set(CFG.CMD.firewall, fwForwardLanSection, 'src', 'lan');
            L.uci.set(CFG.CMD.firewall, fwForwardLanSection, 'dest', zoneName);

            // Allow data traffic to flow back from the VPN tunnel zone into your local LAN
            L.uci.add(CFG.CMD.firewall, 'forwarding', fwForwardVpnSection);
            L.uci.set(CFG.CMD.firewall, fwForwardVpnSection, 'src', zoneName);
            L.uci.set(CFG.CMD.firewall, fwForwardVpnSection, 'dest', 'lan');

            L.uci.save();
            return true;
        } catch (err) {
            console.error('Firewall network state validation failed:', err);
            L.uci.save();
            return false;
        }

    } else {
        // Clean up the routing sections if the instance is just a client tunnel
        L.uci.remove(CFG.CMD.firewall, fwZoneSection);
        L.uci.remove(CFG.CMD.firewall, fwForwardLanSection);
        L.uci.remove(CFG.CMD.firewall, fwForwardVpnSection);

        L.uci.save();
        return true;
    }
};

/**
 * Removes all custom firewall rules and zones for a specific OpenVPN profile
 */
const removeInstanceFirewallRule = function (instance_id) {
    // Delete the inbound WAN rule block
    L.uci.remove(CFG.CMD.firewall, 'openvpn_rule_' + instance_id);

    // Delete the site-to-site zone and forwarding blocks completely
    L.uci.remove(CFG.CMD.firewall, 'openvpn_zone_' + instance_id);
    L.uci.remove(CFG.CMD.firewall, 'openvpn_fwd_lan_' + instance_id);
    L.uci.remove(CFG.CMD.firewall, 'openvpn_fwd_vpn_' + instance_id);
};

/**
 * Renders the firewall information box displaying active ports.
 */
const renderFirewallInfoBox = function () {
    const customPortsMap = {};
    const allRules = L.uci.sections(CFG.CMD.firewall, 'rule') || [];

    // Scan all active openvpn firewall sections dynamically
    allRules.forEach(function (r) {
        const sectionName = r['.name'] || '';
        if (sectionName.indexOf('openvpn_') === 0 || sectionName.indexOf('openvpn_rule_') === 0) {
            const pVal = L.uci.get(CFG.CMD.firewall, sectionName, 'dest_port');
            let protoVal = L.uci.get(CFG.CMD.firewall, sectionName, 'proto') || OPENVPN.PROTO.UDP;

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
            E('strong', {}, ICON.CHECK + TXT.FIREWALL.automated_zone_setup), TXT.FIREWALL.secure_firewall_for_all,
            E('code', { 'title': TXT.FIREWALL.openvpn_tunnel_interface, 'style': 'cursor:help; border-bottom:1px dashed var(--text-color-light, #64748b);' }, 'tun+'), TXT.FIREWALL.devices_autocreated,
            E('div', { 'style': 'margin-top: 8px;' }),
            E('strong', {}, ICON.CHECK + TXT.FIREWALL.inbound_access), TXT.FIREWALL.wan_ports, activeRulesArray.length > 0 ? E('code', {}, activeRulesArray.join(', ')) : E('code', {}, 'None'), TXT.FIREWALL.auto_open_secure_connection,
            E('div', { 'style': 'margin-top: 8px;' }),
            E('strong', {}, ICON.HINT + TXT.FIREWALL.check_traffic_rules), TXT.FIREWALL.network, ICON.ARROW, TXT.FIREWALL.firewall,
            E('a', { 'href': L.url('admin/network/firewall/rules'), 'style': 'font-weight:bold; color:var(--action-bg, #00a8ff); text-decoration:none;' }, ICON.FORWARD + TXT.FIREWALL.traffic_rules)
        ])
    ]);
};

/**
 * Reads system logs of the OpenVPN service from ubus with a fallback to the logread command (replaces 'logread -e openvpn' shell calls).
 */
const callLogRead = function (options) {
    const pattern = (options && options.pattern) ? options.pattern : CFG.CMD.openvpn;

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
            // Fallback to logread binary if ubus returns empty or permissions are restricted
            return L.resolveDefault(L.fs.exec(CFG.CMD.logread, ['-e', pattern]), '')
                .then(function (execRes) {
                    return execRes.stdout || '';
                });
        });
};

/**
 * Applies syntax highlighting to individual log entries using strict regular expressions.
 */
const colorizeLogLines = function (text) {
    if (!text) {
        return '';
    }

    return text.split('\n').map(function (line) {
        let cleanLine = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Filter out system messages that are not important for the user
        if ((cleanLine.indexOf('--script-security') !== -1) ||
            (cleanLine.indexOf('Using AF_INET') !== -1) ||
            (cleanLine.indexOf('pool size limits') !== -1)) {
            return null;
        }

        // 1. Show openvpn-luci script messages in purple color (highest priority)
        if (/openvpn-luci/i.test(cleanLine)) {
            return '<span style="color: var(--badge-purple-text, #a855f7); font-weight:bold;">' + cleanLine + '</span>';
        }

        // 2. Show critical errors and bad statuses in red color
        if (/error|failed|auth_failed|rejected/i.test(cleanLine)) {
            return '<span style="color: var(--danger-text, #ef4444); font-weight:bold;">' + cleanLine + '</span>';
        }

        // 3. Show system warnings and notes in orange color
        if (/warning|warn|note/i.test(cleanLine)) {
            return '<span style="color: var(--warning-text, #f97316); font-weight:bold;">' + cleanLine + '</span>';
        }

        // 4. Show connection attempts and handshakes in green color
        if (/attempting/i.test(cleanLine)) {
            return '<span style="color: var(--success-text, #10b981); font-weight:bold;">' + cleanLine + '</span>';
        }

        // 5. Show successful connections and status updates in blue color
        if (/initiated|established|completed|success/i.test(cleanLine)) {
            return '<span style="var(--sysstat-text-blue, #3b82f6); font-weight:bold;">' + cleanLine + '</span>';
        }

        return cleanLine;
    }).filter(function (line) {
        // Remove empty null rows safely to keep ESLint happy
        return line !== null;
    }).join('\n');
};

/**
 * Filters the visible logs by saving a timestamp cutoff in session storage.
 */
const handleLogFilter = function (clearLogBtn, logTextArea) {
    clearLogBtn.disabled = true;
    clearLogBtn.textContent = ICON.LOADING + TXT.INFO.clearing;

    callLogRead({ pattern: CFG.CMD.openvpn }).then(function (plainText) {
        if (plainText) {
            const lines = String(plainText).trim().split('\n');
            if (lines.length > 0) {
                const lastEntry = lines[lines.length - 1];
                if (lastEntry) {
                    sessionStorage.setItem(CFG.ID.openvpn_log_stamp, lastEntry.substring(0, 24));
                }
            }
        }
        logTextArea.innerHTML = '<span style="color: var(--text-color-light, #64748b); font-style:italic;">' + TXT.MSG.no_vpn_log + '</span>';
        clearLogBtn.textContent = ICON.SUCCESS + TXT.INFO.log_cleared;
        setTimeout(function () {
            clearLogBtn.disabled = false;
            clearLogBtn.textContent = TXT.INFO.log_clear;
        }, 1500);
    });
};

/**
 * Renders the terminal box for the OpenVPN protocol log output.
 */
const renderLogBox = function (logLines) {
    // Transformed from textarea into a scrollable terminal div to support dynamic HTML coloring
    const logTextArea = E('div', {
        'id': 'openvpn_terminal_box',
        'class': 'cbi-input-textarea',
        'style': 'width:100%; height:240px; font-family:var(--font-monospace, monospace); font-size:12px; background:var(--background-color-dark, #222); color:var(--action-text, #fff) !important; padding:15px; border-radius:4px; border:1px solid var(--border-color, #cbd5e1); overflow-y:auto; white-space:pre; text-shadow:none !important;'
    });

    // Colorize the initial log stream entries safely upon creation
    logTextArea.innerHTML = logLines ? colorizeLogLines(logLines) : '<span style="color: var(--text-color-light, #64748b); font-style:italic;">' + TXT.MSG.no_vpn_log + '</span>';

    const clearLogBtn = E('button', {
        'id': 'openvpn_clear_log_btn',
        'class': 'btn cbi-button cbi-button-remove',
        'style': 'margin-top: 10px;'
    }, TXT.INFO.log_clear);

    clearLogBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        handleLogFilter(clearLogBtn, logTextArea);
    });

    // 1. Create the content wrapper for logs (Hidden by default)
    const logContentContainer = E('div', {
        'style': 'padding:0 2px; display:none; margin-top:5px;'
    }, [
        logTextArea,
        clearLogBtn
    ]);

    // 2. Create a dynamic text arrow indicator to show the open/close state
    const toggleArrow = E('span', {
        'style': 'margin-right:8px; font-size:11px; cursor:pointer; user-select:none;'
    }, '▶ ');

    const inlineSummaryLine = E('div', {
        'style': 'width:100%; display:block; font-size:11px; font-family:var(--font-monospace, monospace); color:var(--text-color-light, #64748b); padding:4px 2px; margin-bottom:10px; white-space:normal; word-break:break-all; font-style:italic;'
    }, '▪ ' + TXT.MSG.system_logs);

    // 3. Assemble the interactive clickable title bar header
    const clickableTitle = E('legend', {
        'style': 'font-weight:bold; font-size:13px; padding:0 8px; color:var(--text-color, #334155); cursor:pointer; user-select:none;',
        'click': function () {
            const isHidden = (logContentContainer.style.display === 'none');
            if (isHidden) {
                logContentContainer.style.display = 'block';
                inlineSummaryLine.style.display = 'none'; // Hide placeholder line when box expands
                toggleArrow.textContent = '▼ ';
                // Automatically scroll down to reveal the newest logs when opening
                setTimeout(function () {
                    const obj = document.getElementById('openvpn_terminal_box');
                    if (obj) obj.scrollTop = obj.scrollHeight;
                }, 50);
            } else {
                logContentContainer.style.display = 'none';
                inlineSummaryLine.style.display = 'block'; // Show placeholder line when box collapses
                toggleArrow.textContent = '▶ ';
            }
        }
    }, [
        toggleArrow,
        TXT.INFO.title_log
    ]);


    // 4. Return the finalized structural fieldset layout (Matches renderConfigEditor style)
    return E('div', { 'class': 'cbi-map', 'id': 'system_log_section_node', 'style': 'margin-bottom:25px;' }, [
        E('div', { 'class': 'cbi-section' }, [
            E('fieldset', {
                'class': 'cbi-section-fieldset',
                'style': 'margin-bottom:0px; padding:15px; border:1px solid var(--border-color, #cbd5e1); border-radius:4px; background:var(--background-color, transparent);'
            }, [
                clickableTitle,
                E('div', { 'class': 'cbi-section-node', 'style': 'padding:0 5px;' }, [
                    logContentContainer,
                    inlineSummaryLine // Stays visible until expanded
                ])
            ])
        ])
    ]);
};


/**
 * Filters log lines based on the session storage timestamp.
 */
const parseLogLines = function (viewData) {
    if (!viewData || !viewData.logread) return '';

    const allLines = String(viewData.logread).trim().split('\n');
    const targetStamp = sessionStorage.getItem(CFG.ID.openvpn_log_stamp);

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
 * Asynchronously requests, processes, and renders the colorized OpenVPN system log stream.
 */
const refreshLog = function (viewData) {
    const terminal = document.getElementById('openvpn_terminal_box');
    const clearBtn = document.getElementById('openvpn_clear_log_btn');

    // Halt the background poller process safely if the element container is missing or busy
    if (!terminal || (clearBtn && clearBtn.disabled)) {
        return;
    }

    // Fetch the active logs asynchronously utilizing the central RPC method layer
    callLogRead({ pattern: CFG.CMD.openvpn }).then(function (plainText) {
        // Synchronize the stream database state utilizing the global viewData container
        viewData.logread = plainText || '';

        // Re-evaluate the timestamp filter rules and parse the delta stream
        const updatedLines = parseLogLines(viewData);

        if (updatedLines && updatedLines.trim() !== '') {
            // Dynamically compile the syntax highlighting markers into the live DOM frame
            terminal.innerHTML = colorizeLogLines(updatedLines);
        } else {
            terminal.innerHTML = '<span style="color: var(--text-color-light, #64748b); font-style:italic;">' + TXT.MSG.no_active_log_entries + '</span>';
        }
    });
};


/**
 * --- LOCK SCREEN  ---
 */


/**
 * Renders the loading overlay for the initial default keys generation.
 */
const renderDefaultKeysOverlay = function (keysReady) {
    return E('div', {
        'id': CFG.ID.openvpn_keygen_overlay,
        'style': 'position:absolute; top:35px; left:0; width:100%; height:100%; padding:30px 15px; background:rgba(var(--background-color-rgb, 255, 255, 255), 0.9); z-index:9999; display:' + (keysReady ? 'none' : 'flex') + '; flex-direction:column; align-items:center; justify-content:flex-start; border-radius:4px;'
    }, [
        E('img', {
            'src': CFG.FILE.loading_img,
            'style': 'width:64px; height:32px; margin-bottom:15px; vertical-align:middle;'
        }),
        E('h3', { 'style': 'margin:0 0 10px 0; font-weight:bold; color:var(--text-color, #334155); text-shadow:none !important;' }, TXT.KEY.keygen_in_progress),

        E('p', { 'style': 'margin:0; font-style:normal; font-size:13px; color:var(--text-color, #334155); text-align:center; line-height:1.6;' }, [
            TXT.KEY.keygen_wait, E('br'),
            TXT.MSG.process_take_few_minutes, E('br'), E('br'),
            TXT.KEY.ca + ' (' + CFG.FILE.ca_def_crt + ')', E('br'),
            TXT.KEY.server_crt + ' (' + CFG.FILE.server_def_crt + ')', E('br'),
            TXT.KEY.server_key + ' (' + CFG.FILE.server_def_key + ')', E('br'),
            TXT.KEY.dh + ' (' + CFG.FILE.dh_def_pem + ')', E('br'),
            TXT.KEY.tls + ' (' + CFG.FILE.tls_def_key + ')'
        ])
    ]);
};

/**
 * Polls the system startup state until default crypto keys are fully ready.
 */
const pollDefaultKeysReady = function (viewData) {
    return checkDefaultKeysState(viewData).then(function () {
        const overlay = document.getElementById(CFG.ID.openvpn_keygen_overlay);

        // 1. If background generator lock still exists, maintain the lock screen
        if (!viewData.keysReady) {
            if (overlay) {
                overlay.style.display = 'flex';
            }
            return;
        }

        // 2. Keys are ready - check if a reload is actually required
        if (overlay) {
            if (overlay.style.display === 'flex') {
                overlay.style.display = 'none';
                L.Poll.stop();
                //window.location.reload();
                return;
            }
            overlay.style.display = 'none';
        }

        // 3. If keys were already present on page load, quietly stop the startup poll
        L.Poll.stop();
    }).catch(function () {
        const overlay = document.getElementById(CFG.ID.openvpn_keygen_overlay);
        if (overlay) {
            overlay.style.display = 'none';
        }
        L.Poll.stop();
    });
};


/**
 * --- VIEW ENTRYPOINT  ---
 */


/**
 * Main LuCI view extension wrapper (entrypoint)
 */
return view.extend({

    // Shared data container for the OpenVPN view context
    VIEW_DATA: {
        statusClass: null,
        wizardClass: null,
        keygenClass: null,
        devData: '',
        uptime: 0,
        serverTemplate: '',
        clientTemplate: '',
        logread: '',
        keysReady: false,
        sections: [],
        instances: []
    },

    load: function () {
        L.uci.unload(CFG.CMD.openvpn);
        L.uci.unload(CFG.CMD.firewall);

        // 1. Trigger the background key initialization
        L.fs.exec(CFG.LIBEXEC.luci_app_openvpn, [CFG.LIBEXEC.initkeys]).catch(function (e) {
            console.log(CFG.LIBEXEC.luci_app_openvpn + " " + CFG.LIBEXEC.initkeys + " -> ERROR: " + e.message);
        });
        // 2. Trigger the cleanup process
        L.fs.exec(CFG.LIBEXEC.luci_app_openvpn, [CFG.LIBEXEC.cleanup]).catch(function (e) {
            console.log(CFG.LIBEXEC.luci_app_openvpn + " " + CFG.LIBEXEC.cleanup + " -> ERROR: " + e.message);
        });

        const viewData = this.VIEW_DATA;

        // Keep the core Promise.all for LuCI engine system loading stability
        return Promise.all([
            L.require('view.vpn.openvpn-status'),
            L.require('view.vpn.openvpn-wizard'),
            L.require('view.vpn.openvpn-keygen'),
            L.uci.load(CFG.CMD.openvpn),
            L.uci.load(CFG.CMD.firewall)

            // Make only the inner callback async for a flat flow
        ]).then(async function (results) {
            try {
                viewData.statusClass = results[0];
                viewData.wizardClass = results[1];
                viewData.keygenClass = results[2];

                await viewData.statusClass.onLoad();

                const sections = L.uci.sections(CFG.CMD.openvpn, CFG.CMD.openvpn) || [];

                // No nested .then loops for empty views
                if (sections.length === 0) {
                    await loadSystemTelemetry(viewData);
                    return initEmptyUciView();
                }

                viewData.sections = Array.isArray(sections) ? sections : [];

                // Await the pending session tasks directly and flatly
                await processPendingSessionTask();

                // Await the telemetry and instance assets data loads linearly
                await loadSystemTelemetry(viewData);

                const instances = await loadInstanceData(viewData);
                viewData.instances = Array.isArray(instances) ? instances : [];

            } catch (err) {
                console.error('Error loading main OpenVPN dashboard data:', err);
            }
        });
    },

    /**
     * Renders the main OpenVPN dashboard view
     */
    render: function () {
        const viewData = this.VIEW_DATA;
        const openvpnEnabled = isAnyInstanceEnabled(viewData.sections) ? '1' : '0';
        const openvpnStatus = viewData.statusClass;
        const devDataRaw = String(viewData.devData || '').trim();
        const logLines = parseLogLines(viewData);
        const startupLockOverlay = renderDefaultKeysOverlay(viewData.keysReady);

        const masterServerBtn = E('button', { 'class': 'btn cbi-button cbi-button-positive important' }, TXT.BTN.add_server);
        const masterClientBtn = E('button', { 'class': 'btn cbi-button cbi-button-action important' }, TXT.BTN.add_client);

        let instancesNode;
        let statusTable = null;

        if (viewData.sections.length === 0) {
            instancesNode = E('div', { 'class': 'cbi-map' }, [
                E('div', { 'class': 'cbi-section' }, [
                    E('h3', { 'style': 'color:var(--text-color, #334155); font-weight:bold;' }, TXT.INFO.status),
                    E('div', { 'class': 'cbi-section-node' }, [
                        E('div', { 'class': 'alert-message info', 'style': 'margin:5px 0;' }, TXT.MSG.no_vpn_configured)
                    ])
                ])
            ]);
        } else {
            const instanceSections = [];
            viewData.sections.forEach(function (s, idx) {
                // Render individual instance layout blocks using global memory arrays
                instanceSections.push(renderInstanceBox(s, idx, viewData));
            });

            statusTable = E('div', { 'id': 'openvpn_live_table_wrapper' }, [
                openvpnStatus ? openvpnStatus.refreshStatusTable(viewData.instances, devDataRaw, parseFloat(viewData.uptime) || 0, false, null) : ''
            ]);

            instancesNode = E('div', {}, [
                E('div', { 'class': 'cbi-map' }, [
                    E('div', { 'class': 'cbi-section' }, [
                        E('h3', { 'style': 'color:var(--text-color, #334155); font-weight:bold;' }, TXT.INFO.status),
                        E('div', { 'class': 'cbi-section-node' }, [statusTable])
                    ])
                ]),
                E('div', { 'class': 'cbi-section' }, instanceSections)
            ]);
        }
        // Setup the active background pollers using our persistent viewData references
        if (!viewData.keysReady) {
            L.Poll.add(L.bind(function () {
                return pollDefaultKeysReady(viewData);
            }, this), 5);
        }
        if (viewData.sections.length > 0) {
            L.Poll.add(L.bind(function () {
                if (openvpnStatus) {
                    openvpnStatus.refreshLiveDashboard(viewData, statusTable, refreshMainBoxVisuals);
                }
                refreshLog(viewData);
            }, this), 5);
        }

        return E('div', { 'class': 'cbi-map', 'style': 'position:relative; min-height:300px;' }, [
            startupLockOverlay,

            E('div', { 'id': CFG.ID.main_control_box }, [
                renderMainControlBox(openvpnEnabled, masterServerBtn, masterClientBtn, devDataRaw, viewData)
            ]),

            instancesNode,

            E('hr', { 'style': 'margin:10px 0; border:0;;' }),
            renderInstanceCreationBox(viewData, openvpnEnabled),

            E('hr', { 'style': 'margin:25px 0 35px 0; border:0;' }),
            renderFirewallInfoBox(),

            E('hr', { 'style': 'margin:15px 0; border:0;' }),
            renderLogBox(logLines)
        ]);
    }
});

