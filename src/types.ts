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

// Predefined Colors
export const PredefinedColorsSchema = z.enum([
  "red",
  "green",
  "blue",
  "amber",
  "white",
  "purple",
  "cyan",
  "magenta",
  "yellow",
]);
export type PredefinedColor = z.infer<typeof PredefinedColorsSchema>;

export const ColorMappingSchema = z.record(
  PredefinedColorsSchema,
  RgbColorSchema
);
export type ColorMapping = z.infer<typeof ColorMappingSchema>;

// Tool Input Schemas
export const SetDmxChannelInputSchema = z.object({
  universe: z.number().int().min(1).describe("DMX universe (1-based)"),
  channel: z.number().int().min(1).describe("DMX channel (1-based)"),
  value: z.union([z.number().min(0).max(255), z.number().min(0).max(1)]).describe("Value (0-255 or 0-1 normalized)"),
});
export type SetDmxChannelInput = z.infer<typeof SetDmxChannelInputSchema>;

export const SetDmxRgbInputSchema = z.object({
  universe: z.number().int().min(1).describe("DMX universe"),
  redChannel: z.number().int().min(1).describe("Red channel"),
  greenChannel: z.number().int().min(1).describe("Green channel"),
  blueChannel: z.number().int().min(1).describe("Blue channel"),
  r: z.number().min(0).max(255).describe("Red value (0-255)"),
  g: z.number().min(0).max(255).describe("Green value (0-255)"),
  b: z.number().min(0).max(255).describe("Blue value (0-255)"),
});
export type SetDmxRgbInput = z.infer<typeof SetDmxRgbInputSchema>;

export const SliderSetInputSchema = z.object({
  widgetName: optionalString().describe("Logical widget name"),
  oscPath: optionalString().describe("Direct OSC path"),
  value: z.number().min(0).max(1).describe("Slider value (0-1 normalized)"),
});
export type SliderSetInput = z.infer<typeof SliderSetInputSchema>;

export const SendOscInputSchema = z.object({
  path: z.string().describe("OSC path"),
  args: z.array(OscValueSchema).describe("OSC arguments"),
  dryRun: optionalBoolean().describe("Dry run mode"),
});
export type SendOscInput = z.infer<typeof SendOscInputSchema>;

export const LaunchSceneInputSchema = z.object({
  sceneName: z.string().describe("Scene name or logical widget name"),
});
export type LaunchSceneInput = z.infer<typeof LaunchSceneInputSchema>;

export const ButtonPressInputSchema = z.object({
  widgetName: optionalString().describe("Logical widget name"),
  oscPath: optionalString().describe("Direct OSC path"),
});
export type ButtonPressInput = z.infer<typeof ButtonPressInputSchema>;

export const CueListInputSchema = z.object({
  widgetName: optionalString().describe("Logical widget name"),
  oscPath: optionalString().describe("Direct OSC path"),
});
export type CueListInput = z.infer<typeof CueListInputSchema>;

export const SetMasterInputSchema = z.object({
  value: z.number().min(0).max(1).describe("Master dimmer value (0-1 normalized)"),
});
export type SetMasterInput = z.infer<typeof SetMasterInputSchema>;

export const SetColorWashInputSchema = z.object({
  color: PredefinedColorsSchema.describe("Predefined color name"),
  universe: optionalInt(z.number().int().min(1)).describe("DMX universe"),
  redChannel: optionalInt(z.number().int().min(1)).describe("Red channel"),
  greenChannel: optionalInt(z.number().int().min(1)).describe("Green channel"),
  blueChannel: optionalInt(z.number().int().min(1)).describe("Blue channel"),
});
export type SetColorWashInput = z.infer<typeof SetColorWashInputSchema>;

export const SetSpeedInputSchema = z.object({
  widgetName: optionalString().describe("Logical widget name"),
  oscPath: optionalString().describe("Direct OSC path"),
  bpm: z.number().min(1).describe("Speed in BPM"),
});
export type SetSpeedInput = z.infer<typeof SetSpeedInputSchema>;
