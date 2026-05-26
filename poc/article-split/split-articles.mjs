import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const inputPath = path.join(import.meta.dirname, "sample-regulation.txt");
const outputDir = path.join(import.meta.dirname, "generated");
const outputPath = path.join(outputDir, "articles.json");

const text = await readFile(inputPath, "utf8");
const lines = text.replace(/\r\n/g, "\n").split("\n");

const articleHeadingPattern = /^第([0-9０-９一二三四五六七八九十百千]+)条(?:（([^）]+)）|\s+(.+))?/;
const chapterHeadingPattern = /^第([0-9０-９一二三四五六七八九十百千]+)章\s*(.*)$/;
const supplementaryHeadingPattern = /^附則$/;
const appendixHeadingPattern = /^別表([0-9０-９一二三四五六七八九十百千]+)?\s*(.*)$/;

const preambleLines = [];
const blocks = [];
let currentBlock = null;

function finishCurrentBlock() {
  if (!currentBlock) return;

  const body = currentBlock.bodyLines.join("\n").trim();
  blocks.push({
    id: `block-${blocks.length + 1}`,
    type: currentBlock.type,
    label: currentBlock.label,
    title: currentBlock.title,
    originalText: body,
    revisedText: body,
    isRevisionTarget: false,
    hasDiff: false,
    status: "unchanged",
  });
}

function startBlock({ type, label, title, line }) {
  finishCurrentBlock();
  currentBlock = {
    type,
    label,
    title,
    bodyLines: [line],
  };
}

for (const line of lines) {
  const articleMatch = line.match(articleHeadingPattern);

  if (articleMatch) {
    startBlock({
      type: "article",
      label: `第${articleMatch[1]}条`,
      title: articleMatch[2] ?? articleMatch[3] ?? "",
      line,
    });
    continue;
  }

  const chapterMatch = line.match(chapterHeadingPattern);

  if (chapterMatch) {
    startBlock({
      type: "chapter",
      label: `第${chapterMatch[1]}章`,
      title: chapterMatch[2] ?? "",
      line,
    });
    continue;
  }

  if (supplementaryHeadingPattern.test(line)) {
    startBlock({
      type: "supplementary",
      label: "附則",
      title: "",
      line,
    });
    continue;
  }

  const appendixMatch = line.match(appendixHeadingPattern);

  if (appendixMatch) {
    startBlock({
      type: "appendix",
      label: `別表${appendixMatch[1] ?? ""}`,
      title: appendixMatch[2] ?? "",
      line,
    });
    continue;
  }

  if (currentBlock) {
    currentBlock.bodyLines.push(line);
  } else {
    preambleLines.push(line);
  }
}

finishCurrentBlock();

const articleCount = blocks.filter((block) => block.type === "article").length;

const result = {
  sourceFile: "sample-regulation.txt",
  regulationTitle: preambleLines.find((line) => line.trim())?.trim() ?? "",
  preambleText: preambleLines.join("\n").trim(),
  blockCount: blocks.length,
  articleCount,
  blocks,
  notes: [
    "第○章、第○条、附則、別表を別ブロックとして扱うPoC。",
    "旧文と新文の初期値は同じ内容にしている。",
    "本文がない章見出しも、規程順を保つため独立ブロックとして保持している。",
  ],
};

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, JSON.stringify(result, null, 2), "utf8");

console.log(`Generated: ${outputPath}`);
console.log(`Block count: ${blocks.length}`);
console.log(`Article count: ${articleCount}`);
console.log(
  blocks.map((block) => `${block.type}: ${block.label} ${block.title}`.trim()).join("\n"),
);
