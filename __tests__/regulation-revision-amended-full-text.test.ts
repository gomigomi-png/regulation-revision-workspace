import { describe, expect, it } from "vitest";

import {
  buildAmendedFullText,
  buildAmendedFullTextHtml,
} from "@/lib/regulation-revision/amended-full-text";
import { type RegulationArticleBlock } from "@/lib/regulation-revision/schema";

function article(
  partial: Partial<RegulationArticleBlock> &
    Pick<RegulationArticleBlock, "id" | "order" | "label" | "newText">,
): RegulationArticleBlock {
  return {
    kind: "article",
    title: "",
    oldText: "旧",
    revisionReason: "",
    isRevisionTarget: false,
    ...partial,
  };
}

describe("buildAmendedFullText", () => {
  it("規程内の全条文を order 順に連結する（本文に条番号がある場合）", () => {
    const text = buildAmendedFullText([
      article({
        id: "2",
        order: 2,
        label: "第2条",
        newText: "第2条（適用）\nこの規則は職員に適用する。",
      }),
      article({
        id: "1",
        order: 1,
        label: "第1条",
        newText: "第1条（目的）\nこの規則は就業を定める。",
      }),
    ]);

    expect(text).toBe(
      "第1条（目的）\nこの規則は就業を定める。\n\n第2条（適用）\nこの規則は職員に適用する。",
    );
  });

  it("改正していない条文も除外せず、条番号付きで全文に含める", () => {
    const text = buildAmendedFullText([
      article({
        id: "1",
        order: 1,
        kind: "chapter",
        label: "第3章",
        title: "服務",
        oldText: "第3章 服務",
        newText: "第3章 服務",
        isRevisionTarget: false,
      }),
      article({
        id: "2",
        order: 2,
        label: "第24条",
        title: "子の看護休暇",
        oldText: "旧の看護休暇本文",
        newText: "新の看護等休暇本文",
        isRevisionTarget: true,
      }),
      article({
        id: "3",
        order: 3,
        label: "第25条",
        title: "介護休暇",
        oldText: "介護休暇の本文",
        newText: "介護休暇の本文",
        isRevisionTarget: false,
      }),
    ]);

    expect(text).toBe(
      [
        "第3章 服務",
        "第24条（子の看護休暇）\n新の看護等休暇本文",
        "第25条（介護休暇）\n介護休暇の本文",
      ].join("\n\n"),
    );
  });

  it("削除条文（newText が null）を除外し、新設は order の位置に入れる", () => {
    const text = buildAmendedFullText([
      article({
        id: "1",
        order: 1,
        label: "第1条",
        title: "残る",
        oldText: "残る条文",
        newText: "残る条文",
      }),
      article({
        id: "2",
        order: 2,
        label: "第2条",
        oldText: "削除される",
        newText: null,
      }),
      article({
        id: "3",
        order: 3,
        label: "第3条",
        title: "新設",
        oldText: null,
        newText: "新設される条文",
      }),
    ]);

    expect(text).toBe(
      "第1条（残る）\n残る条文\n\n第3条（新設）\n新設される条文",
    );
  });

  it("対象がなければ空文字を返す", () => {
    expect(buildAmendedFullText([])).toBe("");
    expect(
      buildAmendedFullText([
        article({
          id: "1",
          order: 1,
          label: "第1条",
          oldText: "削除のみ",
          newText: null,
        }),
      ]),
    ).toBe("");
  });
});

describe("buildAmendedFullTextHtml", () => {
  it("Pane 4 と同様、差分箇所だけ赤字下線の HTML にする", () => {
    const html = buildAmendedFullTextHtml([
      article({
        id: "1",
        order: 1,
        label: "第3条",
        title: "対象者",
        oldText: "対象者は、職員、嘱託職員とする。",
        newText: "対象者は、職員、嘱託職員、再雇用嘱託職員とする。",
      }),
    ]);

    expect(html).toContain('<font color="#FF0000"><u>、再雇用嘱託職員</u></font>');
    expect(html).toContain("第3条（対象者）");
    expect(html).not.toMatch(/<font color="#FF0000"><u>[^<]*第3条/);
  });

  it("改正なし条文は span を付けない", () => {
    const html = buildAmendedFullTextHtml([
      article({
        id: "1",
        order: 1,
        label: "第25条",
        title: "介護休暇",
        oldText: "介護休暇の本文",
        newText: "介護休暇の本文",
      }),
    ]);

    expect(html).not.toContain('<font color="#FF0000">');
    expect(html).toContain("第25条（介護休暇）");
    expect(html).toContain("介護休暇の本文");
  });

  it("新設条文は新文全体を赤字下線にする", () => {
    const html = buildAmendedFullTextHtml([
      article({
        id: "1",
        order: 1,
        label: "第7条",
        title: "新設",
        oldText: null,
        newText: "新設される条文",
      }),
    ]);

    expect(html).toContain(
      '<font color="#FF0000"><u>新設される条文</u></font>',
    );
  });
});
