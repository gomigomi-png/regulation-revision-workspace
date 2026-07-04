/**
 * 規程改正ワークスペースの仮データモデル。
 *
 * 初回版の前提:
 * - 1つの改正案件で複数の規程を扱う
 * - 規程全文を条文ブロック単位で保持する
 * - 旧文は固定し、新文だけを編集する
 * - `差分あり` や `通常修正` は保存せず、旧文・新文から派生する
 */

import { z } from "zod";

// ===== 条文ブロック =====

export const articleBlockKindSchema = z.enum([
  "chapter",
  "article",
  "supplementary",
  "appendix",
  "form",
  "other",
]);
export type ArticleBlockKind = z.infer<typeof articleBlockKindSchema>;

export const regulationArticleBlockSchema = z.object({
  id: z.string(),
  order: z.number(),
  kind: articleBlockKindSchema,
  label: z.string(),
  title: z.string().default(""),
  oldText: z.string().nullable(),
  newText: z.string().nullable(),
  revisionReason: z.string().default(""),
  isRevisionTarget: z.boolean().default(false),
});
export type RegulationArticleBlock = z.infer<
  typeof regulationArticleBlockSchema
>;

// ===== 対象規程 =====

export const regulationProgressStatusSchema = z.enum([
  "notStarted",
  "editing",
  "confirmed",
]);
export type RegulationProgressStatus = z.infer<
  typeof regulationProgressStatusSchema
>;

export const revisionRegulationSchema = z.object({
  id: z.string(),
  title: z.string(),
  progressStatus: regulationProgressStatusSchema.default("notStarted"),
  sourceText: z.string().default(""),
  articles: z.array(regulationArticleBlockSchema),
});
export type RevisionRegulation = z.infer<typeof revisionRegulationSchema>;

// ===== 改正案件 =====

export const regulationRevisionWorkspaceStatusSchema = z.enum([
  "draft",
  "reviewing",
  "readyForSubmission",
]);
export type RegulationRevisionWorkspaceStatus = z.infer<
  typeof regulationRevisionWorkspaceStatusSchema
>;

export const regulationRevisionWorkspaceSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: regulationRevisionWorkspaceStatusSchema.default("draft"),
  summary: z.string().default(""),
  regulations: z.array(revisionRegulationSchema),
});
export type RegulationRevisionWorkspace = z.infer<
  typeof regulationRevisionWorkspaceSchema
>;

// ===== 派生状態 =====

export const articleChangeKindSchema = z.enum([
  "unchanged",
  "modified",
  "added",
  "deleted",
]);
export type ArticleChangeKind = z.infer<typeof articleChangeKindSchema>;

export function deriveArticleChangeKind(
  article: Pick<RegulationArticleBlock, "oldText" | "newText">,
): ArticleChangeKind {
  if (article.oldText === null && article.newText !== null) {
    return "added";
  }

  if (article.oldText !== null && article.newText === null) {
    return "deleted";
  }

  if (article.oldText !== article.newText) {
    return "modified";
  }

  return "unchanged";
}

export function hasArticleDiff(
  article: Pick<RegulationArticleBlock, "oldText" | "newText">,
): boolean {
  return deriveArticleChangeKind(article) !== "unchanged";
}

// ===== 出力用の派生型 =====

export type ShinkyutaisyoArticleRow = {
  type: "article";
  articleId: string;
  label: string;
  title: string;
  newText: string | null;
  oldText: string | null;
  changeKind: ArticleChangeKind;
};

export type ShinkyutaisyoOmittedRangeRow = {
  type: "omittedRange";
  fromLabel: string;
  toLabel: string;
};

export type ShinkyutaisyoRow =
  | ShinkyutaisyoArticleRow
  | ShinkyutaisyoOmittedRangeRow;
