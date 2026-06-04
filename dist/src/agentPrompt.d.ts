import { type ToolDefinition } from "mcp-use/server";
export declare const PROMPT_RESOURCE_URI = "qlcplus://prompt/system";
export declare const PROMPT_NAME = "qlcplus_lighting_assistant";
export declare const PROMPT_TOOL_NAME = "qlc_get_agent_prompt";
export declare const PROMPT_FILE: string;
export declare function readAgentPrompt(): Promise<string>;
export declare function registerAgentPrompt(server: any): void;
export declare function createAgentPromptTool(): ToolDefinition;
//# sourceMappingURL=agentPrompt.d.ts.map