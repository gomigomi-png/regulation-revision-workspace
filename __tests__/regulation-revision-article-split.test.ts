import { describe, expect, it } from "vitest";

import { splitRegulationTextToArticleBlocks } from "@/lib/regulation-revision/article-split";

const sampleRegulationText = `就業規則

第1章 総則

第1条（目的）
この規則は、職員の就業に関する基本的事項を定めることを目的とする。

第2条（適用範囲）
この規則は、会社に勤務する職員に適用する。
2 パートタイマー、嘱託職員その他の職員について別に定める場合は、その定めるところによる。

第3条（対象者）
対象者は、職員、嘱託職員とする。

第2章 勤務

第4条（勤務時間）
職員の勤務時間は、1日8時間、1週40時間を原則とする。

第5条（休憩時間）
会社は、勤務時間が6時間を超える場合は45分、8時間を超える場合は1時間の休憩を与える。

第6条（看護休暇）
小学校就学の始期に達するまでの子を養育する職員は、申し出ることにより看護休暇を取得することができる。
2 看護休暇の取得日数は、対象となる子が1人の場合は年5日、2人以上の場合は年10日とする。

附則
この規則は、令和6年4月1日から施行する。

別表1
手当の種類および金額は、会社が別に定める。
`;

describe("splitRegulationTextToArticleBlocks", () => {
  it("第○章、第○条、附則、別表を条文ブロックへ分割する", () => {
    const blocks = splitRegulationTextToArticleBlocks(sampleRegulationText);

    expect(blocks).toHaveLength(10);
    expect(blocks.map((block) => block.kind)).toEqual([
      "chapter",
      "article",
      "article",
      "article",
      "chapter",
      "article",
      "article",
      "article",
      "supplementary",
      "appendix",
    ]);
    expect(blocks.map((block) => block.label)).toEqual([
      "第1章",
      "第1条",
      "第2条",
      "第3条",
      "第2章",
      "第4条",
      "第5条",
      "第6条",
      "附則",
      "別表1",
    ]);
    expect(blocks[0]).toMatchObject({
      kind: "chapter",
      title: "総則",
      oldText: "第1章 総則",
    });
    expect(blocks[1]).toMatchObject({
      kind: "article",
      title: "目的",
      oldText:
        "第1条（目的）\nこの規則は、職員の就業に関する基本的事項を定めることを目的とする。",
    });
    expect(blocks[8]).toMatchObject({
      kind: "supplementary",
      label: "附則",
      oldText: "附則\nこの規則は、令和6年4月1日から施行する。",
    });
    expect(blocks[9]).toMatchObject({
      kind: "appendix",
      label: "別表1",
      oldText: "別表1\n手当の種類および金額は、会社が別に定める。",
    });
  });

  it("生成直後は旧文と新文を同じ内容で初期化する", () => {
    const blocks = splitRegulationTextToArticleBlocks(sampleRegulationText);

    expect(blocks.every((block) => block.oldText === block.newText)).toBe(true);
    expect(blocks.every((block) => block.revisionReason === "")).toBe(true);
    expect(blocks.every((block) => block.isRevisionTarget === false)).toBe(true);
  });

  it("入力順のまま order を振る", () => {
    const blocks = splitRegulationTextToArticleBlocks(sampleRegulationText);

    expect(blocks.map((block) => block.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(blocks.map((block) => block.id)).toEqual([
      "article-block-1",
      "article-block-2",
      "article-block-3",
      "article-block-4",
      "article-block-5",
      "article-block-6",
      "article-block-7",
      "article-block-8",
      "article-block-9",
      "article-block-10",
    ]);
  });

  it("見出しの前にある規程名や空行はブロックに含めない", () => {
    const blocks = splitRegulationTextToArticleBlocks(sampleRegulationText);

    expect(blocks[0]?.oldText).toBe("第1章 総則");
  });
});
