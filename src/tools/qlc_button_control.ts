import { error, text, type ToolDefinition } from "../mcpCompat.js";
import { getLogger } from "../logger.js";
import { ButtonPressInputSchema } from "../types.js";
import { getNativeClient } from "../qlc/nativeClient.js";

export function createButtonPressTool(): ToolDefinition {
  const logger = getLogger();

  return {
    name: "qlc_button_press",
    description:
      "Press a QLC+ 5 Virtual Console button resolved from the current native project inventory. Use widgetName; legacy oscPath is no longer supported.",
    schema: ButtonPressInputSchema,
    cb: async (input: any) => {
      logger.debug("Tool: qlc_button_press", input);

      const { widgetName, oscPath } = input;
      if (!widgetName) {
        return error(
          oscPath
            ? "oscPath is no longer supported; provide the QLC+ button caption in widgetName."
            : "widgetName is required.",
        );
      }
      const client = getNativeClient();
      if (!client) return error("QLC+ native client is not initialized.");

      try {
        const widget = await client.pressButton(widgetName);
        return text(`Button press sent: ${widget.caption}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to press button: ${message}`);
        return error(`Failed to press button: ${message}`);
      }
    },
  };
}
