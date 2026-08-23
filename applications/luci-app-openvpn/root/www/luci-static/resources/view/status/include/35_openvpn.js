/*
 * Copyright (C) 2008-2026 The OpenWrt Project
 * Copyright (C) 2026 Manfred Jaider <masmbit@users.noreply.github.com>
 *
 * This is free software, licensed under the Apache License, Version 2.0.
 * See /LICENSE for more information.
 *
 * luci-app-openvpn : LuCI status overview page
 * /www/luci-static/resources/view/status/include/35_openvpn.js
 */

/* global E */
'use strict';

const TXT = {
	STATUS: {
		title: _('OpenVPN'),
		active: _('Active'),
		disabled: _('Disabled'),
		pending: _('Pending...'),
		error: _('Error')
	}
};
const CFG = Object.freeze({
	FILE: Object.freeze({
		vpn_disabled_img: '/luci-static/resources/icons/tunnel_disabled.svg',
		vpn_enabled_img: '/luci-static/resources/icons/tunnel.svg'
	})
});

return L.Class.extend({
	title: TXT.STATUS.title,

	// Shared data container for the OpenVPN view context
	VIEW_DATA: {
		statusClass: null,
		wizardClass: null,
		devData: '',
		uptime: 0,
		serverTemplate: '',
		clientTemplate: '',
		logread: '',
		keysReady: false,
		sections: [],
		instances: []
	},

	// Shared HTML container nodes
	statusTableContainer: null,
	ifaceBoxContainer: null,

	/**
	 * Load code and data before rendering the page elements
	 */
	load: function () {
		const self = this;

		// Keep the outer Promise for LuCI class engine stability
		return Promise.all([
			L.require('view.vpn.openvpn-status'),
			L.uci.load('openvpn').catch(function () { return null; })

		// Make only the inner callback function async!
		]).then(async function (results) {

			const openvpnStatus = results[0];
			if (!openvpnStatus) return null;

			const sections = L.uci.sections('openvpn', 'openvpn') || [];

			// If no instances exist, clear title and hide the card block completely
			if (sections.length === 0) {
				self.title = '';
				return null;
			}

			self.title = TXT.STATUS.title;
			self.statusTableContainer = E('div', { 'id': 'openvpn_overview_table_wrapper', 'style': 'display: block;' }, [E('div', {})]);
			self.ifaceBoxContainer = E('div', { 'style': 'display:block; margin: 10px 0 15px 0; text-align: left;' }, []);

			// Use the safe outer context reference "self" to read the view data
			const viewData = self.VIEW_DATA;
			viewData.sections = sections;

			// Callback function to refresh the flat ifacebox visualization matrix
			const stateCaptureCallback = function (calculatedState) {
				if (!self.ifaceBoxContainer) return;

				let labelText = TXT.STATUS.disabled;
				let headBg = 'background:var(--background-color-muted, #94a3b8) !important; color:var(--text-color-dark, #ffffff) !important;';
				let imgIcon = CFG.FILE.vpn_disabled_img;

				if (calculatedState === 'active') {
					labelText = TXT.STATUS.active;
					headBg = 'background:var(--zone-lan-bg, rgb(46, 204, 113)) !important; color:var(--text-color-dark, #ffffff) !important;';
					imgIcon = CFG.FILE.vpn_enabled_img;
				} else if (calculatedState === 'pending') {
					labelText = TXT.STATUS.pending;
					headBg = 'background:var(--zone-forward-bg, rgb(230, 126, 34)) !important; color:var(--text-color-dark, #ffffff) !important;';
				} else if (calculatedState === 'error') {
					labelText = TXT.STATUS.error;
					headBg = 'background:var(--zone-wan-bg, rgb(231, 76, 60)) !important; color:var(--text-color-dark, #ffffff) !important;';
				}

				const boxHeadNode = E('div', {
					'class': 'ifacebox-head',
					'style': 'padding:2px 12px; font-size:11px; font-weight:bold; text-shadow:none !important; text-align:center; white-space:nowrap; ' + headBg
				}, [E('strong', {}, labelText)]);

				const boxBodyNode = E('div', {
					'class': 'ifacebox-body',
					'style': 'padding:6px; text-align:center; min-height:0; background:transparent !important;'
				}, [
					E('img', { 'src': imgIcon, 'style': 'width:32px; height:36px; vertical-align:middle;' })
				]);

				const flatIfaceBox = E('div', {
					'class': 'ifacebox',
					'style': 'display:inline-block; vertical-align:middle; margin:0; background:var(--background-color, #fafafa); border:1px solid var(--border-color, #cbd5e1); border-radius:4px; overflow:hidden;'
				}, [boxHeadNode, boxBodyNode]);

				if (self.ifaceBoxContainer.firstChild) {
					self.ifaceBoxContainer.replaceChild(flatIfaceBox, self.ifaceBoxContainer.firstChild);
				} else {
					self.ifaceBoxContainer.appendChild(flatIfaceBox);
				}
			};

			try {
				// Use the clean await operator to trigger the live dashboard refresh loop flatly
				await openvpnStatus.refreshLiveDashboard(viewData, self.statusTableContainer, stateCaptureCallback);
				return openvpnStatus;
			} catch (err) {
				console.error('Error during initial dashboard telemetry launch:', err);
				return openvpnStatus;
			}
		});
	},

	/**
	 * Render the page elements onto the interface
	 */
	render: function (openvpnStatus) {
		if (!openvpnStatus || !this.statusTableContainer || !this.ifaceBoxContainer) {
			return null;
		}

		return E('div', { 'class': 'cbi-section', 'style': 'margin:0; padding:0; width:100%;' }, [
			this.ifaceBoxContainer,
			this.statusTableContainer
		]);
	}
});

