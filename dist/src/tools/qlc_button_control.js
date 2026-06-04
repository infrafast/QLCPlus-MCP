import { error, text } from "mcp-use/server";
import { sendOsc } from "../osc/oscClient.js";
import { resolveWidgetOrPath, findClosestMatches } from "../qlc/widgetResolver.js";
import { getLogger } from "../logger.js";
import { ButtonPressInputSchema } from "../types.js";
export function createButtonPressTool(config) {
    const logger = getLogger();
    return {
        name: "qlc_button_press",
        description: "Trigger a QLC+ button widget by sending value 1 to its mapped OSC path. Specify either the logical widget name or direct OSC path.",
        schema: ButtonPressInputSchema,
        cb: async (input) => {
            logger.debug("Tool: qlc_button_press", input);
            const { widgetName, oscPath } = input;
            const resolution = resolveWidgetOrPath(widgetName, oscPath);
            if (!resolution.resolved) {
                const suggestions = widgetName
                    ? findClosestMatches(widgetName, 3)
                    : [];
                return error(`Could not resolve widget. Name: "${widgetName}", Path: "${oscPath}"`);
            }
            try {
                await sendOsc({ path: resolution.path, args: [1] }, { dryRun: config.qlcDryRun }, config);
                return text("Button press sent");
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                logger.error(`Failed to press button: ${message}`);
                return error(`Failed to press button: ${message}`);
            }
        },
    };
}
//# sourceMappingURL=qlc_button_control.js.map