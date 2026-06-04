# Quick Start Guide

Get QLCPlus-MCP up and running in 5 minutes.

## Prerequisites

- Node.js 20+
- QLC+ 4.x with OSC plugin enabled
- npm

## Installation

```bash
# Clone and install
git clone https://github.com/infrafast/QLCPlus-MCP.git
cd QLCPlus-MCP
npm install
npm run build

# Setup environment
cp .env.example .env
```

## Configure

Edit `.env`:

```bash
# Basic setup - change these for your QLC+ host
MCP_TRANSPORT=stdio
QLC_HOST=127.0.0.1
QLC_OSC_INPUT_PORT=7700
QLC_OSC_OUTPUT_PORT=9000
QLC_DRY_RUN=false
MCP_PROMPT_FILE=/full/path/to/QLCPlus-MCP/PROMPT.md
```

## Start

**Terminal 1: QLC+**

```bash
qlcplus
# Then in QLC+: Input/Output → OSC → Set ports to 7700/9000
```

**Terminal 2: QLCPlus-MCP**

```bash
npm run start:stdio
# Should see: "OSC initialized" and "MCP server ready"
```

**Terminal 3: Your client**

For LiveStageAssistant, configure the active MCP config to use:

```json
{
  "qlcplus": {
    "command": "node",
    "args": ["/full/path/to/QLCPlus-MCP/dist/src/index.js"],
    "env": {
      "MCP_TRANSPORT": "stdio",
      "MCP_PROMPT_FILE": "/full/path/to/QLCPlus-MCP/PROMPT.md"
    },
    "assistantPrompt": {
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

**No logs** → Check `LOG_LEVEL=debug` in `.env` for more details

## Next Steps

- [Full Documentation](./README.md)
- [Integration Guide](./docs/live-stage-assistant-integration.md)
- [Configuration Reference](./docs/MCP-CONFIG.md)
- [Generate widget mappings from QLC+ project](./docs/MCP-CONFIG.md#generating-mappings)

## HTTP Mode (Remote)

For remote/network access:

```bash
# Server (lighting machine)
MCP_TRANSPORT=http \
MCP_AUTH_TOKEN=my-secret \
npm run start:http

# Client configuration
{
  "qlcplus": {
    "url": "http://lighting-machine:8788/mcp",
    "auth": { "type": "bearer", "token": "my-secret" }
  }
}
```

## Help

- Check `.env` configuration
- Review logs: `LOG_LEVEL=debug npm run start:stdio`
- See troubleshooting in [README.md](./README.md#troubleshooting)

---

**That's it! You're ready to control QLC+ with AI.**
