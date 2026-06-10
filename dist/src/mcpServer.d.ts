import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { type Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolDefinition } from "./mcpCompat.js";
export declare function toolSummaries(tools: ToolDefinition[]): Tool[];
export declare function resourceSummaries(): {
    uri: string;
    name: string;
    title: string;
    description: string;
    mimeType: string;
}[];
export declare function createQlcMcpServer(tools: ToolDefinition[]): Server;
//# sourceMappingURL=mcpServer.d.ts.map