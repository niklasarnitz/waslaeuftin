import { expect, test, describe } from "bun:test";
import { smartReplaceUnderscores } from "../../../src/helpers/titleNormalization/smartReplaceUnderscores";

describe("smartReplaceUnderscores", () => {
    test("returns string unmodified if there are no underscores", () => {
        expect(smartReplaceUnderscores("hello world")).toBe("hello world");
        expect(smartReplaceUnderscores("")).toBe("");
        expect(smartReplaceUnderscores("no-underscores-here")).toBe("no-underscores-here");
    });

    test("returns string unmodified if spaces are equal to or greater than underscores", () => {
        expect(smartReplaceUnderscores("hello_world with more spaces")).toBe("hello_world with more spaces");
        expect(smartReplaceUnderscores("equal_ spaces ")).toBe("equal_ spaces ");
        expect(smartReplaceUnderscores("a_ b")).toBe("a_ b");
    });

    test("replaces _-_ with spaced hyphen", () => {
        expect(smartReplaceUnderscores("the_movie_title_-_director's_cut")).toBe("the movie title - director's cut");
        expect(smartReplaceUnderscores("foo_-_bar")).toBe("foo - bar");
    });

    test("replaces underscores between alphanumeric characters and umlauts with spaces", () => {
        expect(smartReplaceUnderscores("hello_world")).toBe("hello world");
        expect(smartReplaceUnderscores("müller_lüdenscheidt_123")).toBe("müller lüdenscheidt 123");
        expect(smartReplaceUnderscores("ÄÖÜ_äöü_ß")).toBe("ÄÖÜ äöü ß");
    });

    test("replaces other underscores and trims the result", () => {
        expect(smartReplaceUnderscores("_leading_and_trailing_")).toBe("leading and trailing");
        expect(smartReplaceUnderscores("multiple___underscores")).toBe("multiple   underscores");
        expect(smartReplaceUnderscores("___")).toBe("");
    });
});
