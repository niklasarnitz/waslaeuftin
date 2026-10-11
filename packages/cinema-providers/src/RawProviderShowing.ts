import type { MovieIdentityEvidence } from "@waslaeuftin/validators";

// ─── Public API ─────────────────────────────────────────────────────────────

export interface RawProviderShowing {
  cinemaId: number;
  movieName: string;
  dateTime: Date;
  bookingUrl?: string | null;
  showingAdditionalData?: string[] | null;
  provider?: string;
  providerFilmId?: string;
  evidence?: MovieIdentityEvidence;
}
