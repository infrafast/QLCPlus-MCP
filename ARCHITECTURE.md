# QLCPlus-MCP Architecture

QLCPlus-MCP is a TypeScript MCP server that controls QLC+ 5 through the QLC+ native network protocol.

User-facing installation and operation live in [README.md](README.md). Migration history and future work live in [ROADMAP.md](ROADMAP.md).

## Product Architecture

```text
MCP client
  -> QLCPlus-MCP tool layer
  -> QLC+ native session
  -> authentication
  -> active-project transfer
  -> validated in-memory Virtual Console inventory
  -> exact caption resolution
  -> native Virtual Console button action
  -> QLC+ 5 lighting engine
```

There is one supported QLC+ runtime transport: **native TCP**.

OSC, WebSocket, `/vc.json`, static runtime `widgets.json`, raw DMX helpers and QLC+ 4 compatibility are intentionally absent from the runtime.

## Startup

[src/index.ts](src/index.ts) performs startup orchestration:

1. load the first available runtime environment file;
2. validate configuration with Zod;
3. initialize logging;
4. initialize the QLC+ native client;
5. register MCP tools/resources/prompts;
6. start STDIO or Streamable HTTP MCP transport.

Environment files are searched in this order:

1. `QLCPLUS_MCP_ENV_FILE`
2. `/etc/qlcplusmcp.env`
3. `/config/.env`
4. `config/.env`
5. `.env`

The repository does not track a machine-specific env file.

## Core Modules

### Configuration — `src/config.ts`

`ConfigSchema` contains only MCP/HTTP, native QLC+, dry-run and logging settings.

Important defaults:

```text
MCP_TRANSPORT=stdio
HTTP_HOST=127.0.0.1
HTTP_PORT=8788
QLC_NATIVE_ENABLED=true
QLC_NATIVE_HOST=127.0.0.1
QLC_NATIVE_PORT=9998
QLC_DRY_RUN=false
```

Boolean environment values are parsed as true booleans rather than forcing absent variables to `false`. Therefore omission of `QLC_NATIVE_ENABLED` correctly keeps the schema default `true`.

Bearer mode requires a non-empty `MCP_AUTH_TOKEN` during configuration validation.

### MCP server — `src/mcpServer.ts`

The official Model Context Protocol SDK is used directly.

Responsibilities:

- expose tool JSON schemas generated from Zod;
- validate tool arguments;
- expose `PROMPT.md` as prompt `agent_prompt`;
- expose `PROMPT.md` as resource `agent://prompt/system`;
- expose `PROMPT.md` through tool `get_agent_prompt`.

### Prompt loading — `src/agentPrompt.ts`

`MCP_PROMPT_FILE` is resolved when the prompt is read, after runtime environment loading. This prevents a custom prompt path from being missed because of ES module import order.

### Logging — `src/logger.ts`

Pino provides structured logging and an in-memory recent-log buffer for the HTTP diagnostic surface.

STDIO mode sends logs to stderr so stdout remains reserved for MCP framing.

## QLC+ Native Protocol

### Endpoint selection — `src/qlc/nativeHost.ts`

Default target:

```text
127.0.0.1:9998
```

On Linux, a localhost target receives a per-process source identity inside `127.0.0.0/8`.

Example:

```text
process A -> 127.x.y.z -> QLC+ :9998
process B -> 127.a.b.c -> QLC+ :9998
```

QLC+ keys native sessions by source address. Distinct loopback source addresses allow concurrent local native clients without exposing QLC+ Native Server to the LAN.

macOS does not use undeclared secondary loopback source addresses and therefore uses the normal platform source selection.

### Codec — `src/qlc/nativeCodec.ts`

Responsibilities:

- native packet headers;
- SimpleCrypt compatibility;
- compression/decompression;
- CRC/SHA integrity handling;
- typed native sections;
- fragmented/coalesced TCP frame decoding;
- protocol and allocation bounds.

Key bounds include:

- native encrypted packet protocol length;
- bounded decrypted output;
- bounded section lengths;
- bounded decompression output.

Malformed framing is treated as a connection failure rather than scanning arbitrary encrypted data for another apparent header.

SimpleCrypt is a QLC+ protocol compatibility mechanism, **not modern transport security**. Native access should remain on localhost or a trusted show network.

### Project inventory — `src/qlc/nativeInventory.ts`

After authorization, QLC+ transfers the active project. The server parses only the metadata required for Virtual Console control.

The parser enforces a configurable maximum project size, rejects XML entities, accepts only the inert standard `<!DOCTYPE Workspace>` form, discovers buttons/sliders recursively inside Virtual Console, records Frame/SoloFrame hierarchy and builds a new inventory before replacing the current one.

#### Caption identity

Runtime command identity ignores **case only**.

```text
Blue Speed  == blue speed
blue speed  != blue_speed
blue speed  != bluespeed
Été         != Ete
```

Internal spaces, accents, punctuation, underscores and hyphens are significant. `exactNativeCaptionKey()` is the only identity key used for command lookup and duplicate detection. `normalizeNativeCaption()` remains diagnostic/search metadata only and must never authorize a live action.

