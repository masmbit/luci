# luci-app-openvpn

Modern client-side JavaScript (LuCI2) user interface for OpenVPN instance management on OpenWrt. This package serves as a secure, fully functional replacement for the deprecated Lua/CBI legacy implementation.

## Features

- **Multi-Instance Support:** Dynamically create, configure, and delete parallel OpenVPN server and client sections from the UI.
- **Procd Integration:** Service states and process lifetimes are natively managed via OpenWrt's `procd` daemon.
- **On-Device Crypto Provisioning:** Automatically generates a unique default crypto environment (`ca`, `certs`, `dhparam`, `tls-crypt` with 100-year validity) during the initial service boot phase to guarantee secure cryptographic isolation without shared-key vulnerabilities and prevent handshakes failures on hardware lacking active NTP synchronization.
- **Deterministic UI Locks:** Front-end controls apply visual execution locks during UCI transaction switches to prevent `procd` timing conflicts.

## Configuration Layout

The application manages sections inside `/etc/config/openvpn`:

```ini
config openvpn 'instance1'
	option enabled '0'
	option role 'server'
	option config '/etc/openvpn/instance1.conf'
```

Daemon configuration profiles are stored individually as `/etc/openvpn/instanceX.conf`.

## Directory Structure

```text
luci-app-openvpn/
├── Makefile
├── Makefile.standalone
├── Makefile.upstream
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
    │       └── luci-app-openvpn.json
    └── www/
        luci-static/resources/view/vpn/
            └── openvpn.js
```

## License

Licensed under the Apache License 2.0.
