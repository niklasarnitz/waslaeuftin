"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession } from "@waslaeuftin/helpers/auth/getAdminSession";
import { startProviderUpdates } from "@waslaeuftin/helpers/catalogUpdater/providerUpdateRunner";

export type StartUpdateState = { ok: boolean; message: string } | null;

// Server actions can be invoked from any route, so every action checks the
// session itself instead of relying on the page's check.
export async function startUpdateAction(
  _previousState: StartUpdateState,
  formData: FormData,
): Promise<StartUpdateState> {
  if (!(await getAdminSession())) {
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
