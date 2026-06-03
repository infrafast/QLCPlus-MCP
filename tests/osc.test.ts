import { describe, it, expect, beforeEach } from "vitest";
import { validateDmxPath, normalizeDmxValue, validateOscPath } from "../src/osc/oscClient";

describe("OSC Client Utils", () => {
  describe("validateDmxPath", () => {
    it("should generate correct DMX path from universe and channel", () => {
      const result = validateDmxPath(1, 1);
      expect(result.valid).toBe(true);
      expect(result.path).toBe("/0/dmx/0");
    });

    it("should convert 1-based universe to 0-based", () => {
      const result = validateDmxPath(4, 12);
      expect(result.valid).toBe(true);
      expect(result.path).toBe("/3/dmx/11");
    });

    it("should reject invalid universe (0)", () => {
      const result = validateDmxPath(0, 1);
      expect(result.valid).toBe(false);
    });

    it("should reject invalid channel (0)", () => {
      const result = validateDmxPath(1, 0);
      expect(result.valid).toBe(false);
    });
  });

  describe("normalizeDmxValue", () => {
    it("should accept values 0-255", () => {
      expect(normalizeDmxValue(0)).toBe(0);
      expect(normalizeDmxValue(128)).toBe(128);
      expect(normalizeDmxValue(255)).toBe(255);
    });

    it("should convert normalized 0-1 values", () => {
      expect(normalizeDmxValue(0.5)).toBe(128);
      expect(normalizeDmxValue(1)).toBe(255);
    });

    it("should reject values outside range", () => {
      expect(() => normalizeDmxValue(-1)).toThrow();
      expect(() => normalizeDmxValue(256)).toThrow();
    });
  });

  describe("validateOscPath", () => {
    it("should accept valid OSC paths", () => {
      expect(validateOscPath("/vc/blackout")).toBe(true);
      expect(validateOscPath("/0/dmx/0")).toBe(true);
      expect(validateOscPath("/vc/button/scene_intro")).toBe(true);
    });

    it("should reject paths without leading slash", () => {
      expect(validateOscPath("vc/blackout")).toBe(false);
    });

    it("should accept paths with hyphens and dots", () => {
      expect(validateOscPath("/vc/my-button.1")).toBe(true);
    });
  });
});
