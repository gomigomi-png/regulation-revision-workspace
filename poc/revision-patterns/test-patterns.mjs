import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  diffCharacters,
  renderChangeReviewHtml,
  renderRevisedPreviewHtml,
  summarizeDiff,
} from "../diff-preview/diff-preview.mjs";

const sample = JSON.parse(
  await readFile(path.join(import.meta.dirname, "sample-patterns.json"), "utf8"),
);

const modifiedAddition = sample.blocks.find(
  (block) => block.status === "modified" && block.label === "第3条",
);
const modifiedDeletion = sample.blocks.find(
  (block) => block.status === "modified" && block.label === "第5条",
);
const deleted = sample.blocks.find((block) => block.status === "deleted");
const added = sample.blocks.find((block) => block.status === "added");

assert.ok(modifiedAddition);
assert.ok(modifiedDeletion);
assert.ok(deleted);
assert.ok(added);

{
  const segments = diffCharacters(modifiedAddition.originalText, modifiedAddition.revisedText);
  const summary = summarizeDiff(segments);
  const revisedHtml = renderRevisedPreviewHtml(segments);
  const reviewHtml = renderChangeReviewHtml(segments);

  assert.equal(summary.hasDiff, true);
  assert.equal(summary.addedText, "、再雇用嘱託職員");
  assert.match(revisedHtml, /diff-added/);
  assert.match(reviewHtml, /diff-added/);
}

{
  const segments = diffCharacters(modifiedDeletion.originalText, modifiedDeletion.revisedText);
  const summary = summarizeDiff(segments);
  const revisedHtml = renderRevisedPreviewHtml(segments);
  const reviewHtml = renderChangeReviewHtml(segments);

  assert.equal(summary.hasDiff, true);
  assert.equal(summary.addedText, "");
  assert.match(summary.removedText, /、1週40時間/);
  assert.doesNotMatch(revisedHtml, /diff-added|diff-removed/);
  assert.match(reviewHtml, /diff-removed/);
}

{
  const segments = diffCharacters(deleted.originalText, deleted.revisedText);
  const summary = summarizeDiff(segments);
  const revisedHtml = renderRevisedPreviewHtml(segments);

  assert.equal(summary.hasDiff, true);
  assert.equal(summary.addedText, "");
  assert.match(summary.removedText, /第6条（休憩時間）/);
  assert.equal(revisedHtml, "");
}

{
  const segments = diffCharacters(added.originalText, added.revisedText);
  const summary = summarizeDiff(segments);
  const revisedHtml = renderRevisedPreviewHtml(segments);

  assert.equal(summary.hasDiff, true);
  assert.match(summary.addedText, /第6条の2（在宅勤務時の取扱い）/);
  assert.equal(summary.removedText, "");
  assert.match(revisedHtml, /diff-added/);
}

console.log("All revision pattern tests passed.");
