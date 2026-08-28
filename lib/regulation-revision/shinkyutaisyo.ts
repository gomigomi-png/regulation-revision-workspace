import {
  type RegulationArticleBlock,
  type RevisionRegulation,
  type ShinkyutaisyoRow,
  deriveArticleChangeKind,
  hasArticleDiff,
} from "@/lib/regulation-revision/schema";

export function formatOmittedRangeLabel(fromLabel: string, toLabel: string) {
  if (fromLabel === toLabel) {
    return `${fromLabel} 【略】`;
  }

  return `${fromLabel}〜${toLabel} 【略】`;
}

export function formatArticleHeading(label: string, title: string) {
  if (title.trim() === "") {
    return label;
  }

  return `${label}（${title}）`;
}

export function buildShinkyutaisyoRows(
  articles: RegulationArticleBlock[],
): ShinkyutaisyoRow[] {
  const sorted = [...articles].sort((left, right) => left.order - right.order);
  const rows: ShinkyutaisyoRow[] = [];

  let omitStart: RegulationArticleBlock | null = null;
  let omitEnd: RegulationArticleBlock | null = null;

  const flushOmit = () => {
    if (!omitStart || !omitEnd) return;

    rows.push({
      type: "omittedRange",
      fromLabel: omitStart.label,
      toLabel: omitEnd.label,
    });
    omitStart = null;
    omitEnd = null;
  };

  for (const article of sorted) {
    if (!hasArticleDiff(article)) {
      if (!omitStart) {
        omitStart = article;
      }
      omitEnd = article;
      continue;
    }

    flushOmit();
    rows.push({
      type: "article",
      articleId: article.id,
      label: article.label,
      title: article.title,
      newText: article.newText,
      oldText: article.oldText,
      changeKind: deriveArticleChangeKind(article),
    });
  }

  flushOmit();
  return rows;
}

export function countChangedArticles(articles: RegulationArticleBlock[]) {
  return articles.filter((article) => hasArticleDiff(article)).length;
}

export function buildShinkyutaisyoFileName(regulationTitle: string) {
  const safeTitle = regulationTitle.trim() || "規程";
  return `${safeTitle}_新旧対照表.docx`;
}

export function getShinkyutaisyoExportSummary(regulation: RevisionRegulation) {
  const changedCount = countChangedArticles(regulation.articles);
  const rows = buildShinkyutaisyoRows(regulation.articles);

  return {
    changedCount,
    rows,
    fileName: buildShinkyutaisyoFileName(regulation.title),
  };
}
