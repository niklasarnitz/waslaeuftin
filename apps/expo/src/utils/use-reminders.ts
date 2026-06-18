import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { trackMobileEvent } from "@waslaeuftin/expo/utils/analytics";
import { trpc } from "@waslaeuftin/expo/utils/api";
import { useDeviceStore } from "@waslaeuftin/expo/utils/device";

export interface RememberableMovie {
  tmdbMovieId: number;
  title: string;
  posterPath: string | null;
}

/**
 * Device-scoped "Erinnerungen" (reminders) for upcoming movies. Exposes the
 * current list, a quick membership lookup, and a toggle that adds/removes a
 * reminder and refreshes the list.
 */
export const useReminders = () => {
  const deviceId = useDeviceStore((state) => state.deviceId);
  const queryClient = useQueryClient();

  const remindersQuery = useQuery(
    trpc.devices.getReminders.queryOptions(
      { deviceId: deviceId ?? "" },
      { enabled: !!deviceId },
    ),
  );

  const reminders = remindersQuery.data ?? [];
  const reminderIds = new Set(
    reminders.map((reminder) => reminder.tmdbMovieId),
  );

  const invalidate = () =>
    queryClient.invalidateQueries(
      trpc.devices.getReminders.queryFilter({ deviceId: deviceId ?? "" }),
    );

  const addReminder = useMutation(
    trpc.devices.addReminder.mutationOptions({ onSuccess: invalidate }),
  );
  const removeReminder = useMutation(
    trpc.devices.removeReminder.mutationOptions({ onSuccess: invalidate }),
  );

  const toggle = (movie: RememberableMovie) => {
    if (!deviceId) return;
    if (reminderIds.has(movie.tmdbMovieId)) {
      trackMobileEvent({
        name: "mobile-reminder-toggled",
        screen: "reminders",
        action: "remove",
        targetType: "movie",
      });
      removeReminder.mutate({ deviceId, tmdbMovieId: movie.tmdbMovieId });
    } else {
      trackMobileEvent({
        name: "mobile-reminder-toggled",
        screen: "upcoming",
        action: "add",
        targetType: "movie",
      });
      addReminder.mutate({
        deviceId,
        tmdbMovieId: movie.tmdbMovieId,
        title: movie.title,
        posterPath: movie.posterPath ?? undefined,
      });
    }
  };

  return {
    deviceId,
    reminders,
    reminderIds,
    isLoading: remindersQuery.isLoading,
    isReminded: (tmdbMovieId: number) => reminderIds.has(tmdbMovieId),
    toggle,
  };
};
