import { readFile } from "fs/promises";
import path from "path";
import { text, type ToolDefinition } from "./mcpCompat.js";
import { z } from "zod";

export const PROMPT_RESOURCE_URI = "agent://prompt/system";
export const PROMPT_NAME = "agent_prompt";
export const PROMPT_TOOL_NAME = "get_agent_prompt";

function promptFilePath(): string {
  return process.env.MCP_PROMPT_FILE
    ? path.resolve(process.env.MCP_PROMPT_FILE)
    : path.resolve(process.cwd(), "PROMPT.md");
}

export async function readAgentPrompt(): Promise<string> {
  return readFile(promptFilePath(), "utf8");
}

function registerPromptName(server: any, name: string): void {
  server.prompt(
    {
      name,
      title: "QLCPlus Lighting Assistant",
      description:
        "Recommended system prompt for agents controlling QLC+ through its native protocol.",
    },
    async () => ({
      description:
        "Recommended system prompt for agents controlling QLC+ through its native protocol.",
      messages: [
        {
          role: "user",
          content: { type: "text", text: await readAgentPrompt() },
        },
      ],
    }),
  );
}

function registerPromptResource(server: any, uri: string): void {
  server.resource(
    {
      name: "QLCPlus MCP Agent Prompt",
      title: "QLCPlus Lighting Assistant Prompt",
      uri,
      description: "Contents of PROMPT.md for QLCPlus-MCP agents.",
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: await readAgentPrompt(),
        },
      ],
    }),
  );
}

export function registerAgentPrompt(server: any): void {
  registerPromptName(server, PROMPT_NAME);
  registerPromptResource(server, PROMPT_RESOURCE_URI);
}

export function createAgentPromptTool(): ToolDefinition {
  return {
    name: PROMPT_TOOL_NAME,
    description:
      "Return the recommended system prompt for agents using QLCPlus-MCP native QLC+ control.",
    schema: z.object({}),
    cb: async () => text(await readAgentPrompt()),
  };
}
