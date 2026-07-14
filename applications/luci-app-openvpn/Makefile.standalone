#
# Copyright (C) 2008-2026 The OpenWrt Project
#
# This is free software, licensed under the Apache License, Version 2.0.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-openvpn
PKG_VERSION:=2.0.0
PKG_RELEASE:=1

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-openvpn
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=LuCI Support for OpenVPN Multi-Instance Gateway
  DEPENDS:=+openvpn-openssl +luci-base +nftables
  PKGARCH:=all
endef

define Package/luci-app-openvpn/description
  This package provides an easy-to-use web interface for the simple configuration 
  and fast deployment of OpenVPN server and client instances. It is the replacement 
  of the old, unsupported LuCI interface, delivering a completely modernized design 
  optimized for current OpenWrt builds.
endef

define Build/Compile
endef

define Package/luci-app-openvpn/install
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/vpn
	$(INSTALL_DATA) ./root/www/luci-static/resources/view/vpn/openvpn.js $(1)/www/luci-static/resources/view/vpn/openvpn.js

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-openvpn.json $(1)/usr/share/rpcd/acl.d/luci-app-openvpn.json

	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/openvpn.json $(1)/usr/share/luci/menu.d/openvpn.json

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./root/etc/init.d/openvpn $(1)/etc/init.d/openvpn

	$(INSTALL_DIR) $(1)/etc/openvpn
	$(INSTALL_DATA) ./root/etc/openvpn/server.default.conf $(1)/etc/openvpn/server.default.conf
	$(INSTALL_DATA) ./root/etc/openvpn/client.default.conf $(1)/etc/openvpn/client.default.conf

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_DATA) ./root/etc/config/openvpn $(1)/etc/config/openvpn
	
	$(INSTALL_DIR) $(1)/etc/openvpn/keys
endef

$(eval $(call BuildPackage,luci-app-openvpn))
