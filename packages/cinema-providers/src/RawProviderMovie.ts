import type { MovieIdentityEvidence } from "@waslaeuftin/validators";

export interface RawProviderMovie {
  cinemaId: number;
  name: string;
  provider?: string;
  providerFilmId?: string;
  evidence?: MovieIdentityEvidence;
}
