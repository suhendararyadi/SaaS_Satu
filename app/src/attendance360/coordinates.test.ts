import { describe, expect, it } from "vitest";
import {
  formatCoordinatePair,
  mapsUrl,
  parseCoordinatePair,
  parseCoordinateValue,
  validateSchoolCoordinates,
} from "./coordinates";

describe("parseCoordinatePair", () => {
  it("reads a pair copied from a map", () => {
    expect(parseCoordinatePair("-7.200116595457873, 107.8887518789388")).toEqual({ latitude: -7.200116595457873, longitude: 107.8887518789388 });
  });

  it("accepts other common separators and wrappers", () => {
    const expected = { latitude: -7.2001, longitude: 107.8887 };
    for (const text of ["-7.2001,107.8887", "-7.2001 107.8887", "(-7.2001, 107.8887)", "[-7.2001; 107.8887]", "  -7.2001 ,  107.8887\n", "−7.2001, 107.8887"]) {
      expect(parseCoordinatePair(text), text).toEqual(expected);
    }
  });

  it("returns null instead of guessing", () => {
    for (const text of ["", "-7.2001", "-7.2001, 107.8887, 12", "lat, lng", "-7,2001 107,8887", "-7.2001, 107.8887abc", "91, 10", "10, 181", "7.2.1, 107"]) {
      expect(parseCoordinatePair(text), text).toBeNull();
    }
  });
});

describe("parseCoordinateValue", () => {
  it("parses plain decimals only", () => {
    expect(parseCoordinateValue(" -7.25 ")).toBe(-7.25);
    expect(parseCoordinateValue("107")).toBe(107);
    for (const text of ["", "-", "7,25", "1e3", "abc", "7.", ".5"]) expect(parseCoordinateValue(text), text).toBeNull();
  });
});

describe("validateSchoolCoordinates", () => {
  it("accepts a valid pair and an empty pair", () => {
    expect(validateSchoolCoordinates("-7.2001", "107.8887")).toEqual({ latitude: null, longitude: null });
    expect(validateSchoolCoordinates("", "")).toEqual({ latitude: null, longitude: null });
  });

  it("requires both fields once one is filled", () => {
    expect(validateSchoolCoordinates("-7.2", "").longitude).toBe("Longitude belum diisi.");
    expect(validateSchoolCoordinates("", "107.8").latitude).toBe("Latitude belum diisi.");
  });

  it("rejects non-numbers and out-of-range values with a clear message", () => {
    expect(validateSchoolCoordinates("abc", "107.8").latitude).toMatch(/antara -90 dan 90/);
    expect(validateSchoolCoordinates("-7.2", "999").longitude).toMatch(/antara -180 dan 180/);
  });

  it("hints at swapped order when latitude is out of range but longitude would fit", () => {
    expect(validateSchoolCoordinates("107.8887", "-7.2001").latitude).toMatch(/tertukar/);
  });
});

describe("formatting helpers", () => {
  it("formats a pair and a maps link", () => {
    expect(formatCoordinatePair(-7.2, 107.9)).toBe("-7.2, 107.9");
    expect(formatCoordinatePair(null, 107.9)).toBe("belum diatur");
    expect(mapsUrl(-7.2, 107.9)).toBe("https://www.google.com/maps?q=-7.2%2C107.9");
  });
});
