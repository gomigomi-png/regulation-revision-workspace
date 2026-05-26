import { mkdir, writeFile } from "node:fs/promises";
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

const sample = {
  regulationTitle: "就業規則",
  newText: [
    "就業規則（案）",
    "",
    "第1条〜第2条 【略】",
    "第3条 対象者は、職員、嘱託職員、再雇用嘱託職員とする。",
    "第4条〜第30条 【略】",
    "",
    "以上",
  ],
  oldText: [
    "就業規則",
    "",
    "第1条〜第2条 【略】",
    "第3条 対象者は、職員、嘱託職員とする。",
    "第4条〜第30条 【略】",
    "",
    "以上",
  ],
};

function textParagraph(text, options = {}) {
  return new Paragraph({
    alignment: options.alignment,
    spacing: { after: options.after ?? 120 },
    children: [
      new TextRun({
        text,
        bold: options.bold,
        size: options.size ?? 21,
      }),
    ],
  });
}

function textBlock(lines) {
  return lines.map((line) => textParagraph(line, { after: line ? 90 : 160 }));
}

function cell(children, options = {}) {
  return new TableCell({
    width: { size: options.width ?? 50, type: WidthType.PERCENTAGE },
    shading: options.shading ? { fill: options.shading } : undefined,
    margins: {
      top: 160,
      bottom: 160,
      left: 180,
      right: 180,
    },
    children,
  });
}

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: 1134,
            right: 900,
            bottom: 1134,
            left: 900,
          },
        },
      },
      children: [
        textParagraph(sample.regulationTitle, {
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
                cell([textParagraph("新", { alignment: AlignmentType.CENTER, bold: true })], {
                  shading: "EAF2FF",
                }),
                cell([textParagraph("旧", { alignment: AlignmentType.CENTER, bold: true })], {
                  shading: "F3F4F6",
                }),
              ],
            }),
            new TableRow({
              children: [
                cell(textBlock(sample.newText)),
                cell(textBlock(sample.oldText)),
              ],
            }),
          ],
        }),
      ],
    },
  ],
});

const outputDir = path.join(import.meta.dirname, "generated");
const outputPath = path.join(outputDir, "shinkyutaisyo-poc.docx");

await mkdir(outputDir, { recursive: true });
const buffer = await Packer.toBuffer(doc);
await writeFile(outputPath, buffer);

console.log(`Generated: ${outputPath}`);
