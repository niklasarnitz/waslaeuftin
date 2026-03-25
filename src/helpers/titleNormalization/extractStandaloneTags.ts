import { TAG_PATTERN } from "./TAG_PATTERN";

export const extractStandaloneTags = (title: string): string[] => {
    const tags: string[] = [];
    let match;

    const tagRegex = new RegExp(TAG_PATTERN.source, TAG_PATTERN.flags);

    while ((match = tagRegex.exec(title)) !== null) {
        if (!match[1]) continue;
        const tag = match[1];
        const beforeIndex = match.index - 1;
        const afterIndex = match.index + match[0].length;

        const isInsideBrackets = title.lastIndexOf("(", match.index) > title.lastIndexOf(")", match.index);

        if (!isInsideBrackets) {
            const isBoundary = (index: number) => index < 0 ||
                index >= title.length ||
                /[\s,/|;–—-]/.test(title[index]!);

            if (isBoundary(beforeIndex) && isBoundary(afterIndex)) {
                tags.push(tag);
            }
        }
    }

    return tags;
};
