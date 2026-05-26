import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import {
  diffCharacters,
  renderChangeReviewHtml,
  renderRevisedPreviewHtml,
  summarizeDiff,
} from "../diff-preview/diff-preview.mjs";

const inputPath = path.join(import.meta.dirname, "sample-patterns.json");
const outputDir = path.join(import.meta.dirname, "generated");
const htmlOutputPath = path.join(outputDir, "patterns-preview.html");
const wordOutputPath = path.join(outputDir, "revision-patterns-styled.docx");

const sample = JSON.parse(await readFile(inputPath, "utf8"));

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTextForHtml(value) {
  return value ? escapeHtml(value).replace(/\n/g, "<br>") : "（なし）";
}

function getDisplayStatus(status) {
  return {
    modified: "通常修正",
    deleted: "削除",
    added: "新設",
  }[status];
}

function diffForBlock(block) {
  const segments = diffCharacters(block.originalText, block.revisedText);
  return {
    segments,
    summary: summarizeDiff(segments),
    revisedPreviewHtml: block.revisedText
      ? renderRevisedPreviewHtml(segments)
      : '<span class="empty-text">（削除）</span>',
    changeReviewHtml:
      block.originalText && block.revisedText
        ? renderChangeReviewHtml(segments)
        : block.status === "deleted"
          ? `<span class="diff-removed">${renderTextForHtml(block.originalText)}</span>`
          : `<span class="diff-added">${renderTextForHtml(block.revisedText)}</span>`,
  };
}

function paragraph(text, options = {}) {
  return new Paragraph({
    alignment: options.alignment,
    spacing: { after: options.after ?? 120 },
    children: [
      new TextRun({
        text,
        bold: options.bold,
        size: options.size ?? 21,
        color: options.color,
        underline: options.underline,
      }),
    ],
  });
}

function paragraphFromRuns(runs) {
  return new Paragraph({
    spacing: { after: 90 },
    children: runs.length ? runs : [new TextRun({ text: "", size: 21 })],
  });
}

function paragraphsFromSegments(segments, side) {
  const paragraphs = [[]];

  function appendText(text, options = {}) {
    const parts = text.split("\n");
    for (const [index, part] of parts.entries()) {
      if (index > 0) {
        paragraphs.push([]);
      }
      if (part) {
        paragraphs.at(-1).push(
          new TextRun({
            text: part,
            size: 21,
            ...options,
          }),
        );
      }
    }
  }

  for (const segment of segments) {
    if (segment.type === "equal") {
      appendText(segment.text);
      continue;
    }

    if (side === "new" && segment.type === "added") {
      appendText(segment.text, {
        color: "FF0000",
        underline: { type: "single", color: "FF0000" },
      });
      continue;
    }

    if (side === "old" && segment.type === "removed") {
      appendText(segment.text, {
        underline: { type: "single" },
      });
    }
  }

  return paragraphs.map((runs) => paragraphFromRuns(runs));
}

function paragraphsFromText(text, emptyText, options = {}) {
  const value = text || emptyText;
  return value.split("\n").map((line) => paragraph(line, { ...options, after: 90 }));
}

function newColumnParagraphs(block) {
  if (block.status === "modified") {
    return paragraphsFromSegments(diffCharacters(block.originalText, block.revisedText), "new");
  }

  if (block.status === "deleted") {
    return paragraphsFromText("", "（削除）", {
      color: "FF0000",
    });
  }

  if (block.status === "added") {
    return paragraphsFromText(block.revisedText, "", {
      color: "FF0000",
    });
  }

  return paragraphsFromText(block.revisedText, "");
}

function oldColumnParagraphs(block) {
  if (block.status === "modified") {
    return paragraphsFromSegments(diffCharacters(block.originalText, block.revisedText), "old");
  }

  return paragraphsFromText(block.originalText, "（新設）");
}

function cell(children, options = {}) {
  return new TableCell({
    width: { size: options.width ?? 50, type: WidthType.PERCENTAGE },
    shading: options.shading ? { fill: options.shading } : undefined,
    margins: { top: 160, bottom: 160, left: 180, right: 180 },
    children,
  });
}

