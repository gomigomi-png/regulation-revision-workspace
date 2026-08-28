"use server";

import { hasDatabaseUrl } from "@/lib/regulation-revision/db/client";
import { saveWorkspace } from "@/lib/regulation-revision/db/repository";
import {
  type RegulationRevisionWorkspace,
  regulationRevisionWorkspaceSchema,
} from "@/lib/regulation-revision/schema";

export type SaveRegulationRevisionWorkspaceResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveRegulationRevisionWorkspace(
  workspace: RegulationRevisionWorkspace,
): Promise<SaveRegulationRevisionWorkspaceResult> {
  if (!hasDatabaseUrl()) {
    return { ok: false, error: "DATABASE_URL が未設定です" };
  }

  const parsed = regulationRevisionWorkspaceSchema.safeParse(workspace);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "保存データが不正です",
    };
  }

  try {
    await saveWorkspace(parsed.data);
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "保存に失敗しました";
    return { ok: false, error: message };
  }
}
