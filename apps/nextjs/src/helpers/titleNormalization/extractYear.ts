export const extractYear = (value: string) => {
    const yearMatch = value.match(/\b(19|20)\d{2}\b/);

    return yearMatch ? Number(yearMatch[0]) : null;
};
