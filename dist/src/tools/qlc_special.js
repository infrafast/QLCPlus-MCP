import { error, text } from "mcp-use/server";
import { sendOscBatch } from "../osc/oscClient.js";
import { getLogger } from "../logger.js";
import { SetColorWashInputSchema } from "../types.js";
// Predefined color mappings
const COLORS = {
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
export function createSetColorWashTool(config) {
    const logger = getLogger();
    return {
        name: "qlc_set_color_wash",
        description: "Set RGB color values through documented QLC+ DMX OSC paths using predefined colors. Requires explicit universe and RGB channel numbers.",
        schema: SetColorWashInputSchema,
        cb: async (input) => {
            logger.debug("Tool: qlc_set_color_wash", input);
            const { color, universe = 1, redChannel, greenChannel, blueChannel } = input;
            // Check if color is valid
            if (!(color in COLORS)) {
                const availableColors = Object.keys(COLORS);
                return error(`Unknown color: "${color}"`);
            }
            const { r, g, b } = COLORS[color];
            if (!redChannel || !greenChannel || !blueChannel) {
                return error("Color wash requires redChannel, greenChannel, and blueChannel. Generic Virtual Console master paths are not sent unless they are mapped as widgets.");
            }
            // Send RGB values to documented QLC+ DMX OSC paths
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
                const results = await sendOscBatch(messages, { dryRun: config.qlcDryRun }, config);
                const allSuccess = results.every((r) => r.success);
                return text(`Color wash applied: ${color} (R=${r}, G=${g}, B=${b})`);
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                logger.error(`Failed to set color wash: ${message}`);
                return error(`Failed to set color wash: ${message}`);
            }
        },
    };
}
//# sourceMappingURL=qlc_special.js.map