# QLC+ 5 Native Protocol Migration Roadmap

## Product Decision

QLCPlus-MCP will become a QLC+ 5 native-network-protocol server. The supported
production control path will use the QLC+ Native Server, not OSC and not the
QLC+ WebSocket/Web API.

This is an intentional breaking migration:

- QLC+ 4 support is not a target for the native-only release;
- runtime widget discovery comes from the project transferred by QLC+;
- QLC+ numeric widget IDs remain session-only data;
- MCP tool names remain stable while their implementation moves to native control;
- OSC is retained only as a short-lived rollback path and is removed after the
  native acceptance gate.

## Evidence Reused From OculizerQLC

This plan incorporates the implementation and live-test experience recorded in
[`OculizerQLC/DEVELOPMENT.md`](https://github.com/infrafast/OculizerQLC/blob/main/DEVELOPMENT.md),
the [native protocol reference](https://github.com/infrafast/OculizerQLC/blob/main/docs/QLC%2B%205%20native%20network%20protocol%20reference.md),
and the [early native tests](https://github.com/infrafast/OculizerQLC/blob/main/docs/QLC5%20native%20network%20protocol%20early%20tests%20summary.md).

The following behavior is already proven in OculizerQLC and should be ported,
not rediscovered from scratch:

- UDP discovery on port `9997` and TCP sessions on port `9998`;
- QLC+ native authentication and SimpleCrypt compatibility;
- bounded TCP framing for fragmented and coalesced packets;
- complete, bounded `NetProjectTransfer` reassembly;
- safe parsing of the transferred workspace XML;
- runtime discovery of buttons, sliders, captions, types, actions, ranges,
  function associations, and Frame/SoloFrame hierarchy;
- grouped live action codes, notably `VCButtonSetPressed = 0xF200` and
  `VCSliderSetValue = 0xF300`, for compatible QLC+ builds;
- asynchronous authorization wait, connection loss detection, bounded retry,
  fresh project download, atomic inventory replacement, and recovery without
  restarting the application;
- bounded/coalesced pending intentions while QLC+ is unavailable;
- strict framing, decryption, allocation, and required-field checks combined
  with forward-compatible handling of unknown opcodes and trailing sections.

OculizerQLC validated these behaviors against a QLC+ build containing upstream
commit [`984f0e7`](https://github.com/mcallegari/qlcplus/commit/984f0e75e48c7c19a56581b82c5e5895285135c7).
The exact opcode and authentication contract remains a QLC+ version compatibility
boundary and must be checked against the QLC+ build selected for QLCPlus-MCP.

## Rollback Anchor

- OSC rollback commit: `dc3fc87`
- Baseline verification: `npm run build` and `npx vitest run` pass with 14 tests.
- Do not mix native and OSC commands in one runtime session.
- Do not extend the OSC implementation during migration except for a blocking
  production defect.

If a native milestone fails for a fundamental protocol reason, restore the whole
rollback commit instead of keeping a partially mixed transport architecture.

## Target Architecture

```text
MCP client
  -> existing QLCPlus-MCP tools
  -> QLC+ native client and session state machine
  -> TCP 9998 authentication and project transfer
  -> in-memory Virtual Console inventory
  -> native button/slider/live actions
  -> QLC+ 5 lighting engine
```

The native session exposes an explicit state such as:

```text
disabled
  -> connecting
  -> waiting-for-authorization
  -> downloading-project
  -> ready
  -> disconnected
  -> reconnecting
```

`qlc_get_state` must distinguish server-process health, TCP connectivity,
authorization, inventory readiness, last successful native action, last error,
and reconnect activity. A connected TCP socket alone is not reported as ready.

## Milestone 0 — Freeze The OSC Baseline

Purpose: preserve a small, verified rollback point before native implementation.

Tasks:

- keep commit `dc3fc87` as the rollback anchor;
- record the current MCP tool names and schemas as compatibility fixtures;
- keep `config/widgets.json` and the QXW generator unchanged during native work;
- add no WebSocket migration layer.

Automated gate:

- `npm run build`;
- `npx vitest run`;
- schema fixtures prove current MCP tools have not changed unexpectedly.

Operator involvement: none.

## Milestone 1 — Native Client, Inventory, And Connection Lifecycle

Status: **complete — automated coverage and Raspberry Pi live authorization,
project inventory, QLC+ restart, reconnect, and fresh inventory accepted**

Purpose: replace the former WebSocket Phase 1 with the complete native foundation
needed by all subsequent work.

Implementation scope:

- add isolated packet, section, SimpleCrypt, TCP framing, and session modules;
- default to configured direct TCP connection at `127.0.0.1:9998`;
- keep UDP discovery optional for diagnostics or non-local deployments rather
  than making startup depend on broadcast discovery;
- authenticate and represent authorization wait/refusal explicitly;
- reassemble `NetProjectTransfer` within a configured maximum size;
- safely parse only required Virtual Console XML metadata;
- normalize captions case-insensitively while ignoring spaces, `_`, and `-`;
- reject duplicate normalized captions and wrong widget kinds explicitly;
- replace the inventory atomically only after complete validation;
- invalidate all session IDs immediately on disconnect;
- reconnect asynchronously with bounded backoff and rate-limited logs;
- redownload and validate the project before returning to `ready`;
- enable TCP keepalive and consume socket close/error events for idle connection
  loss detection; `NetPoll`/`NetPollReply` cannot be used because QLC+ declares
  but does not implement them;
- expose the full lifecycle through `qlc_get_state` and the HTTP status page;
- keep dry-run completely network-free.

Safety requirements:

- bound packet, decrypted payload, project, inventory, and pending-command sizes;
- never scan encrypted data for an apparent packet header after malformed input;
- close and reconnect on framing, cryptographic, or required-field failure;
- reject unsafe XML declarations and external entities while accepting the
  standard inert `<!DOCTYPE Workspace>` marker used by QLC+;
- ignore unknown opcodes and trailing extension sections when safe;
- bind/use the native endpoint only on localhost or a trusted show network.

Automated gate:

- fixed binary codec vectors;
- fragmented, coalesced, truncated, malformed, and oversized packet tests;
- authentication success, refusal, and delayed approval tests;
- exact-multiple and multi-chunk project-transfer tests;
- corrupt/oversized/unsafe XML tests;
- nested inventory, caption normalization, collision, type, action, range, and
  Frame/SoloFrame tests;
- disconnect, backoff, log suppression, state reset, inventory invalidation,
  fresh-project-before-ready, and idle liveness tests;
- proof that dry-run opens no UDP or TCP socket.

Critical operator gate — one short session:

1. Start the selected production QLC+ 5 build with Native Server enabled.
2. Approve the QLCPlus-MCP client if QLC+ requests authorization.
3. Confirm transition to `ready` and confirm that the reported widget inventory
   matches the currently loaded project.
4. Restart QLC+ once and confirm automatic recovery to `ready` without restarting
   QLCPlus-MCP or retaining stale widget IDs.

No lighting-action validation is required in this milestone.

## Milestone 2 — Native-Only MCP Control

Status: **implemented; critical live QLC+ button-control gate pending**

Purpose: route the existing MCP contract through the validated native session.

Tasks:

- make `qlc_list_widgets` return the live native inventory;
- make `qlc_button_press` resolve captions and send native Virtual Console
  button actions;
- require one complete caption match (case-insensitive only); do not apply
  substring, separator-insensitive, semantic, closest, or fuzzy substitution;
- preserve QLC+ button semantics: press-only for Toggle, Blackout, StopAll,
  absent/default, and unknown future actions; press/release only for Flash;
- let QLC+ Frame/SoloFrame behavior own layering and exclusivity;
- report a command as successful only after it is written through a `ready`
  native session;
- keep one bounded discrete-action queue and reject or expire unsafe stale button
  actions across a disconnect rather than blindly replaying toggles;
- remove `qlc_send_osc`; do not preserve a raw-OSC-shaped compatibility shim or
  expose unrestricted native editing/action codes;
- make native configuration and state available on the HTTP admin page;
- stop loading `config/widgets.json` in normal runtime;
- retain QXW parsing only as an offline diagnostic tool.

Automated gate:

- all current MCP tool schema compatibility tests, except the explicitly decided
  raw OSC change;
- exact lookup, missing caption, collision, wrong kind, and inventory replacement;
- button-action semantics and no accidental double-toggle;
- command behavior in every connection state;
- stale-command suppression across reconnect;
- HTTP status/config and MCP STDIO/HTTP regressions;
- `npm run build` and the complete test suite.

Critical operator gate — one short lighting session:

1. Trigger representative Toggle, Flash, Blackout/StopAll if present, ordinary
   Frame, and SoloFrame buttons through MCP.
2. Reload or switch the QLC+ project and confirm rediscovery before the next action.
3. Restart QLC+ and confirm the first post-reconnect action targets the new
   inventory correctly.

This is the only required live lighting-control parity test before native-only
cutover.

## Milestone 3 — Remove OSC And Release Native-Only

Purpose: ship a simpler QLC+ 5 product rather than maintain two protocol stacks.

Tasks:

- make native control the only runtime transport;
- remove OSC runtime code, dependencies, ports, feedback state, raw OSC tool,
  OSC admin fields, Docker UDP exposure, and service configuration;
- remove `config/widgets.json` from runtime requirements;
- delete transport-selection branches that no longer represent product choices;
- preserve the rollback commit/tag rather than compatibility code;
- update README, ARCHITECTURE, PROMPT, Docker, and Raspberry Pi service guidance;
- document QLC+ Native Server setup, authorization, trusted-network constraint,
  connection states, project discovery, and recovery behavior.

Automated gate:

- repository search finds no active OSC/WebSocket runtime path;
- clean install, build, full tests, STDIO, HTTP, Docker, and service-pack checks;
- startup without QLC+ remains healthy and reports `reconnecting`;
- late QLC+ start reaches `ready` without restarting QLCPlus-MCP;
- malformed or incompatible peers never reach `ready` and never receive actions.

Critical operator release gate:

- one sustained Raspberry Pi/service session with QLC+ late start or restart,
  authorization if prompted, inventory refresh, representative MCP button
  actions, bounded logs, and acceptable CPU/RSS usage.

After this gate passes, native-only is the supported release and OSC survives
only in repository history at the rollback anchor.

## Decisions Needed Before Milestone 2

1. **Supported QLC+ build — decided:** require QLC+ commit `984f0e7` or a release
   containing its grouped native action codes and protocol behavior.
2. **Raw advanced tool — decided:** remove `qlc_send_osc` at native-only cutover;
   do not replace it with a raw native editing/action tool in the first release.
3. **Authorization policy:** confirm whether the production QLC+ deployment retains
   client authorization across restart. The client must still tolerate a fresh
   approval request without blocking the MCP server.
4. **Network scope — decided:** support localhost only in the native-only release.

## Deferred Work

The first native-only release does not need:

- QLC+ 4 compatibility;
- WebSocket or `/vc.json` fallback;
- live workspace-edit action tracking while a project is being edited;
- fixture/function/workspace editing;
- semantic caption/color/font updates;
- fuzzy caption matching;
- direct native DMX control;
- slider/cue-list expansion unless required by an existing stable MCP tool.

These can be evaluated after the native-only button-control release is stable.
