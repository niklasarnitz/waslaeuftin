import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useRefresh() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Refetch all queries that are active in the current screen context
      await queryClient.refetchQueries({ type: "active" });
    } catch (error) {
      console.error("Failed to refetch active queries", error);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  return { refreshing, onRefresh };
}
