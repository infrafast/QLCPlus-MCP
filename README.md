# QLCPlus-MCP

A lightweight TypeScript MCP (Model Context Protocol) server for controlling QLC+ lighting software through OSC (Open Sound Control). Enables AI agents to send lighting commands to QLC+ for dynamic scene control, DMX manipulation, and interactive lighting design.

**QLCPlus-MCP is a sister project of [XMSeries-MCP](https://github.com/infrafast/XMSeries-MCP), designed specifically for QLC+ integration.**

## Overview

QLCPlus-MCP provides a set of MCP tools that allow LLM agents to control:

- **Virtual Console Widgets** - Buttons, sliders, speed dials, cue lists
- **Scenes** - Launch predefined lighting scenes by logical name
- **DMX Channels** - Direct control of individual DMX channels (0-255 or normalized 0-1)
- **RGB Color Washes** - Apply predefined colors to RGB fixtures
- **Master Dimmer** - Control grand master brightness
- **Special Functions** - Blackout and panic (emergency stop)

All communication happens through **native QLC+ OSC support** — the MCP server sends OSC commands to QLC+, which remains the lighting engine.

QLCPlus-MCP uses the official Model Context Protocol SDK directly for STDIO and streamable HTTP transports. The runtime server does not depend on `mcp-use`, keeping Raspberry Pi installations significantly lighter.

## Architecture

```
┌─────────────────────────┐
│   LLM Agent / Client    │
│  (e.g., Claude)         │
└────────────┬────────────┘
             │
      MCP Protocol
             │
┌────────────▼────────────┐
│   QLCPlus-MCP Server    │
│  (Node.js/TypeScript)   │
├────────────────────────┤
│ • Tool Handlers        │
│ • Widget Mapping       │
│ • Config Management    │
└────────────┬────────────┘
             │
        OSC Protocol (UDP)
             │
┌────────────▼────────────┐
│   QLC+ Instance         │
│  (Lighting Engine)      │
├────────────────────────┤
│ • Virtual Console       │
│ • DMX Output           │
│ • Scenes / Functions   │
└────────────────────────┘
```

## Features

✅ **STDIO Transport** - For local MCP clients (Claude Desktop, etc.)  
✅ **HTTP Transport** - For remote MCP servers with bearer token auth  
✅ **OSC Client** - Native UDP OSC communication with QLC+  
✅ **Widget Mapping** - Logical names mapped to OSC paths  
✅ **DMX Control** - Direct channel and RGB color control  
✅ **QXW Parser** - Extract widgets from QLC+ project files  
✅ **Zod Validation** - Type-safe tool inputs  
✅ **Dry-Run Mode** - Log OSC commands without sending  
✅ **Bearer Authentication** - Optional HTTP auth for security  
✅ **Comprehensive Logging** - pino logger with pretty printing

## Installation

### Prerequisites

- **Node.js** ≥ 20.20.0 (Node 22 LTS recommended on Raspberry Pi)
- **QLC+ 4.x** - installed and running with OSC plugin enabled
- **npm** or **yarn**

### Clone and Install

```bash
git clone https://github.com/infrafast/QLCPlus-MCP.git
cd QLCPlus-MCP
npm ci
npm run build
```

### Setup Environment

Copy the example configuration:

```bash
cp .env.example config/.env
```

Edit `config/.env` to match your QLC+ setup (see Configuration section).

## Configuration

### Environment Variables

```bash
# MCP Transport mode (stdio or http)
MCP_TRANSPORT=http

# HTTP Server
HTTP_HOST=0.0.0.0
HTTP_PORT=8788
HTTP_MCP_PATH=/mcp

# Authentication (only for HTTP mode)
MCP_AUTH_MODE=none
# MCP_AUTH_MODE=bearer
# MCP_AUTH_TOKEN=change-me

# QLC+ Host and Ports
QLC_HOST=127.0.0.1
QLC_OSC_INPUT_PORT=7700     # QLC+ listens on this port
QLC_OSC_OUTPUT_PORT=9000    # QLC+ sends feedback on this port
QLC_UNIVERSE=1

# Widget Configuration
QLC_WIDGETS_FILE=config/widgets.json

# Allow Raw OSC Sending (advanced users)
QLC_ALLOW_RAW_OSC=false

# Dry Run Mode (log without sending)
QLC_DRY_RUN=false

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

### Widget Mapping

Widget mappings define logical names for QLC+ controls. Create `config/widgets.json`:

```json
{
  "widgets": [
    {
      "id": "1",
      "name": "BLACK",
      "path": "/black",
      "type": "button",
      "description": "Mapped Virtual Console button"
    },
    {
      "id": "2",
      "name": "scene_intro",
      "path": "/scene_intro",
      "type": "button",
      "description": "Mapped Virtual Console scene button"
    },
    {
      "id": "3",
      "name": "master_dimmer",
      "path": "/master_dimmer",
      "type": "slider",
      "minValue": 0,
      "maxValue": 1
    }
  ]
}
```

Use logical names in tools: `qlc_button_press(widgetName="scene_intro")`

To add a new QLC+ Virtual Console widget under MCP control on Raspberry Pi, install OSC command-line tools first:

```bash
sudo apt install liblo-tools
```

In QLC+, edit the widget, put its external input in **Auto Detect**, then send the OSC address and value you want QLC+ to learn. For a widget labelled `lecture pause`, send:

```bash
oscsend localhost 7700 /lecture_pause i 1
or
oscsend 192.168.2.4 7700 /lecture_pause i 1

```

The OSC command name should match the widget label, with spaces replaced by underscores: `lecture pause` becomes `/lecture_pause`. Keep the same label/path convention when generating or editing `config/widgets.json`, so the MCP can expose that Virtual Console control through `qlc_button_press`.

### Agent Prompt

The server exposes the repository `PROMPT.md` as MCP standard prompt `agent_prompt`, standard MCP resource `agent://prompt/system`, and standard fallback tool `get_agent_prompt`. MCP hosts such as LiveStageAssistant can fetch this prompt at startup and append it to the LLM instructions so lighting-specific safety rules, QLC+ widget guidance, and DMX/OSC constraints are available to the model.

When running with `MCP_TRANSPORT=http`, opening `/mcp` in a browser shows the runtime admin page. It displays the current OSC state, tools, resources, and agent HTTP config, and includes a QLC+ connection form for `QLC_HOST`, `QLC_OSC_INPUT_PORT`, `QLC_OSC_OUTPUT_PORT`, `QLC_UNIVERSE`, and `QLC_DRY_RUN`. Saving the form reconnects the OSC client immediately and persists those values back to the loaded runtime env file, such as `config/.env`, `/config/.env`, or the file pointed to by `QLCPLUS_MCP_ENV_FILE`.

Set `MCP_PROMPT_FILE=/absolute/path/to/PROMPT.md` to expose a custom prompt file. If omitted, the server reads `PROMPT.md` from the current working directory.

### QLC+ Setup

1. **Enable OSC Plugin**
   - Open QLC+ → Input/Output → Plugins tab
   - Find and enable the OSC plugin
   - Configure input port (default: 7700) and output port (default: 9000)

2. **Create Virtual Console Widgets**
   - Add buttons, sliders, speed dials, cue lists to your show
   - Note the OSC control addresses, or auto-generate mappings for widgets that have a QLC+ external input mapping

3. **Configure OSC Mappings (Optional)**
   - For each widget, optionally set custom OSC feedback addresses
   - Generated mappings keep only widgets with `<Input Universe="0" Channel="..."/>`, then build the OSC path from the widget caption, for example `BLACK` becomes `/black`

## Usage

### STDIO Mode (Local MCP Clients)

Start the server:

```bash
npm run start:stdio
```

Use with Claude Desktop or other STDIO-based MCP clients.

### HTTP Mode (Remote MCP Server)

Start the server:

```bash
npm run build
npm run start:http
```

Server listens on `http://0.0.0.0:8788/mcp` and prints the LiveStageAssistant/client JSON to copy.

**Health check endpoint:**

```bash
curl http://localhost:8788/health
```

**With Bearer Authentication:**

```bash
# Start with auth enabled
MCP_AUTH_MODE=bearer MCP_AUTH_TOKEN=my-secret npm run start:http

# Call the MCP endpoint
curl -X POST http://localhost:8788/mcp \
  -H "Authorization: Bearer my-secret" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"qlc_button_press","arguments":{"widgetName":"BLACK"}}}'
```

### Development Mode

Watch for changes and rebuild:

```bash
npm run dev
```

### Generate Widget Mappings from QXW

If you have an existing QLC+ project file (`.qxw`):

```bash
npm run generate:widgets ./intervalPI.qxw config/widgets.json
```

This extracts Virtual Console widgets that have `<Input Universe="0" Channel="..."/>` and generates OSC paths from the widget caption. The `Channel` value is QLC+'s internal Auto Detect hash, not a DMX channel.

## MCP Tools Reference

### State and Diagnostics

#### `qlc_get_state`

Report the OSC runtime state: configured QLC+ host and ports, whether the OSC client is initialized, last command sent, feedback listener status, whether recent QLC+ feedback was received, and the recent feedback event history.

```typescript
qlc_get_state({
  freshnessSeconds: 10
})
```

Use this before answering questions such as "Are you connected to QLC+?". UDP sends do not provide acknowledgements, so recent feedback is the strongest confirmation that QLC+ is responding.

### Widget Discovery

#### `qlc_list_widgets`

List widgets loaded from `config/widgets.json`, with optional `type`, `query`, and `limit` filters.

```typescript
qlc_list_widgets({
  query: "black"
})
```

Use this to discover available mapped QLC+ widget names and their OSC paths before using named widget tools.

### OSC

#### `qlc_send_osc` (Advanced)

Send arbitrary OSC messages. **Disabled by default** — enable with `QLC_ALLOW_RAW_OSC=true`.

```typescript
qlc_send_osc({
  path: "/custom_button",
  args: [1]
})
```

### Widget Control

#### `qlc_button_press`

Trigger a mapped QLC+ widget by sending value `1` to its OSC path. Use this for mapped buttons, scenes, cue-list controls, blackout, panic, master actions, or any other Virtual Console action represented in `config/widgets.json`.

```typescript
qlc_button_press({
  widgetName: "BLACK"  // or oscPath: "/black"
})
```

## LiveStageAssistant Integration

QLCPlus-MCP integrates seamlessly with [LiveStageAssistant](https://github.com/infrafast/LiveStageAssistant) for real-time lighting control during live performances.

### STDIO Configuration

Add to LiveStageAssistant MCP configuration:

```json
{
  "mcpServers": {
    "qlcplus": {
      "command": "node",
      "args": ["QLCPlus-MCP/dist/src/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "QLC_HOST": "127.0.0.1",
        "QLC_DRY_RUN": "false",
        "MCP_PROMPT_FILE": "/absolute/path/to/QLCPlus-MCP/PROMPT.md"
      },
      "assistantOptions": {
        "routing": "qlc,qlcplus,lumière,light,éclairage,scène,dmx,fixture,projecteur,couleur"
      }
    }
  }
}
```

When QLCPlus-MCP is used together with another large MCP server such as XMSeries-MCP, enable `MCP_TOOL_ROUTING_ENABLED=true` in LiveStageAssistant and keep the `assistantOptions.routing` keywords above. This prevents the host from sending every available MCP tool in one LLM request and avoids OpenAI's 128-tool request limit.

### HTTP Configuration

Add to LiveStageAssistant MCP configuration:

```json
{
  "mcpServers": {
    "qlcplus": {
      "type": "streamable-http",
      "url": "http://localhost:8788/mcp",
      "headers": {},
      "assistantOptions": {
        "routing": "qlc,qlcplus,lumière,light,éclairage,scène,dmx,fixture,projecteur,couleur"
      }
    }
  }
}
```

Start QLCPlus-MCP HTTP server:

```bash
npm run build
npm run start:http
```

If bearer authentication is enabled:

```bash
MCP_AUTH_MODE=bearer MCP_AUTH_TOKEN=my-secret-token npm run start:http
```

The startup log prints the exact JSON block expected by LiveStageAssistant, including the `Authorization` header when bearer auth is enabled.

### Assistant Prompt Rules

Recommended instructions for Claude / LiveStageAssistant:

```markdown
## QLC+ Control Rules

1. **Never invent widget names**
   - Always resolve scene names from the available widget mappings
   - If unsure, ask user for exact scene name

2. **Prefer mapped widgets**
   - Use `qlc_list_widgets` to discover available controls
   - Use `qlc_button_press` for mapped scenes, buttons, cue-list controls, blackout, panic, and other Virtual Console actions
   - Avoid `qlc_send_osc` unless the user explicitly asks for raw OSC and it is enabled

3. **Use emergency tools carefully**
   - Use mapped widgets for blackout, panic, master, or any Virtual Console action

4. **Widget mappings**
   - Available scenes: intro, verse, chorus, bridge, outro
   - Available sliders: master_dimmer, wash_intensity
   - Ask for complete list if needed

5. **DMX control**
   - Direct DMX helper tools are not exposed
   - Map fixture actions in QLC+ Virtual Console and expose them through `config/widgets.json`
```

## Development

### Build

```bash
npm run build
```

Compiles TypeScript to `dist/`.

### Run Tests

```bash
npm test
```


### Linting

```bash
npm run lint
```

### Format Code

```bash
npm run format
```

## OSC Protocol Reference

### DMX Message Format

```
Path: /<universe_zero_based>/dmx/<channel_zero_based>
Args: [value]

Example:
Universe 1, Channel 12 = 255
→ /0/dmx/11 [255]
```

### Virtual Console Paths

QLC+ 4 Virtual Console widgets should use OSC paths learned with Auto Detect and stored in `config/widgets.json`. Do not assume generic `/vc/...` paths.

```
BLACK -> /black
STOP -> /stop
ambient blue-yellow -> /ambient_blue-yellow
```

### Value Ranges

- **DMX Channels**: 0-255 (8-bit)
- **Mapped sliders**: 0-1 normalized float on the widget path from `config/widgets.json`
- **Speed (BPM)**: 10-240 (converted to 0-1 internally)
- **Button Press**: 1 sent to the mapped widget path

## Troubleshooting

### "OSC not initialized"

Ensure QLC+ is running with OSC plugin enabled.

### No recent QLC+ feedback

Run `qlc_get_state`. If the OSC client is initialized but `feedbackSeenRecently` is false, QLCPlus-MCP can attempt UDP sends but has not observed QLC+ feedback recently. Check QLC+ Input/Output feedback settings, `QLC_OSC_OUTPUT_PORT`, firewall rules, and whether another local process already owns that UDP port.

Check ports in `config/.env`:
```bash
QLC_OSC_INPUT_PORT=7700
QLC_OSC_OUTPUT_PORT=9000
```

### "Widget not found"

Tool returns available widgets when a name isn't found. Update `config/widgets.json` or generate from `.qxw`:

```bash
npm run generate:widgets my_show.qxw
```

### "Bearer token rejected"

Ensure token matches between client and server:

```bash
# Server
MCP_AUTH_TOKEN=my-token npm run start:http

# Client
Authorization: Bearer my-token
```

### Dry-run mode

Set in `config/.env` to test without sending OSC:

```bash
QLC_DRY_RUN=true
```

Check logs for OSC commands that would be sent.

### Logging

Change log level in `config/.env`:

```bash
LOG_LEVEL=debug  # trace|debug|info|warn|error|fatal
# With debug enabled, OSC traffic is logged as:
# [WRITE_OSC] <qlc-host>:<qlc-input-port> <path> args=<json-array>
# [READ_OSC] <source-host>:<source-port> <path> args=<json-array>
NODE_ENV=development  # Enables pretty printing
```

## Project Structure

```
QLCPlus-MCP/
├── src/
│   ├── index.ts                    # Entry point
│   ├── config.ts                   # Configuration with Zod
│   ├── types.ts                    # Type definitions and schemas
│   ├── logger.ts                   # Pino logger setup
│   ├── osc/
│   │   └── oscClient.ts            # OSC communication service
│   ├── qlc/
│   │   ├── qxwParser.ts            # QLC+ project file parser
│   │   ├── widgetResolver.ts       # Widget mapping resolver
│   │   └── generateWidgets.ts      # CLI for widget generation
│   ├── tools/
│   │   ├── qlc_get_state.ts
│   │   ├── qlc_list_widgets.ts
│   │   ├── qlc_send_osc.ts
│   │   └── qlc_button_control.ts
│   └── transports/
│       ├── stdio.ts                # STDIO MCP transport
│       └── http.ts                 # HTTP MCP transport
├── config/
│   ├── .env                        # Runtime configuration for local/Docker use
│   └── widgets.json                # Widget mappings (example)
├── Dockerfile                      # Production HTTP container image
├── docker-compose.yml              # Local/Synology container deployment
├── .dockerignore
├── tests/
│   └── osc.test.ts                 # Test suite
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
└── README.md
```

## Security Considerations

1. **Bearer Token** - Use strong tokens in production (`MCP_AUTH_TOKEN`)
2. **Disable Raw OSC** - Keep `QLC_ALLOW_RAW_OSC=false` in production
3. **Firewall** - Restrict HTTP access to trusted networks
4. **OSC Port** - QLC+ OSC ports (7700, 9000) should not be exposed to untrusted networks
5. **Dry-Run** - Test tool behavior with `QLC_DRY_RUN=true` before live use

## Performance

- **OSC Latency**: Typically < 5ms (local network)
- **Batch Operations**: Supports sending multiple OSC messages efficiently
- **Memory**: ~50MB base + negligible per-tool overhead
- **Concurrent Requests**: Handles multiple simultaneous MCP calls

## Deployment

### Docker

QLCPlus-MCP includes a production `Dockerfile`, `.dockerignore`, and `docker-compose.yml`.

```bash
cp .env.example config/.env
# Edit QLC_HOST so the container can reach the QLC+ machine on your LAN.
docker compose build
docker compose up -d
docker compose logs -f qlcplus-mcp
```

The container starts in HTTP mode by default and exposes:

- MCP HTTP: `http://<docker-host>:8788/mcp`
- Health: `http://<docker-host>:8788/health`
- QLC+ feedback listener: UDP `9000`

`docker-compose.yml` mounts `./config` as read-write `/config`, so `QLC_WIDGETS_FILE=/config/widgets.json` works in containers while the local dev default can still use `config/widgets.json`.

Because `/config` is a host-mounted volume, you can edit `config/.env` or `config/widgets.json` from the host and restart the container. Rebuilding the image is only needed after code or dependency changes.

The startup log prints the client configuration JSON to paste into LiveStageAssistant.

### Synology DSM Container Manager Quick Start

please note it may take up to 15 minutes to build the container.

1. Copy the repository to the NAS, for example:

```text
/volume2/docker/QLCPlus-MCP
```

2. Create `/volume2/docker/QLCPlus-MCP/config/.env` from `.env.example` and set at least:

```bash
MCP_TRANSPORT=http
HTTP_HOST=0.0.0.0
HTTP_PORT=8788
QLC_HOST=192.168.0.160
QLC_OSC_INPUT_PORT=7700
QLC_OSC_OUTPUT_PORT=9000
QLC_WIDGETS_FILE=/config/widgets.json
QLC_DRY_RUN=false
LOG_LEVEL=info
```

3. Put your generated widget file at:

```text
/volume2/docker/QLCPlus-MCP/config/widgets.json
```

4. In DSM Container Manager, create a Project from `/volume2/docker/QLCPlus-MCP/docker-compose.yml`.

5. Build and start the project. The compose file publishes:

```text
8788/tcp -> MCP HTTP
9000/udp -> QLC+ OSC feedback
```

6. Open the logs and copy the printed `Agent HTTP MCP config` JSON into LiveStageAssistant. From another machine, replace `127.0.0.1` with the NAS hostname/IP, for example:

```json
{
  "mcpServers": {
    "qlcplus": {
      "type": "streamable-http",
      "url": "http://synology.local:8788/mcp",
      "headers": {},
      "assistantOptions": {
        "routing": "qlc,qlcplus,lumière,light,éclairage,scène,dmx,fixture,projecteur,couleur"
      }
    }
  }
}
```

7. Check health:

```bash
curl http://synology.local:8788/health
```

If QLC+ runs on another machine, configure QLC+ OSC input on `7700` and feedback/output to the NAS IP on UDP `9000`.

### systemd Service

```ini
[Unit]
Description=QLCPlus MCP Server
After=network.target

[Service]
Type=simple
User=qlcplus
WorkingDirectory=/opt/qlcplus-mcp
EnvironmentFile=/opt/qlcplus-mcp/.env
ExecStart=/usr/bin/node dist/src/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Contributing

Contributions welcome! Areas for enhancement:

- [ ] Advanced QXW parser for complex projects
- [ ] Fixture library integration
- [ ] Recording and playback tools
- [ ] Real-time feedback from QLC+
- [ ] Additional transport modes (WebSocket, SSE)
- [ ] Visualization dashboard

## License

MIT

## References

- [QLC+ Documentation](https://docs.qlcplus.org/)
- [OSC Specification](https://opensoundcontrol.org/)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [XMSeries-MCP](https://github.com/infrafast/XMSeries-MCP)

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check the [QLC+ documentation](https://docs.qlcplus.org/)
- See [LiveStageAssistant](https://github.com/infrafast/LiveStageAssistant) for integration help

---

**Built with ❤️ for live stage lighting control.**

Sister project of [XMSeries-MCP](https://github.com/infrafast/XMSeries-MCP) • Part of the [infrafast](https://github.com/infrafast) ecosystem
