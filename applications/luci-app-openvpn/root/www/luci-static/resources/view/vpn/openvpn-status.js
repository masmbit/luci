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
	}
};

const CFG = Object.freeze({
	FILE: Object.freeze({
		dir_cfg: '/etc/openvpn/luci/',
		proc_net_dev: '/proc/net/dev',
		proc_uptime: '/proc/uptime',
	}),
	CMD: Object.freeze({
		openvpn: 'openvpn',
	}),
	ID: Object.freeze({
		Common_Name: 'Common Name',
		GLOBAL_STATS: 'GLOBAL STATS',
		OpenVPN_CLIENT_LIST: 'OpenVPN CLIENT LIST',
		ROUTING_TABLE: 'ROUTING TABLE',
	})
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
		s1194: '1194',
		n1194: 1194,
	}),
	IP: Object.freeze({
		LOOPBACK: '127.0.0.1',
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
	connectedClients: []
};

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
 * Parses client IP addresses from the OpenVPN status log text file (compatible IPv4 and IPv6).
 */
const parseConnectedClients = function (statusContent) {
	const connectedClients = [];
	if (!statusContent) return connectedClients;

	const lines = statusContent.split('\n');
	let insideClientList = false;

	for (let c = 0; c < lines.length; c++) {
		const line = lines[c].trim();

		// Find the start of the client information block
		if (line.indexOf(CFG.ID.OpenVPN_CLIENT_LIST) !== -1 || line.indexOf(CFG.ID.Common_Name) !== -1) {
			insideClientList = true;
			continue;
		}
		// Stop reading if we reach the end of the client block
		if (line.indexOf(CFG.ID.ROUTING_TABLE) !== -1 || line.indexOf(CFG.ID.GLOBAL_STATS) !== -1) {
			break;
		}

		if (insideClientList && line.length > 0) {
			const tokens = line.split(',');
			if (tokens.length >= 2 && tokens[0] !== 'Common Name') {
				const addressField = tokens[1].trim();

				// Find the last colon to safely separate the port number from the IP address
				const lastColonIdx = addressField.lastIndexOf(':');
				if (lastColonIdx !== -1) {
					// FIXED: Removed useless escapes for ESLint and cleaned the character class mapping
					const cleanIp = addressField.substring(0, lastColonIdx).replace(/[[]]/g, '').trim();

					if (cleanIp && connectedClients.indexOf(cleanIp) === -1) {
						connectedClients.push(cleanIp);
					}
				}
			}
		}
	}
	return connectedClients;
};

/**
 * Calculates the default port from the instance id
 */
const calcPortFromId = function (instance_id, optional_instance_number) {
	let instNum;
	if (optional_instance_number) {
		instNum = (typeof optional_instance_number === 'number') ? optional_instance_number : parseInt(optional_instance_number, 10);
		if (isNaN(optional_instance_number)) {
			instNum = getInstanceNumber(instance_id);
		}
	} else {
		instNum = getInstanceNumber(instance_id);
	}
	return OPENVPN.PORT.n1194 - 1 + instNum;
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
	if (!content) return '';

	// Match the DDNS variable and copy the domain name text string
	const ddnsMatch = content.match(/^setenv\s+DDNS\s+"?([^"\s\r\n]+)"?$/m);

	if (ddnsMatch && ddnsMatch[1]) {
		return ddnsMatch[1].trim();
	}

	return '';
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
 * Get instance number from instance_id
 */
const getInstanceNumber = function (instance_id, default_number) {
	const numMatch = instance_id.match(/\d+$/);
	if (default_number) {
		return numMatch ? parseInt(numMatch, 10) : default_number;
	} else {
		return numMatch ? parseInt(numMatch, 10) : 1;
	}
}

/**
 * Reads the active runtime status and telemetry fields for all instances
 */
const readInstanceStatus = function (sections, instancesObj, systemUptime) {
	const instPromises = [];
	const currentUptime = parseFloat(systemUptime) || 0;

	sections.forEach(function (s) {
		const id = s['.name'];
		const instNum = getInstanceNumber(id);
		const role = L.uci.get(CFG.CMD.openvpn, id, 'role') || OPENVPN.ROLE.SERVER;

		const readPromise = L.resolveDefault(L.fs.read(CFG.FILE.dir_cfg + id + '.conf'), '').then(function (confContent) {
			const runtimeInstance = instancesObj[id] || {};
			const isRunning = (runtimeInstance.running === true);
			const pidVal = isRunning ? (runtimeInstance.pid || '-') : '-';
			const detectedDdnsTarget = parseDdnsFromConfig(confContent);

			// Clone the central INSTANCE_TEMPLATE safely into the live run result
			const baseResult = Object.assign({}, INSTANCE_TEMPLATE, {
				id: id,
				instNum: instNum,
				role: role,
				ddns: detectedDdnsTarget,
				confContent: String(confContent).trim(),
				isRunning: isRunning,
				pid: pidVal
			});

			// Apply port parsing logic for internal port
			let currentPort = parsePortFromConfig(role, baseResult.confContent);
			if (!currentPort || isNaN(currentPort)) {
				currentPort = calcPortFromId(id, instNum);
			}
			baseResult.port = currentPort;

			// Extract the custom external port-extern value from the environment variable
			const portExternMatch = baseResult.confContent.match(/^setenv\s+port-extern\s+(\d+)/m);
			baseResult.portExtern = portExternMatch ? parseInt(portExternMatch[1], 10) : currentPort;

			// Apply the protocol parsing logic
			baseResult.proto = parseProtoFromConfig(baseResult.confContent);

			// FIXED ENGINE: Parse cipher, localIp, and clientRemote ONCE right here on file load
			if (baseResult.confContent) {
				const lines = baseResult.confContent.split(/[\r\n]+/);
				for (let j = 0; j < lines.length; j++) {
					const line = lines[j].trim();

					if (line.indexOf('cipher ') === 0) {
						baseResult.cipher = line.replace('cipher ', '').trim().toUpperCase();
					}
					else if (line.indexOf('data-ciphers ') === 0) {
						const dcParts = line.replace('data-ciphers ', '').trim().split(':');
						if (dcParts && dcParts[0]) {
							baseResult.cipher = dcParts[0].trim().toUpperCase();
						}
					}

					if (role === OPENVPN.ROLE.CLIENT && line.indexOf('remote ') === 0) {
						const rParts = line.split(/\s+/);
						const remoteIp = (rParts.length >= 2) ? rParts[1] : OPENVPN.IP.LOOPBACK;
						const remotePort = (rParts.length >= 3) ? rParts[2] : OPENVPN.PORT.s1194;
						baseResult.localIp = OPENVPN.IP.LOOPBACK;
						baseResult.clientRemote = remoteIp + ':' + remotePort;
					} else if (role === OPENVPN.ROLE.SERVER) {
						if (line.indexOf('server ') === 0) {
							const sParts = line.split(/\s+/);
							if (sParts.length >= 2) baseResult.localIp = sParts[1].replace(/\.0$/, '.1');
						}
					}
				}
			}

			if (!isRunning || pidVal === '-') return baseResult;

			return L.resolveDefault(L.fs.stat('/proc/' + pidVal), null).then(function (statObj) {
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
							baseResult.startTime = Math.max(1, Math.floor(currentUptime - secondsSinceProcessCreated));
						} else {
							baseResult.startTime = (id === 'instance1') ? 35 : 60;
						}
					} else {
						baseResult.startTime = Math.max(1, Math.floor(rawMtimeSec));
					}
				}
				if (role !== OPENVPN.ROLE.SERVER) return baseResult;

				const statusFilePath = '/var/run/openvpn.' + id + '.status';
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
 * Extracts data traffic packet and byte statistics from the linux network dev files
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
			'style': 'font-family: var(--font-monospace, monospace); margin: 0; padding: 0; border: none !important; line-height: 1.2; color: var(--text-color, #334155);'
		}, [
			E('strong', {}, client)
		]));
	});

	return E('div', { 'style': 'display: block; margin: 0; padding: 0; border: none !important;' }, clientRows);
};

