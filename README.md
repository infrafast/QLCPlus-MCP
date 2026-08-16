# QLCPlus-MCP

QLCPlus-MCP is a TypeScript Model Context Protocol server for controlling QLC+ lighting from an AI agent.

The current stable transport is OSC: the server sends OSC messages to QLC+, and QLC+ remains the lighting engine. Show actions are modeled as QLC+ Virtual Console widgets, mapped in `config/widgets.json`, then triggered through MCP tools.

The project is migrating directly to the QLC+ 5 native network protocol so
widget IDs can be discovered from the active project and connection state can be
verified and recovered cleanly. WebSocket is no longer the migration target.
Track the native-only migration in [ROADMAP.md](ROADMAP.md).

## What It Does

- Exposes QLC+ lighting controls as MCP tools.
- Supports local `stdio` clients and remote streamable HTTP clients.
- Triggers mapped Virtual Console widgets by logical name or direct OSC path.
- Lists mapped widgets for agent-side discovery.
- Reports OSC runtime state and recent QLC+ feedback freshness.
- Optionally sends raw OSC messages when explicitly enabled.
- Exposes the repository [PROMPT.md](PROMPT.md) as an MCP prompt/resource/tool for lighting-specific agent instructions.

For technical internals, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Quick Start

Prerequisites:

- Node.js `>=20.20.0`
- npm
- QLC+ 4.x currently configured with OSC enabled

Install:

```bash
git clone https://github.com/infrafast/QLCPlus-MCP.git
cd QLCPlus-MCP
npm ci
npm run build
```

Create runtime configuration:

```bash
cp .env.example config/.env
```

Edit `config/.env`, then start the server:

```bash
npm run start:http
```

The HTTP MCP endpoint defaults to:

```text
http://0.0.0.0:8788/mcp
```

Use dry-run mode for first tests:

```bash
QLC_DRY_RUN=true npm run start:http
```

## QLC+ Setup

Current OSC mode requires QLC+ to accept OSC input.

1. Open QLC+.
2. Enable/configure the OSC plugin in Input/Output.
3. Use input port `7700` unless you configured another port.
4. Create Virtual Console buttons/sliders for the show actions you want the agent to trigger.
5. Map those controls in `config/widgets.json`, or generate a starter mapping from a `.qxw` file.

On Linux/Raspberry Pi, `oscsend` is useful for teaching QLC+ widget input addresses:

```bash
sudo apt install liblo-tools
oscsend 127.0.0.1 7700 /lecture_pause i 1
```

OSC protocol details and implementation notes are documented in [ARCHITECTURE.md](ARCHITECTURE.md).

## Configuration

The server looks for environment files in this order:

1. `QLCPLUS_MCP_ENV_FILE`
2. `/etc/qlcplusmcp.env`
3. `/config/.env`
4. `config/.env`
5. `.env`

Common settings:

```bash
MCP_TRANSPORT=http
HTTP_HOST=0.0.0.0
HTTP_PORT=8788
HTTP_MCP_PATH=/mcp

MCP_AUTH_MODE=none
# MCP_AUTH_MODE=bearer
# MCP_AUTH_TOKEN=change-me

QLC_HOST=127.0.0.1
QLC_OSC_INPUT_PORT=7700
QLC_OSC_OUTPUT_PORT=9000
QLC_UNIVERSE=1

QLC_WIDGETS_FILE=config/widgets.json
QLC_ALLOW_RAW_OSC=false
QLC_DRY_RUN=false

LOG_LEVEL=info
NODE_ENV=development
```

Milestone 1 also provides an opt-in observational QLC+ 5 native client. It does
not send lighting actions yet:

```bash
QLC_NATIVE_ENABLED=true
QLC_NATIVE_HOST=127.0.0.1
QLC_NATIVE_PORT=9998
```

It requires a QLC+ build containing commit `984f0e7` or equivalent native
protocol behavior. QLC+ may ask the operator to authorize `QLCPlus-MCP`. The
client then downloads the active project, reports its connection/inventory state
through `qlc_get_state` and `/mcp/status`, and reconnects after QLC+ restarts.

The complete configuration reference is maintained in [ARCHITECTURE.md](ARCHITECTURE.md).

## Widget Mapping

In the current OSC architecture, `config/widgets.json` maps friendly names to OSC paths:

```json
{
  "widgets": [
    {
      "id": "28",
      "name": "Rouge",
      "path": "/rouge",
      "type": "button",
      "description": "QLC+ red look"
    }
  ],
  "generated": true
}
```

An agent can then call `qlc_button_press` with:

```json
{
  "widgetName": "Rouge"
}
```

Generate a mapping from a QLC+ project:

```bash
npm run generate:widgets intervalPI.qxw config/widgets.json
```

