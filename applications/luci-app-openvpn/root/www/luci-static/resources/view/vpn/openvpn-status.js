/*
 * Copyright (C) 2008-2026 The OpenWrt Project
 * Copyright (C) 2026 Manfred Jaider <masmbit@users.noreply.github.com>
 *
 * This is free software, licensed under the Apache License, Version 2.0.
 * See /LICENSE for more information.
 *
 * luci-app-openvpn : shared status class
 * /www/luci-static/resources/view/vpn/openvpn-status.js
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
		actual: _('Actual'),
		creating: _('Creating...'),
		client: _('Client'),
		disabled: _('Disabled'),
		error: _('Error'),
		instance_x: _('Instance #'),
		no_clients_connected: _('No clients connected'),
		pending: _('Pending...'),
		running: _('Running'),
		since: _('Since')
	},
	TH: {
		encryption: _('Encryption'),
		instance: _('Instance'),
		local_ip_port: _('Local IP / Port'),
		no_inst: _('No instances configured'),
		remote_ip_port: _('Remote IP / Port'),
		status: _('Status'),
		transfer_rx_tx: _('Transfer (Rx / Tx)'),
		type: _('Type'),
		uptime: _('UpTime'),
		vpn: _('VPN')
	}
};

const CFG = Object.freeze({
	FILE: Object.freeze({
		dir_cfg: '/etc/openvpn/luci/',
		proc_net_dev: '/proc/net/dev',
		proc_uptime: '/proc/uptime'
	}),
	LIBEXEC: Object.freeze({
		luci_app_openvpn: '/usr/libexec/luci-app-openvpn',
		readstatus: 'readstatus',
		getmac: 'getmac'
	}),
	CMD: Object.freeze({
		openvpn: 'openvpn'
	}),
})

const OPENVPN = Object.freeze({
	ROLE: Object.freeze({
		SERVER: 'server',
		CLIENT: 'client'
	}),
	PROTO: Object.freeze({
		TCP: 'tcp',
		UDP: 'udp'
	}),
	PORT: Object.freeze({
		s1194: '1194'
	}),
	IP: Object.freeze({
		LOOPBACK: '127.0.0.1'
	})
});


/*
 * --- HELPER ---
 */


/**
 * Default structure template for single OpenVPN running instances
 */
const INSTANCE_TEMPLATE = {
	id: '',
	instNum: 1,
	displayName: '',
	ddns: '',
	role: OPENVPN.ROLE.SERVER,
	port: 0,
	portExtern: 0,
	proto: 'udp',
	cipher: '-',
	localIp: '0.0.0.0',
	clientRemote: '-',
	loopbackServerId: null,
	confContent: '',
	isRunning: false,
	pid: '-',
	startTime: 0,
	clientRefresh: 5,
	connectedClients: []
};

/**
 * Caches static configuration structures to optimize system flash access
 */
let cachedMacHex = null;
const configAssetCache = {};
const statusFileCache = {};

/**
 * Gets the active status of the OpenVPN service from ubus
 */
const callServiceList = L.rpc.declare({
	object: 'service',
	method: 'list',
	params: ['name'],
	expect: { 'openvpn': {} }
});

/**
 * Checks if an OpenVPN instance is enabled
 */
const isInstanceEnabled = function (instance_id) {
	return L.uci.get(CFG.CMD.openvpn, instance_id, 'enabled') === '1';
};

/**
 * Checks if at least one OpenVPN instance is enabled in the configuration array
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
 * Reads data from proc files to get network and uptime statistics
 */
const refreshSystemTelemetry = async function (viewData) {
	try {
		// Read both system files at the same time to save time
		const results = await Promise.all([
			L.resolveDefault(L.fs.read(CFG.FILE.proc_net_dev), ''),
			L.resolveDefault(L.fs.read(CFG.FILE.proc_uptime), '0')
		]);

		const [rawDevData, rawUptime] = results;

		viewData.devData = rawDevData || '';

		const parts = String(rawUptime).trim().split(/\s+/);
		viewData.uptime = (parts && parts[0]) ? parseFloat(parts[0]) : 0;

	} catch (err) {
		console.error('Error refreshing system data:', err);
	}
};

/**
 * Parses client IP addresses from the OpenVPN status log text file
 */
