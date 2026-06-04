# QLCPlus-MCP

A TypeScript MCP (Model Context Protocol) server for controlling QLC+ lighting software through OSC (Open Sound Control). Enables AI agents to send lighting commands to QLC+ for dynamic scene control, DMX manipulation, and interactive lighting design.

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

- **Node.js** ≥ 20.0.0
- **QLC+ 4.x** - installed and running with OSC plugin enabled
- **npm** or **yarn**

### Clone and Install

```bash
git clone https://github.com/infrafast/QLCPlus-MCP.git
cd QLCPlus-MCP
npm install
npm run build
```

### Setup Environment

Copy the example configuration:

```bash
cp .env.example .env
```

Edit `.env` to match your QLC+ setup (see Configuration section).

## Configuration

### Environment Variables

```bash
# MCP Transport mode (stdio or http)
MCP_TRANSPORT=stdio

# HTTP Server (only used if MCP_TRANSPORT=http)
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
      "name": "blackout",
      "path": "/vc/blackout",
      "type": "button",
      "description": "Emergency blackout"
    },
    {
      "id": "2",
      "name": "scene_intro",
      "path": "/vc/scene/intro",
      "type": "button",
      "description": "Launch intro scene"
    },
    {
      "id": "3",
      "name": "master_dimmer",
      "path": "/vc/master",
      "type": "slider",
      "minValue": 0,
      "maxValue": 1
    }
  ]
}
```

Use logical names in tools: `qlc_button_press(widgetName="scene_intro")`

### Agent Prompt

