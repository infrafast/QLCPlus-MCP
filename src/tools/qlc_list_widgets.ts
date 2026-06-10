import { z } from "zod";
import { text, type ToolDefinition } from "../mcpCompat.js";
import { getLogger } from "../logger.js";
import { listWidgets } from "../qlc/widgetResolver.js";
import { optionalInt, optionalString, nullToUndefined, WidgetTypeSchema } from "../types.js";

export const ListWidgetsInputSchema = z.object({
  type: z.preprocess(
    nullToUndefined,
    WidgetTypeSchema.optional(),
  ).describe("Only return widgets of this type."),
  query: optionalString().describe("Case-insensitive text filter on widget name or OSC path."),
  limit: optionalInt(z.number().int().min(1).max(200))
    .describe("Maximum number of widgets to return."),
});

export function createListWidgetsTool(): ToolDefinition {
  const logger = getLogger();

  return {
    name: "qlc_list_widgets",
    description:
      "List QLC+ widgets loaded from config/widgets.json, including logical names, OSC paths, types, and descriptions. Use this to discover available mapped widgets before controlling named QLC+ scenes or buttons.",
    schema: ListWidgetsInputSchema,
    cb: async (input: any) => {
      logger.debug("Tool: qlc_list_widgets", input);

      const query = typeof input?.query === "string" ? input.query.toLowerCase() : "";
      const type = input?.type;
      const limit = input?.limit ?? 100;

      const widgets = listWidgets()
        .filter((widget) => !type || widget.type === type)
        .filter((widget) => {
          if (!query) return true;
          return (
            widget.name.toLowerCase().includes(query) ||
            widget.path.toLowerCase().includes(query) ||
            widget.description?.toLowerCase().includes(query)
          );
        })
        .slice(0, limit);

      const payload = {
        count: widgets.length,
        widgets: widgets.map((widget) => ({
          id: widget.id,
          name: widget.name,
          path: widget.path,
          type: widget.type,
          description: widget.description,
          minValue: widget.minValue,
          maxValue: widget.maxValue,
        })),
      };

      return text(JSON.stringify(payload, null, 2));
    },
  };
}
