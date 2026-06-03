import { Tool } from "mcp-use";
import { sendOsc, sendOscBatch } from "../osc/oscClient.js";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";
import { SetMasterInputSchema, SetColorWashInputSchema } from "../types.js";
import { z } from "zod";

// Predefined color mappings
const COLORS: Record<string, { r: number; g: number; b: number }> = {
  red: { r: 255, g: 0, b: 0 },
  green: { r: 0, g: 255, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  amber: { r: 255, g: 191, b: 0 },
  white: { r: 255, g: 255, b: 255 },
  purple: { r: 128, g: 0, b: 128 },
  cyan: { r: 0, g: 255, b: 255 },
  magenta: { r: 255, g: 0, b: 255 },
  yellow: { r: 255, g: 255, b: 0 },
};

export function createSetMasterTool(config: Config): Tool {
  const logger = getLogger();

  return {
    name: "qlc_set_master",
    description:
      "Set the QLC+ master dimmer (grand master) value. Range is 0-1 (normalized), where 1 is full brightness.",
    inputSchema: SetMasterInputSchema,
    handler: async (input: any) => {
      logger.debug("Tool: qlc_set_master", input);

      const { value } = input;

      if (value < 0 || value > 1) {
        return {
          success: false,
          error: `Invalid master value: ${value}. Expected 0-1 (normalized).`,
        };
      }

      try {
        // QLC+ master dimmer OSC path
        const result = await sendOsc(
          { path: "/vc/master", args: [value] },
          { dryRun: config.qlcDryRun },
          config
        );

        return {
          success: result.success,
          message: `Master dimmer set to ${(value * 100).toFixed(1)}%`,
          value: value,
          percentage: value * 100,
        };
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to set master: ${err}`);
        return {
          success: false,
          error: `Failed to set master: ${err}`,
        };
      }
    },
  };
}

export function createBlackoutTool(config: Config): Tool {
  const logger = getLogger();

  return {
    name: "qlc_blackout",
    description:
      "Trigger QLC+ blackout (fade all lights to 0). This is a safe, emergency-grade tool for immediate darkness.",
    inputSchema: z.object({}),
    handler: async () => {
      logger.debug("Tool: qlc_blackout");

      try {
        // Blackout is typically /vc/blackout
        const result = await sendOsc(
          { path: "/vc/blackout", args: [1] },
          { dryRun: config.qlcDryRun },
          config
        );

        return {
          success: result.success,
          message: "Blackout triggered",
          status: config.qlcDryRun ? "dry_run" : "active",
        };
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to trigger blackout: ${err}`);
        return {
          success: false,
          error: `Failed to trigger blackout: ${err}`,
        };
      }
    },
  };
}

export function createPanicTool(config: Config): Tool {
  const logger = getLogger();

  return {
    name: "qlc_panic",
    description:
      "Trigger QLC+ panic mode (emergency stop - instantly kills all lighting). Use only in emergencies.",
    inputSchema: z.object({}),
    handler: async () => {
      logger.debug("Tool: qlc_panic");

      try {
        // Panic is typically /vc/panic
        const result = await sendOsc(
          { path: "/vc/panic", args: [1] },
          { dryRun: config.qlcDryRun },
          config
        );

        return {
          success: result.success,
          message: "PANIC triggered - all lights off immediately",
          status: config.qlcDryRun ? "dry_run" : "active",
          warning:
            "This is an emergency stop. All lighting has been killed immediately.",
        };
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to trigger panic: ${err}`);
        return {
          success: false,
          error: `Failed to trigger panic: ${err}`,
        };
      }
    },
  };
}

export function createSetColorWashTool(config: Config): Tool {
  const logger = getLogger();

  return {
    name: "qlc_set_color_wash",
    description:
      "Set a color wash using predefined colors (red, green, blue, amber, white, purple, cyan, magenta, yellow). Optionally specify DMX channels.",
    inputSchema: SetColorWashInputSchema,
    handler: async (input: any) => {
      logger.debug("Tool: qlc_set_color_wash", input);

      const { color, universe = 1, redChannel, greenChannel, blueChannel } =
        input;

      // Check if color is valid
      if (!(color in COLORS)) {
        const availableColors = Object.keys(COLORS);
        return {
          success: false,
          error: `Unknown color: "${color}"`,
          availableColors: availableColors,
        };
      }

      const { r, g, b } = COLORS[color];

      // If channels not specified, just set master to full (wash mode)
      if (!redChannel || !greenChannel || !blueChannel) {
        try {
          const result = await sendOsc(
            { path: "/vc/master", args: [1] },
            { dryRun: config.qlcDryRun },
            config
          );

          return {
            success: result.success,
            message: `Color wash applied (mode: master). For RGB control, specify redChannel, greenChannel, blueChannel.`,
            color: color,
            rgb: { r, g, b },
            hint: "Provide universe, redChannel, greenChannel, blueChannel for DMX RGB control",
          };
        } catch (error) {
          const err = error instanceof Error ? error.message : String(error);
          return {
            success: false,
            error: `Failed to apply color wash: ${err}`,
          };
        }
      }

      // Send RGB values to DMX
      try {
        const universeZeroBased = universe - 1;
        const messages = [
          {
            path: `/${universeZeroBased}/dmx/${redChannel - 1}`,
            args: [r],
          },
          {
            path: `/${universeZeroBased}/dmx/${greenChannel - 1}`,
            args: [g],
          },
          {
            path: `/${universeZeroBased}/dmx/${blueChannel - 1}`,
            args: [b],
          },
        ];

        const results = await sendOscBatch(
          messages,
          { dryRun: config.qlcDryRun },
          config
        );

        const allSuccess = results.every((r) => r.success);

        return {
          success: allSuccess,
          message: `Color wash applied: ${color} (R=${r}, G=${g}, B=${b})`,
          color: color,
          rgb: { r, g, b },
          channels: {
            red: redChannel,
            green: greenChannel,
            blue: blueChannel,
          },
          universe: universe,
        };
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to set color wash: ${err}`);
        return {
          success: false,
          error: `Failed to set color wash: ${err}`,
        };
      }
    },
  };
}
