"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCopy, FileText, ListChecks } from "lucide-react";

import { saveRegulationRevisionWorkspace } from "@/app/actions/regulation-revision";
import {
  buildAmendedFullTextClipboardPayload,
  copyAmendedFullTextToClipboard,
} from "@/lib/regulation-revision/amended-full-text";
import { splitRegulationTextToArticleBlocks } from "@/lib/regulation-revision/article-split";
import { createDiffParts } from "@/lib/regulation-revision/diff";
import { downloadShinkyutaisyoDocx } from "@/lib/regulation-revision/shinkyutaisyo-docx";
import { countChangedArticles } from "@/lib/regulation-revision/shinkyutaisyo";
import {
  type RegulationArticleBlock,
  type RegulationRevisionWorkspace as RegulationRevisionWorkspaceData,
  deriveArticleChangeKind,
  hasArticleDiff,
} from "@/lib/regulation-revision/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { InlineTextareaField } from "@/components/primitives/InlineTextareaField";
import { Pane1Toggle } from "@/components/workspace/Pane1Toggle";
import { cn } from "@/lib/utils";

type RegulationRevisionWorkspaceProps = {
  initialWorkspace: RegulationRevisionWorkspaceData;
  persistToDatabase?: boolean;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

const saveStatusLabels: Record<SaveStatus, string> = {
  idle: "",
  saving: "保存中…",
  saved: "保存済み",
  error: "保存失敗",
};

const progressLabels = {
  notStarted: "未着手",
  editing: "編集中",
  confirmed: "確認済み",
} as const;

const workspaceStatusLabels = {
  draft: "下書き",
  reviewing: "確認中",
  readyForSubmission: "提出準備完了",
} as const;

const changeKindLabels = {
  unchanged: "差分なし",
  modified: "修正",
  added: "新設",
  deleted: "削除",
} as const;

function progressBadgeVariant(
  status: keyof typeof progressLabels,
): "default" | "secondary" | "outline" {
  if (status === "confirmed") return "default";
  if (status === "editing") return "secondary";
  return "outline";
}

function changeBadgeVariant(
  article: Pick<RegulationArticleBlock, "oldText" | "newText">,
): "secondary" | "destructive" | "outline" {
  const changeKind = deriveArticleChangeKind(article);
  if (changeKind === "deleted") return "destructive";
  if (changeKind === "unchanged") return "outline";
  return "secondary";
}

function getInitialArticleId(workspace: RegulationRevisionWorkspaceData) {
  const firstRegulation = workspace.regulations[0];
  return (
    firstRegulation?.articles.find(
      (article) => article.isRevisionTarget || hasArticleDiff(article),
    )?.id ??
    firstRegulation?.articles[0]?.id ??
    ""
  );
}

function getFirstActionableArticleId(articles: RegulationArticleBlock[]) {
  return (
    articles.find((article) => article.isRevisionTarget || hasArticleDiff(article))
      ?.id ??
    articles[0]?.id ??
    ""
  );
}

export function RegulationRevisionWorkspace({
  initialWorkspace,
  persistToDatabase = false,
}: RegulationRevisionWorkspaceProps) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const skipNextSaveRef = useRef(true);
  const saveRequestIdRef = useRef(0);
  const [sourceTextDrafts, setSourceTextDrafts] = useState<Record<string, string>>(
    {},
  );
  const [pendingGenerateSourceText, setPendingGenerateSourceText] = useState<
    string | null
  >(null);
  const [pendingWordExportWithoutDiffs, setPendingWordExportWithoutDiffs] =
    useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [wordExportError, setWordExportError] = useState<string | null>(null);
  const isExportingWordRef = useRef(false);
  const [copyFullTextStatus, setCopyFullTextStatus] = useState<"idle" | "copied">(
    "idle",
  );
  const [copyFullTextError, setCopyFullTextError] = useState<string | null>(null);
  const [copyFullTextEmptyOpen, setCopyFullTextEmptyOpen] = useState(false);
  const copyFullTextResetTimerRef = useRef<number | null>(null);
  const [selectedRegulationId, setSelectedRegulationId] = useState(
    initialWorkspace.regulations[0]?.id ?? "",
  );
  const [selectedArticleId, setSelectedArticleId] = useState(
    getInitialArticleId(initialWorkspace),
  );

  useEffect(() => {
    if (!persistToDatabase) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const requestId = ++saveRequestIdRef.current;
    setSaveStatus("saving");

    const timer = window.setTimeout(() => {
      void (async () => {
        const result = await saveRegulationRevisionWorkspace(workspace);
        if (requestId !== saveRequestIdRef.current) return;

        if (result.ok) {
          setSaveStatus("saved");
          return;
        }

        setSaveStatus("error");
        console.error(result.error);
      })();
    }, 600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [persistToDatabase, workspace]);

  const activeRegulation = useMemo(
    () =>
      workspace.regulations.find(
        (regulation) => regulation.id === selectedRegulationId,
      ) ?? workspace.regulations[0],
    [selectedRegulationId, workspace.regulations],
  );

  const activeArticle = useMemo(
    () =>
      activeRegulation?.articles.find(
        (article) => article.id === selectedArticleId,
      ) ?? activeRegulation?.articles[0],
    [activeRegulation, selectedArticleId],
  );

  const selectRegulation = useCallback(
    (regulationId: string) => {
      const nextRegulation = workspace.regulations.find(
        (regulation) => regulation.id === regulationId,
      );
      setSelectedRegulationId(regulationId);
      setSelectedArticleId(
        nextRegulation ? getFirstActionableArticleId(nextRegulation.articles) : "",
      );
    },
    [workspace.regulations],
  );

  const updateActiveArticle = useCallback(
    (patch: Partial<RegulationArticleBlock>) => {
      if (!activeRegulation || !activeArticle) return;

      setWorkspace((current) => ({
        ...current,
        regulations: current.regulations.map((regulation) => {
          if (regulation.id !== activeRegulation.id) return regulation;

          return {
            ...regulation,
            progressStatus:
              regulation.progressStatus === "confirmed"
                ? regulation.progressStatus
                : "editing",
            articles: regulation.articles.map((article) =>
              article.id === activeArticle.id ? { ...article, ...patch } : article,
            ),
          };
        }),
      }));
    },
    [activeArticle, activeRegulation],
  );

  const updateActiveRegulationSourceText = useCallback(
    (value: string) => {
      if (!activeRegulation) return;

      setWorkspace((current) => ({
        ...current,
        regulations: current.regulations.map((regulation) => {
          if (regulation.id !== activeRegulation.id) return regulation;

          return {
            ...regulation,
            progressStatus:
              regulation.progressStatus === "confirmed"
                ? regulation.progressStatus
                : "editing",
            sourceText: value,
          };
        }),
      }));
    },
    [activeRegulation],
  );

  const updateSourceTextDraft = useCallback((regulationId: string, value: string) => {
    setSourceTextDrafts((current) => ({
      ...current,
      [regulationId]: value,
    }));
  }, []);

  const generateArticlesForActiveRegulation = useCallback(
    (sourceText: string) => {
      if (!activeRegulation) return;
      if (sourceText.trim() === "") return;

      const nextArticles = splitRegulationTextToArticleBlocks(sourceText);
      if (nextArticles.length === 0) return;

      setWorkspace((current) => ({
        ...current,
        regulations: current.regulations.map((regulation) => {
          if (regulation.id !== activeRegulation.id) return regulation;

          return {
            ...regulation,
            progressStatus:
              regulation.progressStatus === "confirmed"
                ? regulation.progressStatus
                : "editing",
            sourceText,
            articles: nextArticles,
          };
        }),
      }));
      setSelectedArticleId(getFirstActionableArticleId(nextArticles));
    },
    [activeRegulation],
  );

  const exportActiveRegulationWord = useCallback(async () => {
    if (!activeRegulation || isExportingWordRef.current) return;

    isExportingWordRef.current = true;
    setIsExportingWord(true);
    setWordExportError(null);

    try {
      await downloadShinkyutaisyoDocx(activeRegulation);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      const message =
        error instanceof Error ? error.message : "Word出力に失敗しました";
      console.error(error);
      setWordExportError(message);
    } finally {
      isExportingWordRef.current = false;
      setIsExportingWord(false);
    }
  }, [activeRegulation]);

  const requestWordExport = useCallback(() => {
    if (!activeRegulation) return;

    if (countChangedArticles(activeRegulation.articles) === 0) {
      setPendingWordExportWithoutDiffs(true);
      return;
    }

    void exportActiveRegulationWord();
  }, [activeRegulation, exportActiveRegulationWord]);

  const copyAmendedFullText = useCallback(async () => {
    if (!activeRegulation) return;

    const { plain } = buildAmendedFullTextClipboardPayload(activeRegulation.articles);
    if (plain.trim() === "") {
      setCopyFullTextEmptyOpen(true);
      return;
    }

    try {
      await copyAmendedFullTextToClipboard(activeRegulation.articles);
      setCopyFullTextError(null);
      setCopyFullTextStatus("copied");
      if (copyFullTextResetTimerRef.current !== null) {
        window.clearTimeout(copyFullTextResetTimerRef.current);
      }
      copyFullTextResetTimerRef.current = window.setTimeout(() => {
        setCopyFullTextStatus("idle");
        copyFullTextResetTimerRef.current = null;
      }, 2000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "クリップボードへのコピーに失敗しました";
      console.error(error);
      setCopyFullTextError(message);
    }
  }, [activeRegulation]);

  useEffect(() => {
    return () => {
      if (copyFullTextResetTimerRef.current !== null) {
        window.clearTimeout(copyFullTextResetTimerRef.current);
      }
    };
  }, []);

  const diffParts = useMemo(
    () =>
      activeArticle
        ? createDiffParts(activeArticle.oldText, activeArticle.newText)
        : [],
    [activeArticle],
  );

  if (!activeRegulation || !activeArticle) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <Card>
          <CardHeader>
            <CardTitle>規程データがありません</CardTitle>
            <CardDescription>
              規程改正ワークスペースに表示する対象規程を追加してください。
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const activeChangeKind = deriveArticleChangeKind(activeArticle);
  const changedArticleCount = countChangedArticles(activeRegulation.articles);
  const activeSourceText =
    sourceTextDrafts[activeRegulation.id] ?? activeRegulation.sourceText;
  const canGenerateArticles = activeSourceText.trim() !== "";

  return (
    <SidebarProvider
      defaultOpen
      className="h-screen w-full overflow-hidden bg-gradient-to-br from-background via-background to-muted/40 text-foreground"
    >
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border [&_[data-slot=sidebar-container]]:bg-gradient-to-b [&_[data-slot=sidebar-container]]:from-sidebar [&_[data-slot=sidebar-container]]:via-sidebar [&_[data-slot=sidebar-container]]:to-background"
      >
        <SidebarHeader className="border-b border-sidebar-border bg-sidebar/80 p-0 backdrop-blur">
          <div className="flex h-12 items-center justify-between gap-2 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[state=expanded]:px-5">
            <h2 className="truncate text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              規程改正
            </h2>
            <Pane1Toggle />
          </div>
        </SidebarHeader>

        <SidebarContent className="px-1 py-3 group-data-[collapsible=icon]:hidden">
          <SidebarGroup className="px-1">
            <SidebarGroupLabel className="px-2 text-xs font-semibold tracking-wide text-sidebar-foreground/70 uppercase">
              対象規程
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {workspace.regulations.map((regulation) => {
                  return (
                    <SidebarMenuItem key={regulation.id}>
                      <SidebarMenuButton
                        tooltip={regulation.title}
                        isActive={regulation.id === activeRegulation.id}
                        onClick={() => selectRegulation(regulation.id)}
                      >
                        <span className="truncate">{regulation.title}</span>
                        <Badge
                          className="ml-auto"
                          variant={progressBadgeVariant(regulation.progressStatus)}
                          size="xs"
                        >
                          {progressLabels[regulation.progressStatus]}
                        </Badge>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="flex min-w-0 flex-col bg-transparent">
        <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b bg-gradient-to-r from-background via-card to-muted/60 px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{workspace.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {workspace.summary}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <Button
                type="button"
                size="sm"
                disabled={isExportingWord}
                onClick={requestWordExport}
              >
                <FileText data-icon="inline-start" aria-hidden />
                {isExportingWord ? "出力中…" : "新旧対照表をWord出力"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  void copyAmendedFullText();
                }}
              >
                <ClipboardCopy data-icon="inline-start" aria-hidden />
                {copyFullTextStatus === "copied"
                  ? "コピーしました"
                  : "改正後全文をコピー"}
              </Button>
              <Button type="button" variant="outline" size="sm">
                <ListChecks data-icon="inline-start" aria-hidden />
                修正条文一覧を出力
              </Button>
            </div>
            <Badge variant="outline">{workspaceStatusLabels[workspace.status]}</Badge>
            {persistToDatabase && saveStatus !== "idle" ? (
              <Badge
                variant={saveStatus === "error" ? "destructive" : "outline"}
              >
                {saveStatusLabels[saveStatus]}
              </Badge>
            ) : null}
            <Badge variant="secondary">{activeRegulation.title}</Badge>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <section className="flex w-72 shrink-0 flex-col border-r bg-gradient-to-b from-muted/70 via-background to-card">
            <div className="flex min-h-16 shrink-0 flex-col gap-1 border-b bg-card/70 px-4 py-3 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <h2 className="truncate text-sm font-semibold">条文</h2>
                <Badge variant={progressBadgeVariant(activeRegulation.progressStatus)}>
                  {progressLabels[activeRegulation.progressStatus]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {activeRegulation.articles.length}件中 {changedArticleCount}
                件に差分
              </p>
            </div>

            <Card size="sm" className="m-3">
              <CardHeader className="border-b">
                <CardTitle emphasis="prominent">規程本文</CardTitle>
                <CardDescription>
                  Wordからコピーした全文を貼り付け、条文候補を生成します。
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <InlineTextareaField
                  key={`${activeRegulation.id}-source-text`}
                  value={activeSourceText}
                  ariaLabel={`${activeRegulation.title}の規程本文`}
                  placeholder="Wordからコピーした規程全文を貼り付け"
                  className="max-h-72 overflow-y-auto"
                  onValueChange={(value) =>
                    updateSourceTextDraft(activeRegulation.id, value)
                  }
                  onSave={(value) => {
                    updateSourceTextDraft(activeRegulation.id, value);
                    updateActiveRegulationSourceText(value);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  `第○章`、`第○条`、`附則`、`別表` を目印に分割します。
                </p>
              </CardContent>
              <CardFooter className="justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canGenerateArticles}
                  onClick={() => setPendingGenerateSourceText(activeSourceText)}
                >
                  条文候補を生成
                </Button>
              </CardFooter>
            </Card>

            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-2 p-3">
                {activeRegulation.articles.map((article) => {
                  const active = article.id === activeArticle.id;
                  const changeKind = deriveArticleChangeKind(article);
                  return (
                    <button
                      key={article.id}
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => setSelectedArticleId(article.id)}
                      className={cn(
                        "flex w-full flex-col gap-2 rounded-lg border bg-card/95 p-3 text-left text-sm shadow-xs transition-colors hover:bg-accent/80 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                        active &&
                          "border-ring bg-gradient-to-r from-accent to-card shadow-sm",
                      )}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {article.label}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {article.title || "見出しなし"}
                          </span>
                        </span>
                        <Badge variant={changeBadgeVariant(article)} size="xs">
                          {changeKindLabels[changeKind]}
                        </Badge>
                      </span>
                      <span className="flex flex-wrap gap-1">
                        {article.isRevisionTarget && (
                          <Badge variant="outline" size="xs">
                            修正対象
                          </Badge>
                        )}
                        {article.kind !== "article" && (
                          <Badge variant="ghost" size="xs">
                            {article.kind}
                          </Badge>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </section>

          <main className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-background via-card/60 to-background">
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-4 p-4">
                <Card>
                  <CardHeader>
                    <CardTitle emphasis="prominent">
                      {activeArticle.label} {activeArticle.title}
                    </CardTitle>
                    <CardDescription>
                      旧文を見ながら、新文と修正理由を編集します。
                    </CardDescription>
                    <CardAction>
                      <Button
                        variant={
                          activeArticle.isRevisionTarget ? "secondary" : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          updateActiveArticle({
                            isRevisionTarget: !activeArticle.isRevisionTarget,
                          })
                        }
                      >
                        {activeArticle.isRevisionTarget
                          ? "修正対象"
                          : "修正対象にする"}
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <section className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">旧文</h3>
                        <Badge variant="outline">固定</Badge>
                      </div>
                      <div className="rounded-lg border bg-gradient-to-b from-muted/50 to-background p-3 text-sm leading-relaxed whitespace-pre-line">
                        {activeArticle.oldText ?? "（新設条文のため旧文なし）"}
                      </div>
                    </section>

                    <Separator />

                    <section className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">新文</h3>
                        <Badge variant="secondary">編集可</Badge>
                      </div>
                      <InlineTextareaField
                        key={`${activeArticle.id}-new-text`}
                        value={activeArticle.newText ?? ""}
                        ariaLabel={`${activeArticle.label}の新文`}
                        placeholder="改正後の条文を入力"
                        onSave={(value) => updateActiveArticle({ newText: value })}
                      />
                    </section>

                    <section className="flex flex-col gap-2">
                      <h3 className="text-sm font-semibold">修正理由</h3>
                      <InlineTextareaField
                        key={`${activeArticle.id}-reason`}
                        value={activeArticle.revisionReason}
                        ariaLabel={`${activeArticle.label}の修正理由`}
                        placeholder="常務会提出前の確認用メモとして修正理由を入力"
                        onSave={(value) =>
                          updateActiveArticle({ revisionReason: value })
                        }
                      />
                    </section>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </main>

          <aside className="flex w-96 shrink-0 flex-col border-l bg-gradient-to-b from-canvas via-card to-background">
            <div className="flex min-h-16 shrink-0 flex-col gap-1 border-b bg-card/70 px-4 py-3 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <h2 className="truncate text-sm font-semibold">差分プレビュー</h2>
                <Badge variant={changeBadgeVariant(activeArticle)}>
                  {changeKindLabels[activeChangeKind]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                選択中条文の赤字下線確認
              </p>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-4 p-4">
                <Card>
                  <CardHeader>
                    <CardTitle emphasis="prominent">改正後表示</CardTitle>
                    <CardDescription>
                      Wordで赤字下線を入れる箇所の確認用です。
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-line">
                      {diffParts.map((part, index) =>
                        part.changed ? (
                          <span
                            key={`${part.value}-${index}`}
                            className="text-destructive underline decoration-destructive underline-offset-2"
                          >
                            {part.value}
                          </span>
                        ) : (
                          <span key={`${part.value}-${index}`}>{part.value}</span>
                        ),
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card size="sm">
                  <CardHeader>
                    <CardTitle emphasis="prominent">新旧対照表プレビュー</CardTitle>
                    <CardDescription>
                      初回版の正式出力で優先する行の見え方です。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <section className="flex flex-col gap-2">
                        <h3 className="font-semibold">新</h3>
                        <div className="rounded-lg border bg-gradient-to-b from-background to-muted/40 p-3 leading-relaxed whitespace-pre-line">
                          {activeArticle.newText
                            ? diffParts.map((part, index) =>
                                part.changed ? (
                                  <span
                                    key={`${part.value}-${index}`}
                                    className="text-destructive underline decoration-destructive underline-offset-2"
                                  >
                                    {part.value}
                                  </span>
                                ) : (
                                  <span key={`${part.value}-${index}`}>
                                    {part.value}
                                  </span>
                                ),
                              )
                            : "（新文なし）"}
                        </div>
                      </section>
                      <section className="flex flex-col gap-2">
                        <h3 className="font-semibold">旧</h3>
                        <div className="rounded-lg border bg-gradient-to-b from-background to-muted/40 p-3 leading-relaxed whitespace-pre-line">
                          {activeArticle.oldText || "（旧文なし）"}
                        </div>
                      </section>
                    </div>
                    {activeArticle.revisionReason && (
                      <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                        修正理由: {activeArticle.revisionReason}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card size="sm">
                  <CardHeader>
                    <CardTitle emphasis="prominent">初回スコープ</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Badge variant="outline">対象規程を選ぶ</Badge>
                    <Badge variant="outline">条文を選ぶ</Badge>
                    <Badge variant="outline">新文を編集する</Badge>
                    <Badge variant="outline">差分を見る</Badge>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </aside>
        </div>
      </SidebarInset>

      <AlertDialog
        open={pendingGenerateSourceText !== null}
        onOpenChange={(open) => {
          if (!open) setPendingGenerateSourceText(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>既存の条文を置き換えますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{activeRegulation.title}」の条文リスト、新文、修正理由は、貼り付けた本文から作り直した候補に置き換わります。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingGenerateSourceText === null) return;

                const sourceText = pendingGenerateSourceText;
                setPendingGenerateSourceText(null);
                updateActiveRegulationSourceText(sourceText);
                generateArticlesForActiveRegulation(sourceText);
              }}
            >
              置き換えて生成
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingWordExportWithoutDiffs}
        onOpenChange={setPendingWordExportWithoutDiffs}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>変更のある条文がありません</AlertDialogTitle>
            <AlertDialogDescription>
              「{activeRegulation.title}」には差分のある条文がありません。それでも新旧対照表を出力しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setPendingWordExportWithoutDiffs(false);
                void exportActiveRegulationWord();
              }}
            >
              それでも出力
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={wordExportError !== null}
        onOpenChange={(open) => {
          if (!open) setWordExportError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Word出力に失敗しました</AlertDialogTitle>
            <AlertDialogDescription>
              {wordExportError}
              {" "}
              ブラウザがダウンロードをブロックしている場合は、アドレスバー付近の許可を確認してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setWordExportError(null)}>
              閉じる
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={copyFullTextEmptyOpen}
        onOpenChange={setCopyFullTextEmptyOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>コピーする条文がありません</AlertDialogTitle>
            <AlertDialogDescription>
              「{activeRegulation.title}」には改正後として連結できる条文がありません。削除されていない条文の新文があるか確認してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setCopyFullTextEmptyOpen(false)}>
              閉じる
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={copyFullTextError !== null}
        onOpenChange={(open) => {
          if (!open) setCopyFullTextError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>コピーに失敗しました</AlertDialogTitle>
            <AlertDialogDescription>
              {copyFullTextError}
              {" "}
              ブラウザがクリップボードへのアクセスを拒否している場合は、サイトの権限設定を確認してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setCopyFullTextError(null)}>
              閉じる
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
