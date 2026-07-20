#
# Copyright (C) 2008-2026 The OpenWrt Project
#
# This is free software, licensed under the Apache License, Version 2.0.
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
  DEPENDS:=+luci-base +openvpn-openssl +openssl-util +nftables +coreutils
  PKGARCH:=all
endef

define Package/luci-app-openvpn/description
  This package provides an easy-to-use web interface for simple configuration 
  of OpenVPN server and client instances with key generator and connection wizard. 
  It is the replacement of the old, unsupported LuCI interface, delivering a 
  completely modernized design optimized for current OpenWrt builds.
endef

define Build/Compile
endef

define Package/luci-app-openvpn/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_DATA) ./root/etc/config/openvpn $(1)/etc/config/openvpn

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./root/etc/init.d/openvpn $(1)/etc/init.d/openvpn

	$(INSTALL_DIR) $(1)/etc/openvpn
	$(INSTALL_DATA) ./root/etc/openvpn/server.default.conf $(1)/etc/openvpn/server.default.conf
	$(INSTALL_DATA) ./root/etc/openvpn/client.default.conf $(1)/etc/openvpn/client.default.conf

	$(INSTALL_DIR) $(1)/etc/openvpn/keys

	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/openvpn.json $(1)/usr/share/luci/menu.d/openvpn.json

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-openvpn.json $(1)/usr/share/rpcd/acl.d/luci-app-openvpn.json
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-openvpn-status.json $(1)/usr/share/rpcd/acl.d/luci-app-openvpn-status.json

	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/vpn
	$(INSTALL_DATA) ./root/www/luci-static/resources/view/vpn/openvpn.js $(1)/www/luci-static/resources/view/vpn/openvpn.js
	$(INSTALL_DATA) ./root/www/luci-static/resources/view/vpn/openvpn-status.js $(1)/www/luci-static/resources/view/vpn/openvpn-status.js

	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/status/include
	$(INSTALL_DATA) ./root/www/luci-static/resources/view/status/include/35_openvpn.js $(1)/www/luci-static/resources/view/status/include/35_openvpn.js
endef

$(eval $(call BuildPackage,luci-app-openvpn))
