import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  diffCharacters,
  renderChangeReviewHtml,
  renderRevisedPreviewHtml,
  summarizeDiff,
} from "./diff-preview.mjs";

const inputPath = path.join(import.meta.dirname, "sample-diff.json");
const outputDir = path.join(import.meta.dirname, "generated");
const outputPath = path.join(outputDir, "preview.html");

const sample = JSON.parse(await readFile(inputPath, "utf8"));
const target = sample.selectedBlock;
const segments = diffCharacters(target.originalText, target.revisedText);
const summary = summarizeDiff(segments);
const previewHtml = renderRevisedPreviewHtml(segments);
const changeReviewHtml = renderChangeReviewHtml(segments);

const deletionCase = sample.cases.find((testCase) => testCase.name === "文言削除");
const deletionSegments = diffCharacters(deletionCase.originalText, deletionCase.revisedText);
const deletionSummary = summarizeDiff(deletionSegments);
const deletionPreviewHtml = renderRevisedPreviewHtml(deletionSegments);
const deletionChangeReviewHtml = renderChangeReviewHtml(deletionSegments);

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PoC-3 赤字下線差分プレビュー</title>
  <style>
    body {
      font-family: "Yu Gothic UI", Meiryo, sans-serif;
      line-height: 1.8;
      margin: 40px;
      color: #111827;
    }
    .page {
      max-width: 880px;
      margin: 0 auto;
    }
    .card {
      border: 1px solid #d1d5db;
      border-radius: 12px;
      padding: 24px;
      margin-top: 20px;
    }
    .label {
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 8px;
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
    <h1>PoC-3 赤字下線差分プレビュー</h1>
    <p>${sample.regulationTitle} / ${target.label} ${target.title}</p>

    <section class="card">
      <div class="label">旧文</div>
      <pre>${target.originalText}</pre>
    </section>

    <section class="card">
      <div class="label">新文</div>
      <pre>${target.revisedText}</pre>
    </section>

    <section class="card">
      <div class="label">改正後全文用プレビュー（削除文言は表示しない）</div>
      <p>${previewHtml}</p>
    </section>

    <section class="card">
      <div class="label">差分確認用プレビュー（追加・削除の両方を表示）</div>
      <p>${changeReviewHtml}</p>
    </section>

    <section class="card">
      <div class="label">差分サマリー</div>
      <p>差分あり: ${summary.hasDiff ? "はい" : "いいえ"}</p>
      <p>追加: ${summary.addedText || "なし"}</p>
      <p>削除: ${summary.removedText || "なし"}</p>
    </section>

    <section class="card">
      <div class="label">削除パターンの確認</div>
      <pre>${deletionCase.originalText}</pre>
      <pre>${deletionCase.revisedText}</pre>
      <p><strong>改正後全文用:</strong><br>${deletionPreviewHtml}</p>
      <p><strong>差分確認用:</strong><br>${deletionChangeReviewHtml}</p>
      <p>削除: ${deletionSummary.removedText || "なし"}</p>
    </section>
  </main>
</body>
</html>`;

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, html, "utf8");

console.log(`Generated: ${outputPath}`);
console.log(`Has diff: ${summary.hasDiff}`);
console.log(`Added: ${summary.addedText || "(none)"}`);
console.log(`Removed: ${summary.removedText || "(none)"}`);
