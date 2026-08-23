# luci-app-openvpn

Modern client-side JavaScript user interface for easy OpenVPN server and client configuration on OpenWrt.

## Description

This package provides an easy web interface to configure OpenVPN servers and clients quickly. With the built-in key generator, wizard, and DDNS, your VPN is up and running immediately. It replaces the old interface with a modern design optimized for current OpenWrt builds.

Thanks to this user-friendly application, **anyone can deploy a secure OpenVPN network now**. You do not need to know anything about complex cryptographic key generation or writing config files—the app automatically handles the entire background setup for you.

With the new `luci-app-openvpn`, building new server and client connections becomes incredibly easy. Automated firewall management, smart network environment detection, and seamless profile sharing make managing secure VPN tunnels completely effortless.

## Features

- **Easy Setup:** Deploy fully working OpenVPN servers or clients in seconds.
- **Connection Wizard:** Simple step-by-step configuration for mobile clients, laptops, and LAN-to-LAN networks.
- **Smart Network Detection:** Automatically detects your public IP, domain name, and checks if your router is running behind a **Double-NAT gateway** (another main internet router).
- **Automatic Keygen:** Background cryptographic wizard automatically creates secure keys and certificates (RSA / Pure ECC) on your router.
- **Integrated Key Editor:** View, edit, download, and verify key files and validity dates directly inside your web browser.
- **Automated Firewall Rules:** Automatically creates all required firewall zone mappings, secure traffic rules, and double-NAT port forwardings.
- **Smart Profile Export & QR-Code Sync:** Download complete `.ovpn` profiles or generate a secure QR-code. Just scan it with your phone camera for instant import into the OpenVPN Connect app without downloading files.
- **Seamless Profile Import:** Upload existing `.ovpn` configs or `.crt` multi-key bundles to set up new client instances instantly on your router.
- **Global Mobile Profiles (TCP 443):** Smart deployment presets for standard UDP or **travel-optimized TCP 443** connections—perfect for bypassing strict firewalls and surfing safely anywhere in the world.
- **Dynamic DNS (DDNS) Support:** Built-in connection tracker with a global hotplug script to update your VPN endpoint automatically when your public WAN IP changes.
- **Clear Status Table:** A compact overview of running tunnels, active PIDs, encryption strength, and live rx/tx data transfer.

## Configuration Layout

The application manages configurations inside `/etc/config/openvpn`:

```ini
config openvpn 'instance1'
	option enabled '0'
	option role 'server'
	option config '/etc/openvpn/luci/instance1.conf'
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
    │   ├── hotplug.d/
    │   │   └── openvpn/
    │   │       └── 10-luci-app-openvpn-ddns
    │   ├── openvpn/
    │   │   ├── keys/
    │   │   └── luci/
    │   │       ├── client.default.conf
    │   │       └── server.default.conf
    │   └── uci-defaults/
    │       └── 99_luci-app-openvpn
    ├── usr/
    │   ├── libexec/
    │   │   └── luci-app-openvpn
    │   └── share/
    │       ├── luci/menu.d/
    │       │   └── luci-app-openvpn.json
    │       └── rpcd/acl.d/
    │           ├── luci-app-openvpn.json
    │           └── luci-app-openvpn-status.json
    └── www/
        └── luci-static/resources/view/
            ├── status/include/
            │   └── 35_openvpn.js
            └── vpn/
                ├── openvpn.js
                ├── openvpn-keygen.js
                ├── openvpn-status.js
                └── openvpn-wizard.js
```

## License

Licensed under the Apache License 2.0.
