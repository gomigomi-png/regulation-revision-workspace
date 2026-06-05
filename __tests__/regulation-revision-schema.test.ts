import { describe, expect, it } from "vitest";

import {
  deriveArticleChangeKind,
  hasArticleDiff,
  regulationRevisionWorkspaceSchema,
} from "@/lib/regulation-revision/schema";

describe("regulation revision workspace schema", () => {
  it("最小の改正案件データを受け取り、初期ステータスを補完する", () => {
    const result = regulationRevisionWorkspaceSchema.safeParse({
      id: "workspace-1",
      title: "看護休暇日数の変更",
      regulations: [
        {
          id: "regulation-1",
          title: "就業規則",
          articles: [
            {
              id: "article-1",
              order: 1,
              kind: "article",
              label: "第1条",
              oldText: "旧文",
              newText: "旧文",
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("draft");
      expect(result.data.summary).toBe("");
      expect(result.data.regulations[0].progressStatus).toBe("notStarted");
      expect(result.data.regulations[0].sourceText).toBe("");
      expect(result.data.regulations[0].articles[0].isRevisionTarget).toBe(
        false,
      );
    }
  });

  it("旧文と新文から条文の変更種別を派生する", () => {
    expect(
      deriveArticleChangeKind({ oldText: "旧文", newText: "旧文" }),
    ).toBe("unchanged");
    expect(
      deriveArticleChangeKind({ oldText: "旧文", newText: "新文" }),
    ).toBe("modified");
    expect(deriveArticleChangeKind({ oldText: null, newText: "新文" })).toBe(
      "added",
    );
    expect(deriveArticleChangeKind({ oldText: "旧文", newText: null })).toBe(
      "deleted",
    );
  });

  it("差分ありを変更種別から判定する", () => {
    expect(hasArticleDiff({ oldText: "同じ文", newText: "同じ文" })).toBe(
      false,
    );
    expect(hasArticleDiff({ oldText: "旧文", newText: "新文" })).toBe(true);
  });
});
