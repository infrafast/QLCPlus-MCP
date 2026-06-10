# QLCPlus-MCP Raspberry Pi service

This pack installs QLCPlus-MCP as a systemd service on Raspberry Pi.

The repository supports HTTP mode through:

```bash
npm run start:http
```

which sets:

```bash
MCP_TRANSPORT=http
```

## Files

- `qlcplusmcp.env` -> `/etc/qlcplusmcp.env`
- `qlcplusmcp.service` -> `/etc/systemd/system/qlcplusmcp.service`
- `qlcplusmcp` -> `/usr/local/bin/qlcplusmcp`
- `install_qlcplusmcp_service.sh` -> installer script

## Prerequisites

Make sure the repository exists here:

```text
/home/pi/QLCPlus-MCP
```

and has already been built:

```bash
cd /home/pi/QLCPlus-MCP
npm ci --no-audit --no-fund
npm run build
```

Node.js must be >= 20.20.0. Node 22 LTS is recommended when installing both QLCPlus-MCP and XMSeries-MCP on the same Raspberry Pi.

The runtime no longer depends on `mcp-use`; installation is intentionally kept close to XMSeries-MCP and uses the official MCP SDK directly.

If `dist/src/index.js` is already present from a previous build or deployment package, a runtime-only Raspberry Pi install can use `npm ci --omit=dev --omit=optional --no-audit --no-fund` to avoid installing TypeScript/test tooling. Use the full `npm ci --no-audit --no-fund` form when you need to rebuild on the Pi.

## Install

From the folder containing these files:

```bash
chmod +x install_qlcplusmcp_service.sh
./install_qlcplusmcp_service.sh
```

Then check the environment file:

```bash
sudo nano /etc/qlcplusmcp.env
```

After the service is running, open `http://<raspberry-ip>:8788/mcp` to view runtime status, tools/resources, and update the QLC+ host/OSC ports from the browser. Changes are saved back to `/etc/qlcplusmcp.env` and the OSC client reconnects immediately.

Start automatically at boot:

```bash
qlcplusmcp auto
```

## Commands

```bash
qlcplusmcp start
qlcplusmcp stop
qlcplusmcp restart
qlcplusmcp status
qlcplusmcp logs
qlcplusmcp health
qlcplusmcp test-remote
qlcplusmcp last-state
qlcplusmcp noauto
qlcplusmcp config
```

## Default ports

- QLCPlus-MCP HTTP: `8788`
- MCP endpoint: `/mcp`
- QLC+ OSC input: `7700`
- QLC+ OSC output/listen: `9000`

## Expected architecture

NAS Synology / LiveStageAssistant calls:

```text
http://<raspberry-tailscale-ip>:8788/mcp
```

Raspberry Pi / QLCPlus-MCP sends OSC to QLC+:

```text
QLC_HOST:7700
```

If QLC+ runs on the Raspberry, keep:

```env
QLC_HOST=127.0.0.1
```

If QLC+ runs on another machine in the rack, use its LAN IP, for example:

```env
QLC_HOST=192.168.100.30
```
