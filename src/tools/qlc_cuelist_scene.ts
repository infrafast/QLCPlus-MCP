import { error, text, type ToolDefinition } from "mcp-use/server";
import { sendOsc } from "../osc/oscClient.js";
import { resolveWidgetOrPath, findClosestMatches } from "../qlc/widgetResolver.js";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";
import { LaunchSceneInputSchema } from "../types.js";

export function createLaunchSceneTool(config: Config): ToolDefinition {
  const logger = getLogger();

  return {
    name: "qlc_launch_scene",
    description:
      "Launch a QLC+ scene by its logical name from the widget mappings. The scene must be configured in the widget mapping file.",
    schema: LaunchSceneInputSchema,
    cb: async (input: any) => {
      logger.debug("Tool: qlc_launch_scene", input);

      const { sceneName } = input;

      const resolution = resolveWidgetOrPath(sceneName);

      if (!resolution.resolved) {
        const suggestions = findClosestMatches(sceneName, 5);

        return error(`Scene "${sceneName}" not found in widget mappings.`);
      }

      try {
        // Send value 1 to launch the scene
        const result = await sendOsc(
          { path: resolution.path, args: [1] },
          { dryRun: config.qlcDryRun },
          config
        );

        return text(`Scene "${sceneName}" launched`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to launch scene: ${message}`);
        return error(`Failed to launch scene: ${message}`);
      }
    },
  };
}
