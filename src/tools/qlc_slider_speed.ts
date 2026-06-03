import { error, text, type ToolDefinition } from "mcp-use/server";
import { sendOsc } from "../osc/oscClient.js";
import { resolveWidgetOrPath, findClosestMatches } from "../qlc/widgetResolver.js";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";
import { SliderSetInputSchema, SetSpeedInputSchema } from "../types.js";

export function createSliderSetTool(config: Config): ToolDefinition {
  const logger = getLogger();

  return {
    name: "qlc_slider_set",
    description:
      "Set a QLC+ slider value (0-1 normalized range). Specify either the logical widget name or direct OSC path.",
    schema: SliderSetInputSchema,
    cb: async (input: any) => {
      logger.debug("Tool: qlc_slider_set", input);

      const { widgetName, oscPath, value } = input;

      if (value < 0 || value > 1) {
        return error(
          `Invalid slider value: ${value}. Expected 0-1 (normalized).`
        );
      }

      const resolution = resolveWidgetOrPath(widgetName, oscPath);

      if (!resolution.resolved) {
        const suggestions = widgetName
          ? findClosestMatches(widgetName, 3)
          : [];

        return error(
          `Could not resolve widget. Name: "${widgetName}", Path: "${oscPath}"`
        );
      }

      try {
        const result = await sendOsc(
          { path: resolution.path, args: [value] },
          { dryRun: config.qlcDryRun },
          config
        );

        return text(`Slider set to ${(value * 100).toFixed(1)}%`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to set slider: ${message}`);
        return error(`Failed to set slider: ${message}`);
      }
    },
  };
}

export function createSpeedSetTool(config: Config): ToolDefinition {
  const logger = getLogger();

  return {
    name: "qlc_speed_set",
    description:
      "Set the speed of a QLC+ speed dial or chase. Value should be in BPM (beats per minute).",
    schema: SetSpeedInputSchema,
    cb: async (input: any) => {
      logger.debug("Tool: qlc_speed_set", input);

      const { widgetName, oscPath, bpm } = input;

      if (bpm < 1) {
        return error(`Invalid BPM value: ${bpm}. Expected >= 1.`);
      }

      const resolution = resolveWidgetOrPath(widgetName, oscPath);

      if (!resolution.resolved) {
        const suggestions = widgetName
          ? findClosestMatches(widgetName, 3)
          : [];

        return error(
          `Could not resolve widget. Name: "${widgetName}", Path: "${oscPath}"`
        );
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

        return text(`Speed set to ${bpm} BPM`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to set speed: ${message}`);
        return error(`Failed to set speed: ${message}`);
      }
    },
  };
}
