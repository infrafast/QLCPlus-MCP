import { Tool } from "mcp-use";
import { sendOsc } from "../osc/oscClient.js";
import { resolveWidgetOrPath, findClosestMatches } from "../qlc/widgetResolver.js";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";
import { SliderSetInputSchema, SetSpeedInputSchema } from "../types.js";

export function createSliderSetTool(config: Config): Tool {
  const logger = getLogger();

  return {
    name: "qlc_slider_set",
    description:
      "Set a QLC+ slider value (0-1 normalized range). Specify either the logical widget name or direct OSC path.",
    inputSchema: SliderSetInputSchema,
    handler: async (input: any) => {
      logger.debug("Tool: qlc_slider_set", input);

      const { widgetName, oscPath, value } = input;

      if (value < 0 || value > 1) {
        return {
          success: false,
          error: `Invalid slider value: ${value}. Expected 0-1 (normalized).`,
        };
      }

      const resolution = resolveWidgetOrPath(widgetName, oscPath);

      if (!resolution.resolved) {
        const suggestions = widgetName
          ? findClosestMatches(widgetName, 3)
          : [];

        return {
          success: false,
          error: `Could not resolve widget. Name: "${widgetName}", Path: "${oscPath}"`,
          availableWidgets: suggestions.map((w) => ({
            name: w.name,
            path: w.path,
            type: w.type,
          })),
        };
      }

      try {
        const result = await sendOsc(
          { path: resolution.path, args: [value] },
          { dryRun: config.qlcDryRun },
          config
        );

        return {
          success: result.success,
          message: `Slider set to ${(value * 100).toFixed(1)}%`,
          widget: widgetName || "direct path",
          oscPath: resolution.path,
          value: value,
          percentage: value * 100,
        };
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to set slider: ${err}`);
        return {
          success: false,
          error: `Failed to set slider: ${err}`,
        };
      }
    },
  };
}

export function createSpeedSetTool(config: Config): Tool {
  const logger = getLogger();

  return {
    name: "qlc_speed_set",
    description:
      "Set the speed of a QLC+ speed dial or chase. Value should be in BPM (beats per minute).",
    inputSchema: SetSpeedInputSchema,
    handler: async (input: any) => {
      logger.debug("Tool: qlc_speed_set", input);

      const { widgetName, oscPath, bpm } = input;

      if (bpm < 1) {
        return {
          success: false,
          error: `Invalid BPM value: ${bpm}. Expected >= 1.`,
        };
      }

      const resolution = resolveWidgetOrPath(widgetName, oscPath);

      if (!resolution.resolved) {
        const suggestions = widgetName
          ? findClosestMatches(widgetName, 3)
          : [];

        return {
          success: false,
          error: `Could not resolve widget. Name: "${widgetName}", Path: "${oscPath}"`,
          availableWidgets: suggestions.map((w) => ({
            name: w.name,
            path: w.path,
            type: w.type,
          })),
        };
      }

      try {
        // Convert BPM to normalized value (0-1)
        // Typical range: 10-240 BPM maps to 0-1
        const normalizedSpeed = Math.min(1, Math.max(0, (bpm - 10) / (240 - 10)));

        const result = await sendOsc(
          { path: resolution.path, args: [normalizedSpeed] },
          { dryRun: config.qlcDryRun },
          config
        );

        return {
          success: result.success,
          message: `Speed set to ${bpm} BPM`,
          widget: widgetName || "direct path",
          oscPath: resolution.path,
          bpm: bpm,
          normalizedValue: normalizedSpeed,
        };
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to set speed: ${err}`);
        return {
          success: false,
          error: `Failed to set speed: ${err}`,
        };
      }
    },
  };
}
