import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RegulationRevisionWorkspace } from "@/components/regulation-revision/RegulationRevisionWorkspace";
import { type RegulationRevisionWorkspace as RegulationRevisionWorkspaceData } from "@/lib/regulation-revision/schema";

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

const workspaceFixture: RegulationRevisionWorkspaceData = {
  id: "workspace-1",
  title: "規程改正テスト",
  status: "draft",
  summary: "条文候補生成の動作確認",
  regulations: [
    {
      id: "regulation-1",
      title: "就業規則",
      progressStatus: "notStarted",
      sourceText: "",
      articles: [
        {
          id: "seed-article-1",
          order: 1,
          kind: "article",
          label: "第99条",
          title: "仮条文",
          oldText: "仮の条文です。",
          newText: "仮の条文です。",
          revisionReason: "",
          isRevisionTarget: false,
        },
      ],
    },
  ],
};

describe("RegulationRevisionWorkspace", () => {
  it("貼り付け直後の規程本文から条文候補を生成できる", () => {
    render(<RegulationRevisionWorkspace initialWorkspace={workspaceFixture} />);

    fireEvent.change(screen.getByLabelText("就業規則の規程本文"), {
      target: { value: sampleRegulationText },
    });
    fireEvent.click(screen.getByRole("button", { name: "条文候補を生成" }));

    expect(screen.getByText("第1章")).toBeInTheDocument();
    expect(screen.getByText("第6条")).toBeInTheDocument();
    expect(screen.getByLabelText("第1章の新文")).toHaveValue("第1章 総則");
    expect(screen.queryByText("第99条")).not.toBeInTheDocument();
  });
});
