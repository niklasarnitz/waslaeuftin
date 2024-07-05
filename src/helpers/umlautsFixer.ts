export const umlautsFixer = (input: string) => {
  return decodeURIComponent(input);
};

export const encodeUmlauts = (input: string) => {
  return encodeURIComponent(input);
};
