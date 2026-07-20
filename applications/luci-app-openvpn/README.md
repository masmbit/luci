# luci-app-openvpn

Modern client-side JavaScript user interface for easy OpenVPN server and client configuration on OpenWrt.

## Description

This package provides an easy-to-use web interface for simple configuration of OpenVPN server and client instances with key generator and connection wizard. It is the replacement of the old, unsupported LuCI interface, delivering a completely modernized design optimized for current OpenWrt builds.

With the new `luci-app-openvpn`, building new server and client connections becomes incredibly easy. Automated firewall management and the built-in key generator help you to establish correct and highly secure VPN tunnel connections without manual effort. 

The live status overview is clean and simple. Using the integrated connection wizard, you can deploy real-world VPN profiles with just a few clicks. Managing and creating secure VPN connections has never been this effortless.

## Features

- **Easy Setup:** Deploy fully working OpenVPN servers or clients in seconds.
- **Connection Wizard:** Simple step-by-step configuration for real-world use cases.
- **Automatic Keygen:** Automatically creates secure cryptographic keys and certificates.
- **Smart Firewall:** Handles all necessary firewall zone rules and port forwardings.
- **Clear Status Table:** A compact overview of running tunnels, encryption types, and live data transfer.

## Configuration Layout

The application manages configurations inside `/etc/config/openvpn`:

```ini
config openvpn 'instance1'
	option enabled '0'
	option role 'server'
	option config '/etc/openvpn/instance1.conf'
```

## Directory Structure

```text
luci-app-openvpn/
├── Makefile
├── LICENSE
├── README.md
└── root/
    ├── etc/
    │   ├── config/
    │   │   └── openvpn
    │   ├── init.d/
    │   │   └── openvpn
    │   └── openvpn/
    │       ├── client.default.conf
    │       ├── server.default.conf
    │       └── keys/
    ├── usr/
    │   share/
    │   ├── luci/menu.d/
    │   │   └── openvpn.json
    │   └── rpcd/acl.d/
    │       ├── luci-app-openvpn.json
    │       └── luci-app-openvpn-status.json
    └── www/
        luci-static/resources/view/
            ├── status/include/
            │   └── 35_openvpn.js
            └── vpn/
                ├── openvpn.js
                └── openvpn-status.js
```

## License

Licensed under the Apache License 2.0.
