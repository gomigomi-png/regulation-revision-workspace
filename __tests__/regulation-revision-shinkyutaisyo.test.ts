import { describe, expect, it } from "vitest";

import {
  type RegulationArticleBlock,
  type RevisionRegulation,
} from "@/lib/regulation-revision/schema";
import { createShinkyutaisyoDocument } from "@/lib/regulation-revision/shinkyutaisyo-docx";
import {
  buildShinkyutaisyoFileName,
  buildShinkyutaisyoRows,
  formatOmittedRangeLabel,
} from "@/lib/regulation-revision/shinkyutaisyo";

function article(
  partial: Partial<RegulationArticleBlock> &
    Pick<RegulationArticleBlock, "id" | "order" | "label">,
): RegulationArticleBlock {
  return {
    kind: "article",
    title: "",
    oldText: "旧",
    newText: "旧",
    revisionReason: "",
    isRevisionTarget: false,
    ...partial,
  };
}

describe("buildShinkyutaisyoRows", () => {
  it("変更のない連続範囲を【略】行にまとめる", () => {
    const rows = buildShinkyutaisyoRows([
      article({
        id: "1",
        order: 1,
        label: "第1条",
        oldText: "A",
        newText: "A",
      }),
      article({
        id: "2",
        order: 2,
        label: "第2条",
        oldText: "B",
        newText: "B",
      }),
      article({
        id: "3",
        order: 3,
        label: "第3条",
        oldText: "C",
        newText: "C2",
        isRevisionTarget: true,
      }),
      article({
        id: "4",
        order: 4,
        label: "第4条",
        oldText: "D",
        newText: "D",
      }),
    ]);

    expect(rows).toEqual([
      {
        type: "omittedRange",
        fromLabel: "第1条",
        toLabel: "第2条",
      },
      {
        type: "article",
        articleId: "3",
        label: "第3条",
        title: "",
        oldText: "C",
        newText: "C2",
        changeKind: "modified",
      },
      {
        type: "omittedRange",
        fromLabel: "第4条",
        toLabel: "第4条",
      },
    ]);
  });

  it("削除と新設の changeKind を付与する", () => {
    const rows = buildShinkyutaisyoRows([
      article({
        id: "deleted",
        order: 1,
        label: "第10条",
        oldText: "削除される",
        newText: null,
      }),
      article({
        id: "added",
        order: 2,
        label: "第11条",
        oldText: null,
        newText: "新設される",
      }),
    ]);

    expect(rows[0]).toMatchObject({
      type: "article",
      changeKind: "deleted",
    });
    expect(rows[1]).toMatchObject({
      type: "article",
      changeKind: "added",
    });
  });
});

describe("formatOmittedRangeLabel", () => {
  it("同一ラベルは単体の【略】にする", () => {
    expect(formatOmittedRangeLabel("第4条", "第4条")).toBe("第4条 【略】");
  });

  it("範囲は〜でつなぐ", () => {
    expect(formatOmittedRangeLabel("第1条", "第2条")).toBe("第1条〜第2条 【略】");
  });
});

describe("buildShinkyutaisyoFileName", () => {
  it("規程名からファイル名を作る", () => {
    expect(buildShinkyutaisyoFileName("就業規則")).toBe(
      "就業規則_新旧対照表.docx",
    );
  });
});

describe("createShinkyutaisyoDocument", () => {
  it("Document を生成できる", () => {
    const regulation: RevisionRegulation = {
      id: "reg-1",
      title: "就業規則",
      progressStatus: "editing",
      sourceText: "",
      articles: [
        article({
          id: "a1",
          order: 1,
          label: "第1条",
          title: "目的",
          oldText: "旧文です。",
          newText: "新文です。",
          isRevisionTarget: true,
        }),
      ],
    };

    expect(() => createShinkyutaisyoDocument(regulation)).not.toThrow();
  });
});
