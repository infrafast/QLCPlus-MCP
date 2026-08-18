# Agent Instructions

This file guides Codex and other automation agents working in this repository.

## Product Direction

QLCPlus-MCP is a QLC+ 5 **native-protocol-only** MCP server.

Do not add or restore OSC, WebSocket, `/vc.json`, QLC+ 4 compatibility, static `widgets.json` runtime mappings, raw DMX paths, or transport fallbacks unless the repository owner explicitly changes this product decision.

The supported control path is:

```text
MCP client
  -> QLCPlus-MCP tools
  -> QLC+ 5 native client
  -> active-project inventory
  -> validated native Virtual Console actions
```

## Documentation Placement

Keep documentation non-redundant and consistent.

- [README.md](README.md): user-facing purpose, installation, quick start, deployment and common operation.
- [ARCHITECTURE.md](ARCHITECTURE.md): implementation details, native protocol lifecycle, transports, security and validation.
- [ROADMAP.md](ROADMAP.md): completed migration history, acceptance gates and future native-only work.
- [PROMPT.md](PROMPT.md): runtime instructions for an AI agent using this MCP server.
- [AGENTS.md](AGENTS.md): repository-maintenance rules for coding agents.

Do not recreate `docs/`, `QUICKSTART.md`, `PROJECT-SUMMARY.md`, or parallel documentation unless explicitly requested.

## Development Rules

- Read the existing code and docs before changing behavior.
- Keep changes scoped and add/update tests for behavior changes.
- Preserve MCP tool names and schemas unless a deliberate compatibility change is requested.
- Keep QLC+ numeric widget IDs session-only; never persist them as stable identifiers.
- Treat native state `ready` as the only state in which a live action may be sent.
- Invalidate the inventory on disconnect and require a fresh project transfer before returning to `ready`.
- Keep framing, decrypted payload, project and inventory sizes bounded.
- Do not expose native encryption keys, HTTP bearer tokens, or other secrets in health/status responses or logs.
- Default HTTP binding to loopback. Network exposure must be an explicit deployment choice; bearer authentication is strongly recommended for non-loopback HTTP.
- Run `npm run build` and `npm run test:ci` after code changes when feasible.
- Keep GitHub Actions green before merging.

## Widget Caption Rules

Live button execution uses one complete QLC+ caption and ignores **case only**.

Internal spaces, accents, punctuation, underscores and hyphens are significant. Examples:

```text
Blue Speed  == blue speed
blue speed  != blue_speed
blue speed  != bluespeed
```

Do not normalize separators or accents for execution. Do not use substring, prefix, semantic, closest or fuzzy matching to authorize a live command.

Loose normalization may exist only as diagnostic/search metadata and must not determine command identity or collision handling.

## Agent Command Routing

If the user supplies a complete caption, the runtime agent should call `qlc_button_press` directly. The server validates the caption against the current native inventory, so pre-calling `qlc_list_widgets` is unnecessary.

Use `qlc_list_widgets` for discovery, partial searches, or recovery after an exact caption was rejected.

## Native Compatibility Boundary

The implementation currently requires QLC+ native protocol behavior compatible with upstream commit `984f0e7`, including grouped Virtual Console action codes such as `VCButtonSetPressed = 0xF200`.

The Linux localhost client may bind a per-process address in `127.0.0.0/8` so concurrent native clients have distinct QLC+ source identities. Do not replace this with LAN exposure as a workaround.

SimpleCrypt is protocol compatibility, not modern transport security. Keep the QLC+ native endpoint on localhost or a trusted show network.
