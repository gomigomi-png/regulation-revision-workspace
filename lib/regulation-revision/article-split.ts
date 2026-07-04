import { type RegulationArticleBlock } from "@/lib/regulation-revision/schema";

const articleHeadingPattern =
  /^第([0-9０-９一二三四五六七八九十百千]+)条(?:（([^）]+)）|\s+(.+))?/;
const chapterHeadingPattern =
  /^第([0-9０-９一二三四五六七八九十百千]+)章\s*(.*)$/;
const supplementaryHeadingPattern = /^附則$/;
const appendixHeadingPattern =
  /^別表([0-9０-９一二三四五六七八九十百千]+)?\s*(.*)$/;

type PendingBlock = {
  kind: RegulationArticleBlock["kind"];
  label: string;
  title: string;
  bodyLines: string[];
};

function createBlock(
  currentBlock: PendingBlock,
  order: number,
): RegulationArticleBlock {
  const body = currentBlock.bodyLines.join("\n").trim();

  return {
    id: `article-block-${order}`,
    order,
    kind: currentBlock.kind,
    label: currentBlock.label,
    title: currentBlock.title,
    oldText: body,
    newText: body,
    revisionReason: "",
    isRevisionTarget: false,
  };
}

export function splitRegulationTextToArticleBlocks(
  sourceText: string,
): RegulationArticleBlock[] {
  const lines = sourceText.replace(/\r\n/g, "\n").split("\n");
  const blocks: RegulationArticleBlock[] = [];
  let currentBlock: PendingBlock | null = null;

  const finishCurrentBlock = () => {
    if (!currentBlock) return;
    blocks.push(createBlock(currentBlock, blocks.length + 1));
  };

  const startBlock = (
    kind: RegulationArticleBlock["kind"],
    label: string,
    title: string,
    line: string,
  ) => {
    finishCurrentBlock();
    currentBlock = { kind, label, title, bodyLines: [line] };
  };

  for (const line of lines) {
    const headingLine = line.trim();
    const articleMatch = headingLine.match(articleHeadingPattern);

    if (articleMatch) {
      startBlock(
        "article",
        `第${articleMatch[1]}条`,
        articleMatch[2] ?? articleMatch[3] ?? "",
        line,
      );
      continue;
    }

    const chapterMatch = headingLine.match(chapterHeadingPattern);

    if (chapterMatch) {
      startBlock("chapter", `第${chapterMatch[1]}章`, chapterMatch[2] ?? "", line);
      continue;
    }

    if (supplementaryHeadingPattern.test(headingLine)) {
      startBlock("supplementary", "附則", "", line);
      continue;
    }

    const appendixMatch = headingLine.match(appendixHeadingPattern);

    if (appendixMatch) {
      startBlock(
        "appendix",
        `別表${appendixMatch[1] ?? ""}`,
        appendixMatch[2] ?? "",
        line,
      );
      continue;
    }

    if (currentBlock) {
      currentBlock.bodyLines.push(line);
    }
  }

  finishCurrentBlock();

  return blocks;
}
