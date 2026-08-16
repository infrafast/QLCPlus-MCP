# QLCPlus-MCP Architecture

This document describes the technical structure of QLCPlus-MCP. User installation and everyday operation live in [README.md](README.md). Migration planning lives in [ROADMAP.md](ROADMAP.md).

## System Overview

QLCPlus-MCP is a TypeScript MCP server that lets AI agents control QLC+ lighting.

Current architecture:

```text
MCP client
  -> QLCPlus-MCP tools
  -> native client / runtime project inventory
  -> QLC+ 5 Native Server on localhost TCP 9998
  -> QLC+ Virtual Console / lighting engine
```

The runtime server uses the official MCP SDK directly for both STDIO and streamable HTTP transports. It does not depend on `mcp-use` at runtime.

QLCPlus-MCP now uses the QLC+ 5 native protocol for widget inventory and button
control. OSC is no longer initialized and `config/widgets.json` is not loaded at
runtime. Historical OSC code remains only until the final cleanup milestone.

## Entry Point

[src/index.ts](src/index.ts) performs startup orchestration:

1. Load runtime `.env` configuration.
2. Validate configuration with Zod.
3. Initialize logging.
4. Initialize the OSC client.
5. Load widget mappings.
6. Register MCP tools.
7. Start either STDIO or HTTP transport.

Runtime environment files are searched in this order:

1. `QLCPLUS_MCP_ENV_FILE`
2. `/etc/qlcplusmcp.env`
3. `/config/.env`
4. `config/.env`
5. `.env`

## Core Modules

### Configuration

[src/config.ts](src/config.ts)

- Defines `ConfigSchema`.
- Parses environment variables.
- Validates transport, HTTP, auth, QLC+, widget, dry-run, and logging settings.
- Supports runtime updates of QLC+ connection settings.
- Persists runtime QLC+ settings back to the loaded env file when the HTTP admin surface changes them.

### MCP Server Compatibility

[src/mcpServer.ts](src/mcpServer.ts) and [src/mcpCompat.ts](src/mcpCompat.ts)

- Adapt local tool definitions to MCP SDK schemas.
- Expose tools, prompts, and resources.
- Validate tool input with Zod before invoking handlers.
- Expose `PROMPT.md` as:
  - prompt `agent_prompt`;
  - resource `agent://prompt/system`;
  - tool `get_agent_prompt`.

### Logging

[src/logger.ts](src/logger.ts)

- Uses pino.
- Supports development pretty logs and production JSON logs.
- Uses the configured `LOG_LEVEL`.

## Transport Modes

### STDIO

[src/transports/stdio.ts](src/transports/stdio.ts)

Use for same-host MCP clients such as local desktop agents.

### HTTP

[src/transports/http.ts](src/transports/http.ts)

Use for networked clients and service deployments.

Responsibilities:

- streamable HTTP MCP endpoint;
- health/admin surface;
- optional bearer authentication;
- browser-visible runtime status and QLC+ connection controls.

## OSC Layer

[src/osc/oscClient.ts](src/osc/oscClient.ts)

Responsibilities:

- initialize the OSC UDP client;
- send individual OSC messages;
- send OSC batches;
- validate OSC paths;
- normalize internal DMX values;
- track runtime state and recent feedback;
- support dry-run mode.

Current OSC mode sends commands to QLC+ input port `QLC_OSC_INPUT_PORT` and listens for feedback on `QLC_OSC_OUTPUT_PORT`.

## QLC+ 5 Native Migration Client

[src/qlc/nativeCodec.ts](src/qlc/nativeCodec.ts),
[src/qlc/nativeInventory.ts](src/qlc/nativeInventory.ts), and
[src/qlc/nativeClient.ts](src/qlc/nativeClient.ts)

The native client connects to TCP port `9998`, performs QLC+ native
authentication, receives the
current project through `NetProjectTransfer`, atomically builds an in-memory
Virtual Console inventory, and sends validated `VCButtonSetPressed` actions.

The native client reports `connecting`, `waiting-for-authorization`,
`downloading-project`, `ready`, `disconnected`, and `stopped`. A TCP connection is
not ready until authentication and complete project validation succeed. Socket
closure/error events and TCP keepalive trigger bounded reconnects; QLC+
`NetPoll`/`NetPollReply` are declared upstream but not implemented.

Button execution uses strict full-caption lookup. Case is ignored, but spaces,
accents, punctuation, and the complete caption must match the current inventory.
Partial and fuzzy names are rejected before any native packet is sent.