The server exposes the repository `PROMPT.md` as MCP prompt `qlcplus_lighting_assistant`, MCP resource `qlcplus://prompt/system`, and fallback tool `qlc_get_agent_prompt`. MCP hosts such as LiveStageAssistant can fetch this prompt at startup and append it to the LLM instructions so lighting-specific safety rules, QLC+ widget guidance, and DMX/OSC constraints are available to the model.

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
npm run start:http
```

Server listens on `http://0.0.0.0:8788/mcp`

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
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"qlc_set_dmx_channel","arguments":{"universe":1,"channel":1,"value":255}}}'
```

### Development Mode

Watch for changes and rebuild:

```bash
npm run dev
```

### Generate Widget Mappings from QXW

If you have an existing QLC+ project file (`.qxw`):

```bash
npm run generate:widgets ./my_show.qxw config/widgets.json
```

This extracts Virtual Console widgets that have `<Input Universe="0" Channel="..."/>` and generates OSC paths from the widget caption. The `Channel` value is QLC+'s internal Auto Detect hash, not a DMX channel.

## MCP Tools Reference

### State and Diagnostics

#### `qlc_get_state`

Report the OSC runtime state: configured QLC+ host and ports, whether the OSC client is initialized, last command sent, feedback listener status, and whether recent QLC+ feedback was received.

```typescript
qlc_get_state({
  freshnessSeconds: 10
})
```

Use this before answering questions such as "Are you connected to QLC+?". UDP sends do not provide acknowledgements, so recent feedback is the strongest confirmation that QLC+ is responding.

### DMX and OSC

#### `qlc_set_dmx_channel`

Set a DMX channel value.

```typescript
qlc_set_dmx_channel({
  universe: 1,
  channel: 12,
  value: 255  // 0-255 or 0-1 normalized
})
```

**Example:**
```
Set Universe 1, Channel 12 to full intensity
→ Sends OSC: /0/dmx/11 [255]
```

#### `qlc_set_dmx_rgb`

Set RGB color on three DMX channels.

```typescript
qlc_set_dmx_rgb({
  universe: 1,
  redChannel: 1,
  greenChannel: 2,
  blueChannel: 3,
  r: 255,
  g: 0,
  b: 255  // Purple
})
```

#### `qlc_send_osc` (Advanced)

Send arbitrary OSC messages. **Disabled by default** — enable with `QLC_ALLOW_RAW_OSC=true`.

```typescript
qlc_send_osc({
  path: "/vc/button/custom",
  args: [1]
})
```

### Widget Control

#### `qlc_button_press`

Momentary button press (press + release).

```typescript
qlc_button_press({
  widgetName: "blackout",  // or oscPath: "/vc/blackout"
  duration: 100  // milliseconds
})
```

#### `qlc_button_toggle`

Toggle button state.

```typescript
qlc_button_toggle({
  widgetName: "go_button"
})
```

#### `qlc_slider_set`

Set slider value (0-1 normalized).

```typescript
qlc_slider_set({
  widgetName: "master_dimmer",
  value: 0.75  // 75% brightness
})
```

#### `qlc_speed_set`

Set speed dial value in BPM.

```typescript
qlc_speed_set({
  widgetName: "chase_speed",
  bpm: 120
})
```

### Scenes and Cues

#### `qlc_launch_scene`

Launch a scene by logical name.

```typescript
qlc_launch_scene({
  sceneName: "scene_chorus"
})
```

#### `qlc_cuelist_next`

Advance to next cue.

```typescript
qlc_cuelist_next({
  widgetName: "cues_main"
})
```

#### `qlc_cuelist_previous`

Go to previous cue.

```typescript
qlc_cuelist_previous({
  widgetName: "cues_main"
})
```

### Special Functions

#### `qlc_set_master`

Set grand master dimmer (0-1 normalized).

```typescript
qlc_set_master({
  value: 1.0  // Full brightness
})
```

#### `qlc_set_color_wash`

Apply a predefined color wash.

```typescript
qlc_set_color_wash({
  color: "red",  // red|green|blue|amber|white|purple|cyan|magenta|yellow
  universe: 1,
  redChannel: 1,
  greenChannel: 2,
  blueChannel: 3
})
```

#### `qlc_blackout`

Trigger blackout (emergency darkness).

```typescript
qlc_blackout({})
```

#### `qlc_panic`

Trigger panic mode (emergency stop — instantly kills all lighting).

```typescript
qlc_panic({})
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
      "assistantPrompt": {
        "promptName": "qlcplus_lighting_assistant",
        "resourceUri": "qlcplus://prompt/system",
        "tool": "qlc_get_agent_prompt",
        "routing": "qlc,qlcplus,lumière,light,éclairage,scène,dmx,fixture,projecteur,wash,couleur,blackout,panic"
      }
    }
  }
}
```

When QLCPlus-MCP is used together with another large MCP server such as XMSeries-MCP, enable `MCP_TOOL_ROUTING_ENABLED=true` in LiveStageAssistant and keep the `assistantPrompt.routing` keywords above. This prevents the host from sending every available MCP tool in one LLM request and avoids OpenAI's 128-tool request limit.

### HTTP Configuration

Add to LiveStageAssistant MCP configuration:

```json
{
  "mcpServers": {
    "qlcplus": {
      "url": "http://localhost:8788/mcp",
      "auth": {
        "type": "bearer",
        "token": "my-secret-token"
      },
      "assistantPrompt": {
        "promptName": "qlcplus_lighting_assistant",
        "resourceUri": "qlcplus://prompt/system",
        "tool": "qlc_get_agent_prompt",
        "routing": "qlc,qlcplus,lumière,light,éclairage,scène,dmx,fixture,projecteur,wash,couleur,blackout,panic"
      }
    }
  }
}
```

Start QLCPlus-MCP HTTP server:

```bash
MCP_TRANSPORT=http MCP_AUTH_TOKEN=my-secret-token npm run start:http
```

### Assistant Prompt Rules

Recommended instructions for Claude / LiveStageAssistant:

```markdown
## QLC+ Control Rules

1. **Never invent widget names**
   - Always resolve scene names from the available widget mappings
   - If unsure, ask user for exact scene name

