import { z } from "zod";
import { type ToolDefinition } from "../mcpCompat.js";
export declare const ListWidgetsInputSchema: z.ZodObject<{
    type: z.ZodPreprocess<z.ZodOptional<z.ZodEnum<{
        unknown: "unknown";
        button: "button";
        slider: "slider";
        speed: "speed";
        cuelist: "cuelist";
        chaser: "chaser";
        frame: "frame";
        label: "label";
    }>>>;
    query: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    limit: z.ZodPreprocess<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare function createListWidgetsTool(): ToolDefinition;
//# sourceMappingURL=qlc_list_widgets.d.ts.map