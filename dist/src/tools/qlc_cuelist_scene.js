import { error, text } from "mcp-use/server";
import { sendOsc } from "../osc/oscClient.js";
import { resolveWidgetOrPath, findClosestMatches } from "../qlc/widgetResolver.js";
import { getLogger } from "../logger.js";
import { CueListInputSchema, LaunchSceneInputSchema } from "../types.js";
export function createCueListNextTool(config) {
    const logger = getLogger();
    return {
        name: "qlc_cuelist_next",
        description: "Advance to the next cue in a QLC+ Cue List widget. Specify either the logical widget name or direct OSC path.",
        schema: CueListInputSchema,
        cb: async (input) => {
            logger.debug("Tool: qlc_cuelist_next", input);
            const { widgetName, oscPath } = input;
            const resolution = resolveWidgetOrPath(widgetName, oscPath);
            if (!resolution.resolved) {
                const suggestions = widgetName
                    ? findClosestMatches(widgetName, 3)
                    : [];
                return error(`Could not resolve widget. Name: "${widgetName}", Path: "${oscPath}"`);
            }
            try {
                // Cue lists typically use specific values:
                // 1 = next, 2 = previous, 3 = stop, 4 = start
                const result = await sendOsc({ path: `${resolution.path}/next`, args: [1] }, { dryRun: config.qlcDryRun }, config);
                return text("Advanced to next cue");
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                logger.error(`Failed to advance cue list: ${message}`);
                return error(`Failed to advance cue list: ${message}`);
            }
        },
    };
}
export function createCueListPreviousTool(config) {
    const logger = getLogger();
    return {
        name: "qlc_cuelist_previous",
        description: "Go to the previous cue in a QLC+ Cue List widget. Specify either the logical widget name or direct OSC path.",
        schema: CueListInputSchema,
        cb: async (input) => {
            logger.debug("Tool: qlc_cuelist_previous", input);
            const { widgetName, oscPath } = input;
            const resolution = resolveWidgetOrPath(widgetName, oscPath);
            if (!resolution.resolved) {
                const suggestions = widgetName
                    ? findClosestMatches(widgetName, 3)
                    : [];
                return error(`Could not resolve widget. Name: "${widgetName}", Path: "${oscPath}"`);
            }
            try {
                const result = await sendOsc({ path: `${resolution.path}/previous`, args: [1] }, { dryRun: config.qlcDryRun }, config);
                return text("Went to previous cue");
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                logger.error(`Failed to go to previous cue: ${message}`);
                return error(`Failed to go to previous cue: ${message}`);
            }
        },
    };
}
export function createLaunchSceneTool(config) {
    const logger = getLogger();
    return {
        name: "qlc_launch_scene",
        description: "Launch a QLC+ scene by its logical name from the widget mappings. The scene must be configured in the widget mapping file.",
        schema: LaunchSceneInputSchema,
        cb: async (input) => {
            logger.debug("Tool: qlc_launch_scene", input);
            const { sceneName } = input;
            const resolution = resolveWidgetOrPath(sceneName);
            if (!resolution.resolved) {
                const suggestions = findClosestMatches(sceneName, 5);
                return error(`Scene "${sceneName}" not found in widget mappings.`);
            }
            try {
                // Send value 1 to launch the scene
                const result = await sendOsc({ path: resolution.path, args: [1] }, { dryRun: config.qlcDryRun }, config);
                return text(`Scene "${sceneName}" launched`);
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                logger.error(`Failed to launch scene: ${message}`);
                return error(`Failed to launch scene: ${message}`);
            }
        },
    };
}
//# sourceMappingURL=qlc_cuelist_scene.js.map