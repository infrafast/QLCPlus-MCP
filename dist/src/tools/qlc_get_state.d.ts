import { z } from "zod";
import { type ToolDefinition } from "../mcpCompat.js";
export declare const GetStateInputSchema: z.ZodObject<{
    freshnessSeconds: z.ZodPreprocess<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare function createGetStateTool(): ToolDefinition;
//# sourceMappingURL=qlc_get_state.d.ts.map