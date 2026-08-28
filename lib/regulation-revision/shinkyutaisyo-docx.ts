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

import { diffCharacters } from "@/lib/regulation-revision/diff";
import {
  type RevisionRegulation,
  type ShinkyutaisyoArticleRow,
  type ShinkyutaisyoRow,
} from "@/lib/regulation-revision/schema";
import {
  buildShinkyutaisyoFileName,
  buildShinkyutaisyoRows,
  formatArticleHeading,
  formatOmittedRangeLabel,
} from "@/lib/regulation-revision/shinkyutaisyo";

type RunOptions = {
  bold?: boolean;
  color?: string;
  underline?: { type: "single"; color?: string };
};

function paragraph(text: string, options: {
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  after?: number;
  bold?: boolean;
  size?: number;
  color?: string;
  underline?: { type: "single"; color?: string };
} = {}) {
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

function paragraphFromRuns(runs: TextRun[]) {
  return new Paragraph({
    spacing: { after: 90 },
    children: runs.length ? runs : [new TextRun({ text: "", size: 21 })],
  });
}

function paragraphsFromPlainText(text: string, options: RunOptions = {}) {
  if (text === "") {
    return [paragraphFromRuns([])];
  }

  return text.split("\n").map((line) =>
    paragraphFromRuns([
      new TextRun({
        text: line,
        size: 21,
        ...options,
      }),
    ]),
  );
}

function paragraphsFromSegments(
  oldText: string,
  newText: string,
  side: "new" | "old",
) {
  const paragraphs: TextRun[][] = [[]];

  const appendText = (text: string, options: RunOptions = {}) => {
    const parts = text.split("\n");
    for (const [index, part] of parts.entries()) {
      if (index > 0) {
        paragraphs.push([]);
      }
      if (part) {
        paragraphs.at(-1)?.push(
          new TextRun({
            text: part,
            size: 21,
            ...options,
          }),
        );
      }
    }
  };

  for (const segment of diffCharacters(oldText, newText)) {
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

function headingParagraphs(row: ShinkyutaisyoArticleRow) {
  return paragraphsFromPlainText(formatArticleHeading(row.label, row.title), {
    bold: true,
  });
}

function newColumnParagraphs(row: ShinkyutaisyoArticleRow) {
  if (row.changeKind === "deleted") {
    return [
      ...headingParagraphs(row),
      ...paragraphsFromPlainText("（削除）", { color: "FF0000" }),
    ];
  }

  if (row.changeKind === "added") {
    return [
      ...headingParagraphs(row),
      ...paragraphsFromPlainText(row.newText ?? "", { color: "FF0000" }),
    ];
  }

  if (row.changeKind === "modified" && row.oldText !== null && row.newText !== null) {
    return [
      ...headingParagraphs(row),
      ...paragraphsFromSegments(row.oldText, row.newText, "new"),
    ];
  }

  return [
    ...headingParagraphs(row),
    ...paragraphsFromPlainText(row.newText ?? ""),
  ];
}

function oldColumnParagraphs(row: ShinkyutaisyoArticleRow) {
  if (row.changeKind === "added") {
    return [
      ...headingParagraphs(row),
      ...paragraphsFromPlainText("（新設）"),
    ];
  }

  if (row.changeKind === "modified" && row.oldText !== null && row.newText !== null) {
    return [
      ...headingParagraphs(row),
      ...paragraphsFromSegments(row.oldText, row.newText, "old"),
    ];
  }

  return [
    ...headingParagraphs(row),
    ...paragraphsFromPlainText(row.oldText ?? ""),
  ];
}

function omittedParagraphs(row: Extract<ShinkyutaisyoRow, { type: "omittedRange" }>) {
  return paragraphsFromPlainText(
    formatOmittedRangeLabel(row.fromLabel, row.toLabel),
  );
}

function cell(children: Paragraph[], options: { shading?: string } = {}) {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    shading: options.shading ? { fill: options.shading } : undefined,
    margins: { top: 160, bottom: 160, left: 180, right: 180 },
    children,
  });
}

function buildTableRows(rows: ShinkyutaisyoRow[]) {
  return rows.map((row) => {
    if (row.type === "omittedRange") {
      const omitted = omittedParagraphs(row);
      return new TableRow({
        children: [cell(omitted), cell(omitted)],
      });
    }

    return new TableRow({
      children: [cell(newColumnParagraphs(row)), cell(oldColumnParagraphs(row))],
    });
  });
}

export function createShinkyutaisyoDocument(regulation: RevisionRegulation) {
  const rows = buildShinkyutaisyoRows(regulation.articles);

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: "landscape",
            },
            margin: {
              top: 1134,
              right: 900,
              bottom: 1134,
              left: 900,
            },
          },
        },
        children: [
          paragraph(regulation.title, {
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
              insideHorizontal: {
                style: BorderStyle.SINGLE,
                size: 1,
                color: "999999",
              },
              insideVertical: {
                style: BorderStyle.SINGLE,
                size: 1,
                color: "999999",
              },
            },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  cell(
                    [
                      paragraph("新", {
                        alignment: AlignmentType.CENTER,
                        bold: true,
                      }),
                    ],
                    { shading: "F3F4F6" },
                  ),
                  cell(
                    [
                      paragraph("旧", {
                        alignment: AlignmentType.CENTER,
                        bold: true,
                      }),
                    ],
                    { shading: "F3F4F6" },
                  ),
                ],
              }),
              ...buildTableRows(rows),
              new TableRow({
                children: [
                  cell([
                    paragraph("以上", {
                      alignment: AlignmentType.RIGHT,
                      after: 0,
                    }),
                  ]),
                  cell([
                    paragraph("以上", {
                      alignment: AlignmentType.RIGHT,
                      after: 0,
                    }),
                  ]),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });
}

async function tryCreateSaveFileHandle(fileName: string) {
  const pickerWindow = globalThis as typeof globalThis & {
    showSaveFilePicker?: (options: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<{
      createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  };

  if (typeof pickerWindow.showSaveFilePicker !== "function") {
    return null;
  }

  try {
    return await pickerWindow.showSaveFilePicker({
      suggestedName: fileName,
      types: [
        {
          description: "Word 文書",
          accept: {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
              [".docx"],
          },
        },
      ],
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return null;
  }
}

function downloadBlobWithAnchor(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = globalThis.document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  globalThis.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  globalThis.window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function downloadShinkyutaisyoDocx(regulation: RevisionRegulation) {
  const fileName = buildShinkyutaisyoFileName(regulation.title);

  // ブラウザの「複数ファイルの自動ダウンロード」ブロックを避けるため、
  // 対応ブラウザでは先に保存先を選ばせてから生成する。
  const saveHandle = await tryCreateSaveFileHandle(fileName);

  const wordDocument = createShinkyutaisyoDocument(regulation);
  const blob = await Packer.toBlob(wordDocument);

  if (saveHandle) {
    const writable = await saveHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }

  downloadBlobWithAnchor(blob, fileName);
}
