import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, GetPromptRequestSchema, ListPromptsRequestSchema, ListResourcesRequestSchema, ListResourceTemplatesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { PROMPT_NAME, PROMPT_RESOURCE_URI, readAgentPrompt, } from "./agentPrompt.js";
function toolInputSchema(tool) {
    const schema = z.toJSONSchema(tool.schema);
    delete schema.$schema;
    return schema;
}
export function toolSummaries(tools) {
    return tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: toolInputSchema(tool),
    }));
}
export function resourceSummaries() {
    return [
        {
            uri: PROMPT_RESOURCE_URI,
            name: "QLCPlus MCP Agent Prompt",
            title: "QLCPlus Lighting Assistant Prompt",
            description: "Contents of PROMPT.md for agents that inject MCP resources into model instructions.",
            mimeType: "text/markdown",
        },
    ];
}
export function createQlcMcpServer(tools) {
    const server = new Server({
        name: "qlcplus-mcp",
        version: "1.0.0",
    }, {
        capabilities: {
            tools: {},
            prompts: {},
            resources: {},
        },
    });
    server.setRequestHandler(ListPromptsRequestSchema, async () => ({
        prompts: [
            {
                name: PROMPT_NAME,
                title: "QLCPlus Lighting Assistant",
                description: "Recommended system prompt for agents controlling QLC+ lighting through this MCP server.",
            },
        ],
    }));
    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
        if (request.params.name !== PROMPT_NAME) {
            throw new Error(`Unknown prompt: ${request.params.name}`);
        }
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
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
        resources: resourceSummaries(),
    }));
    server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
        resourceTemplates: [],
    }));
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        if (request.params.uri !== PROMPT_RESOURCE_URI) {
            throw new Error(`Unknown resource: ${request.params.uri}`);
        }
        const prompt = await readAgentPrompt();
        return {
            contents: [
                {
                    uri: request.params.uri,
                    mimeType: "text/markdown",
                    text: prompt,
                },
            ],
        };
    });
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: toolSummaries(tools),
    }));
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const tool = tools.find((item) => item.name === request.params.name);
        if (!tool) {
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
        const parsed = tool.schema.safeParse(request.params.arguments ?? {});
        if (!parsed.success) {
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Invalid arguments for ${tool.name}: ${parsed.error.message}`,
                    },
                ],
            };
        }
        return await tool.cb(parsed.data);
    });
    return server;
}
//# sourceMappingURL=mcpServer.js.map