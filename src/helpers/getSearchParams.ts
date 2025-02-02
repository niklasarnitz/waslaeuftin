import { headers } from "next/headers";

export const getSearchParams = async () => {
  const headerList = await headers();

  return Object.fromEntries(
    new URLSearchParams(headerList.get("x-search-params") ?? ""),
  );
};
