import { z } from "zod";

export const nullToUndefined = (value: unknown) => value === null ? undefined : value;
export const optionalString = () => z.preprocess(nullToUndefined, z.string().optional());
export const optionalNumber = () => z.preprocess(nullToUndefined, z.number().optional());
export const optionalBoolean = () => z.preprocess(nullToUndefined, z.boolean().optional());
export const optionalInt = (schema: z.ZodNumber = z.number().int()) =>
  z.preprocess(nullToUndefined, schema.optional());

// OSC Related Types
export const OscValueSchema = z.union([z.number(), z.string(), z.boolean()]);
export type OscValue = z.infer<typeof OscValueSchema>;

export const OscMessageSchema = z.object({
  path: z.string(),
  args: z.array(OscValueSchema),
});
export type OscMessage = z.infer<typeof OscMessageSchema>;

export const OscSendOptionsSchema = z.object({
  dryRun: optionalBoolean(),
  timeout: optionalNumber(),
});
export type OscSendOptions = z.infer<typeof OscSendOptionsSchema>;

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
export type DmxChannel = z.infer<typeof DmxChannelSchema>;

export const RgbColorSchema = z.object({
  r: z.number().min(0).max(255),
  g: z.number().min(0).max(255),
  b: z.number().min(0).max(255),
});
export type RgbColor = z.infer<typeof RgbColorSchema>;

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
export type WidgetType = z.infer<typeof WidgetTypeSchema>;

export const WidgetMappingSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  type: WidgetTypeSchema,
  description: optionalString(),
  minValue: optionalNumber(),
  maxValue: optionalNumber(),
});
export type WidgetMapping = z.infer<typeof WidgetMappingSchema>;

export const WidgetConfigSchema = z.object({
  widgets: z.array(WidgetMappingSchema),
  generated: optionalBoolean(),
  generatedAt: optionalString(),
});
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;

// Tool Input Schemas
export const SendOscInputSchema = z.object({
  path: z.string().describe("OSC path"),
  args: z.array(OscValueSchema).describe("OSC arguments"),
  dryRun: optionalBoolean().describe("Dry run mode"),
  speaker: optionalString().describe("Optional recognized speaker name supplied by the voice agent; ignored by QLCPlus-MCP."),
});
export type SendOscInput = z.infer<typeof SendOscInputSchema>;

export const ButtonPressInputSchema = z.object({
  widgetName: optionalString().describe("Logical widget name"),
  oscPath: optionalString().describe("Direct OSC path"),
  speaker: optionalString().describe("Optional recognized speaker name supplied by the voice agent; ignored by QLCPlus-MCP."),
});
export type ButtonPressInput = z.infer<typeof ButtonPressInputSchema>;

export const CueListInputSchema = z.object({
  widgetName: optionalString().describe("Logical widget name"),
  oscPath: optionalString().describe("Direct OSC path"),
  speaker: optionalString().describe("Optional recognized speaker name supplied by the voice agent; ignored by QLCPlus-MCP."),
});
export type CueListInput = z.infer<typeof CueListInputSchema>;

export const SetMasterInputSchema = z.object({
  value: z.number().min(0).max(1).describe("Master dimmer value (0-1 normalized)"),
});
export type SetMasterInput = z.infer<typeof SetMasterInputSchema>;
