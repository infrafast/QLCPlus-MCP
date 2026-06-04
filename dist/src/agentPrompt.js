import { readFile } from "fs/promises";
import path from "path";
import { text } from "mcp-use/server";
import { z } from "zod";
export const PROMPT_RESOURCE_URI = "agent://prompt/system";
export const PROMPT_NAME = "agent_prompt";
export const LEGACY_PROMPT_RESOURCE_URI = "qlcplus://prompt/system";
export const LEGACY_PROMPT_NAME = "qlcplus_lighting_assistant";
export const PROMPT_TOOL_NAME = "get_agent_prompt";
export const PROMPT_FILE = process.env.MCP_PROMPT_FILE
    ? path.resolve(process.env.MCP_PROMPT_FILE)
    : path.resolve(process.cwd(), "PROMPT.md");
export async function readAgentPrompt() {
    return readFile(PROMPT_FILE, "utf8");
}
function registerPromptName(server, name) {
    server.prompt({
        name,
        title: "QLCPlus Lighting Assistant",
        description: "Recommended system prompt for agents controlling QLC+ lighting through this MCP server.",
    }, async () => {
        const prompt = await readAgentPrompt();
        return {
            description: "Recommended system prompt for agents controlling QLC+ lighting through this MCP server.",
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: prompt,
                    },
                },
            ],
        };
    });
}
function registerPromptResource(server, uri) {
    server.resource({
        name: "QLCPlus MCP Agent Prompt",
        title: "QLCPlus Lighting Assistant Prompt",
        uri,
        description: "Contents of PROMPT.md for agents that inject MCP resources into model instructions.",
        mimeType: "text/markdown",
    }, async () => {
        const prompt = await readAgentPrompt();
        return {
            contents: [
                {
                    uri,
                    mimeType: "text/markdown",
                    text: prompt,
                },
            ],
        };
    });
}
export function registerAgentPrompt(server) {
    registerPromptName(server, PROMPT_NAME);
    registerPromptName(server, LEGACY_PROMPT_NAME);
    registerPromptResource(server, PROMPT_RESOURCE_URI);
    registerPromptResource(server, LEGACY_PROMPT_RESOURCE_URI);
}
export function createAgentPromptTool() {
    return {
        name: PROMPT_TOOL_NAME,
        description: "Return the recommended system prompt for agents using QLCPlus-MCP. Use it to inject QLC+ lighting-specific safety rules, widget/scene guidance, and OSC/DMX constraints into the LLM context when the host supports that workflow.",
        schema: z.object({}),
        cb: async () => text(await readAgentPrompt()),
    };
}
//# sourceMappingURL=agentPrompt.js.map