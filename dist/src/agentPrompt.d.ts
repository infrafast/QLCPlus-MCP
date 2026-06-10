import { type ToolDefinition } from "./mcpCompat.js";
export declare const PROMPT_RESOURCE_URI = "agent://prompt/system";
export declare const PROMPT_NAME = "agent_prompt";
export declare const PROMPT_TOOL_NAME = "get_agent_prompt";
export declare const PROMPT_FILE: string;
export declare function readAgentPrompt(): Promise<string>;
export declare function registerAgentPrompt(server: any): void;
export declare function createAgentPromptTool(): ToolDefinition;
//# sourceMappingURL=agentPrompt.d.ts.map