2. **Prefer high-level tools**
   - Use `qlc_launch_scene` instead of raw OSC
   - Use `qlc_set_dmx_channel` instead of `qlc_send_osc`
   - Use specific tools for safety and clarity

3. **Use emergency tools carefully**
   - `qlc_blackout`: For immediate darkness (transitions smoothly)
   - `qlc_panic`: For actual emergencies only (instant kill)

4. **Widget mappings**
   - Available scenes: intro, verse, chorus, bridge, outro
   - Available sliders: master_dimmer, wash_intensity
   - Ask for complete list if needed

5. **DMX control**
   - Universe 1: Main rig
   - Channels 1-3: RGB wash (auto-detected)
   - Channels 4-15: Individual fixtures
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

Run with UI:

```bash
npm run test:ui
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

```
Buttons:      /vc/button/<id>
Sliders:      /vc/slider/<id>
Speed:        /vc/speed/<id>
Cue Lists:    /vc/cuelist/<id>
Master:       /vc/master
Blackout:     /vc/blackout
Panic:        /vc/panic
```

### Value Ranges

- **DMX Channels**: 0-255 (8-bit)
- **Sliders/Master**: 0-1 (normalized float)
- **Speed (BPM)**: 10-240 (converted to 0-1 internally)
- **Button Press**: 1 (press), 0 (release)

## Troubleshooting

### "OSC not initialized"

Ensure QLC+ is running with OSC plugin enabled.

### No recent QLC+ feedback

Run `qlc_get_state`. If the OSC client is initialized but `feedbackSeenRecently` is false, QLCPlus-MCP can attempt UDP sends but has not observed QLC+ feedback recently. Check QLC+ Input/Output feedback settings, `QLC_OSC_OUTPUT_PORT`, firewall rules, and whether another local process already owns that UDP port.

Check ports in `.env`:
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

Set in `.env` to test without sending OSC:

```bash
QLC_DRY_RUN=true
```

Check logs for OSC commands that would be sent.

### Logging

Change log level in `.env`:

```bash
LOG_LEVEL=debug  # trace|debug|info|warn|error|fatal
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
│   │   ├── qlc_set_dmx_channel.ts
│   │   ├── qlc_set_dmx_rgb.ts
│   │   ├── qlc_send_osc.ts
│   │   ├── qlc_button_control.ts
│   │   ├── qlc_slider_speed.ts
│   │   ├── qlc_cuelist_scene.ts
│   │   └── qlc_special.ts
│   └── transports/
│       ├── stdio.ts                # STDIO MCP transport
│       └── http.ts                 # HTTP MCP transport
├── config/
│   └── widgets.json                # Widget mappings (example)
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

```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY config ./config

ENV MCP_TRANSPORT=http
ENV QLC_DRY_RUN=false
ENV LOG_LEVEL=info

EXPOSE 8788

CMD ["node", "dist/src/index.js"]
```

### Docker Compose with QLC+

```yaml
version: '3.8'
services:
  qlcplus:
    image: qlcplus/qlcplus:latest
    ports:
      - "7700:7700/udp"
      - "9000:9000/udp"
    environment:
      - DISPLAY=:99  # Virtual display

  qlcplus-mcp:
    build: .
    ports:
      - "8788:8788"
    environment:
      - MCP_TRANSPORT=http
      - QLC_HOST=qlcplus
      - QLC_DRY_RUN=false
    depends_on:
      - qlcplus
```

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
- [mcp-use](https://github.com/mcp-use/mcp-use)
- [XMSeries-MCP](https://github.com/infrafast/XMSeries-MCP)

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check the [QLC+ documentation](https://docs.qlcplus.org/)
- See [LiveStageAssistant](https://github.com/infrafast/LiveStageAssistant) for integration help

---

**Built with ❤️ for live stage lighting control.**

Sister project of [XMSeries-MCP](https://github.com/infrafast/XMSeries-MCP) • Part of the [infrafast](https://github.com/infrafast) ecosystem
