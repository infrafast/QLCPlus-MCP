import { z } from "zod";
export const nullToUndefined = (value) => value === null ? undefined : value;
export const optionalString = () => z.preprocess(nullToUndefined, z.string().optional());
export const optionalNumber = () => z.preprocess(nullToUndefined, z.number().optional());
export const optionalBoolean = () => z.preprocess(nullToUndefined, z.boolean().optional());
export const optionalInt = (schema = z.number().int()) => z.preprocess(nullToUndefined, schema.optional());
// OSC Related Types
export const OscValueSchema = z.union([z.number(), z.string(), z.boolean()]);
export const OscMessageSchema = z.object({
    path: z.string(),
    args: z.array(OscValueSchema),
});
export const OscSendOptionsSchema = z.object({
    dryRun: optionalBoolean(),
    timeout: optionalNumber(),
});
// DMX Related Types
export const DmxValueSchema = z.union([
    z.number().min(0).max(255),
    z.number().min(0).max(1),
]);
export const DmxChannelSchema = z.object({
    universe: z.number().int().min(1),
    channel: z.number().int().min(1),
    value: z.number().min(0).max(255),
});
export const RgbColorSchema = z.object({
    r: z.number().min(0).max(255),
    g: z.number().min(0).max(255),
    b: z.number().min(0).max(255),
});
// Widget Related Types
export const WidgetTypeSchema = z.enum([
    "button",
    "slider",
    "speed",
    "cuelist",
    "chaser",
    "frame",
    "label",
    "unknown",
]);
export const WidgetMappingSchema = z.object({
    id: z.string(),
    name: z.string(),
    path: z.string(),
    type: WidgetTypeSchema,
    description: optionalString(),
    minValue: optionalNumber(),
    maxValue: optionalNumber(),
});
export const WidgetConfigSchema = z.object({
    widgets: z.array(WidgetMappingSchema),
    generated: optionalBoolean(),
    generatedAt: optionalString(),
});
// Tool Input Schemas
export const SendOscInputSchema = z.object({
    path: z.string().describe("OSC path"),
    args: z.array(OscValueSchema).describe("OSC arguments"),
    dryRun: optionalBoolean().describe("Dry run mode"),
    speaker: optionalString().describe("Optional recognized speaker name supplied by the voice agent; ignored by QLCPlus-MCP."),
});
export const ButtonPressInputSchema = z.object({
    widgetName: optionalString().describe("Logical widget name"),
    oscPath: optionalString().describe("Direct OSC path"),
    speaker: optionalString().describe("Optional recognized speaker name supplied by the voice agent; ignored by QLCPlus-MCP."),
});
export const CueListInputSchema = z.object({
    widgetName: optionalString().describe("Logical widget name"),
    oscPath: optionalString().describe("Direct OSC path"),
    speaker: optionalString().describe("Optional recognized speaker name supplied by the voice agent; ignored by QLCPlus-MCP."),
});
export const SetMasterInputSchema = z.object({
    value: z.number().min(0).max(1).describe("Master dimmer value (0-1 normalized)"),
});
//# sourceMappingURL=types.js.map