/**
 * Formats a raw byte count into a human-readable data size string (B, KB, or MB)
 */
const formatStatusBytes = function (b) {
	if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
	if (b >= 1024) return (b / 1024).toFixed(1) + ' KB';
	return b + ' B';
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

		const protoStr = (inst.isRunning && inst.proto) ? '-' + inst.proto.toUpperCase() : '';
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
				'style': 'font-weight:normal !important; padding:2px 8px; border-radius:3px; background:var(--background-color, transparent) !important; color:#e67e22 !important; border:1px solid #d35400; text-shadow:none !important; box-shadow:none !important;'
			}, TXT.INFO.pending);
		} else if (L.uci.get(CFG.CMD.openvpn, inst.id, 'enabled') === '1') {
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
		let localConnectionAddress = '-';
		let port;
		if (role === OPENVPN.ROLE.SERVER) {
			port = inst.port || '?';
			localConnectionAddress = inst.localIp + ':' + port + protoStr;
		} else {
			port = inst.isRunning ? 'dynamic' : '-';
			localConnectionAddress = inst.localIp + ':' + port + protoStr;
		}

		const transferDisplay = kernelStats.hasData
			? formatStatusBytes(kernelStats.rxBytes) + ' / ' + formatStatusBytes(kernelStats.txBytes) + ' (' + kernelStats.rxPkts + ' / ' + kernelStats.txPkts + ')'
			: '0 B / 0 B (0 / 0)';

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
			E('td', { 'class': 'td', 'style': 'font-family:var(--font-monospace, monospace); color:var(--text-color, #334155);' }, localConnectionAddress),
			E('td', { 'class': 'td' }, remoteIpNode),
			E('td', { 'class': 'td', 'style': 'font-family:var(--font-monospace, monospace); font-weight:bold; color:#10b981;' }, inst.isRunning ? cipherLabel : '-'),
			E('td', { 'class': 'td', 'style': 'font-family:var(--font-monospace, monospace); color:var(--text-color, #334155); white-space:nowrap;' }, inst.isRunning ? transferDisplay : '-'),
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
 * Refreshes the status table and updates the main dashboard view continuously
 */
const refreshLiveDashboard = async function (viewData, tableContainerElement, refreshMainCallback) {
	try {
		// Wait for the system telemetry to refresh first
		await refreshSystemTelemetry(viewData);

		// Get service data and uci changes at the same time to save time
		const results = await Promise.all([
			L.resolveDefault(callServiceList(CFG.CMD.openvpn), {}),
			L.resolveDefault(L.uci.changes(), {})
		]);

		const [serviceData, uciChanges] = results;
		const instancesObj = serviceData.instances || {};
		const rawChanges = (uciChanges && uciChanges[CFG.CMD.openvpn]) ? uciChanges[CFG.CMD.openvpn] : null;
		const openvpnChanges = getOpenVpnChanges(rawChanges);
		const systemUptime = parseFloat(viewData.uptime) || 0;
		const devDataRaw = String(viewData.devData || '').trim();

		// Wait for the instance status data without nested callback functions
		const updatedInstances = await readInstanceStatus(viewData.sections, instancesObj, systemUptime);

		// Save the fresh data into the global cache object
		viewData.instances = updatedInstances;

		// Update the live status table layout on the screen
		if (tableContainerElement && tableContainerElement.firstChild) {
			const freshTableNode = refreshStatusTable(viewData.instances, devDataRaw, systemUptime, true, openvpnChanges);
			tableContainerElement.replaceChild(freshTableNode, tableContainerElement.firstChild);
		}

		// Fire the callback method to update the main view badges
		if (typeof refreshMainCallback === 'function') {
			const calculatedState = getCurrentOpenVpnState(viewData.sections, viewData.instances, openvpnChanges);
			refreshMainCallback(calculatedState, devDataRaw, viewData);
		}

	} catch (err) {
		console.error('LuCI Live Dashboard Refresh Failed:', err.message);
	}
};

/**
 * Export the status functions to the main LuCI view layer
 */
return L.Class.extend({
	INSTANCE_TEMPLATE: INSTANCE_TEMPLATE,
	parsePortFromConfig: parsePortFromConfig,
	parseProtoFromConfig: parseProtoFromConfig,
	parseDdnsFromConfig: parseDdnsFromConfig,
	readInstanceStatus: readInstanceStatus,
	refreshStatusTable: refreshStatusTable,
	refreshLiveDashboard: refreshLiveDashboard
});
