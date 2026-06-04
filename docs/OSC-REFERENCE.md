# OSC Protocol Reference

This document describes the OSC (Open Sound Control) protocol used by QLCPlus-MCP to communicate with QLC+.

## Protocol Overview

**Transport:** UDP  
**Default Ports:**
- Input (QLC+ listens): 7700 (universe 1)
- Output (QLC+ sends): 9000 (universe 1)

For additional universes, add (universe - 1) to port numbers.

## Message Format

All OSC messages follow this structure:

```
OSC Address: /path/to/control
OSC Type Tags: [data types]
OSC Arguments: [values]
```

Example:

```
Path:     /0/dmx/0
Type:     i (integer)
Argument: 255
```

## Virtual Console Paths

QLC+ 4 Virtual Console widgets are controlled through OSC paths learned with Auto Detect. QLC+ stores the learned path as an internal input hash, so QLCPlus-MCP must use the mapped widget paths from `config/widgets.json` instead of inventing generic `/vc/...` paths.

Examples from a generated widget map:

```
BLACK -> /black
STOP -> /stop
ambient blue-yellow -> /ambient_blue-yellow
```

## DMX Channel Mapping

DMX is addressed by path, not by separate control message:

```
Path: /<universe_zero_based>/dmx/<channel_zero_based>
Args: [value]

Examples:
Universe 1, Channel 1   → /0/dmx/0 [255]
Universe 1, Channel 12  → /0/dmx/11 [128]
Universe 2, Channel 5   → /1/dmx/4 [200]
Universe 4, Channel 12  → /3/dmx/11 [255]
```

## Value Ranges

| Control Type | Range | Notes |
|--------------|-------|-------|
| DMX Channels | 0-255 | 8-bit unsigned integer |
| Sliders | 0-1 | Normalized float |
| Master Dimmer | 0-1 | Normalized float |
| Speed (BPM) | 10-240 | Converted to 0-1 internally |
| Buttons | 1 | Sent to the mapped widget path |
| Toggles | 1 | Single value toggles state |

## Common Operations

### Set DMX Value

```
OSC: /0/dmx/0 [255]    # Universe 1, Channel 1 to full
OSC: /0/dmx/0 [128]    # Universe 1, Channel 1 to 50%
OSC: /1/dmx/4 [64]     # Universe 2, Channel 5 to ~25%
```

### Set RGB Color

```
# Red (255, 0, 0)
OSC: /0/dmx/0 [255]    # Red channel
OSC: /0/dmx/1 [0]      # Green channel
OSC: /0/dmx/2 [0]      # Blue channel

# Cyan (0, 255, 255)
OSC: /0/dmx/0 [0]      # Red
OSC: /0/dmx/1 [255]    # Green
OSC: /0/dmx/2 [255]    # Blue
```

## MCP Tool to OSC Mapping

### qlc_set_dmx_channel

**Input:**
```typescript
{
  universe: 1,
  channel: 12,
  value: 255
}
```

**OSC Sent:**
```
/0/dmx/11 [255]
```

### qlc_set_dmx_rgb

**Input:**
```typescript
{
  universe: 1,
  redChannel: 1,
  greenChannel: 2,
  blueChannel: 3,
  r: 255,
  g: 0,
  b: 255
}
```

**OSC Sent:**
```
/0/dmx/0 [255]    # Red
/0/dmx/1 [0]      # Green
/0/dmx/2 [255]    # Blue
```

### qlc_button_press

**Input:**
```typescript
{
  widgetName: "scene_intro"
}
```

**OSC Sent (via widget mapping):**
```
/scene_intro [1]
```

### qlc_slider_set

**Input:**
```typescript
{
  widgetName: "master_dimmer",
  value: 0.75
}
```

**OSC Sent:**
```
Use a mapped slider widget path, for example /master_dimmer [0.75]
```

### qlc_set_color_wash

**Input:**
```typescript
{
  color: "red",
  universe: 1,
  redChannel: 1,
  greenChannel: 2,
  blueChannel: 3
}
```

**OSC Sent:**
```
/0/dmx/0 [255]    # Red = 255
/0/dmx/1 [0]      # Green = 0
/0/dmx/2 [0]      # Blue = 0
```

## Predefined Colors

