# MCP Configuration Guide

This guide explains how to configure QLCPlus-MCP for different deployment scenarios.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Widget Mapping](#widget-mapping)
3. [Transport Modes](#transport-modes)
4. [Authentication](#authentication)
5. [QLC+ Setup](#qlc-setup)
6. [Logging Configuration](#logging-configuration)

## Environment Variables

All configuration is managed through environment variables, which can be set in `.env` or directly in your shell.

### Core Transport Variables

```bash
# Transport mode
MCP_TRANSPORT=stdio
# Options: stdio, http
# Default: stdio
# - stdio: For local MCP clients (Claude Desktop, etc.)
# - http: For remote HTTP-based MCP servers
```

### HTTP Server Variables

Used only when `MCP_TRANSPORT=http`:

```bash
HTTP_HOST=0.0.0.0
# Address to bind to
# Default: 0.0.0.0
# Use 127.0.0.1 for localhost only, 0.0.0.0 for all interfaces

HTTP_PORT=8788
# Port to listen on
# Default: 8788
# Range: 1-65535
# Ensure no other service uses this port

HTTP_MCP_PATH=/mcp
# HTTP path for MCP endpoint
# Default: /mcp
# Full URL: http://HOST:PORT/mcp
```

### Authentication Variables

```bash
MCP_AUTH_MODE=none
# Authentication mode
# Options: none, bearer
# Default: none

MCP_AUTH_TOKEN=change-me
# Bearer token for authentication
# Required if MCP_AUTH_MODE=bearer
# Generate with: openssl rand -base64 32
# Minimum 16 characters recommended
```

### QLC+ Configuration

```bash
QLC_HOST=127.0.0.1
# QLC+ host address
# Default: 127.0.0.1
# Use your QLC+ machine hostname/IP for remote connections

QLC_OSC_INPUT_PORT=7700
# OSC input port (QLC+ listens on this)
# Default: 7700
# Standard QLC+ default: 7700 + (universe - 1)

QLC_OSC_OUTPUT_PORT=9000
# OSC output port (QLC+ sends feedback on this; qlc_get_state listens here)
# Default: 9000
# Standard QLC+ default: 9000 + (universe - 1)

QLC_UNIVERSE=1
# Default DMX universe
# Default: 1
# Range: 1-512
```

### Widget Configuration

```bash
QLC_WIDGETS_FILE=config/widgets.json
# Path to widget mappings file
# Default: config/widgets.json
# Can be relative or absolute path
```

### Advanced Options

```bash
QLC_ALLOW_RAW_OSC=false
# Allow qlc_send_osc tool
# Default: false
# Warning: Only enable for trusted use cases

QLC_DRY_RUN=false
# Dry-run mode (log without sending OSC)
# Default: false
# Useful for testing without actual QLC+ running
```

### Logging Configuration

```bash
LOG_LEVEL=info
# Logging level
# Options: trace, debug, info, warn, error, fatal
# Default: info

NODE_ENV=development
# Node environment
# Options: development, production
# Default: development
# Affects pretty-printing and performance
```

## Widget Mapping

### Format

Widget mappings are defined in JSON format:

```json
{
  "widgets": [
    {
      "id": "unique-id",
      "name": "logical-name",
      "path": "/osc/path",
      "type": "button|slider|speed|cuelist|chaser|frame|label|unknown",
      "description": "Human readable description",
      "minValue": 0,
      "maxValue": 1
    }
  ],
  "generated": false,
  "generatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| id | yes | string | Unique identifier |
| name | yes | string | Logical widget name (lowercase, no spaces) |
| path | yes | string | OSC path (must start with /) |
| type | yes | enum | Widget type |
| description | no | string | Human-readable description |
| minValue | no | number | Minimum value for range widgets |
| maxValue | no | number | Maximum value for range widgets |

### Examples

**Button (momentary press):**

```json
{
  "id": "btn_intro",
  "name": "scene_intro",
  "path": "/vc/button/intro",
  "type": "button",
  "description": "Launch intro scene"
}
```

**Slider (0-1 normalized):**

```json
{
  "id": "sld_master",
  "name": "master_dimmer",
  "path": "/vc/master",
  "type": "slider",
  "description": "Master brightness",
  "minValue": 0,
  "maxValue": 1
}
```

**Speed Dial (BPM):**

```json
{
  "id": "spd_chase",
  "name": "chase_speed",
  "path": "/vc/speed/chase",
  "type": "speed",
  "description": "Chase sequence speed (BPM)"
}
```

**Cue List:**

```json
{
  "id": "cue_main",
  "name": "cues_main",
  "path": "/vc/cuelist/main",
  "type": "cuelist",
  "description": "Main cue sequence"
}
```

### Generating Mappings

From an existing QLC+ project (`.qxw` file):

```bash
npm run generate:widgets ./show.qxw config/widgets.json
```

This automatically extracts Virtual Console widgets that have `<Input Universe="0" Channel="..."/>` and creates mappings from the widget captions. The `Channel` value is QLC+'s internal Auto Detect hash, not a DMX channel.

### Naming Conventions

- Use lowercase with underscores: `scene_intro`, `master_dimmer`
- Avoid special characters except `_` and `-`
- Use descriptive names that indicate purpose
- Group related widgets: `scene_*`, `button_*`, `slider_*`

## Transport Modes

### STDIO Mode (Local)

Best for local clients (Claude Desktop, etc.)

**Configuration:**

```bash
MCP_TRANSPORT=stdio
```

**Start:**

```bash
npm run start:stdio
```

**Client configuration (Claude Desktop):**

```json
{
  "mcpServers": {
    "qlcplus": {
      "command": "node",
      "args": ["/path/to/QLCPlus-MCP/dist/src/index.js"]
    }
  }
}
```

**Advantages:**

- Simple setup
- No network overhead
- Direct debugging
- Perfect for development

**Limitations:**

- Local only
- No built-in auth
- Single client

### HTTP Mode (Remote)

Best for remote servers or multiple clients

**Configuration:**

```bash
MCP_TRANSPORT=http
HTTP_HOST=0.0.0.0
HTTP_PORT=8788
MCP_AUTH_MODE=bearer
MCP_AUTH_TOKEN=your-token-here
```

**Start:**

```bash
npm run start:http
```

**Health endpoint:**

```bash
curl http://localhost:8788/health
```

**MCP endpoint:**

```bash
curl -X POST http://localhost:8788/mcp \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'
```

**Advantages:**

- Remote access
- Built-in authentication
- Multiple concurrent clients
- Production-ready

**Limitations:**

- Requires network setup
- Slightly higher latency
- More complex troubleshooting

## Authentication

### None (Insecure)

```bash
MCP_AUTH_MODE=none
```

Use only for local development or trusted networks.

### Bearer Token (Recommended)

```bash
MCP_AUTH_MODE=bearer
MCP_AUTH_TOKEN=my-secure-token
```

**Generate strong token:**

```bash
openssl rand -base64 32
# Output: EW7zPxL2K9mN3vQ5t7sB8cD9eF4gH6jI1kL2mN3oP4qR5sT6uV7wX8yZ9aB0c1d=
```

**Client requests must include:**

```bash
Authorization: Bearer my-secure-token
```

**Example:**

```bash
curl -X POST http://localhost:8788/mcp \
  -H "Authorization: Bearer my-secure-token" \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'
```

**Token best practices:**

- Use `openssl rand` or similar for generation
- Store securely (env file, secrets manager)
- Rotate regularly
- Use different tokens per environment
- Never commit to git

## QLC+ Setup

### Enable OSC Plugin

1. Open QLC+ → **Input/Output** tab
2. Find **OSC** in the plugins list
3. Click **Settings** next to OSC
4. Configure:
   - Input port: `7700` (or `7700 + universe - 1` for multi-universe)
   - Output port: `9000`
5. Click **OK**

### Configure Universe

For single universe (typical):

```bash
QLC_UNIVERSE=1
QLC_OSC_INPUT_PORT=7700
QLC_OSC_OUTPUT_PORT=9000
```

For multi-universe:

```bash
# Universe 2
QLC_UNIVERSE=2
QLC_OSC_INPUT_PORT=7701
QLC_OSC_OUTPUT_PORT=9001
```

### Create Virtual Console Widgets

1. **Add Button:**
   - Right-click Virtual Console → **Add Button**
   - Name: "scene_intro"
   - Optional: Set OSC feedback address `/vc/scene/intro`

2. **Add Slider:**
   - Right-click Virtual Console → **Add Slider**
   - Name: "master_dimmer"
   - Set value range: 0-255

3. **Add Speed Dial:**
   - Right-click Virtual Console → **Add Speed Dial**
   - Name: "chase_speed"

4. **Add Cue List:**
   - Right-click Virtual Console → **Add Cue List**
   - Assign function to list

### Test OSC Connection

From another machine:

```bash
# Using oscdump (if installed)
oscdump osc.udp://127.0.0.1:9000 &

# Press a button in QLC+ - should see output
# /vc/button/1 1
```

## Logging Configuration

### Log Levels

```bash
LOG_LEVEL=trace      # Everything (very verbose)
LOG_LEVEL=debug      # Development details
LOG_LEVEL=info       # General information (default)
LOG_LEVEL=warn       # Warnings only
LOG_LEVEL=error      # Errors only
LOG_LEVEL=fatal      # Fatal errors
```

### Environment

**Development (pretty output):**

```bash
NODE_ENV=development
LOG_LEVEL=debug
```

Output:

```
[14:32:15.123] INFO (1234): Sending OSC message
    path: "/0/dmx/0"
    value: 255
```

**Production (compact JSON):**

```bash
NODE_ENV=production
LOG_LEVEL=info
```

Output:

```json
{"level":30,"time":"2024-01-01T14:32:15.123Z","pid":1234,"msg":"Sending OSC message","path":"/0/dmx/0","value":255}
```

### Redirecting Logs

**To file:**

```bash
npm run start:http > server.log 2>&1 &
```

**To systemd journal:**

```bash
journalctl -u qlcplus-mcp -f
```

## Example Configurations

### Development (Local)

```bash
MCP_TRANSPORT=stdio
QLC_HOST=127.0.0.1
QLC_DRY_RUN=false
LOG_LEVEL=debug
NODE_ENV=development
QLC_ALLOW_RAW_OSC=true
```

### Production (Remote)

```bash
MCP_TRANSPORT=http
HTTP_HOST=0.0.0.0
HTTP_PORT=8788
MCP_AUTH_MODE=bearer
MCP_AUTH_TOKEN=secure-token-here
QLC_HOST=lighting-machine.local
QLC_DRY_RUN=false
LOG_LEVEL=info
NODE_ENV=production
QLC_ALLOW_RAW_OSC=false
```

### Testing (Dry-Run)

```bash
MCP_TRANSPORT=stdio
QLC_DRY_RUN=true
LOG_LEVEL=info
NODE_ENV=development
```

## Validation

All configuration is validated on startup using Zod schemas:

```typescript
// src/config.ts
export const ConfigSchema = z.object({
  transport: z.enum(['stdio', 'http']),
  httpPort: z.number().int().min(1).max(65535),
  authMode: z.enum(['none', 'bearer']),
  // ... more validations
});
```

Invalid configuration results in clear error messages:

```
Error: Configuration validation failed:
  - http_port must be between 1 and 65535 (got 99999)
  - mcp_auth_token required when auth_mode is 'bearer'
```

---

For questions or issues, see [README.md](../README.md) or open an issue on GitHub.
