import { error, text } from "mcp-use/server";
import { sendOsc } from "../osc/oscClient.js";
import { resolveWidgetOrPath, findClosestMatches } from "../qlc/widgetResolver.js";
import { getLogger } from "../logger.js";
import { ButtonPressInputSchema } from "../types.js";
export function createButtonPressTool(config) {
    const logger = getLogger();
    return {
        name: "qlc_button_press",
        description: "Send a momentary button press to a QLC+ button widget. Specify either the logical widget name or direct OSC path.",
        schema: ButtonPressInputSchema,
        cb: async (input) => {
            logger.debug("Tool: qlc_button_press", input);
            const { widgetName, oscPath, duration = 100 } = input;
            const resolution = resolveWidgetOrPath(widgetName, oscPath);
            if (!resolution.resolved) {
                const suggestions = widgetName
                    ? findClosestMatches(widgetName, 3)
                    : [];
                return error(`Could not resolve widget. Name: "${widgetName}", Path: "${oscPath}"`);
            }
            try {
                // Press (value = 1)
                await sendOsc({ path: resolution.path, args: [1] }, { dryRun: config.qlcDryRun }, config);
                // Wait for duration
                await new Promise((resolve) => setTimeout(resolve, duration));
                // Release (value = 0)
                await sendOsc({ path: resolution.path, args: [0] }, { dryRun: config.qlcDryRun }, config);
                return text(`Button pressed for ${duration}ms`);
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                logger.error(`Failed to press button: ${message}`);
                return error(`Failed to press button: ${message}`);
            }
        },
    };
}
export function createButtonToggleTool(config) {
    const logger = getLogger();
    return {
        name: "qlc_button_toggle",
        description: "Toggle a QLC+ button widget between pressed and released states. Specify either the logical widget name or direct OSC path.",
        schema: ButtonPressInputSchema,
        cb: async (input) => {
            logger.debug("Tool: qlc_button_toggle", input);
            const { widgetName, oscPath } = input;
            const resolution = resolveWidgetOrPath(widgetName, oscPath);
            if (!resolution.resolved) {
                const suggestions = widgetName
                    ? findClosestMatches(widgetName, 3)
                    : [];
                return error(`Could not resolve widget. Name: "${widgetName}", Path: "${oscPath}"`);
            }
            try {
                // Toggle by sending value 1 (the button state toggles)
                const result = await sendOsc({ path: resolution.path, args: [1] }, { dryRun: config.qlcDryRun }, config);
                return text("Button state toggled");
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                logger.error(`Failed to toggle button: ${message}`);
                return error(`Failed to toggle button: ${message}`);
            }
        },
    };
}
//# sourceMappingURL=qlc_button_control.js.map