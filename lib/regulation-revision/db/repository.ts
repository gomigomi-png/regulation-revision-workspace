import {
  type RegulationRevisionWorkspace,
  regulationRevisionWorkspaceSchema,
} from "@/lib/regulation-revision/schema";

import { getSql } from "./client";

type WorkspaceRow = {
  id: string;
  title: string;
  status: string;
  summary: string;
};

type RegulationRow = {
  id: string;
  workspace_id: string;
  title: string;
  progress_status: string;
  source_text: string;
  sort_order: number;
};

type ArticleRow = {
  id: string;
  regulation_id: string;
  sort_order: number;
  kind: string;
  label: string;
  title: string;
  old_text: string | null;
  new_text: string | null;
  revision_reason: string;
  is_revision_target: boolean;
};

function mapRowsToWorkspace(
  workspace: WorkspaceRow,
  regulations: RegulationRow[],
  articles: ArticleRow[],
): RegulationRevisionWorkspace {
  const articlesByRegulationId = new Map<string, ArticleRow[]>();

  for (const article of articles) {
    const bucket = articlesByRegulationId.get(article.regulation_id) ?? [];
    bucket.push(article);
    articlesByRegulationId.set(article.regulation_id, bucket);
  }

  return regulationRevisionWorkspaceSchema.parse({
    id: workspace.id,
    title: workspace.title,
    status: workspace.status,
    summary: workspace.summary,
    regulations: regulations.map((regulation) => ({
      id: regulation.id,
      title: regulation.title,
      progressStatus: regulation.progress_status,
      sourceText: regulation.source_text,
      articles: (articlesByRegulationId.get(regulation.id) ?? [])
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((article) => ({
          id: article.id,
          order: article.sort_order,
          kind: article.kind,
          label: article.label,
          title: article.title,
          oldText: article.old_text,
          newText: article.new_text,
          revisionReason: article.revision_reason,
          isRevisionTarget: article.is_revision_target,
        })),
    })),
  });
}

export async function getWorkspaceById(
  workspaceId: string,
): Promise<RegulationRevisionWorkspace | null> {
  const sql = getSql();

  const workspaceRows = await sql`
    SELECT id, title, status, summary
    FROM workspaces
    WHERE id = ${workspaceId}
    LIMIT 1
  `;

  const workspace = workspaceRows[0] as WorkspaceRow | undefined;
  if (!workspace) {
    return null;
  }

  const regulationRows = (await sql`
    SELECT id, workspace_id, title, progress_status, source_text, sort_order
    FROM regulations
    WHERE workspace_id = ${workspaceId}
    ORDER BY sort_order ASC, id ASC
  `) as RegulationRow[];

  if (regulationRows.length === 0) {
    return mapRowsToWorkspace(workspace, regulationRows, []);
  }

  const regulationIds = regulationRows.map((regulation) => regulation.id);
  const articleRows = (await sql`
    SELECT
      id,
      regulation_id,
      sort_order,
      kind,
      label,
      title,
      old_text,
      new_text,
      revision_reason,
      is_revision_target
    FROM articles
    WHERE regulation_id = ANY(${regulationIds})
    ORDER BY regulation_id ASC, sort_order ASC, id ASC
  `) as ArticleRow[];

  return mapRowsToWorkspace(workspace, regulationRows, articleRows);
}

export async function saveWorkspace(
  workspace: RegulationRevisionWorkspace,
): Promise<void> {
  const parsed = regulationRevisionWorkspaceSchema.parse(workspace);
  const sql = getSql();

  await sql`
    INSERT INTO workspaces (id, title, status, summary)
    VALUES (${parsed.id}, ${parsed.title}, ${parsed.status}, ${parsed.summary})
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      status = EXCLUDED.status,
      summary = EXCLUDED.summary
  `;

  const nextRegulationIds = parsed.regulations.map((regulation) => regulation.id);

  if (nextRegulationIds.length === 0) {
    await sql`
      DELETE FROM regulations
      WHERE workspace_id = ${parsed.id}
    `;
    return;
  }

  await sql`
    DELETE FROM regulations
    WHERE workspace_id = ${parsed.id}
      AND id <> ALL(${nextRegulationIds})
  `;

  for (const [regulationIndex, regulation] of parsed.regulations.entries()) {
    await sql`
      INSERT INTO regulations (
        id,
        workspace_id,
        title,
        progress_status,
        source_text,
        sort_order
      )
      VALUES (
        ${regulation.id},
        ${parsed.id},
        ${regulation.title},
        ${regulation.progressStatus},
        ${regulation.sourceText},
        ${regulationIndex}
      )
      ON CONFLICT (id) DO UPDATE SET
        workspace_id = EXCLUDED.workspace_id,
        title = EXCLUDED.title,
        progress_status = EXCLUDED.progress_status,
        source_text = EXCLUDED.source_text,
        sort_order = EXCLUDED.sort_order
    `;

    const nextArticleIds = regulation.articles.map((article) => article.id);

    if (nextArticleIds.length === 0) {
      await sql`
        DELETE FROM articles
        WHERE regulation_id = ${regulation.id}
      `;
      continue;
    }

    await sql`
      DELETE FROM articles
      WHERE regulation_id = ${regulation.id}
        AND id <> ALL(${nextArticleIds})
    `;

    for (const article of regulation.articles) {
      await sql`
        INSERT INTO articles (
          id,
          regulation_id,
          sort_order,
          kind,
          label,
          title,
          old_text,
          new_text,
          revision_reason,
          is_revision_target
        )
        VALUES (
          ${article.id},
          ${regulation.id},
          ${article.order},
          ${article.kind},
          ${article.label},
          ${article.title},
          ${article.oldText},
          ${article.newText},
          ${article.revisionReason},
          ${article.isRevisionTarget}
        )
        ON CONFLICT (id) DO UPDATE SET
          regulation_id = EXCLUDED.regulation_id,
          sort_order = EXCLUDED.sort_order,
          kind = EXCLUDED.kind,
          label = EXCLUDED.label,
          title = EXCLUDED.title,
          old_text = EXCLUDED.old_text,
          new_text = EXCLUDED.new_text,
          revision_reason = EXCLUDED.revision_reason,
          is_revision_target = EXCLUDED.is_revision_target
      `;
    }
  }
}