const parseConnectedClients = function (statusContent) {
	const rawClients = [];
	if (!statusContent) {
		return rawClients;
	}

	const lines = statusContent.split('\n');
	let insideClientList = false;

	// Loop through rows to extract all initial raw client connections
	for (let c = 0; c < lines.length; c++) {
		const line = lines[c].trim();

		if (line.indexOf('OpenVPN CLIENT LIST') !== -1 || line.indexOf('Common Name,Real Address') !== -1) {
			insideClientList = true;
			continue;
		}

		if (line.indexOf('ROUTING TABLE') !== -1 || line.indexOf('GLOBAL STATS') !== -1 || line.indexOf('END') === 0) {
			break;
		}

		if (insideClientList && line.length > 0) {
			const tokens = line.split(',');

			if (tokens.length >= 5 && tokens[0] !== 'Common Name' && tokens[0] !== 'Updated') {
				const rawRealAddress = tokens[1].trim();
				const cleanRealAddress = rawRealAddress.replace(/[[\]]/g, '');

				let formattedDate = tokens[4].trim();
				const parsedClientDate = new Date(formattedDate.replace(/-/g, '/'));
				if (!isNaN(parsedClientDate.getTime())) {
					formattedDate = parsedClientDate.toLocaleString();
				}

				const bytesRxInt = parseInt(tokens[2].trim(), 10) || 0;
				const bytesTxInt = parseInt(tokens[3].trim(), 10) || 0;

				rawClients.push({
					commonName: tokens[0].trim(),
					realAddress: cleanRealAddress,
					bytesReceived: bytesRxInt,
					bytesSent: bytesTxInt,
					connectedSince: formattedDate
				});
			}
		}
	}

	// Process dynamic dual-pass filtration against parallel ghost connections
	const connectedClients = [];
	const authenticatedIps = {};
	const undefIpsTrack = {};

	// Pass 1: Map all fully authenticated clients with their clean base IP
	for (let i = 0; i < rawClients.length; i++) {
		const client = rawClients[i];

		// Strips the port safely from both IPv4 (1.2.3.4:port) and IPv6 ([2001::1]:port)
		let baseIp = client.realAddress;
		if (client.realAddress.indexOf('[') !== -1) {
			const ipv6Match = client.realAddress.match(/^\[(.*)\]:\d+$/);
			baseIp = ipv6Match ? ipv6Match[1].trim() : baseIp;
		} else {
			const lastColonIdx = client.realAddress.lastIndexOf(':');
			baseIp = (lastColonIdx !== -1) ? client.realAddress.substring(0, lastColonIdx).trim() : client.realAddress;
		}

		// OpenVPN kernel strictly utilizes uppercase 'UNDEF' strings
		if (client.commonName !== 'UNDEF') {
			if (baseIp) {
				authenticatedIps[baseIp] = true;
			}
		} else {
			// Track the highest traffic volume entry for unauthenticated duplicate IPs
			if (baseIp) {
				const currentTotalBytes = client.bytesReceived + client.bytesSent;

				if (!undefIpsTrack[baseIp] || currentTotalBytes > undefIpsTrack[baseIp].bytes) {
					undefIpsTrack[baseIp] = { bytes: currentTotalBytes, index: i };
				}
			}
		}
	}


	// Pass 2: Re-evaluate and push entries, filtering duplicate ghost streams cleanly
	for (let j = 0; j < rawClients.length; j++) {
		const targetClient = rawClients[j];
		const targetLastColonIdx = targetClient.realAddress.lastIndexOf(':');
		const baseIp = (targetLastColonIdx !== -1) ? targetClient.realAddress.substring(0, targetLastColonIdx).trim() : targetClient.realAddress;

		if (targetClient.commonName === 'UNDEF') {
			// Drop if a fully named and authenticated session already covers this base IP
			if (authenticatedIps[baseIp] === true) {
				continue;
			}
			// Drop if this is an older zombie UNDEF channel with less traffic than the active one
			if (undefIpsTrack[baseIp] && undefIpsTrack[baseIp].index !== j) {
				continue;
			}
		}

		connectedClients.push(targetClient);
	}

	return connectedClients;
};

/**
 * Calculates a unique router-individual port using hexadecimal grid markers.
 */
const calcPortFromId = function (instance_id, optional_instance_number) {
	let instNum;
	if (optional_instance_number) {
		instNum = (typeof optional_instance_number === 'number') ? optional_instance_number : parseInt(optional_instance_number, 10);
		if (isNaN(instNum)) {
			instNum = getInstanceNumber(instance_id);
		}
	} else {
		instNum = getInstanceNumber(instance_id);
	}

	// Read instantly from the static OnLoad memory register
	if (cachedMacHex !== null) {
		return 0xE000 + cachedMacHex + instNum;
	}

	// Unwrapped hardware fallback if the interface was missing during OnLoad
	return 0xE000 + instNum;
};

/**
 * Extracts the OpenVPN port number from the configuration text safely
 */
const parsePortFromConfig = function (role, content) {
	if (!content) return null;

	const lines = content.split('\n');

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i].trim();

		// Skip empty lines and full line comment markers
		if (line.length === 0 || line.charAt(0) === '#' || line.charAt(0) === ';') {
			continue;
		}

		// Strip inline comments from the end of the lines
		const hashIdx = line.indexOf('#');
		if (hashIdx !== -1) {
			line = line.substring(0, hashIdx).trim();
		}

		const semiIdx = line.indexOf(';');
		if (semiIdx !== -1) {
			line = line.substring(0, semiIdx).trim();
		}

		// Split spaces or tabs into clean text tokens
		const tokens = line.split(/\s+/);
		if (tokens.length < 2) {
			continue;
		}

		const directive = tokens[0].toLowerCase();

		// Server profile check: look for "port number" syntax
		if (role === OPENVPN.ROLE.SERVER && directive === 'port') {
			const portNum = parseInt(tokens[1], 10);
			if (!isNaN(portNum) && portNum > 0 && portNum <= 65535) {
				return portNum;
			}
		}

		// Client profile check: look for "remote host port" syntax
		if (role === OPENVPN.ROLE.CLIENT && directive === 'remote' && tokens.length >= 3) {
			const portNum = parseInt(tokens[2], 10);
			if (!isNaN(portNum) && portNum > 0 && portNum <= 65535) {
				return portNum;
			}
		}
	}

	return null;
};

