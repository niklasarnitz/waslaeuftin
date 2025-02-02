import { headers } from "next/headers";

export const getPathName = async () => {
  const headerList = await headers();

  return headerList.get("x-current-path");
};
