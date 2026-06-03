import { z } from "zod";
export declare const OscValueSchema: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodBoolean]>;
export type OscValue = z.infer<typeof OscValueSchema>;
export declare const OscMessageSchema: z.ZodObject<{
    path: z.ZodString;
    args: z.ZodArray<z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodBoolean]>>;
}, z.core.$strip>;
export type OscMessage = z.infer<typeof OscMessageSchema>;
export declare const OscSendOptionsSchema: z.ZodObject<{
    dryRun: z.ZodOptional<z.ZodBoolean>;
    timeout: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type OscSendOptions = z.infer<typeof OscSendOptionsSchema>;
export declare const DmxValueSchema: z.ZodUnion<readonly [z.ZodNumber, z.ZodNumber]>;
export declare const DmxChannelSchema: z.ZodObject<{
    universe: z.ZodNumber;
    channel: z.ZodNumber;
    value: z.ZodNumber;
}, z.core.$strip>;
export type DmxChannel = z.infer<typeof DmxChannelSchema>;
export declare const RgbColorSchema: z.ZodObject<{
    r: z.ZodNumber;
    g: z.ZodNumber;
    b: z.ZodNumber;
}, z.core.$strip>;
export type RgbColor = z.infer<typeof RgbColorSchema>;
export declare const WidgetTypeSchema: z.ZodEnum<{
    unknown: "unknown";
    button: "button";
    slider: "slider";
    speed: "speed";
    cuelist: "cuelist";
    chaser: "chaser";
    frame: "frame";
    label: "label";
}>;
export type WidgetType = z.infer<typeof WidgetTypeSchema>;
export declare const WidgetMappingSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    path: z.ZodString;
    type: z.ZodEnum<{
        unknown: "unknown";
        button: "button";
        slider: "slider";
        speed: "speed";
        cuelist: "cuelist";
        chaser: "chaser";
        frame: "frame";
        label: "label";
    }>;
    description: z.ZodOptional<z.ZodString>;
    minValue: z.ZodOptional<z.ZodNumber>;
    maxValue: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type WidgetMapping = z.infer<typeof WidgetMappingSchema>;
export declare const WidgetConfigSchema: z.ZodObject<{
    widgets: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        path: z.ZodString;
        type: z.ZodEnum<{
            unknown: "unknown";
            button: "button";
            slider: "slider";
            speed: "speed";
            cuelist: "cuelist";
            chaser: "chaser";
            frame: "frame";
            label: "label";
        }>;
        description: z.ZodOptional<z.ZodString>;
        minValue: z.ZodOptional<z.ZodNumber>;
        maxValue: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    generated: z.ZodOptional<z.ZodBoolean>;
    generatedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;
export declare const PredefinedColorsSchema: z.ZodEnum<{
    red: "red";
    green: "green";
    blue: "blue";
    amber: "amber";
    white: "white";
    purple: "purple";
    cyan: "cyan";
    magenta: "magenta";
    yellow: "yellow";
}>;
export type PredefinedColor = z.infer<typeof PredefinedColorsSchema>;
export declare const ColorMappingSchema: z.ZodRecord<z.ZodEnum<{
    red: "red";
    green: "green";
    blue: "blue";
    amber: "amber";
    white: "white";
    purple: "purple";
    cyan: "cyan";
    magenta: "magenta";
    yellow: "yellow";
}>, z.ZodObject<{
    r: z.ZodNumber;
    g: z.ZodNumber;
    b: z.ZodNumber;
}, z.core.$strip>>;
export type ColorMapping = z.infer<typeof ColorMappingSchema>;
export declare const SetDmxChannelInputSchema: z.ZodObject<{
    universe: z.ZodNumber;
    channel: z.ZodNumber;
    value: z.ZodUnion<readonly [z.ZodNumber, z.ZodNumber]>;
}, z.core.$strip>;
export type SetDmxChannelInput = z.infer<typeof SetDmxChannelInputSchema>;
export declare const SetDmxRgbInputSchema: z.ZodObject<{
    universe: z.ZodNumber;
    redChannel: z.ZodNumber;
    greenChannel: z.ZodNumber;
    blueChannel: z.ZodNumber;
    r: z.ZodNumber;
    g: z.ZodNumber;
    b: z.ZodNumber;
}, z.core.$strip>;
export type SetDmxRgbInput = z.infer<typeof SetDmxRgbInputSchema>;
export declare const SliderSetInputSchema: z.ZodObject<{
    widgetName: z.ZodOptional<z.ZodString>;
    oscPath: z.ZodOptional<z.ZodString>;
    value: z.ZodNumber;
}, z.core.$strip>;
export type SliderSetInput = z.infer<typeof SliderSetInputSchema>;
export declare const SendOscInputSchema: z.ZodObject<{
    path: z.ZodString;
    args: z.ZodArray<z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodBoolean]>>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type SendOscInput = z.infer<typeof SendOscInputSchema>;
export declare const LaunchSceneInputSchema: z.ZodObject<{
    sceneName: z.ZodString;
}, z.core.$strip>;
export type LaunchSceneInput = z.infer<typeof LaunchSceneInputSchema>;
export declare const ButtonPressInputSchema: z.ZodObject<{
    widgetName: z.ZodOptional<z.ZodString>;
    oscPath: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type ButtonPressInput = z.infer<typeof ButtonPressInputSchema>;
export declare const CueListInputSchema: z.ZodObject<{
    widgetName: z.ZodOptional<z.ZodString>;
    oscPath: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CueListInput = z.infer<typeof CueListInputSchema>;
export declare const SetMasterInputSchema: z.ZodObject<{
    value: z.ZodNumber;
}, z.core.$strip>;
export type SetMasterInput = z.infer<typeof SetMasterInputSchema>;
export declare const SetColorWashInputSchema: z.ZodObject<{
    color: z.ZodEnum<{
        red: "red";
        green: "green";
        blue: "blue";
        amber: "amber";
        white: "white";
        purple: "purple";
        cyan: "cyan";
        magenta: "magenta";
        yellow: "yellow";
    }>;
    universe: z.ZodOptional<z.ZodNumber>;
    redChannel: z.ZodOptional<z.ZodNumber>;
    greenChannel: z.ZodOptional<z.ZodNumber>;
    blueChannel: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type SetColorWashInput = z.infer<typeof SetColorWashInputSchema>;
export declare const SetSpeedInputSchema: z.ZodObject<{
    widgetName: z.ZodOptional<z.ZodString>;
    oscPath: z.ZodOptional<z.ZodString>;
    bpm: z.ZodNumber;
}, z.core.$strip>;
export type SetSpeedInput = z.infer<typeof SetSpeedInputSchema>;
//# sourceMappingURL=types.d.ts.map