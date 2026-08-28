import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const schemaPath = join(
  rootDir,
  "lib/regulation-revision/db/schema.sql",
);
const seedPath = join(rootDir, "data/regulation-revision-workspace.json");

function loadEnvLocal() {
  try {
    const envLocal = readFileSync(join(rootDir, ".env.local"), "utf8");
    for (const line of envLocal.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local が無い場合は process.env の DATABASE_URL を使う
  }
}

function splitSqlStatements(sqlText) {
  return sqlText
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function main() {
  loadEnvLocal();

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error(
      "DATABASE_URL が未設定です。.env.local に接続文字列を書いてから再実行してください。",
    );
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const schemaSql = readFileSync(schemaPath, "utf8");

  console.log("Creating tables...");
  for (const statement of splitSqlStatements(schemaSql)) {
    await sql.query(statement);
  }

  const existing = await sql`
    SELECT id
    FROM workspaces
    WHERE id = 'rrw-001'
    LIMIT 1
  `;

  if (existing.length > 0) {
    console.log("Seed skipped: workspace rrw-001 already exists.");
    return;
  }

  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  console.log(`Seeding workspace: ${seed.title}`);

  await sql`
    INSERT INTO workspaces (id, title, status, summary)
    VALUES (${seed.id}, ${seed.title}, ${seed.status}, ${seed.summary})
  `;

  for (const [regulationIndex, regulation] of seed.regulations.entries()) {
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
        ${seed.id},
        ${regulation.title},
        ${regulation.progressStatus},
        ${regulation.sourceText},
        ${regulationIndex}
      )
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
      `;
    }
  }

  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