`widgets.json` will cease to be a runtime requirement after native-only control is
validated. Until then, keep it as the stable OSC source of truth.

## Usage Scenarios

### Local MCP Client

Use `stdio` when the MCP host runs on the same machine:

```bash
npm run start:stdio
```

Example client config:

```json
{
  "mcpServers": {
    "qlcplus": {
      "command": "node",
      "args": ["/full/path/to/QLCPlus-MCP/dist/src/index.js"]
    }
  }
}
```

### Remote Or Network Client

Use HTTP when another machine or service connects to the server:

```bash
npm run start:http
```

Enable bearer auth on trusted deployments:

```bash
MCP_AUTH_MODE=bearer MCP_AUTH_TOKEN="$(openssl rand -base64 32)" npm run start:http
```

### LiveStageAssistant

Use either `stdio` for same-host setups or HTTP for network deployments. The server exposes [PROMPT.md](PROMPT.md) as `agent_prompt`, `agent://prompt/system`, and `get_agent_prompt` so a host can load the lighting guidance automatically.

Example `stdio` MCP configuration:

```json
{
  "mcpServers": {
    "qlcplus": {
      "command": "node",
      "args": ["/path/to/QLCPlus-MCP/dist/src/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "MCP_PROMPT_FILE": "/path/to/QLCPlus-MCP/PROMPT.md"
      },
      "assistantOptions": {
        "routing": "qlc,qlcplus,lumière,light,éclairage,scène,dmx,fixture,projecteur,couleur"
      }
    }
  }
}
```

Example HTTP MCP configuration:

```json
{
  "mcpServers": {
    "qlcplus": {
      "url": "http://lighting-machine.local:8788/mcp",
      "auth": {
        "type": "bearer",
        "token": "same-token-as-MCP_AUTH_TOKEN"
      },
      "assistantOptions": {
        "routing": "qlc,qlcplus,lumière,light,éclairage,scène,dmx,fixture,projecteur,couleur"
      }
    }
  }
}
```

### Raspberry Pi Or Container Deployment

For a Raspberry Pi/service-oriented deployment, keep configuration in `config/.env`, `/config/.env`, or `/etc/qlcplusmcp.env`, run `npm run build`, then start with `npm run start:http`.

The `qlcplusmcp_raspi_service_pack` directory contains systemd/service helper scripts. Typical service commands after installation:

```bash
qlcplusmcp start
qlcplusmcp stop
qlcplusmcp restart
qlcplusmcp status
qlcplusmcp logs
qlcplusmcp health
qlcplusmcp auto
qlcplusmcp noauto
```

The HTTP admin page at `/mcp` includes runtime QLC+ connection controls when accessed from a browser.

## MCP Tools

Current tools:

- `get_agent_prompt`: returns the recommended lighting-agent prompt.
- `qlc_get_state`: reports OSC client state and feedback freshness.
- `qlc_list_widgets`: lists mapped widgets from `config/widgets.json`.
- `qlc_button_press`: triggers a mapped widget by name or direct OSC path.
- `qlc_send_osc`: sends raw OSC when `QLC_ALLOW_RAW_OSC=true`.

Agents should list widgets before triggering named controls and must not invent widget names.

## Development

Build:

```bash
npm run build
```

Run tests once:

```bash
npx vitest run
```

Format TypeScript:

```bash
npm run format
```

Start in watch mode:

```bash
npm run dev
```

Documentation ownership rules for future maintainers and Codex agents are in [AGENTS.md](AGENTS.md).

## Troubleshooting

`Widget not found`

Run `qlc_list_widgets`, verify `config/widgets.json`, then regenerate mappings if needed:

```bash
npm run generate:widgets show.qxw config/widgets.json
```

No visible lighting change

- Confirm QLC+ is running.
- Confirm OSC input is enabled.
- Confirm host/port in `config/.env`.
- Try `QLC_DRY_RUN=true` to inspect intended commands without sending.

No recent QLC+ feedback

Feedback is useful but not required for sending commands. Check `QLC_OSC_OUTPUT_PORT`, QLC+ output settings, and firewalls.

Bearer token rejected

Check `MCP_AUTH_MODE`, `MCP_AUTH_TOKEN`, and the client `Authorization: Bearer ...` header.

## Documentation Map

- [README.md](README.md): user-facing installation, scenarios, and configuration overview.
- [ARCHITECTURE.md](ARCHITECTURE.md): technical architecture, modules, tools, and validation.
- [ROADMAP.md](ROADMAP.md): staged native-protocol migration and rollback anchor.
- [AGENTS.md](AGENTS.md): documentation and development guidance for Codex/automation agents.

## License

MIT

## References

- [QLC+ Documentation](https://docs.qlcplus.org/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Open Sound Control](https://opensoundcontrol.stanford.edu/)
