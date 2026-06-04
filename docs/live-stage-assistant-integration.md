# LiveStageAssistant Integration Guide

This guide explains how to integrate QLCPlus-MCP with LiveStageAssistant for real-time lighting control during live performances.

## Architecture

```
┌──────────────────────────┐
│  LiveStageAssistant      │
│  (AI Performance Manager)│
└────────────┬─────────────┘
             │
        MCP Protocol
             │
    ┌────────▼─────────┐
    │ QLCPlus-MCP      │
    │ (Lighting MCP)   │
    └────────┬─────────┘
             │
        OSC Protocol
             │
    ┌────────▼─────────┐
    │ QLC+ Instance    │
    │ (Lighting Engine)│
    └──────────────────┘
```

## Quick Start

### 1. Setup QLCPlus-MCP

Install and build:

```bash
git clone https://github.com/infrafast/QLCPlus-MCP.git
cd QLCPlus-MCP
npm install
npm run build
```

Create `.env`:

```bash
cp .env.example .env
```

Edit `.env` for your environment:

```bash
MCP_TRANSPORT=stdio
QLC_HOST=127.0.0.1
QLC_OSC_INPUT_PORT=7700
QLC_OSC_OUTPUT_PORT=9000
QLC_DRY_RUN=false
LOG_LEVEL=info
```

### 2. Configure LiveStageAssistant

Add to LiveStageAssistant's MCP server configuration file:

**For STDIO (local) mode:**

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

**For HTTP (remote) mode:**

