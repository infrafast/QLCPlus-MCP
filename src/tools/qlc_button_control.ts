import { Tool } from "mcp-use";
import { sendOsc } from "../osc/oscClient.js";
import { resolveWidgetOrPath, findClosestMatches } from "../qlc/widgetResolver.js";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";
import { ButtonPressInputSchema } from "../types.js";

export function createButtonPressTool(config: Config): Tool {
  const logger = getLogger();

  return {
    name: "qlc_button_press",
    description:
      "Send a momentary button press to a QLC+ button widget. Specify either the logical widget name or direct OSC path.",
    inputSchema: ButtonPressInputSchema,
    handler: async (input: any) => {
      logger.debug("Tool: qlc_button_press", input);

      const { widgetName, oscPath, duration = 100 } = input;

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
        // Press (value = 1)
        await sendOsc(
          { path: resolution.path, args: [1] },
          { dryRun: config.qlcDryRun },
          config
        );

        // Wait for duration
        await new Promise((resolve) => setTimeout(resolve, duration));

        // Release (value = 0)
        await sendOsc(
          { path: resolution.path, args: [0] },
          { dryRun: config.qlcDryRun },
          config
        );

        return {
          success: true,
          message: `Button pressed for ${duration}ms`,
          widget: widgetName || "direct path",
          oscPath: resolution.path,
          duration,
        };
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to press button: ${err}`);
        return {
          success: false,
          error: `Failed to press button: ${err}`,
        };
      }
    },
  };
}

export function createButtonToggleTool(config: Config): Tool {
  const logger = getLogger();

  return {
    name: "qlc_button_toggle",
    description:
      "Toggle a QLC+ button widget between pressed and released states. Specify either the logical widget name or direct OSC path.",
    inputSchema: ButtonPressInputSchema,
    handler: async (input: any) => {
      logger.debug("Tool: qlc_button_toggle", input);

      const { widgetName, oscPath } = input;
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
        // Toggle by sending value 1 (the button state toggles)
        const result = await sendOsc(
          { path: resolution.path, args: [1] },
          { dryRun: config.qlcDryRun },
          config
        );

        return {
          success: result.success,
          message: "Button state toggled",
          widget: widgetName || "direct path",
          oscPath: resolution.path,
        };
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to toggle button: ${err}`);
        return {
          success: false,
          error: `Failed to toggle button: ${err}`,
        };
      }
    },
  };
}
