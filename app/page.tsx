import { RegulationRevisionWorkspace } from "@/components/regulation-revision/RegulationRevisionWorkspace";
import regulationRevisionWorkspaceData from "@/data/regulation-revision-workspace.json";
import { hasDatabaseUrl } from "@/lib/regulation-revision/db/client";
import { getWorkspaceById } from "@/lib/regulation-revision/db/repository";
import { regulationRevisionWorkspaceSchema } from "@/lib/regulation-revision/schema";

// 毎回 Neon から読む。静的化するとビルド時点の JSON / スナップショットが返り、保存が残らない。
export const dynamic = "force-dynamic";

const DEFAULT_WORKSPACE_ID = "rrw-001";

function loadFallbackWorkspace() {
  const workspaceResult = regulationRevisionWorkspaceSchema.safeParse(
    regulationRevisionWorkspaceData,
  );

  if (!workspaceResult.success) {
    throw new Error(
      `regulation-revision-workspace.json: ${workspaceResult.error.issues[0]?.message}`,
    );
  }

  return workspaceResult.data;
}

export default async function Page() {
  let workspaceFromDatabase = null;

  if (hasDatabaseUrl()) {
    try {
      workspaceFromDatabase = await getWorkspaceById(DEFAULT_WORKSPACE_ID);
    } catch (error) {
      console.error("Failed to load workspace from Neon:", error);
    }
  }

  const initialWorkspace = workspaceFromDatabase ?? loadFallbackWorkspace();

  return (
    <RegulationRevisionWorkspace
      initialWorkspace={initialWorkspace}
      persistToDatabase={workspaceFromDatabase !== null}
    />
  );
}
