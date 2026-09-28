"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { isAuthorizedAdmin } from "@waslaeuftin/helpers/adminAuth";
import { startProviderUpdates } from "@waslaeuftin/helpers/catalogUpdater/providerUpdateRunner";

export type StartUpdateState = { ok: boolean; message: string } | null;

// Server actions can be invoked from any route, so the proxy's /admin guard is
// not enough — every action checks the credentials itself.
export async function startUpdateAction(
  _previousState: StartUpdateState,
  formData: FormData,
): Promise<StartUpdateState> {
  if (!isAuthorizedAdmin((await headers()).get("authorization"))) {
    return { ok: false, message: "Not authorized." };
  }

  const provider = formData.get("provider");
  const providers =
    typeof provider === "string" && provider.length > 0
      ? [provider]
      : undefined;

  try {
    const result = await startProviderUpdates({ providers, trigger: "manual" });
    revalidatePath("/admin");
    return result.started
      ? { ok: true, message: "Update started." }
      : { ok: false, message: result.reason };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
