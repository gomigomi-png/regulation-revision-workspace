import { createDiffParts, type DiffPart } from "@/lib/regulation-revision/diff";
import { type RegulationArticleBlock } from "@/lib/regulation-revision/schema";
import { formatArticleHeading } from "@/lib/regulation-revision/shinkyutaisyo";

/**
 * 条文ブロックを改正後全文用のテキストにする。
 * 本文に条番号が無い場合（手入力データ）は見出しを補い、
 * 分割生成済みで本文先頭にラベルがある場合はそのまま使う。
 */
function formatAmendedBlock(
  article: RegulationArticleBlock & { newText: string },
): string {
  const body = article.newText;
  if (body.startsWith(article.label)) {
    return body;
  }

  const heading = formatArticleHeading(article.label, article.title);
  if (body.trim() === "") {
    return heading;
  }

  return `${heading}\n${body}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapChangedHtml(escaped: string): string {
  // Word 貼り付けでは span の color だけが落ちることがあるため、
  // 色は font、下線は u で分離する（新旧対照表 Word 出力と同じ #FF0000）。
  return `<font color="#FF0000"><u>${escaped}</u></font>`;
}

function diffPartsToHtml(parts: DiffPart[]): string {
  return parts
    .map((part) => {
      const escaped = escapeHtml(part.value).replace(/\n/g, "<br>");
      return part.changed ? wrapChangedHtml(escaped) : escaped;
    })
    .join("");
}

/**
 * Pane 4 の改正後表示と同じ diff を、条文ブロック単位の HTML にする。
 */
function buildAmendedBlockHtml(
  article: RegulationArticleBlock & { newText: string },
): string {
  const body = article.newText;

  if (body.startsWith(article.label)) {
    return diffPartsToHtml(createDiffParts(article.oldText, body));
  }

  const heading = formatArticleHeading(article.label, article.title);
  if (body.trim() === "") {
    return escapeHtml(heading);
  }

  return `${escapeHtml(heading)}<br>${diffPartsToHtml(createDiffParts(article.oldText, body))}`;
}

function sortedArticlesWithNewText(articles: RegulationArticleBlock[]) {
  return [...articles]
    .sort((left, right) => left.order - right.order)
    .filter(
      (article): article is RegulationArticleBlock & { newText: string } =>
        article.newText !== null,
    );
}

/**
 * 選択中規程の改正後全文を組み立てる。
 * 修正対象・差分の有無に関わらず、規程内の全条文を order 順に並べる。
 * 削除条文（newText === null）だけ除外し、新設は order の位置に入る。
 */
export function buildAmendedFullText(articles: RegulationArticleBlock[]): string {
  return sortedArticlesWithNewText(articles).map(formatAmendedBlock).join("\n\n");
}

/**
 * Word 貼り付け用の HTML 全文。Pane 4 と同様、追加・変更箇所を赤字下線にする。
 */
export function buildAmendedFullTextHtml(articles: RegulationArticleBlock[]): string {
  const body = sortedArticlesWithNewText(articles)
    .map(buildAmendedBlockHtml)
    .join("<br><br>");

  return `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body><!--StartFragment--><div>${body}</div><!--EndFragment--></body></html>`;
}

export type AmendedFullTextClipboardPayload = {
  plain: string;
  html: string;
};

export function buildAmendedFullTextClipboardPayload(
  articles: RegulationArticleBlock[],
): AmendedFullTextClipboardPayload {
  return {
    plain: buildAmendedFullText(articles),
    html: buildAmendedFullTextHtml(articles),
  };
}

export async function copyAmendedFullTextToClipboard(
  articles: RegulationArticleBlock[],
): Promise<void> {
  const { plain, html } = buildAmendedFullTextClipboardPayload(articles);

  if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([plain], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      }),
    ]);
    return;
  }

  await navigator.clipboard.writeText(plain);
}