### Native client — `src/qlc/nativeClient.ts`

The native client implements the lifecycle:

```text
disabled
  or
connecting
  -> waiting-for-authorization
  -> downloading-project
  -> ready
  -> disconnected
  -> connecting ...
```

`ready` requires an active TCP connection, successful authorization and a complete validated current project inventory. On disconnect or project replacement, the inventory is invalidated immediately and a fresh project must be downloaded before returning to `ready`.

Each receive callback is bound to the exact socket that delivered the bytes. Stale socket data and obsolete project-transfer generations cannot replace the current inventory.

## Button Execution

`qlc_button_press` resolves one complete caption through the current inventory and sends the native Virtual Console action only while state is `ready`.

Current native action code:

```text
VCButtonSetPressed = 0xF200
```

Toggle/default buttons use press-only semantics; Flash uses press/release. Missing captions and wrong widget kinds are rejected without fuzzy fallback.

## MCP Tools

| Tool | Purpose |
| --- | --- |
| `get_agent_prompt` | Return runtime agent guidance. |
| `qlc_get_state` | Report native lifecycle/inventory/reconnect/action state. |
| `qlc_list_widgets` | Discover the current native project inventory. |
| `qlc_button_press` | Execute one complete exact button caption. |

## STDIO Transport

`src/transports/stdio.ts` uses `StdioServerTransport` and is preferred when the MCP host and QLCPlus-MCP run on the same machine.

Closing or failing the STDIO transport goes through the same native-client cleanup path before process exit.

## HTTP Transport

`src/transports/http.ts` implements:

- **stateless Streamable HTTP MCP**;
- `/health`;
- authenticated `/mcp/status`;
- authenticated log/tool/resource diagnostics;
- optional bearer authentication;
- a read-only native status page.

The MCP endpoint intentionally does **not** allocate or retain `Mcp-Session-Id` values. A fresh `StreamableHTTPServerTransport` and MCP server binding are created for each protocol request with `sessionIdGenerator: undefined` and JSON responses enabled. Mixer/QLC runtime state remains global in the QLC+ native client, not in the MCP transport.

This makes HTTP clients resilient to a QLCPlus-MCP or Raspberry Pi restart: after the endpoint is reachable again, the next MCP request does not depend on a transport session that existed before the restart. It also avoids an in-memory HTTP session table and is suitable for multiple independent MCP clients such as Claude, ChatGPT/OpenAI-compatible clients and LiveStageAssistant.

The browser admin page remains available on `GET /mcp` when the request accepts HTML. MCP protocol requests continue to use the same `/mcp` URL and `type: "streamable-http"`; client configuration does not change.

There is no runtime QLC+ reconfiguration form and no OSC configuration endpoint.

### Public health boundary

`/health` intentionally precedes bearer authorization so infrastructure can test liveness. It returns only minimal service/native readiness information and never returns bearer tokens, native encryption keys, authenticated headers, full runtime config or logs.

### Bearer token handling

When bearer mode is enabled, `MCP_AUTH_TOKEN` is required at startup, incoming tokens are compared with `timingSafeEqual`, generated agent configuration displays a placeholder instead of the real secret, and the real token is not logged.

HTTP request bodies are bounded to 1 MiB before JSON parsing. Default HTTP binding is `127.0.0.1`; network exposure is explicit.

## Dry Run

With `QLC_DRY_RUN=true`, the native client opens no TCP socket. Button calls return dry-run results without transmitting live actions.

## Packaging

Generated `dist/` output is ignored and not tracked. A deployment must run `npm run build` before starting `dist/src/index.js`.

The Docker build compiles TypeScript in a build stage and exposes only the MCP HTTP TCP port. The Raspberry Pi service pack uses `/etc/qlcplusmcp.env`; its installer preserves existing configuration and mode `600`.

## Automated Validation

GitHub Actions runs on pull requests and `main` pushes with Node 20.20 and Node 22:

```text
npm ci
npm run build
npm run test:ci
```

The tests cover native codec framing, native host selection, project inventory/security, connection/reconnect behavior, project/session race handling, button semantics, STDIO cleanup behavior, nullable MCP schemas, prompt behavior and native configuration defaults.

Live QLC+ validation remains necessary for protocol compatibility and actual lighting behavior.

## Security Boundaries

1. Never expose HTTP secrets through `/health`, status payloads, generated config or logs.
2. Prefer STDIO or loopback HTTP for same-host operation.
3. Use bearer authentication for non-loopback HTTP.
4. Keep QLC+ native TCP on localhost/trusted show networks.
5. Treat project data received from QLC+ as untrusted input and preserve allocation/XML bounds.
6. Never execute fuzzy/partial widget matches.
7. Never persist session-only numeric QLC+ widget IDs.
8. Never allow project data from an obsolete socket or obsolete transfer generation to replace the current inventory.
9. Keep Streamable HTTP stateless unless a future feature truly requires server-to-client session state; do not add an in-memory `Mcp-Session-Id` table merely for client continuity.