/**
 * Extracts the OpenVPN protocol string (udp/tcp) from the configuration text safely
 */
const parseProtoFromConfig = function (content) {
	if (!content) return OPENVPN.PROTO.UDP;
	const lines = content.split('\n');
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i].trim();
		if (line.length === 0 || line.charAt(0) === '#' || line.charAt(0) === ';') {
			continue;
		}
		const hashIdx = line.indexOf('#');
		if (hashIdx !== -1) line = line.substring(0, hashIdx).trim();
		const semiIdx = line.indexOf(';');
		if (semiIdx !== -1) line = line.substring(0, semiIdx).trim();

		const tokens = line.split(/\s+/);
		if (tokens.length < 2) continue;

		// Look for the "proto" directive line
		if (tokens[0].toLowerCase() === 'proto') {
			const protoVal = tokens[1].toLowerCase();
			// Handle standard openvpn proto values (udp, tcp, udp4, tcp4, udp6, tcp6)
			if (protoVal.indexOf(OPENVPN.PROTO.TCP) !== -1) return OPENVPN.PROTO.TCP;
			if (protoVal.indexOf(OPENVPN.PROTO.UDP) !== -1) return OPENVPN.PROTO.UDP;
			return protoVal;
		}
	}
	return OPENVPN.PROTO.UDP; // Default fallback matching standard OpenVPN defaults
};

/**
 * Safe parser to get ONLY the active dynamic DDNS domain name from the configuration file text
 */
const parseDdnsFromConfig = function (content) {
	if (!content) {
		return '';
	}

	// Example: setenv DDNS "my.ddns.net"

	// Match line with setenv DDNS followed by optional single or double quotes
	const ddnsMatch = content.match(/^setenv\s+DDNS\s+["']?([^"'\s\r\n]+)["']?$/m);

	if (ddnsMatch && ddnsMatch[1]) {
		return ddnsMatch[1].trim();
	}

	return '';
};

/**
 * Safe parser to get ONLY the active status refresh seconds from the configuration file text
 */
const parseClientRefresh = function (content, instNum) {
	if (!content) {
		return 5;
	}

	// Example: status /tmp/run/openvpn.instance1.status 5

	// Match line starting with status, path, instance filename, space, and digits
	const patternStr = '^status\\s+\\S+openvpn\\.instance' + instNum + '\\.status\\s+(\\d+)(?:\\s|$)';
	const refreshRegex = new RegExp(patternStr, 'm');
	const refreshMatch = content.match(refreshRegex);

	if (refreshMatch && refreshMatch[1]) {
		return parseInt(refreshMatch[1], 10) || 5;
	}

	return 5;
};


/**
 * Parses the raw list of LuCI modifications to find changed instances
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
 * Checks the overall running state of all OpenVPN profiles together
 */
const getCurrentOpenVpnState = function (sections, updatedInstances, openvpnChanges) {
	const uciEnabled = isAnyInstanceEnabled(sections);
	if (!uciEnabled) {
		return 'disabled';
	}

	if (Array.isArray(openvpnChanges) && openvpnChanges.length > 0) {
		return 'pending';
	}

	// If the updatedInstances array from ubus is missing or empty during a refresh drop, return 'pending'
	if (!updatedInstances || updatedInstances.length === 0) {
		return 'pending';
	}

	let totalEnabledCount = 0;
	let totalRunningCount = 0;

	for (let i = 0; i < updatedInstances.length; i++) {
		const inst = updatedInstances[i];
		if (inst && isInstanceEnabled(inst.id)) {
			totalEnabledCount++;
			if (inst.isRunning === true) {
				totalRunningCount++;
			}
		}
	}

	if (totalEnabledCount > 0 && totalRunningCount === totalEnabledCount) {
		return 'active';
	}

	// Returns error ONLY if an enabled instance is genuinely dead after a solid live read
	return 'error';
};

/**
 * Safe parser to get the numeric instance index from a string ID.
 */
const getInstanceNumber = function (instance_id, default_number) {
	if (!default_number) {
		default_number = 1;
	} else {
		const fallbackNum = (typeof default_number === 'number') ? default_number : parseInt(default_number, 10);
		const safeFallback = !isNaN(fallbackNum) ? fallbackNum : 1;
		default_number = safeFallback;
	}
	if (typeof instance_id !== 'string' || !instance_id) {
		return default_number;
	}
	const numMatch = instance_id.match(/\d+$/);
	if (numMatch) {
		const parsedNum = parseInt(numMatch[0], 10);
		return !isNaN(parsedNum) ? parsedNum : default_number;
	}
	return default_number;
};

