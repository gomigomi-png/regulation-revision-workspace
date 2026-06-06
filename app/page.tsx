import { RegulationRevisionWorkspace } from "@/components/regulation-revision/RegulationRevisionWorkspace";
import regulationRevisionWorkspaceData from "@/data/regulation-revision-workspace.json";
import { regulationRevisionWorkspaceSchema } from "@/lib/regulation-revision/schema";

export default function Page() {
  const workspaceResult = regulationRevisionWorkspaceSchema.safeParse(
    regulationRevisionWorkspaceData,
  );

  if (!workspaceResult.success) {
    throw new Error(
      `regulation-revision-workspace.json: ${workspaceResult.error.issues[0]?.message}`,
    );
  }

  return <RegulationRevisionWorkspace initialWorkspace={workspaceResult.data} />;
}