| Color | R | G | B | Hex |
|-------|---|---|---|-----|
| red | 255 | 0 | 0 | #FF0000 |
| green | 0 | 255 | 0 | #00FF00 |
| blue | 0 | 0 | 255 | #0000FF |
| amber | 255 | 191 | 0 | #FFBF00 |
| white | 255 | 255 | 255 | #FFFFFF |
| purple | 128 | 0 | 128 | #800080 |
| cyan | 0 | 255 | 255 | #00FFFF |
| magenta | 255 | 0 | 255 | #FF00FF |
| yellow | 255 | 255 | 0 | #FFFF00 |

## QLC+ Cue List Control

QLC+ 4 does not document generic OSC paths or suffixes for Cue List next/previous/start/stop controls. Configure dedicated Virtual Console controls in QLC+, learn their OSC paths with Auto Detect, and call those mapped widgets from `config/widgets.json`.

## Speed Dial Control

Use a mapped speed widget path from `config/widgets.json` and send a normalized float value. Do not assume generic `/vc/speed/...` paths.

## Multi-Universe Support

For setups with multiple DMX universes:

```
Universe 1: /0/dmx/...  (ports 7700/9000)
Universe 2: /1/dmx/...  (ports 7701/9001)
Universe 3: /2/dmx/...  (ports 7702/9002)
Universe 4: /3/dmx/...  (ports 7703/9003)
```

**Configure in QLC+:**
1. Input/Output → OSC
2. For each universe, set appropriate port: 7700 + (universe - 1)

**Configure in QLCPlus-MCP `.env`:**
```bash
QLC_UNIVERSE=1
QLC_OSC_INPUT_PORT=7700
QLC_OSC_OUTPUT_PORT=9000
```

Or use direct paths with different universe numbers in tool arguments.

## Testing OSC

### Using oscdump

Install osc-tools:

```bash
# macOS
brew install osc-tools

# Linux
apt-get install osc-tools
```

Monitor incoming OSC:

```bash
oscdump osc.udp://127.0.0.1:9000
```

Monitor commands sent to QLC+ on its input port:

```bash
oscdump osc.udp://0.0.0.0:7700
```

Monitor feedback received from QLC+ on the MCP feedback port:

```bash
oscdump osc.udp://0.0.0.0:9000
```

### Using netcat

Listen for UDP on port 7700:

```bash
nc -u -l 127.0.0.1 7700
```

### Sending test messages with socat

```bash
echo "/0/dmx/0,i 255" | socat - UDP:127.0.0.1:7700
```

## Feedback from QLC+

By default, QLC+ sends feedback on port 9000 (output port). QLCPlus-MCP listens on `QLC_OSC_OUTPUT_PORT`, logs received packets as `[READ_OSC]` when `LOG_LEVEL=debug`, and exposes the latest observed feedback plus recent feedback history through `qlc_get_state`.

Important nuance: OSC over UDP has no built-in acknowledgement. A successful send means the local UDP send did not fail; it does not prove QLC+ received or applied the command. Recent feedback received by `qlc_get_state` is the best live indication that QLC+ is responding.

## Best Practices

1. **Batch Operations** - Send related messages quickly for smooth transitions
2. **Normalize Values** - Use 0-1 for all slider-type controls
3. **DMX Channel Format** - Always use zero-based addressing in paths
4. **Error Handling** - Implement retry logic for network-based connections
5. **Logging** - Enable debug logging to trace OSC communication. Each outgoing OSC write logs a line like `[WRITE_OSC] 192.168.0.160:7700 /black args=[1]`; dry-run writes use `[WRITE_OSC_DRY_RUN]`. Each incoming feedback packet logs as `[READ_OSC] <source-host>:<source-port> <path> args=<json-array>`.

## Common Issues

### "Connection refused"
- Ensure QLC+ is running
- Check OSC plugin is enabled
- Verify ports in configuration

### "No response from QLC+"
- Check firewall rules
- Verify correct IP/hostname
- Test with oscdump

### "Values not applying"
- Ensure correct universe/channel numbers
- Verify widget exists in QLC+
- Check value range (0-255 for DMX, 0-1 for sliders)

## References

- [QLC+ Documentation](https://docs.qlcplus.org/)
- [OSC Specification](https://opensoundcontrol.org/)
- [QLC+ OSC Plugin Docs](https://docs.qlcplus.org/v4/plugins/osc)

---

For detailed tool reference, see [README.md MCP Tools Reference](./README.md#mcp-tools-reference)