/**
 * Compiles or load from cache the compiled INSTANCE_TEMPLATE configuration
 */
const getInstanceConfig = async function (id, instNum, role, path_conf) {
	let currentMtimeConf = 0;
	let currentSizeConf = 0;

	try {
		const confStat = await L.fs.stat(path_conf);
		if (confStat) {
			if (typeof confStat.mtime === 'object' && confStat.mtime.sec) {
				currentMtimeConf = parseInt(confStat.mtime.sec, 10) || 0;
			} else if (typeof confStat.mtime === 'number') {
				currentMtimeConf = Math.floor(confStat.mtime);
			}
			currentSizeConf = parseInt(confStat.size, 10) || 0;

			// Cache HIT path
			if (configAssetCache[id] &&
				configAssetCache[id].mtime === currentMtimeConf &&
				configAssetCache[id].size === currentSizeConf) {
				return Object.assign({}, configAssetCache[id].cachedBase);
			}
		}
	} catch {
		// Proceed to live compilation on error
	}

	let confContent = '';
	try {
		confContent = await L.fs.read(path_conf);
	} catch (err) {
		console.error('LuCI Live Dashboard: reading the file ' + path_conf + ' failed: ', err.message);
		confContent = '';
	}

	if (!confContent || confContent.trim() === '') {
		// Signals readSingleInstanceStatus to execute early exit template
		return null;
	}

	const detectedDdnsTarget = parseDdnsFromConfig(confContent);
	const baseResult = Object.assign({}, INSTANCE_TEMPLATE, {
		id: id,
		instNum: instNum,
		role: role,
		ddns: detectedDdnsTarget,
		confContent: String(confContent).trim()
	});

	let currentPort = parsePortFromConfig(role, baseResult.confContent);
	if (!currentPort || isNaN(currentPort)) {
		currentPort = calcPortFromId(id, instNum);
	}
	baseResult.port = currentPort;

	const portExternMatch = baseResult.confContent.match(/^setenv\s+portextern\s+(\d+)/m);
	baseResult.portExtern = portExternMatch ? parseInt(portExternMatch[1], 10) : currentPort;
	baseResult.proto = parseProtoFromConfig(baseResult.confContent);
	baseResult.clientRefresh = parseClientRefresh(baseResult.confContent, instNum);

	const lines = baseResult.confContent.split(/[\r\n]+/);
	for (var i = 0; i < lines.length; i++) {
		var cleanLine = lines[i].trim();

		if (cleanLine.indexOf('cipher ') === 0) {
			baseResult.cipher = cleanLine.replace('cipher ', '').trim().toUpperCase();
		} else if (cleanLine.indexOf('data-ciphers ') === 0) {
			var dcParts = cleanLine.replace('data-ciphers ', '').trim().split(':');
			if (dcParts && dcParts[0]) {
				baseResult.cipher = dcParts[0].trim().toUpperCase();
			}
		}

		if (role === OPENVPN.ROLE.CLIENT && cleanLine.indexOf('remote ') === 0) {
			var rParts = cleanLine.split(/\s+/);
			var remoteIp = (rParts.length >= 2) ? rParts[1] : OPENVPN.IP.LOOPBACK;
			var remotePort = (rParts.length >= 3) ? rParts[2] : OPENVPN.PORT.s1194;
			baseResult.localIp = OPENVPN.IP.LOOPBACK;
			baseResult.clientRemote = remoteIp + ':' + remotePort;
		} else if (role === OPENVPN.ROLE.SERVER) {
			if (cleanLine.indexOf('server ') === 0) {
				var sParts = cleanLine.split(/\s+/);
				if (sParts.length >= 2) baseResult.localIp = sParts[1].replace(/\.0$/, '.1');
			}
		}
	}

	if (currentMtimeConf > 0) {
		configAssetCache[id] = {
			mtime: currentMtimeConf,
			size: currentSizeConf,
			cachedBase: Object.assign({}, baseResult)
		};
	}

	return baseResult;
};

/**
 * Measures the process start uptime using the Linux /proc framework.
 */
const getProcessStartTime = async function (id, pidVal, currentUptime) {
	try {
		const statObj = await L.fs.stat('/proc/' + pidVal);
		if (statObj && statObj.mtime) {
			let rawMtimeSec = 0;
			if (typeof statObj.mtime === 'object' && statObj.mtime.sec) {
				rawMtimeSec = parseInt(statObj.mtime.sec, 10) || 0;
			} else if (typeof statObj.mtime === 'number') {
				rawMtimeSec = Math.floor(statObj.mtime);
			} else if (typeof statObj.mtime === 'string') {
				rawMtimeSec = parseInt(statObj.mtime, 10) || 0;
			}

			const currentUnixTime = Math.floor(new Date().getTime() / 1000);
			if (rawMtimeSec > 1000000000) {
				const secondsSinceProcessCreated = currentUnixTime - rawMtimeSec;
				if (secondsSinceProcessCreated > 0 && secondsSinceProcessCreated <= (currentUptime + 300)) {
					return Math.max(1, Math.floor(currentUptime - secondsSinceProcessCreated));
				}
				return (id === 'instance1') ? 35 : 60;
			}
			return Math.max(1, Math.floor(rawMtimeSec));
		}
	} catch {
		// Silent catch if process terminated during the hardware poll loop
	}
	return 0;
};

