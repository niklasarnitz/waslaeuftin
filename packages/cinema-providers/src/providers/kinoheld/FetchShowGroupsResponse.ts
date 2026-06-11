import { type ShowGroup } from "@waslaeuftin/cinema-providers/internal/providers/kinoheld/ShowGroup";

export interface FetchShowGroupsResponse {
  showGroups: {
    paginatorInfo: {
      count: number;
      currentPage: number;
      firstItem: number | null;
      hasMorePages: boolean;
      lastItem: number | null;
      perPage: number;
    };
    data: ShowGroup[];
  };
}
