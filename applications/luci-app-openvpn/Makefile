#
# Copyright (C) 2008-2026 The OpenWrt Project
# Copyright (C) 2026 Manfred Jaider <masmbit@users.noreply.github.com>
#
# This is free software, licensed under the Apache License, Version 2.0.
# See /LICENSE for more information.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-openvpn
PKG_VERSION:=2.0.0
PKG_RELEASE:=1
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=Manfred Jaider <masmbit@users.noreply.github.com>

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-openvpn
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=LuCI support for OpenVPN server and client configuration
  DEPENDS:=+luci-base +openvpn +openssl-util +firewall4 +coreutils
  PKGARCH:=all
endef

define Package/luci-app-openvpn/description
  This package provides an easy web interface to configure OpenVPN servers and
  clients quickly. With the built-in key generator, wizard, and DDNS, your VPN
  is up and running immediately. It replaces the old interface with a modern
  design optimized for current OpenWrt builds.
endef

define Build/Compile
endef

define Package/luci-app-openvpn/install
	$(INSTALL_DIR) $(1)/etc/hotplug.d/openvpn
	$(INSTALL_BIN) ./root/etc/hotplug.d/openvpn/10-luci-app-openvpn-ddns $(1)/etc/hotplug.d/openvpn/10-luci-app-openvpn-ddns
	
	$(INSTALL_DIR) $(1)/etc/openvpn/keys
	
	$(INSTALL_DIR) $(1)/etc/openvpn/luci
	$(INSTALL_DATA) ./root/etc/openvpn/luci/server.default.conf $(1)/etc/openvpn/luci/server.default.conf
	$(INSTALL_DATA) ./root/etc/openvpn/luci/client.default.conf $(1)/etc/openvpn/luci/client.default.conf	

	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./root/etc/uci-defaults/99_luci-app-openvpn $(1)/etc/uci-defaults/99_luci-app-openvpn	
	
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
endef

$(eval $(call BuildPackage,luci-app-openvpn))