/**
 * Read the connected client status file if necessary or use the statusFileCache
 */
const getConnectedClientsStatus = async function (inst) {
	try {
		const statusFilePath = '/tmp/run/openvpn.' + inst.id + '.status';
		const fileStat = await L.fs.stat(statusFilePath);

		const maxAllowedFileAge = inst.clientRefresh * 5;

		if (fileStat) {
			let currentMtime = 0;
			if (typeof fileStat.mtime === 'object' && fileStat.mtime.sec) {
				currentMtime = parseInt(fileStat.mtime.sec, 10) || 0;
			} else if (typeof fileStat.mtime === 'number') {
				currentMtime = Math.floor(fileStat.mtime);
			}
			const currentSize = parseInt(fileStat.size, 10) || 0;

			if (!statusFileCache[inst.id]) {
				statusFileCache[inst.id] = { mtime: 0, size: 0, parsedClients: [] };
			}

			const currentRouterUnixTime = Math.floor(new Date().getTime() / 1000);
			const fileAgeSeconds = currentRouterUnixTime - currentMtime;

			// Invalidate cache immediately if openvpn daemon froze in deadlock
			if (fileAgeSeconds > maxAllowedFileAge) {
				statusFileCache[inst.id].parsedClients = [];
				return [];
			}

			// use cache if no change
			if (statusFileCache[inst.id].mtime === currentMtime &&
				statusFileCache[inst.id].size === currentSize) {
				return statusFileCache[inst.id].parsedClients;
			}

			// change detected - parse status file
			const res = await L.fs.exec(CFG.LIBEXEC.luci_app_openvpn, [CFG.LIBEXEC.readstatus, inst.id]);
			const cleanStatusContent = String((res && res.code === 0) ? (res.stdout || '') : '').trim();

			if (cleanStatusContent.length > 0) {
				const freshClients = parseConnectedClients(cleanStatusContent);

				statusFileCache[inst.id].mtime = currentMtime;
				statusFileCache[inst.id].size = currentSize;
				statusFileCache[inst.id].parsedClients = freshClients;

				return freshClients;
			}
		}
	} catch {
		// Silent catch fallback execution
	}

	if (statusFileCache[inst.id]) {
		statusFileCache[inst.id].parsedClients = [];
	}
	return [];
};

/**
 * Reads the active runtime status and telemetry fields
 */
const readSingleInstanceStatus = async function (id, instancesObj, currentUptime, role) {
	const instNum = getInstanceNumber(id);
	const path_conf = CFG.FILE.dir_cfg + id + '.conf';

	// Step 1: Get instance configuration profile from file or cache
	let inst = await getInstanceConfig(id, instNum, role, path_conf);

	// Early exit if no instance configuration found
	if (inst === null) {
		return Object.assign({}, INSTANCE_TEMPLATE, {
			id: id,
			instNum: instNum,
			role: role,
			isRunning: false,
			pid: '-'
		});
	}

	// Get process running state and pid from service list
	const runtimeInstance = instancesObj[id] || {};
	const isRunning = (runtimeInstance.running === true);
	const pidVal = isRunning ? (runtimeInstance.pid || '-') : '-';

	inst.isRunning = isRunning;
	inst.pid = pidVal;

	// Exit if the server daemon process is offline
	if (isRunning === false || pidVal === '-') {
		inst.startTime = 0;
		inst.connectedClients = [];
		return inst;
	}

	// Step 2: Measure dynamic runtime process uptime via proc stats
	inst.startTime = await getProcessStartTime(id, pidVal, currentUptime);

	// Client profiles do not create status logs
	if (role !== OPENVPN.ROLE.SERVER) {
		return inst;
	}

	// Step 3: Resolve connected users matrix buffer via cached shell routine
	inst.connectedClients = await getConnectedClientsStatus(inst);

	return inst;
};

/**
 * Reads the active runtime status and telemetry fields for all instances
 */
const readInstanceStatus = async function (sections, instancesObj, systemUptime) {
	const instPromises = [];
	const currentUptime = parseFloat(systemUptime) || 0;
	const cleanSections = Array.isArray(sections) ? sections : [];

	// Modern, flat iterator to populate the background scanning registers
	for (const section of cleanSections) {
		if (!section) continue;
		const id = section['.name'];
		const role = L.uci.get(CFG.CMD.openvpn, id, 'role') || OPENVPN.ROLE.SERVER;

		// Push the independent worker promises into the central pipeline array container
		instPromises.push(readSingleInstanceStatus(id, instancesObj, currentUptime, role));
	}

	// Fire all configuration scans simultaneously in parallel for rapid modal loads
	return await Promise.all(instPromises);
};


