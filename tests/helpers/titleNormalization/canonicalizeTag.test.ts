import { expect, test, describe } from "bun:test";
import { canonicalizeTag } from "@waslaeuftin/helpers/titleNormalization/canonicalizeTag";

describe("canonicalizeTag", () => {
    test("Basic string cleaning (trimming, handling auf prefix)", () => {
        expect(canonicalizeTag("   SOME TAG   ")).toBe("SOME TAG");
        expect(canonicalizeTag("some   tag")).toBe("some   tag"); // cleaned retains spaces if not mapped
    });

    test("Standard mappings (internal normalization handles spaces)", () => {
        expect(canonicalizeTag("ov")).toBe("OV");
        expect(canonicalizeTag("omu")).toBe("OmU");
        expect(canonicalizeTag("omeu")).toBe("OmEU");
        expect(canonicalizeTag("2d")).toBe("2D");
        expect(canonicalizeTag("3d")).toBe("3D");
        expect(canonicalizeTag("imax")).toBe("IMAX");
        expect(canonicalizeTag("dolby")).toBe("Dolby");
        expect(canonicalizeTag("dolby   atmos")).toBe("Dolby Atmos"); // "dolby atmos" is in map, normalized collapses spaces
        expect(canonicalizeTag("preview")).toBe("Preview");
        expect(canonicalizeTag("sneak")).toBe("Sneak");
        expect(canonicalizeTag("english")).toBe("English");
        expect(canonicalizeTag("englisch")).toBe("English");
        expect(canonicalizeTag("engl.")).toBe("English");
        expect(canonicalizeTag("70mm")).toBe("70mm");
        expect(canonicalizeTag("35mm")).toBe("35mm");
        expect(canonicalizeTag("4k")).toBe("4K");
        expect(canonicalizeTag("hfr")).toBe("HFR");
        expect(canonicalizeTag("screenx")).toBe("ScreenX");
        expect(canonicalizeTag("4dx")).toBe("4DX");
        expect(canonicalizeTag("laser")).toBe("Laser");
        expect(canonicalizeTag("ukrainisch")).toBe("Ukrainisch");
        expect(canonicalizeTag("ukrainische fassung")).toBe("Ukrainisch");
    });

    test('Removing the "auf " prefix', () => {
        expect(canonicalizeTag("auf englisch")).toBe("English");
        expect(canonicalizeTag("auf   english")).toBe("English");
        expect(canonicalizeTag("auf ukrainisch")).toBe("Ukrainisch");
        expect(canonicalizeTag("Auf arab.")).toBe("Arabisch");
        expect(canonicalizeTag("AUF spanisch")).toBe("spanisch");
    });

    test('Special case for "CineStricken"', () => {
        expect(canonicalizeTag("cinestricken")).toBe("CineStricken");
        expect(canonicalizeTag("cinestricken etwas")).toBe("CineStricken etwas");
        expect(canonicalizeTag("Cinestricken etwas anders")).toBe("CineStricken etwas anders");
    });

    test("Fallback to the cleaned string when no mapping or special case matches", () => {
        expect(canonicalizeTag("Unknown Tag")).toBe("Unknown Tag");
        expect(canonicalizeTag("random   123")).toBe("random   123");
    });
});
