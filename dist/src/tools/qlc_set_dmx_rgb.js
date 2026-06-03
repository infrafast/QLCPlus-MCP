import { error, text } from "mcp-use/server";
import { sendOscBatch, validateDmxPath } from "../osc/oscClient.js";
import { getLogger } from "../logger.js";
import { SetDmxRgbInputSchema } from "../types.js";
export function createSetDmxRgbTool(config) {
    const logger = getLogger();
    return {
        name: "qlc_set_dmx_rgb",
        description: "Set RGB color values on DMX channels. Sends three consecutive OSC messages to set red, green, and blue channels.",
        schema: SetDmxRgbInputSchema,
        cb: async (input) => {
            logger.debug("Tool: qlc_set_dmx_rgb", input);
            const { universe, redChannel, greenChannel, blueChannel, r, g, b, } = input;
            try {
                // Validate all three channels
                const rPath = validateDmxPath(universe, redChannel);
                const gPath = validateDmxPath(universe, greenChannel);
                const bPath = validateDmxPath(universe, blueChannel);
                if (!rPath.valid || !gPath.valid || !bPath.valid) {
                    return error(`Invalid DMX coordinates. Universe must be >= 1, channels must be >= 1.`);
                }
                // Create OSC messages
                const messages = [
                    { path: rPath.path, args: [r] },
                    { path: gPath.path, args: [g] },
                    { path: bPath.path, args: [b] },
                ];
                // Send batch
                const results = await sendOscBatch(messages, { dryRun: config.qlcDryRun }, config);
                const allSuccess = results.every((r) => r.success);
                return text(`RGB color set: R=${r}, G=${g}, B=${b}`);
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                logger.error(`Failed to set RGB color: ${message}`);
                return error(`Failed to set RGB color: ${message}`);
            }
        },
    };
}
//# sourceMappingURL=qlc_set_dmx_rgb.js.map