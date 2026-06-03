import { Tool } from "mcp-use";
import { sendOsc } from "../osc/oscClient.js";
import { resolveWidgetOrPath, findClosestMatches } from "../qlc/widgetResolver.js";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";
import { CueListInputSchema, LaunchSceneInputSchema } from "../types.js";
import { z } from "zod";

export function createCueListNextTool(config: Config): Tool {
  const logger = getLogger();

  return {
    name: "qlc_cuelist_next",
    description:
      "Advance to the next cue in a QLC+ Cue List widget. Specify either the logical widget name or direct OSC path.",
    inputSchema: CueListInputSchema,
    handler: async (input: any) => {
      logger.debug("Tool: qlc_cuelist_next", input);

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
        // Cue lists typically use specific values:
        // 1 = next, 2 = previous, 3 = stop, 4 = start
        const result = await sendOsc(
          { path: `${resolution.path}/next`, args: [1] },
          { dryRun: config.qlcDryRun },
          config
        );

        return {
          success: result.success,
          message: "Advanced to next cue",
          widget: widgetName || "direct path",
          oscPath: resolution.path,
        };
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to advance cue list: ${err}`);
        return {
          success: false,
          error: `Failed to advance cue list: ${err}`,
        };
      }
    },
  };
}

export function createCueListPreviousTool(config: Config): Tool {
  const logger = getLogger();

  return {
    name: "qlc_cuelist_previous",
    description:
      "Go to the previous cue in a QLC+ Cue List widget. Specify either the logical widget name or direct OSC path.",
    inputSchema: CueListInputSchema,
    handler: async (input: any) => {
      logger.debug("Tool: qlc_cuelist_previous", input);

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
        const result = await sendOsc(
          { path: `${resolution.path}/previous`, args: [1] },
          { dryRun: config.qlcDryRun },
          config
        );

        return {
          success: result.success,
          message: "Went to previous cue",
          widget: widgetName || "direct path",
          oscPath: resolution.path,
        };
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to go to previous cue: ${err}`);
        return {
          success: false,
          error: `Failed to go to previous cue: ${err}`,
        };
      }
    },
  };
}

export function createLaunchSceneTool(config: Config): Tool {
  const logger = getLogger();

  return {
    name: "qlc_launch_scene",
    description:
      "Launch a QLC+ scene by its logical name from the widget mappings. The scene must be configured in the widget mapping file.",
    inputSchema: LaunchSceneInputSchema,
    handler: async (input: any) => {
      logger.debug("Tool: qlc_launch_scene", input);

      const { sceneName } = input;

      const resolution = resolveWidgetOrPath(sceneName);

      if (!resolution.resolved) {
        const suggestions = findClosestMatches(sceneName, 5);

        return {
          success: false,
          error: `Scene "${sceneName}" not found in widget mappings.`,
          suggestions: suggestions.map((w) => ({
            name: w.name,
            path: w.path,
            type: w.type,
          })),
        };
      }

      try {
        // Send value 1 to launch the scene
        const result = await sendOsc(
          { path: resolution.path, args: [1] },
          { dryRun: config.qlcDryRun },
          config
        );

        return {
          success: result.success,
          message: `Scene "${sceneName}" launched`,
          scene: sceneName,
          oscPath: resolution.path,
        };
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to launch scene: ${err}`);
        return {
          success: false,
          error: `Failed to launch scene: ${err}`,
        };
      }
    },
  };
}