Enable the migration client with:

```text
QLC_NATIVE_ENABLED=true
QLC_NATIVE_HOST=auto
QLC_NATIVE_PORT=9998
```

`auto` selects a private IPv4 address from a physical Ethernet interface first,
then Wi-Fi. This makes the kernel use that LAN address as the TCP source and
avoids QLC+'s one-session-per-source-address collision with a loopback client.
Tailscale/CGNAT and non-private addresses are deliberately excluded. An explicit
host remains supported. Keep native access on a trusted LAN because SimpleCrypt
is protocol compatibility, not modern network security.

### OSC Protocol Notes

Transport: UDP.

Default QLC+ ports:

| Direction | Default | Meaning                                            |
| --------- | ------- | -------------------------------------------------- |
| Input     | `7700`  | QLC+ listens for OSC commands.                     |
| Output    | `9000`  | QLC+ sends OSC feedback; QLCPlus-MCP listens here. |

For additional universes, QLC+ conventionally offsets ports by `universe - 1`.

OSC messages contain:

```text
OSC address: /path/to/control
Type tags: data types
Arguments: values
```

Examples:

```text
/black [1]
/0/dmx/0 [255]
```

QLC+ 4 Virtual Console widgets are controlled through OSC paths learned with Auto Detect. QLC+ stores the learned path as an internal input hash, so QLCPlus-MCP must use mapped paths from `config/widgets.json` rather than inventing generic `/vc/...` paths.

Generated mapping examples:

```text
BLACK -> /black
STOP -> /stop
ambient blue-yellow -> /ambient_blue-yellow
```

DMX direct paths are zero-based:

```text
Universe 1, Channel 1  -> /0/dmx/0
Universe 1, Channel 12 -> /0/dmx/11
Universe 2, Channel 5  -> /1/dmx/4
```

Important OSC limitation: UDP send success only means the local socket accepted the packet. It does not prove QLC+ received or applied the command. Use `qlc_get_state` feedback freshness as the best runtime signal.

## Widget Mapping Layer

[src/qlc/widgetResolver.ts](src/qlc/widgetResolver.ts)

Responsibilities:

- load `config/widgets.json`;
- index widgets by logical name and OSC path;
- resolve `widgetName` or direct `oscPath`;
- list available widgets;
- return closest matches for failed lookups.

Current runtime behavior depends on this mapping. Native-only control will replace
it with the inventory transferred by the active QLC+ project.

### Mapping File Shape

```json
{
  "widgets": [
    {
      "id": "unique-id",
      "name": "logical-name",
      "path": "/osc/path",
      "type": "button",
      "description": "Human readable description",
      "minValue": 0,
      "maxValue": 1
    }
  ],
  "generated": false,
  "generatedAt": "2024-01-01T00:00:00.000Z"
}
```

Fields:

| Field                   | Required | Notes                                                                             |
| ----------------------- | -------- | --------------------------------------------------------------------------------- |
| `id`                    | yes      | Unique mapping identifier.                                                        |
| `name`                  | yes      | Logical name used by MCP tools.                                                   |
| `path`                  | yes      | OSC path beginning with `/`.                                                      |
| `type`                  | yes      | `button`, `slider`, `speed`, `cuelist`, `chaser`, `frame`, `label`, or `unknown`. |
| `description`           | no       | Human-readable hint for operators/agents.                                         |
| `minValue` / `maxValue` | no       | Optional range metadata.                                                          |

Naming guidance:

- use descriptive names;
- prefer lowercase with underscores for hand-written names;
- keep QLC+ labels and mapping names stable during a show;
- model reusable lighting actions as Virtual Console widgets rather than raw low-level DMX when possible.

## QXW Parsing

[src/qlc/qxwParser.ts](src/qlc/qxwParser.ts) and [src/qlc/generateWidgets.ts](src/qlc/generateWidgets.ts)

Responsibilities:

- parse QLC+ project files;
- support zipped `.qxw` workspaces and plain XML `.qxw` workspaces;
- support `Workspace` and legacy `QLC` roots;
- collect Virtual Console widgets recursively;
- derive names from `Name` or `Caption`;
- generate `config/widgets.json` starter mappings.

This is an offline helper for OSC mode. It becomes an optional diagnostic after
native runtime discovery is validated.

## MCP Tools

Current registered tools:

| Tool               | Purpose                                                               |
| ------------------ | --------------------------------------------------------------------- |
| `get_agent_prompt` | Return the recommended lighting-agent prompt from `PROMPT.md`.        |
| `qlc_get_state`    | Report OSC runtime state, connection details, and feedback freshness. |
| `qlc_list_widgets` | List mapped widgets from `config/widgets.json`.                       |
| `qlc_send_osc`     | Send raw OSC when `QLC_ALLOW_RAW_OSC=true`.                           |
| `qlc_button_press` | Trigger a mapped widget by `widgetName` or direct `oscPath`.          |

Tool implementations live in [src/tools](src/tools).

Design constraint: MCP tool names and input schemas should remain stable while the transport layer migrates underneath them.

## Data Flow

Mapped button press in current OSC mode:

```text
Agent calls qlc_button_press({ widgetName: "Rouge" })
  -> tool validates input
  -> widgetResolver resolves "Rouge"
  -> OSC client sends the mapped path/value
  -> QLC+ receives OSC input
  -> QLC+ Virtual Console performs the show action
```

Raw OSC flow:

```text
Agent calls qlc_send_osc({ path, args })
  -> tool checks QLC_ALLOW_RAW_OSC
  -> OSC path and args are validated
  -> OSC client sends the message or logs dry-run intent
```

## Configuration Surface

All configuration is environment based. Variables can be set in the shell or in the runtime env file found at startup.

### Transport

| Variable        | Default | Purpose                                                    |
| --------------- | ------- | ---------------------------------------------------------- |
| `MCP_TRANSPORT` | `stdio` | `stdio` for local MCP clients, `http` for network clients. |

### HTTP

| Variable        | Default   | Purpose                                          |
| --------------- | --------- | ------------------------------------------------ |
| `HTTP_HOST`     | `0.0.0.0` | Address to bind. Use `127.0.0.1` for local-only. |
| `HTTP_PORT`     | `8788`    | HTTP server port.                                |
| `HTTP_MCP_PATH` | `/mcp`    | MCP endpoint path.                               |

### Authentication

| Variable         | Default | Purpose                               |
| ---------------- | ------- | ------------------------------------- |
| `MCP_AUTH_MODE`  | `none`  | `none` or `bearer`.                   |
| `MCP_AUTH_TOKEN` | unset   | Required when `MCP_AUTH_MODE=bearer`. |

Bearer auth should be used for network deployments. Generate a token with:

```bash
openssl rand -base64 32
```

### QLC+ OSC

| Variable              | Default     | Purpose                                       |
| --------------------- | ----------- | --------------------------------------------- |
| `QLC_HOST`            | `127.0.0.1` | QLC+ host reachable from this server.         |
| `QLC_OSC_INPUT_PORT`  | `7700`      | QLC+ OSC input port.                          |
| `QLC_OSC_OUTPUT_PORT` | `9000`      | Feedback/listen port used by `qlc_get_state`. |
| `QLC_UNIVERSE`        | `1`         | Default universe for internal helpers.        |

### Widget And Advanced Options

| Variable            | Default               | Purpose                                   |
| ------------------- | --------------------- | ----------------------------------------- |
| `QLC_WIDGETS_FILE`  | `config/widgets.json` | Widget mapping path.                      |
| `QLC_ALLOW_RAW_OSC` | `false`               | Enables the advanced `qlc_send_osc` tool. |
| `QLC_DRY_RUN`       | `false`               | Logs OSC writes without sending.          |
| `MCP_PROMPT_FILE`   | `PROMPT.md`           | Optional custom prompt file.              |

### Logging

| Variable    | Default       | Purpose                                                |
| ----------- | ------------- | ------------------------------------------------------ |
| `LOG_LEVEL` | `info`        | `trace`, `debug`, `info`, `warn`, `error`, or `fatal`. |
| `NODE_ENV`  | `development` | Controls log formatting.                               |

Outgoing OSC writes log as `[WRITE_OSC] ...`; dry-run writes use `[WRITE_OSC_DRY_RUN]`; feedback reads log as `[READ_OSC] ...` when debug logging is enabled.

## Integration Patterns

### Local STDIO

Use for a same-machine MCP host:

