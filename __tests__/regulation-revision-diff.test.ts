import { describe, expect, it } from "vitest";

import { createDiffParts } from "@/lib/regulation-revision/diff";

describe("createDiffParts", () => {
  it("同じ文は赤字にしない", () => {
    const text =
      "第1条（目的）\nこの規則は、職員の就業に関する基本的事項を定めることを目的とする。";

    expect(createDiffParts(text, text)).toEqual([
      { value: text, changed: false },
    ]);
  });

  it("追加された文言だけを変更箇所にする", () => {
    const oldText = "第3条（対象者）\n対象者は、職員、嘱託職員とする。";
    const newText =
      "第3条（対象者）\n対象者は、職員、嘱託職員、再雇用嘱託職員とする。";

    expect(createDiffParts(oldText, newText)).toEqual([
      {
        value: "第3条（対象者）\n対象者は、職員、嘱託職員",
        changed: false,
      },
      { value: "、再雇用嘱託職員", changed: true },
      { value: "とする。", changed: false },
    ]);
  });

  it("削除された文言は改正後表示に出さない", () => {
    const oldText =
      "第5条（休憩時間）\n会社は、勤務時間が6時間を超える場合は45分、8時間を超える場合は1時間の休憩を与える。";
    const newText =
      "第5条（休憩時間）\n会社は、勤務時間が6時間を超える場合は45分の休憩を与える。";

    expect(createDiffParts(oldText, newText)).toEqual([
      {
        value:
          "第5条（休憩時間）\n会社は、勤務時間が6時間を超える場合は45分の休憩を与える。",
        changed: false,
      },
    ]);
  });

  it("新設条文は新文全体を変更箇所にする", () => {
    expect(createDiffParts(null, "第7条（新設）")).toEqual([
      { value: "第7条（新設）", changed: true },
    ]);
  });

  it("削除条文は削除表示にする", () => {
    expect(createDiffParts("第7条（旧）", null)).toEqual([
      { value: "（削除）", changed: true },
    ]);
  });

  it("サンプル第24条でも専用フレーズに頼らず比較する", () => {
    const oldText =
      "小学校就学の始期に達するまでの子を養育する従業員は、負傷し、または疾病にかかった当該子の世話をするため、年次有給休暇とは別に子の看護休暇を取得することができる。";
    const newText =
      "小学校第３学年終了前の子を養育する従業員は、負傷し、または疾病にかかった当該子の世話、感染症に伴う学級閉鎖等への対応、または学校行事への参加のため、年次有給休暇とは別に子の看護等休暇を取得することができる。";

    const parts = createDiffParts(oldText, newText);
    const unchanged = parts
      .filter((part) => !part.changed)
      .map((part) => part.value)
      .join("");
    const changed = parts
      .filter((part) => part.changed)
      .map((part) => part.value)
      .join("");

    expect(unchanged).toContain("小学校");
    expect(unchanged).toContain("の子を養育する従業員は");
    expect(changed).toContain("第３");
    expect(changed).toContain("終了前");
    expect(changed).toContain("感染症に伴う学級閉鎖");
    expect(changed).not.toContain("小学校");
  });
});
