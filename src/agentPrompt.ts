import { readFile } from "fs/promises";
import path from "path";
import { text, type ToolDefinition } from "mcp-use/server";
import { z } from "zod";

export const PROMPT_RESOURCE_URI = "qlcplus://prompt/system";
export const PROMPT_NAME = "qlcplus_lighting_assistant";
export const PROMPT_TOOL_NAME = "get_agent_prompt";
export const PROMPT_FILE = process.env.MCP_PROMPT_FILE
  ? path.resolve(process.env.MCP_PROMPT_FILE)
  : path.resolve(process.cwd(), "PROMPT.md");

export async function readAgentPrompt(): Promise<string> {
  return readFile(PROMPT_FILE, "utf8");
}

export function registerAgentPrompt(server: any): void {
  server.prompt(
    {
      name: PROMPT_NAME,
      title: "QLCPlus Lighting Assistant",
      description: "Recommended system prompt for agents controlling QLC+ lighting through this MCP server.",
    },
    async () => {
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
    }
  );

  server.resource(
    {
      name: "QLCPlus MCP Agent Prompt",
      title: "QLCPlus Lighting Assistant Prompt",
      uri: PROMPT_RESOURCE_URI,
      description: "Contents of PROMPT.md for agents that inject MCP resources into model instructions.",
      mimeType: "text/markdown",
    },
    async () => {
      const prompt = await readAgentPrompt();
      return {
        contents: [
          {
            uri: PROMPT_RESOURCE_URI,
            mimeType: "text/markdown",
            text: prompt,
          },
        ],
      };
    }
  );
}

export function createAgentPromptTool(): ToolDefinition {
  return {
    name: PROMPT_TOOL_NAME,
    description:
      "Return the recommended system prompt for agents using QLCPlus-MCP. Use it to inject QLC+ lighting-specific safety rules, widget/scene guidance, and OSC/DMX constraints into the LLM context when the host supports that workflow.",
    schema: z.object({}),
    cb: async () => text(await readAgentPrompt()),
  };
}
