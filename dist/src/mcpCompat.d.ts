import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";
export interface ToolDefinition {
    name: string;
    description: string;
    schema: z.ZodTypeAny;
    cb: (input: unknown) => Promise<CallToolResult> | CallToolResult;
}
export declare function text(value: string): CallToolResult;
export declare function error(value: string): CallToolResult;
//# sourceMappingURL=mcpCompat.d.ts.map