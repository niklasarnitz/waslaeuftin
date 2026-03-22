export const CINEMA_BATCH_SIZE = 5;
export const BATCH_DELAY_MS = 500;

export const sleep = async (delayMs: number) => {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
};

export const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
  if (chunkSize <= 0) {
    throw new Error("chunkSize must be greater than 0");
  }

  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
};
