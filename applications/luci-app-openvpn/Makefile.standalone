#
# Copyright (C) 2008-2026 The OpenWrt Project
# Copyright (C) 2026 Manfred Jaider <masmbit@users.noreply.github.com>
#
# This is free software, licensed under the Apache License, Version 2.0.
# See /LICENSE for more information.
#
# luci-app-openvpn : Makefile.standalone

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-openvpn
PKG_VERSION:=2.0.0
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=Manfred Jaider <masmbit@users.noreply.github.com>

# List all language translation codes to be bundled directly into the main package
PKG_LANGS:=de zh-cn

include $(INCLUDE_DIR)/package.mk

# --- Main Application Package Definition ---
define Package/luci-app-openvpn
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=LuCI support for OpenVPN server and client configuration
  DEPENDS:=+luci-base +openvpn +openssl-util +firewall4
  PKGARCH:=all
endef

define Package/luci-app-openvpn/description
  This package provides an easy web interface to configure OpenVPN servers and
  clients quickly. With the built-in key generator, wizard, and DDNS, your VPN
  is up and running immediately. It replaces the old interface with a modern
  design optimized for current OpenWrt builds.
endef

# --- Build & Compilation Stage ---
define Build/Compile
	$(INSTALL_DIR) $(PKG_BUILD_DIR)
	# Loop through the language array and compile .po text files into binary .lmo format
	$(foreach lang,$(PKG_LANGS), \
		if [ -f ./po/$(lang)/openvpn.po ]; then \
			po2lmo ./po/$(lang)/openvpn.po $(PKG_BUILD_DIR)/openvpn.$(lang).lmo; \
		fi; \
	)
endef

# --- Package Installation Stage ---
define Package/luci-app-openvpn/install

	$(INSTALL_DIR) $(1)/etc/hotplug.d/iface
	$(INSTALL_DATA) ./root/etc/hotplug.d/iface/35-luci-app-openvpn-bootup $(1)/etc/hotplug.d/iface/35-luci-app-openvpn-bootup

	$(INSTALL_DIR) $(1)/etc/hotplug.d/openvpn
	$(INSTALL_DATA) ./root/etc/hotplug.d/openvpn/35-luci-app-openvpn-ddns $(1)/etc/hotplug.d/openvpn/35-luci-app-openvpn-ddns

	$(INSTALL_DIR) $(1)/etc/openvpn/keys

	$(INSTALL_DIR) $(1)/etc/openvpn/luci
	$(INSTALL_DATA) ./root/etc/openvpn/luci/server.default.conf $(1)/etc/openvpn/luci/server.default.conf
	$(INSTALL_DATA) ./root/etc/openvpn/luci/client.default.conf $(1)/etc/openvpn/luci/client.default.conf

	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./root/etc/uci-defaults/35_luci-app-openvpn $(1)/etc/uci-defaults/35_luci-app-openvpn

	$(INSTALL_DIR) $(1)/usr/libexec
	$(INSTALL_BIN) ./root/usr/libexec/luci-app-openvpn $(1)/usr/libexec/luci-app-openvpn

	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-openvpn.json $(1)/usr/share/luci/menu.d/luci-app-openvpn.json

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-openvpn.json $(1)/usr/share/rpcd/acl.d/luci-app-openvpn.json
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-openvpn-status.json $(1)/usr/share/rpcd/acl.d/luci-app-openvpn-status.json

	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/vpn
	$(INSTALL_DATA) ./root/www/luci-static/resources/view/vpn/openvpn.js $(1)/www/luci-static/resources/view/vpn/openvpn.js
	$(INSTALL_DATA) ./root/www/luci-static/resources/view/vpn/openvpn-status.js $(1)/www/luci-static/resources/view/vpn/openvpn-status.js
	$(INSTALL_DATA) ./root/www/luci-static/resources/view/vpn/openvpn-keygen.js $(1)/www/luci-static/resources/view/vpn/openvpn-keygen.js
	$(INSTALL_DATA) ./root/www/luci-static/resources/view/vpn/openvpn-wizard.js $(1)/www/luci-static/resources/view/vpn/openvpn-wizard.js

	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/status/include
	$(INSTALL_DATA) ./root/www/luci-static/resources/view/status/include/35_openvpn.js $(1)/www/luci-static/resources/view/status/include/35_openvpn.js

	# 3. Install compiled binary .lmo translation assets directly into the same package
	$(INSTALL_DIR) $(1)/usr/share/luci/i18n
	$(foreach lang,$(PKG_LANGS), \
		if [ -f $(PKG_BUILD_DIR)/openvpn.$(lang).lmo ]; then \
			$(INSTALL_DATA) $(PKG_BUILD_DIR)/openvpn.$(lang).lmo $(1)/usr/share/luci/i18n/openvpn.$(lang).lmo; \
		fi; \
	)

endef

# Evaluate the main package into the OpenWrt Buildroot
$(eval $(call BuildPackage,luci-app-openvpn))