/*
 * --- STATUS VIEW ---
 */


/**
 * Extracts data traffic packet and byte statistics from the linux network dev files
 */
const parseKernelInterfaceData = function (tunDevice, devDataRaw) {
	const stats = { rxBytes: 0, rxPkts: 0, txBytes: 0, txPkts: 0, hasData: false };

	if (!devDataRaw || devDataRaw.length === 0) {
		return stats;
	}

	const devLines = devDataRaw.split('\n');

	// Strict boundary anchor to match exactly "tun0:" and not "tun00:" or "vtun0:"
	const targetAnchor = tunDevice + ':';

	for (let d = 0; d < devLines.length; d++) {
		const currentLine = devLines[d].trim();

		if (currentLine.indexOf(targetAnchor) === 0) {
			const rawMetrics = currentLine.substring(targetAnchor.length).trim();
			const parts = rawMetrics.split(/\s+/);

			// A standard POSIX /proc/net/dev row contains exactly 16 telemetry columns
			if (parts && parts.length >= 16) {
				stats.rxBytes = parseInt(parts[0], 10) || 0;
				stats.rxPkts = parseInt(parts[1], 10) || 0;
				stats.txBytes = parseInt(parts[8], 10) || 0;
				stats.txPkts = parseInt(parts[9], 10) || 0;
				stats.hasData = true;
			}
			break; // Found the targeted device row, stop processing the remaining lines
		}
	}
	return stats;
};

/**
 * Renders the remote node network column context based on instance roles
 */
const renderRemoteNode = function (role, isRunning, clientRemote, connectedClients, protoStr) {
	if (role === OPENVPN.ROLE.CLIENT) {
		if (!isRunning) return E('span', { 'style': 'color: var(--text-color-light, #64748b);' }, '-');
		return E('span', { 'style': 'font-family: var(--font-monospace, monospace); color: var(--text-color, #334155);' }, clientRemote + protoStr);
	}

	if (!isRunning) return E('span', { 'style': 'color: var(--text-color-light, #64748b);' }, '-');

	if (!Array.isArray(connectedClients) || connectedClients.length === 0) {
		return E('span', { 'style': 'font-style: italic; color: var(--text-color-light, #64748b);' }, TXT.INFO.no_clients_connected);
	}

	const clientRows = [];
	connectedClients.forEach(function (client) {
		clientRows.push(E('div', {
			'style': 'font-family: var(--font-monospace, monospace); margin: 0; padding: 0; border: none !important; line-height: 1.3; color: var(--text-color, #334155);'
		}, [
			E('strong', {}, [
				E('span', { 'style': 'color: var(--action-bg, #00a8ff);' }, client.realAddress),
				E('span', { 'style': 'color: var(--text-color-light, #64748b); font-weight: normal' }, protoStr)
			]),
			E('small', {
				'style': 'display: block; font-size: 11px; color: var(--text-color-light, #64748b); margin-top: 0px;'
			}, [
				TXT.INFO.client + ': ',
				E('strong', { 'style': 'color: var(--success-text, #10b981); font-weight: bold;' }, client.commonName)
			]),
			E('small', {
				'style': 'display: block; font-size: 11px; color: var(--text-color-light, #64748b); margin-top: 0px;'
			}, TXT.INFO.since + ': ' + client.connectedSince),
			E('small', {
				'style': 'display: block; font-size: 11px; color: var(--text-color-light, #64748b); margin-top: 0px;'
			}, TXT.INFO.actual + ': ' + formatStatusBytes(client.bytesReceived) + ' / ' + formatStatusBytes(client.bytesSent))
		]));
	});


	return E('div', { 'style': 'display: block; margin: 0; padding: 0; border: none !important;' }, clientRows);
};

/**
 * Formats a raw byte count into a human-readable data size string (B, KB, or MB)
 */
const formatStatusBytes = function (b) {
	if (b >= 1048576) return (b / 1048576).toFixed(1) + 'MB';
	if (b >= 1024) return (b / 1024).toFixed(1) + 'KB';
	return b + 'B';
};

/**
 * Calculates and formats individual tunnel runtime durations using system uptime seconds
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
 * Renders and refreshes the openvpn instance status and telemetry table
 */
