# QLC+ 5 Native Protocol Roadmap

## Product Decision

QLCPlus-MCP is a **QLC+ 5 native-network-protocol-only** MCP server.

The supported production path is:

```text
MCP client
  -> QLCPlus-MCP tools
  -> QLC+ native session
  -> active project inventory
  -> validated native Virtual Console actions
  -> QLC+ 5
```

OSC, WebSocket, `/vc.json`, QLC+ 4 runtime compatibility and static `widgets.json` mappings are no longer product targets.

## Compatibility Boundary

The implementation requires QLC+ native protocol behavior compatible with upstream commit `984f0e7` or a release containing equivalent grouped native Virtual Console action codes and authentication/project-transfer behavior.

Important currently used action code:

```text
VCButtonSetPressed = 0xF200
```

The protocol details reused from OculizerQLC include:

- TCP native sessions on port `9998`;
- QLC+ native authentication/SimpleCrypt compatibility;
- bounded TCP framing for fragmented/coalesced packets;
- bounded project-transfer reassembly;
- safe active-project XML parsing;
- Virtual Console button/slider inventory discovery;
- reconnect and fresh-project behavior;
- grouped Virtual Console action codes.

## Historical Rollback Anchor

The former OSC implementation remains available only through repository history.

Rollback anchor:

```text
dc3fc87
```

Do not reintroduce OSC code as an in-tree fallback. If historical comparison is required, inspect the rollback commit/tag instead.

## Milestone 0 — Freeze OSC Baseline

Status: **complete (historical)**

Purpose: preserve a known rollback point before native work.

Result:

- OSC baseline preserved in Git history;
- MCP tool contract recorded before migration;
- WebSocket migration abandoned in favor of direct native protocol work.

## Milestone 1 — Native Client, Inventory And Lifecycle

Status: **complete**

Implemented:

- native packet/section/SimpleCrypt codec;
- TCP framing and bounded decoding;
- authentication lifecycle;
- active-project transfer/reassembly;
- safe Virtual Console inventory parsing;
- explicit `connecting`, `waiting-for-authorization`, `downloading-project`, `ready`, `disconnected` and `stopped` states;
- atomic inventory replacement;
- inventory invalidation on disconnect;
- automatic reconnect and fresh project download;
- TCP keepalive;
- Linux per-process `127/8` local source identity for concurrent clients;
- dry-run with no native socket.

Accepted live behavior from the migration phase includes Raspberry Pi authorization, inventory discovery, QLC+ restart and reconnect/fresh-inventory recovery.

## Milestone 2 — Native MCP Button Control

Status: **implemented; representative live-lighting acceptance remains the release gate**

Implemented:

- `qlc_list_widgets` reads the native runtime inventory;
- `qlc_button_press` sends native Virtual Console button actions;
- Toggle/default buttons use press-only semantics;
- Flash uses press/release semantics;
- commands are rejected outside `ready`;
- numeric widget IDs remain session-only;
- raw OSC control was removed;
- exact button identity is validated server-side.

### Exact caption policy

Matching ignores **case only**.

```text
Blue Speed  == blue speed
blue speed  != blue_speed
blue speed  != bluespeed
Été         != Ete
```

Spaces are explicitly supported in widget captions.

No substring, separator-insensitive, accent-insensitive, semantic, closest or fuzzy match may authorize a live action.

### Efficient agent routing

A complete user-supplied caption goes directly to `qlc_button_press`.

`qlc_list_widgets` is used for discovery, partial search and recovery after an exact-match failure. This removes a redundant MCP round trip from normal commands while keeping the server as the authoritative validator.

### Remaining live acceptance gate

On the target QLC+ production build:

1. trigger representative Toggle buttons;
2. trigger a Flash button and verify release behavior;
3. trigger buttons inside ordinary Frame and SoloFrame layouts if present;
4. verify a button whose caption contains spaces, for example `blue speed`;
5. reload/switch the QLC+ project and verify rediscovery before the next action;
6. restart QLC+ and verify the first post-reconnect action uses the fresh inventory.

## Milestone 3 — Native-Only Cleanup

Status: **implemented on `cleanup/native-only-consistency`; automated PR CI and final Raspberry Pi release validation pending**

The cleanup removes migration-era contradictions and legacy runtime code.

Implemented on the cleanup branch:

- remove OSC runtime module;
- remove static widget resolver and `config/widgets.json` runtime mapping;
- remove obsolete QXW-to-OSC generator/parser;
- remove OSC/DMX runtime types and tests;
- remove OSC Docker UDP exposure and config volume;
- make Docker native-only;
- make Raspberry Pi service configuration native-only;
- stop tracking machine-specific `config/.env`;
- stop tracking generated `dist/`;
- add `.env`, `config/.env`, `dist/` and `.DS_Store` ignore rules;
- fix `QLC_NATIVE_ENABLED` default handling;
- bind HTTP to loopback by default;
- require a token when bearer auth is selected;
- prevent bearer token exposure through `/health`, generated agent config or logs;
- replace the stale OSC HTTP admin form with read-only native status;
- bound HTTP JSON request bodies;
- preserve spaces/punctuation/accents/separators in exact widget identity;
- resolve `MCP_PROMPT_FILE` after runtime env loading;
- add GitHub Actions build/test CI on Node 20.20 and 22;
- add the repository MIT `LICENSE` file;
- align README, ARCHITECTURE, ROADMAP, AGENTS and PROMPT with native-only behavior.

### Milestone 3 automated gate

The pull request must pass:

```text
npm ci
npm run build
npm run test:ci
```

on Node 20.20 and Node 22.

Repository review should also confirm there is no active OSC/WebSocket runtime path and no tracked runtime `.env` or `dist/` output.

### Milestone 3 Raspberry Pi release gate

After CI passes:

1. update/build QLCPlus-MCP on the Raspberry Pi;
2. verify systemd starts cleanly with `/etc/qlcplusmcp.env`;
3. confirm `qlcplusmcp health` reports the native lifecycle;
4. approve QLC+ authorization if required;
5. reach `ready` with the expected inventory;
6. execute representative exact captions including at least one caption containing spaces;
7. restart QLC+ and confirm automatic recovery;
8. check journal output for bounded reconnect logging and acceptable CPU/RSS usage.

After this live gate, native-only cleanup can be considered production accepted.

## Future Native-Only Work

Candidates after the native button-control release is stable:

- native slider control with a deliberately designed MCP schema;
- richer inventory search that never changes execution identity rules;
- native connection telemetry/metrics;
- additional protocol compatibility fixtures for future QLC+ versions;
- authorization automation only if QLC+ provides an explicit secure supported mechanism;
- optional release packaging/artifacts after CI proves reproducible builds.

Not planned unless the product decision changes explicitly:

- OSC fallback;
- QLC+ 4 support;
- WebSocket or `/vc.json` fallback;
- raw unrestricted native action tools;
- fuzzy execution matching;
- direct native DMX control.