const enrichedBlocks = sample.blocks.map((block) => ({
  ...block,
  ...diffForBlock(block),
}));

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PoC-4 削除・新設パターン確認</title>
  <style>
    body {
      font-family: "Yu Gothic UI", Meiryo, sans-serif;
      line-height: 1.8;
      margin: 40px;
      color: #111827;
    }
    .page { max-width: 960px; margin: 0 auto; }
    .card {
      border: 1px solid #d1d5db;
      border-radius: 12px;
      padding: 24px;
      margin-top: 20px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .label { color: #6b7280; font-size: 13px; margin-bottom: 8px; }
    .status {
      display: inline-block;
      border: 1px solid #d1d5db;
      border-radius: 999px;
      padding: 2px 10px;
      font-size: 12px;
      color: #374151;
      background: #f9fafb;
    }
    .diff-added {
      color: #dc2626;
      text-decoration-line: underline;
      text-decoration-color: #dc2626;
      text-underline-offset: 3px;
      font-weight: 700;
    }
    .diff-removed {
      color: #dc2626;
      text-decoration-line: line-through underline;
      text-decoration-style: double;
      text-decoration-color: #dc2626;
      text-underline-offset: 3px;
      font-weight: 700;
    }
    .empty-text { color: #6b7280; }
    pre {
      white-space: pre-wrap;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
    }
  </style>
</head>
<body>
  <main class="page">
    <h1>PoC-4 削除・新設パターン確認</h1>
    <p>${sample.regulationTitle} の通常修正・削除・新設を、差分表示と新旧対照表の両方で確認する。</p>

    ${enrichedBlocks
      .map(
        (block) => `
    <section class="card">
      <h2>${block.label} ${block.title} <span class="status">${getDisplayStatus(block.status)}</span></h2>
      <div class="grid">
        <div>
          <div class="label">旧文</div>
          <pre>${block.originalText || "（なし）"}</pre>
        </div>
        <div>
          <div class="label">新文</div>
          <pre>${block.revisedText || "（なし）"}</pre>
        </div>
      </div>
      <div>
        <div class="label">改正後全文用プレビュー</div>
        <p>${block.revisedPreviewHtml}</p>
      </div>
      <div>
        <div class="label">差分確認用プレビュー</div>
        <p>${block.changeReviewHtml}</p>
      </div>
      <div>
        <div class="label">差分サマリー</div>
        <p>追加: ${block.summary.addedText || (block.status === "added" ? "新設条文全体" : "なし")}</p>
        <p>削除: ${block.summary.removedText || (block.status === "deleted" ? "削除条文全体" : "なし")}</p>
      </div>
    </section>`,
      )
      .join("\n")}
  </main>
</body>
</html>`;

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          size: {
            orientation: "landscape",
          },
          margin: { top: 1134, right: 900, bottom: 1134, left: 900 },
        },
      },
      children: [
        paragraph(sample.regulationTitle, {
          alignment: AlignmentType.CENTER,
          bold: true,
          size: 28,
          after: 360,
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "666666" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "666666" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "666666" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "666666" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
          },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                cell([paragraph("新", { alignment: AlignmentType.CENTER, bold: true })], {
                  shading: "EAF2FF",
                }),
                cell([paragraph("旧", { alignment: AlignmentType.CENTER, bold: true })], {
                  shading: "F3F4F6",
                }),
              ],
            }),
            ...sample.blocks.map(
              (block) =>
                new TableRow({
                  children: [
                    cell(newColumnParagraphs(block)),
                    cell(oldColumnParagraphs(block)),
                  ],
                }),
            ),
          ],
        }),
      ],
    },
  ],
});

await mkdir(outputDir, { recursive: true });
await writeFile(htmlOutputPath, html, "utf8");
await writeFile(wordOutputPath, await Packer.toBuffer(doc));

console.log(`Generated HTML: ${htmlOutputPath}`);
console.log(`Generated Word: ${wordOutputPath}`);
console.log(`Patterns: ${sample.blocks.map((block) => block.status).join(", ")}`);