```json
{
  "mcpServers": {
    "qlcplus": {
      "url": "http://localhost:8788/mcp",
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

If LiveStageAssistant also loads another large MCP server such as XMSeries-MCP, enable `MCP_TOOL_ROUTING_ENABLED=true` in the active LiveStageAssistant `.env`. The `assistantPrompt.routing` keywords let LiveStageAssistant expose only the relevant server tools on each routed turn and avoid OpenAI's 128-tool request limit.

For questions such as "es-tu connecté à QLC ?", LiveStageAssistant should call `qlc_get_state`. The tool reports initialization, configured host/ports, last command sent, and whether QLC+ feedback was received recently.

### 3. Start Services

**Terminal 1: Start QLC+**

```bash
qlcplus
```

Enable the OSC plugin and configure ports (7700 input, 9000 output).

**Terminal 2: Start QLCPlus-MCP**

```bash
cd QLCPlus-MCP
npm run start:stdio
# Or for HTTP mode:
# npm run start:http
```

**Terminal 3: Start LiveStageAssistant**

```bash
cd LiveStageAssistant
npm start
```

## Configuration Patterns

### Pattern 1: Local STDIO Setup

Best for: Single machine, development

```json
{
  "mcpServers": {
    "qlcplus": {
      "command": "node",
      "args": ["/opt/QLCPlus-MCP/dist/src/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "QLC_HOST": "127.0.0.1",
        "QLC_DRY_RUN": "false",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Pattern 2: Remote HTTP Setup with Auth

Best for: Network-separated machines, production

**QLCPlus-MCP server (on lighting machine):**

```bash
MCP_TRANSPORT=http \
MCP_AUTH_MODE=bearer \
MCP_AUTH_TOKEN=my-secure-token-12345 \
QLC_HOST=0.0.0.0 \
npm run start:http
```

**LiveStageAssistant config (on control machine):**

```json
{
  "mcpServers": {
    "qlcplus": {
      "url": "http://lighting-machine.local:8788/mcp",
      "auth": {
        "type": "bearer",
        "token": "my-secure-token-12345"
      }
    }
  }
}
```

### Pattern 3: Docker Deployment

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  qlcplus:
    image: qlcplus/qlcplus:latest
    container_name: qlcplus
    ports:
      - "7700:7700/udp"
      - "9000:9000/udp"
    environment:
      - DISPLAY=:99
    volumes:
      - ./qlcplus-projects:/root/.qlcplus
    networks:
      - lighting

  qlcplus-mcp:
    build:
      context: ./QLCPlus-MCP
      dockerfile: Dockerfile
    container_name: qlcplus-mcp
    ports:
      - "8788:8788"
    environment:
      - MCP_TRANSPORT=http
      - MCP_AUTH_MODE=bearer
      - MCP_AUTH_TOKEN=secure-token-here
      - QLC_HOST=qlcplus
      - QLC_OSC_INPUT_PORT=7700
      - QLC_OSC_OUTPUT_PORT=9000
      - QLC_DRY_RUN=false
      - LOG_LEVEL=info
    depends_on:
      - qlcplus
    networks:
      - lighting

  live-stage-assistant:
    build:
      context: ./LiveStageAssistant
    container_name: live-stage-assistant
    ports:
      - "3000:3000"
    environment:
      - QLCPLUS_MCP_URL=http://qlcplus-mcp:8788/mcp
      - QLCPLUS_MCP_TOKEN=secure-token-here
    depends_on:
      - qlcplus-mcp
    networks:
      - lighting

networks:
  lighting:
    driver: bridge
```

Start all services:

```bash
docker-compose up -d
```

## Widget Mapping

### Creating Widget Mappings

QLCPlus-MCP uses a logical widget mapping system. The `qlc_list_widgets` tool lets LiveStageAssistant list the loaded mappings at runtime. Create `config/widgets.json`:

```json
{
  "widgets": [
    {
      "id": "1",
      "name": "intro_scene",
      "path": "/scene_intro",
      "type": "button",
      "description": "Launch intro lighting scene"
    },
    {
      "id": "2",
      "name": "verse_scene",
      "path": "/scene_verse",
      "type": "button",
      "description": "Launch verse lighting scene"
    },
    {
      "id": "3",
      "name": "chorus_scene",
      "path": "/scene_chorus",
      "type": "button",
      "description": "Launch chorus lighting scene"
    },
    {
      "id": "4",
      "name": "master_dimmer",
      "path": "/master_dimmer",
      "type": "slider",
      "description": "Master brightness control",
      "minValue": 0,
      "maxValue": 1
    },
    {
      "id": "5",
      "name": "strobe_speed",
      "path": "/strobe_speed",
      "type": "speed",
      "description": "Strobe effect speed (BPM)"
    },
    {
      "id": "6",
      "name": "cues",
      "path": "/main_cuelist",
      "type": "cuelist",
      "description": "Main cue list"
    }
  ]
}
```

### Auto-Generate from QLC+ Project

If you have an existing QLC+ project (`.qxw` file):

```bash
npm run generate:widgets /path/to/show.qxw config/widgets.json
```

This extracts Virtual Console widgets that have `<Input Universe="0" Channel="..."/>` and generates OSC paths from the widget caption. The `Channel` value is QLC+'s internal Auto Detect hash, not a DMX channel.

## Assistant Prompt Configuration

Add these instructions to LiveStageAssistant's system prompt:

```markdown
## Lighting Control with QLC+

You have access to QLCPlus-MCP tools for controlling stage lighting.

### Golden Rules

1. **Never Invent Names**
   - Always check available widget names before using them
   - Ask if unsure about exact scene names

2. **Prefer High-Level Tools**
   - Use `qlc_launch_scene` for scenes (safer than raw OSC)
   - Use `qlc_set_dmx_channel` for direct DMX control
   - Use `qlc_button_press` for button widgets
   - Avoid `qlc_send_osc` unless absolutely necessary

3. **Emergency Functions**
   - Use mapped widgets for blackout, panic, master, and other Virtual Console actions

4. **Widget Reference**

   **Scenes:**
   - intro_scene: Intro lighting
   - verse_scene: Verse lighting
   - chorus_scene: Chorus lighting
   - bridge_scene: Bridge lighting
   - outro_scene: Outro lighting

   **Controls:**
   - master_dimmer: Master brightness (0-1)
   - strobe_speed: Strobe speed in BPM
   - cues: Main cue list

5. **DMX Control**
   - Universe 1: Main lighting rig
   - Channels 1-3: RGB wash (auto-fade capable)
   - Channels 4-15: Individual moving lights

### Example Interactions

**User:** "Dim the lights to 50%"
**Assistant:** Resolves a mapped master slider widget and calls `qlc_slider_set(value=0.5)`

**User:** "Go to the chorus scene"
**Assistant:** Calls `qlc_launch_scene(sceneName="chorus_scene")`

**User:** "Set the wash to red"
**Assistant:** Calls `qlc_set_color_wash(color="red", universe=1, redChannel=1, greenChannel=2, blueChannel=3)`

**User:** "Emergency! Turn everything off!"
**Assistant:** Resolves a mapped panic/stop widget if one exists; otherwise says no mapped emergency widget is available
```

## Usage Examples

### Example 1: Scene Launch During Performance

```
User: "The singer is coming on stage now. Launch the verse lighting."

LiveStageAssistant resolves:
→ qlc_launch_scene(sceneName="verse_scene")

QLCPlus-MCP sends OSC:
→ /scene_verse [1]

QLC+ fades to verse lighting in 3 seconds.
```

### Example 2: Dynamic Dimming

```
User: "Lower the brightness to 75% for the acoustic section"

LiveStageAssistant resolves:
→ qlc_slider_set(widgetName="master_dimmer", value=0.75)

QLCPlus-MCP sends OSC:
→ /master_dimmer [0.75]

QLC+ master dimmer smoothly transitions to 75%.
```

### Example 3: Color Change

```
User: "Switch the wash lights to amber for the warm section"

LiveStageAssistant resolves:
→ qlc_set_color_wash(
    color="amber",
    universe=1,
    redChannel=1,
    greenChannel=2,
    blueChannel=3
  )

QLCPlus-MCP sends OSC batch:
→ /0/dmx/0 [255]  (red)
→ /0/dmx/1 [191]  (green)
→ /0/dmx/2 [0]    (blue)

QLC+ fades RGB channels to amber color.
```

### Example 4: Cue List Navigation

```
User: "Go to the next cue"

LiveStageAssistant resolves:
→ qlc_button_toggle(widgetName="cues_next")

QLCPlus-MCP sends OSC:
→ /main_cuelist_next [1]

QLC+ advances to next cue in the sequence.
```

## Security Best Practices

### Development (Local STDIO)

```bash
# No auth needed for local stdio
MCP_TRANSPORT=stdio
QLC_DRY_RUN=false
LOG_LEVEL=debug
NODE_ENV=development
```

### Production (Remote HTTP)

```bash
# Use strong bearer token
MCP_TRANSPORT=http
MCP_AUTH_MODE=bearer
MCP_AUTH_TOKEN=$(openssl rand -base64 32)  # Generate strong token
QLC_HOST=0.0.0.0
QLC_DRY_RUN=false
LOG_LEVEL=info
NODE_ENV=production
```

### Network Security

1. **Firewall Rules**
   - Allow HTTP only from LiveStageAssistant machine
   - Block OSC ports from untrusted networks

2. **Token Management**
   - Rotate tokens regularly
   - Use different tokens for different machines
   - Never commit tokens to git

3. **TLS/SSL (Optional)**
   - Use reverse proxy (nginx, caddy) for HTTPS
   - Only expose through secure channel

## Troubleshooting

### QLC+ Connection State

Ask the assistant "es-tu connecté à QLC ?" or call `qlc_get_state` directly. If the OSC client is initialized but no recent feedback is seen, verify QLC+ Input/Output feedback settings, the configured `QLC_OSC_OUTPUT_PORT`, and firewall rules.

### "MCP Server Not Found"

Check that QLCPlus-MCP is running:

```bash
ps aux | grep qlcplus-mcp
# or
npm run start:http
```

For STDIO mode, ensure the path is correct:

```json
{
  "args": ["/full/path/to/dist/src/index.js"]  // Use absolute path
}
```

### "Widget Not Found" Error

Check available widgets:

```bash
cat config/widgets.json | jq '.widgets[].name'
```

Or generate from QLC+ project:

```bash
npm run generate:widgets show.qxw
```

### OSC Connection Failed

Verify QLC+ is listening:

```bash
netstat -un | grep 7700
```

Check `.env`:

```bash
QLC_HOST=127.0.0.1
QLC_OSC_INPUT_PORT=7700
QLC_OSC_OUTPUT_PORT=9000
```

Ensure QLC+ OSC plugin is enabled.

### Slow Response Times

Check log level:

```bash
# Development (pretty printing) vs production (faster)
LOG_LEVEL=info NODE_ENV=production npm run start:http
```

Monitor OSC latency:

```bash
QLC_DRY_RUN=true npm run start:http  # Test without actual OSC sends
```

## Performance Tips

1. **Pre-load Scenes** - Define all scenes in QLC+ before performance
2. **Batch Operations** - Group related DMX changes
3. **Dry-Run Testing** - Test all sequences before live performance
4. **Monitor Latency** - OSC typically < 5ms on local network
5. **Resource Limits** - QLC+ can handle hundreds of rapid commands

## Advanced: Custom Widget Resolvers

For complex shows with many widgets, create custom resolvers:

```typescript
// custom-widgets.ts
import { WidgetMapping } from 'qlcplus-mcp';

export const customWidgets: WidgetMapping[] = [
  // Scene set with transitions
  {
    id: "scene_001",
    name: "act1_scene1",
    path: "/act1_scene1",
    type: "button",
    description: "Act 1, Scene 1 - The Entrance"
  },
  // Complex effects
  {
    id: "effect_001",
    name: "laser_show_start",
    path: "/laser_sequence",
    type: "button",
    description: "Start laser sequence"
  }
];
```

Load in LiveStageAssistant config to merge with default widgets.

## Support & Resources

- [QLCPlus-MCP GitHub](https://github.com/infrafast/QLCPlus-MCP)
- [QLC+ Documentation](https://docs.qlcplus.org/)
- [OSC Specification](https://opensoundcontrol.org/)
- [LiveStageAssistant GitHub](https://github.com/infrafast/LiveStageAssistant)

---

**For live performances, always test extensively before show time!**