```json
{
  "mcpServers": {
    "qlcplus": {
      "command": "node",
      "args": ["/opt/QLCPlus-MCP/dist/src/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "QLC_HOST": "127.0.0.1",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Remote HTTP

Run QLCPlus-MCP on the lighting machine:

```bash
MCP_TRANSPORT=http \
MCP_AUTH_MODE=bearer \
MCP_AUTH_TOKEN=my-secure-token \
npm run start:http
```

Connect a client to:

```text
http://lighting-machine.local:8788/mcp
```

### LiveStageAssistant

LiveStageAssistant can use either STDIO or HTTP. Suggested routing keywords:

```text
qlc, qlcplus, lumière, light, éclairage, scène, dmx, fixture, projecteur, couleur
```

When LiveStageAssistant asks whether QLC+ is connected, call `qlc_get_state`. The tool reports initialization, configured host/ports, last command sent, and recent feedback.

If LiveStageAssistant also loads a large MCP server, enable MCP tool routing in that host so lighting-related turns expose only relevant tools and avoid tool-count limits.

### Raspberry Pi Service Pack

The `qlcplusmcp_raspi_service_pack` directory contains service helper files:

| File                            | Installed target                         |
| ------------------------------- | ---------------------------------------- |
| `qlcplusmcp.env`                | `/etc/qlcplusmcp.env`                    |
| `qlcplusmcp.service`            | `/etc/systemd/system/qlcplusmcp.service` |
| `qlcplusmcp`                    | `/usr/local/bin/qlcplusmcp`              |
| `install_qlcplusmcp_service.sh` | installer script                         |

Expected repository path on Raspberry Pi:

```text
/home/pi/QLCPlus-MCP
```

Build before installing:

```bash
cd /home/pi/QLCPlus-MCP
npm ci --no-audit --no-fund
npm run build
```

Runtime-only deployments with prebuilt `dist/src/index.js` can use:

```bash
npm ci --omit=dev --omit=optional --no-audit --no-fund
```

Install from the service pack directory:

```bash
chmod +x install_qlcplusmcp_service.sh
./install_qlcplusmcp_service.sh
```

Service helper commands:

```bash
qlcplusmcp start
qlcplusmcp stop
qlcplusmcp restart
qlcplusmcp status
qlcplusmcp logs
qlcplusmcp health
qlcplusmcp test-remote
qlcplusmcp last-state
qlcplusmcp auto
qlcplusmcp noauto
qlcplusmcp config
```

The HTTP admin page at `/mcp` can persist QLC+ connection changes back to `/etc/qlcplusmcp.env` when that file is the loaded runtime config.

## Native Protocol Migration Target

The intended future architecture:

```text
MCP client
  -> QLCPlus-MCP tools
  -> QLC transport abstraction
  -> QLC+ 5 native TCP session / transferred project inventory
  -> QLC+ Virtual Console / lighting engine
```

Discovery strategy:

- authenticate with the QLC+ Native Server on localhost TCP `9998`;
- reassemble and validate the bounded `NetProjectTransfer` workspace XML;
- resolve widgets by normalized QLC+ caption;
- keep IDs in memory only and invalidate them after every disconnect;
- redownload the current project before returning to `ready` after reconnect;
- provide no WebSocket fallback.

The staged migration plan and validation gates are in [ROADMAP.md](ROADMAP.md).

## Testing

Run the current test suite with:

```bash
npx vitest run
```

Current tests cover:

- OSC utility behavior;
- DMX path/value utilities used by OSC internals;
- QXW parser behavior for plain XML workspaces with nested Virtual Console widgets.

Expected validation before merging transport changes:

- `npm run build`
- `npx vitest run`
- targeted unit tests for new transport behavior;
- manual QLC+ validation for protocol changes when a real QLC+ instance is required.

## Project Structure

```text
QLCPlus-MCP/
├── src/
│   ├── agentPrompt.ts
│   ├── config.ts
│   ├── index.ts
│   ├── logger.ts
│   ├── mcpCompat.ts
│   ├── mcpServer.ts
│   ├── osc/
│   │   └── oscClient.ts
│   ├── qlc/
│   │   ├── generateWidgets.ts
│   │   ├── qxwParser.ts
│   │   └── widgetResolver.ts
│   ├── tools/
│   │   ├── qlc_button_control.ts
│   │   ├── qlc_get_state.ts
│   │   ├── qlc_list_widgets.ts
│   │   └── qlc_send_osc.ts
│   └── transports/
│       ├── http.ts
│       └── stdio.ts
├── config/
│   └── widgets.json
├── tests/
├── AGENTS.md
├── ARCHITECTURE.md
├── README.md
└── ROADMAP.md
```

## Documentation Ownership

- User-facing setup and scenarios: [README.md](README.md).
- Technical architecture and module behavior: this file.
- Staged implementation plans and validation milestones: [ROADMAP.md](ROADMAP.md).
- Agent/developer documentation rules: [AGENTS.md](AGENTS.md).
