export const extractYear = (value: string) => {
  const yearMatch = /\b(19|20)\d{2}\b/.exec(value);

  return yearMatch ? Number(yearMatch[0]) : null;
};
