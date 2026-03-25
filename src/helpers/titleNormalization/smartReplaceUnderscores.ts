export const smartReplaceUnderscores = (str: string): string => {
    if (!str.includes("_")) return str;

    const spaces = (str.match(/ /g) || []).length;
    const underscores = (str.match(/_/g) || []).length;

    // Wenn der String stark von Unterstrichen dominiert wird (Dateinamen-/URL-Stil)
    if (underscores > spaces) {
        return str
            .replace(/_-_/g, " - ") // Behandle _-_ als Bindestrich
            .replace(/([a-zA-Z0-9äöüÄÖÜß])_([a-zA-Z0-9äöüÄÖÜß])/g, "$1 $2") // Wörter trennen
            .replace(/_/g, " ") // Restliche Kanten-Unterstriche killen
            .trim();
    }
    return str;
};
