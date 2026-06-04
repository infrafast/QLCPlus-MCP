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
export const ColorMappingSchema = z.record(PredefinedColorsSchema, RgbColorSchema);
// Tool Input Schemas
export const SetDmxChannelInputSchema = z.object({
    universe: z.number().int().min(1).describe("DMX universe (1-based)"),
    channel: z.number().int().min(1).describe("DMX channel (1-based)"),
    value: z.union([z.number().min(0).max(255), z.number().min(0).max(1)]).describe("Value (0-255 or 0-1 normalized)"),
});
export const SetDmxRgbInputSchema = z.object({
    universe: z.number().int().min(1).describe("DMX universe"),
    redChannel: z.number().int().min(1).describe("Red channel"),
    greenChannel: z.number().int().min(1).describe("Green channel"),
    blueChannel: z.number().int().min(1).describe("Blue channel"),
    r: z.number().min(0).max(255).describe("Red value (0-255)"),
    g: z.number().min(0).max(255).describe("Green value (0-255)"),
    b: z.number().min(0).max(255).describe("Blue value (0-255)"),
});
export const SliderSetInputSchema = z.object({
    widgetName: optionalString().describe("Logical widget name"),
    oscPath: optionalString().describe("Direct OSC path"),
    value: z.number().min(0).max(1).describe("Slider value (0-1 normalized)"),
});
export const SendOscInputSchema = z.object({
    path: z.string().describe("OSC path"),
    args: z.array(OscValueSchema).describe("OSC arguments"),
    dryRun: optionalBoolean().describe("Dry run mode"),
});
export const LaunchSceneInputSchema = z.object({
    sceneName: z.string().describe("Scene name or logical widget name"),
});
export const ButtonPressInputSchema = z.object({
    widgetName: optionalString().describe("Logical widget name"),
    oscPath: optionalString().describe("Direct OSC path"),
    duration: optionalNumber().describe("Press duration in milliseconds"),
});
export const CueListInputSchema = z.object({
    widgetName: optionalString().describe("Logical widget name"),
    oscPath: optionalString().describe("Direct OSC path"),
});
export const SetMasterInputSchema = z.object({
    value: z.number().min(0).max(1).describe("Master dimmer value (0-1 normalized)"),
});
export const SetColorWashInputSchema = z.object({
    color: PredefinedColorsSchema.describe("Predefined color name"),
    universe: optionalInt(z.number().int().min(1)).describe("DMX universe"),
    redChannel: optionalInt(z.number().int().min(1)).describe("Red channel"),
    greenChannel: optionalInt(z.number().int().min(1)).describe("Green channel"),
    blueChannel: optionalInt(z.number().int().min(1)).describe("Blue channel"),
});
export const SetSpeedInputSchema = z.object({
    widgetName: optionalString().describe("Logical widget name"),
    oscPath: optionalString().describe("Direct OSC path"),
    bpm: z.number().min(1).describe("Speed in BPM"),
});
//# sourceMappingURL=types.js.map