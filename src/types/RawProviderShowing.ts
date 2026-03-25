// ─── Public API ─────────────────────────────────────────────────────────────

export type RawProviderShowing = {
    cinemaId: number;
    movieName: string;
    dateTime: Date;
    bookingUrl?: string | null;
    showingAdditionalData?: string[] | null;
};
