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

Configure your MCP client (e.g., Claude Desktop) to use:

```json
{
  "qlcplus": {
    "command": "node",
    "args": ["/full/path/to/QLCPlus-MCP/dist/src/index.js"]
  }
}
```

## Test

Once all three are running:

1. Ask your AI client to dim the lights: "Set master brightness to 50%"
2. Watch QLC+ respond in real-time
3. Check QLCPlus-MCP terminal for logs

## Common Issues

**"OSC not initialized"** → Ensure QLC+ is running with OSC enabled

**"Widget not found"** → Create `config/widgets.json` with your scene names

**Prompt not loaded in the agent** → Configure your MCP host to fetch prompt `qlcplus_lighting_assistant`, resource `qlcplus://prompt/system`, or fallback tool `qlc_get_agent_prompt`

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
