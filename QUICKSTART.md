# Quick Start Guide

Get QLCPlus-MCP up and running in 5 minutes.

## Prerequisites

- Node.js >= 20.20.0, Node 22 LTS recommended
- QLC+ 4.x with OSC plugin enabled
- npm

## Installation

```bash
# Clone and install
git clone https://github.com/infrafast/QLCPlus-MCP.git
cd QLCPlus-MCP
npm ci
npm run build

# Setup environment
cp .env.example config/.env
```

## Configure

Edit `config/.env`:

```bash
# Basic setup - change QLC_HOST for your QLC+ machine
MCP_TRANSPORT=http
HTTP_HOST=0.0.0.0
HTTP_PORT=8788
QLC_HOST=127.0.0.1
QLC_OSC_INPUT_PORT=7700
QLC_OSC_OUTPUT_PORT=9000
QLC_DRY_RUN=false
```

## Start

**Terminal 1: QLC+**

```bash
qlcplus
# Then in QLC+: Input/Output → OSC → Set ports to 7700/9000
```

**Terminal 2: QLCPlus-MCP**

```bash
npm run start:http
# Should see: "OSC initialized" and "Agent HTTP MCP config"
```

**Terminal 3: Your client**

For LiveStageAssistant, configure the active MCP config to use:

```json
{
  "qlcplus": {
    "type": "streamable-http",
    "url": "http://127.0.0.1:8788/mcp",
    "headers": {},
    "assistantOptions": {
      "routing": "qlc,qlcplus,lumière,light,éclairage,scène,dmx,fixture,projecteur,couleur"
    }
  }
}
```

If LiveStageAssistant also loads a large MCP server such as XMSeries-MCP, set `MCP_TOOL_ROUTING_ENABLED=true` in the active LiveStageAssistant `.env`. The routing keywords keep QLC+ lighting turns on the QLCplus tool subset and avoid exceeding OpenAI's 128-tool request limit.

## Test

Once all three are running:

1. Ask your AI client to dim the lights: "Set master brightness to 50%"
2. Watch QLC+ respond in real-time
3. Ask your AI client: "Are you connected to QLC+?"
4. The assistant should call `qlc_get_state` and report the configured host/port plus whether recent QLC+ feedback was seen
5. Check QLCPlus-MCP terminal for logs

## Common Issues

**"OSC not initialized"** → Ensure QLC+ is running with OSC enabled

**No recent QLC+ feedback** → QLCPlus-MCP can send UDP, but cannot confirm QLC+ response until feedback is received on `QLC_OSC_OUTPUT_PORT`

**"Widget not found"** → Create `config/widgets.json` with your scene names

**Prompt not loaded in the agent** → Configure your MCP host to fetch standard prompt `agent_prompt`, resource `agent://prompt/system`, or fallback tool `get_agent_prompt`

**No logs** → Check `LOG_LEVEL=debug` in `config/.env` for more details

## Next Steps

- [Full Documentation](./README.md)
- [Integration Guide](./docs/live-stage-assistant-integration.md)
- [Configuration Reference](./docs/MCP-CONFIG.md)
- [Generate widget mappings from QLC+ project](./docs/MCP-CONFIG.md#generating-mappings)

## HTTP Mode (Remote)

For remote/network access:

```bash
# Server
npm run start:http

# Client configuration
{
  "qlcplus": {
    "type": "streamable-http",
    "url": "http://lighting-machine:8788/mcp",
    "headers": {}
  }
}
```

For bearer authentication, set `MCP_AUTH_MODE=bearer` and `MCP_AUTH_TOKEN=my-secret` in `config/.env`. The startup log prints the correct client JSON.

## Docker / Synology DSM Quick Start

QLCPlus-MCP ships with `Dockerfile`, `.dockerignore`, and `docker-compose.yml`.

```bash
cp .env.example config/.env
# Edit QLC_HOST to the LAN IP of the QLC+ machine.
docker compose build
docker compose up -d
docker compose logs -f qlcplus-mcp
```

`docker-compose.yml` mounts `./config` to `/config`, so you can edit `config/.env` or `config/widgets.json` on the host, then restart the container without rebuilding the image.

Container endpoints:

```text
http://<docker-host>:8788/mcp
http://<docker-host>:8788/health
```

For Synology DSM Container Manager:

1. Copy this repository to a NAS folder such as `/volume2/docker/QLCPlus-MCP`.
2. Edit `config/.env` in that folder and set `QLC_HOST`, `HTTP_PORT`, and `QLC_WIDGETS_FILE=/config/widgets.json`.
3. Put your widget mappings in `/volume2/docker/QLCPlus-MCP/config/widgets.json`.
4. Create a Container Manager Project from `docker-compose.yml`.
5. Publish `8788/tcp` and `9000/udp` as defined by compose.
6. Start the project and copy the printed `Agent HTTP MCP config` from the logs.

If LiveStageAssistant runs on another machine, replace `127.0.0.1` in the printed JSON with the Synology IP or hostname.

## Help

- Check `config/.env` configuration
- Review logs: `LOG_LEVEL=debug npm run start:http`
- See troubleshooting in [README.md](./README.md#troubleshooting)

---

**That's it! You're ready to control QLC+ with AI.**
