import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  diffCharacters,
  renderChangeReviewHtml,
  renderRevisedPreviewHtml,
  summarizeDiff,
} from "./diff-preview.mjs";

const sample = JSON.parse(
  await readFile(path.join(import.meta.dirname, "sample-diff.json"), "utf8"),
);

const normal = sample.cases.find((testCase) => testCase.name === "通常修正");
const unchanged = sample.cases.find((testCase) => testCase.name === "差分なし");
const deletion = sample.cases.find((testCase) => testCase.name === "文言削除");

{
  const segments = diffCharacters(normal.originalText, normal.revisedText);
  const summary = summarizeDiff(segments);
  const html = renderRevisedPreviewHtml(segments);
  const reviewHtml = renderChangeReviewHtml(segments);

  assert.equal(summary.hasDiff, true);
  assert.equal(summary.addedText, "、再雇用嘱託職員");
  assert.equal(summary.removedText, "");
  assert.match(html, /<span class="diff-added">、再雇用嘱託職員<\/span>/);
  assert.match(reviewHtml, /<span class="diff-added">、再雇用嘱託職員<\/span>/);
}

{
  const segments = diffCharacters(unchanged.originalText, unchanged.revisedText);
  const summary = summarizeDiff(segments);
  const html = renderRevisedPreviewHtml(segments);
  const reviewHtml = renderChangeReviewHtml(segments);

  assert.equal(summary.hasDiff, false);
  assert.equal(summary.addedText, "");
  assert.equal(summary.removedText, "");
  assert.doesNotMatch(html, /diff-added/);
  assert.doesNotMatch(reviewHtml, /diff-added|diff-removed/);
}

{
  const segments = diffCharacters(deletion.originalText, deletion.revisedText);
  const summary = summarizeDiff(segments);
  const html = renderRevisedPreviewHtml(segments);
  const reviewHtml = renderChangeReviewHtml(segments);

  assert.equal(summary.hasDiff, true);
  assert.match(summary.removedText, /、8時間を超える場合は1時間/);
  assert.doesNotMatch(html, /<span class="diff-added">/);
  assert.doesNotMatch(html, /diff-removed/);
  assert.match(reviewHtml, /<span class="diff-removed">、8時間を超える場合は1時間<\/span>/);
}

console.log("All diff preview tests passed.");