const refreshStatusTable = function (instances, devDataRaw, systemUptime, isLiveRefresh, openvpnChanges) {
	const tableRows = [];
	const rawChanges = openvpnChanges || null;

	for (let i = 0; i < instances.length; i++) {
		const inst = instances[i];
		const role = inst.role || OPENVPN.ROLE.SERVER;

		const kernelStats = parseKernelInterfaceData('tun' + (inst.instNum - 1), devDataRaw);

		const protoStr = (inst.isRunning && inst.proto) ? '/' + inst.proto : '';
		const remoteIpNode = renderRemoteNode(role, inst.isRunning, inst.clientRemote, inst.connectedClients, protoStr);

		const customUciName = L.uci.get(CFG.CMD.openvpn, inst.id, 'displayname') || '';
		const displayId = customUciName ? customUciName : TXT.INFO.instance_x + inst.instNum;

		// Create the instance type badge (Server / Client)
		const typeBadge = E('span', {
			'class': 'ifacebadge',
			'style': 'font-weight:normal !important; padding:2px 6px; border-radius:3px; background:var(--background-color, transparent) !important; border:1px solid var(--border-color, #cbd5e1); color:var(--text-color, #334155);'
		}, role.charAt(0).toUpperCase() + role.slice(1));

		const hasPendingApply = (Array.isArray(rawChanges) && rawChanges.indexOf(inst.id) !== -1);
		let statusBadge;

		// Select the correct status badge style based on the runtime state
		if (inst.isRunning) {
			statusBadge = E('span', {
				'class': 'ifacebadge',
				'style': 'font-weight:normal !important; padding:2px 8px; border-radius:3px; background:var(--background-color, transparent) !important; color:var(--action-bg, #00a8ff) !important; border:1px solid var(--action-border, #0097e6); text-shadow:none !important; box-shadow:none !important;'
			}, TXT.INFO.running + ' (PID: ' + inst.pid + ')');
		} else if (hasPendingApply) {
			statusBadge = E('span', {
				'class': 'ifacebadge',
				'style': 'font-weight:normal !important; padding:2px 8px; border-radius:3px; background:var(--background-color, transparent) !important; color: var(--warning-text, #e67e22) !important; border:1px solid #d35400; text-shadow:none !important; box-shadow:none !important;'
			}, TXT.INFO.pending);
		} else if (L.uci.get(CFG.CMD.openvpn, inst.id, 'enabled') === '1') {
			if (!isLiveRefresh) {
				statusBadge = E('span', {
					'class': 'ifacebadge',
					'style': 'font-weight:normal !important; padding:2px 8px; border-radius:3px; background:var(--background-color, transparent) !important; color: var(--warning-text, #e67e22) !important; border:1px solid #d35400; text-shadow:none !important; box-shadow:none !important;'
				}, TXT.INFO.creating);
			} else {
				statusBadge = E('span', {
					'class': 'ifacebadge',
					'style': 'font-weight:normal !important; padding:2px 8px; border-radius:3px; background:var(--background-color, transparent) !important; color: var(--danger-text, #e74c3c) !important; border:1px solid #c0392b; text-shadow:none !important; box-shadow:none !important;'
				}, TXT.INFO.error);
			}
		} else {
			statusBadge = E('span', {
				'class': 'ifacebadge',
				'style': 'font-weight:normal !important; padding:2px 8px; border-radius:3px; background:var(--neutral-bg, #f1f2f6) !important; color:var(--text-color-light, #64748b) !important; border:1px solid var(--border-color, #cbd5e1); text-shadow:none !important; box-shadow:none !important;'
			}, TXT.INFO.disabled);
		}

		let localConnectionNode = '-';
		if (inst.isRunning) {
			const activePort = inst.port || '?';
			const activeProto = inst.proto ? '/' + inst.proto.toLowerCase() : '';

			localConnectionNode = E('span', {
				'style': 'font-family:var(--font-monospace, monospace); color:var(--text-color, #334155);'
			}, [
				inst.localIp + ':' + activePort,
				E('span', { 'style': 'color:var(--text-color-light, #64748b)' }, activeProto)
			]);
		}

		// Clean separation between primary Data Bytes and volatile Packet Counters
		let transferNode = '-';
		if (inst.isRunning && kernelStats.hasData) {
			transferNode = E('div', {
				'style': 'font-family:var(--font-monospace, monospace); color:var(--text-color, #334155); white-space:nowrap; padding:0; margin:0;'
			}, [
				E('span', { 'style': 'white-space:nowrap;' }, formatStatusBytes(kernelStats.rxBytes) + ' / ' + formatStatusBytes(kernelStats.txBytes)),
				E('small', {
					'style': 'display:block; font-size:11px; color:var(--text-color-light, #64748b); margin-top:0px; white-space:nowrap;'
				}, kernelStats.rxPkts + ' / ' + kernelStats.txPkts)
			]);
		} else if (inst.isRunning) {
			transferNode = E('div', {
				'style': 'font-family:var(--font-monospace, monospace); color:var(--text-color, #334155);'
			}, [
				E('span', {}, '0 B / 0 B'),
				E('small', {
					'style': 'display:block; font-size:11px; color:var(--text-color-light, #64748b); margin-top:0px;'
				}, '0 / 0')
			]);
		}

		const uptimeDisplay = calculateInstanceUptime(inst.startTime, systemUptime);
		const cipherLabel = String(inst.cipher || 'AES-256-GCM');

		// Create alternate row styling classes for visual structure
		const rowStyleClass = (i % 2 === 0) ? 'tr cbi-section-table-row cbi-rowstyle-1' : 'tr cbi-section-table-row cbi-rowstyle-2';

		// Push the complete generated row node array into the table loop memory
		tableRows.push(E('tr', { 'class': rowStyleClass }, [
			E('td', { 'class': 'td' }, '#' + inst.instNum),
			E('td', { 'class': 'td', 'style': 'font-weight:bold; color:var(--text-color, #334155);' }, displayId),
			E('td', { 'class': 'td' }, typeBadge),
			E('td', { 'class': 'td' }, statusBadge),
			E('td', { 'class': 'td' }, localConnectionNode),
			E('td', { 'class': 'td' }, remoteIpNode),
			E('td', { 'class': 'td', 'style': 'font-family:var(--font-monospace, monospace); font-weight:bold; color: var(--success-text, #10b981);' }, inst.isRunning ? cipherLabel : '-'),
			E('td', { 'class': 'td' }, transferNode),
			E('td', { 'class': 'td', 'style': 'font-family:var(--font-monospace, monospace); color:var(--text-color, #334155);' }, inst.isRunning ? uptimeDisplay : '-')
		]));
	}

	// Render the complete telemetry matrix container block layout
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
 * Refreshes the status table and updates the main dashboard view continuously.
 */
const refreshLiveDashboard = async function (viewData, tableContainerElement, refreshMainCallback) {
	try {
		// 1. Wait for the system telemetry to refresh first
		await refreshSystemTelemetry(viewData);

		// 2. Fetch service data and uci changes simultaneously
		const results = await Promise.all([
			L.resolveDefault(callServiceList(CFG.CMD.openvpn), null),
			L.resolveDefault(L.uci.changes(), null)
		]);

		const serviceData = results[0];
		const uciChanges = results[1];

		// Check A: If ubus blocked the query (Session Timeout / Tab Sleep), abort instantly! Do NOT overwrite viewData with corrupt empty elements.
		if (!serviceData || typeof serviceData !== 'object') {
			return;
		}

		const instancesObj = serviceData.instances || {};
		const rawChanges = (uciChanges && uciChanges[CFG.CMD.openvpn]) ? uciChanges[CFG.CMD.openvpn] : null;
		const openvpnChanges = getOpenVpnChanges(rawChanges);

		const systemUptime = parseFloat(viewData.uptime) || 0;
		const devDataRaw = String(viewData.devData || '').trim();

		// 3. Wait for the instance status data safely
		const updatedInstances = await readInstanceStatus(viewData.sections, instancesObj, systemUptime);

		// Check B: Structural integrity check. If the array dropped to zero but UCI has profiles, a background processing block occurred -> Abort!
		if ((!updatedInstances || updatedInstances.length === 0) && viewData.sections && viewData.sections.length > 0) {
			return;
		}

		// Save the fresh verified data into the global cache object safely
		viewData.instances = updatedInstances;

		// 4. Update the live status table layout on the screen
		if (tableContainerElement && tableContainerElement.firstChild) {
			const freshTableNode = refreshStatusTable(viewData.instances, devDataRaw, systemUptime, true, openvpnChanges);
			tableContainerElement.replaceChild(freshTableNode, tableContainerElement.firstChild);
		}

		// 5. Fire the callback method to update the main view badges
		if (typeof refreshMainCallback === 'function') {
			const calculatedState = getCurrentOpenVpnState(viewData.sections, viewData.instances, openvpnChanges);
			refreshMainCallback(calculatedState, devDataRaw, viewData);
		}

	} catch (err) {
		console.error('LuCI Live Dashboard Refresh Failed:', err.message);
	}
};

/**
 * Hardware initializer executed on system class load
 */
const onLoad = async function () {
	try {
		// get mac address
		const res = await L.fs.exec(CFG.LIBEXEC.luci_app_openvpn, [CFG.LIBEXEC.getmac]);
		const rawMac = String((res && res.code === 0) ? (res.stdout || '') : '').trim();

		if (rawMac && rawMac !== '00:00:00:00:00:00') {
			const cleanMac = rawMac.replace(/[^a-fA-F0-9]/g, '');

			// Isolate the last 3 hex characters (12-bit entropy seed)
			if (cleanMac.length >= 3) {
				const lastThreeHex = cleanMac.substring(cleanMac.length - 3);

				// Save into the static memory register for all future allocations
				const parsedSeed = parseInt(lastThreeHex, 16);
				cachedMacHex = !isNaN(parsedSeed) ? parsedSeed : 0x000;
			}
		}
	} catch {
		// Silent safety fallback execution lane
	}
};

/**
 * Export the status functions to the main LuCI view layer
 */
return L.Class.extend({
	INSTANCE_TEMPLATE: INSTANCE_TEMPLATE,
	onLoad: onLoad,
	getInstanceNumber: getInstanceNumber,
	calcPortFromId: calcPortFromId,
	parsePortFromConfig: parsePortFromConfig,
	parseProtoFromConfig: parseProtoFromConfig,
	parseDdnsFromConfig: parseDdnsFromConfig,
	readInstanceStatus: readInstanceStatus,
	refreshStatusTable: refreshStatusTable,
	refreshLiveDashboard: refreshLiveDashboard
});

