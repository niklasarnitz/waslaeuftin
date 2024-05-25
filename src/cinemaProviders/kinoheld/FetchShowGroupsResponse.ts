import { type ShowGroup } from "./ShowGroup";

export interface FetchShowGroupsResponse {
  showGroups: {
    paginatorInfo: {
      count: number;
      currentPage: number;
      firstItem: number | null;
      hasMorePages: boolean;
      lastItem: number | null;
      perPage: number;
      __typename: string;
    };
    data: ShowGroup[];
  };
}
