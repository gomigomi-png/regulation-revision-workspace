"use client";

/**
 * InlineTextareaField — Pane 4 編集 UI の「複数行 textarea」プリミティブ。
 *
 * shadcn `<Textarea>` をラップし、Lab v3 で確定した規律で編集体験を統一する:
 *   - 常に `<Textarea>` 表示（Type-direct、ADR-0014）
 *   - `bg-card` で周囲（bg-background）より明るく「手前」感を出す
 *   - `field-sizing: content`（Tailwind v4 / shadcn v4 の textarea デフォルト）で内容に応じて自動リサイズ
 *   - 保存: blur で onSave 発火（値が変わっていれば）。Cmd+Enter で blur
 *   - キャンセル: Esc で defaultValue に戻して blur
 *
 * 雛形では「職務経歴」「志望動機」のような長文項目で再利用。
 */

import { useEffect, useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type InlineTextareaFieldProps = {
  /** 現在の値（空文字で「未設定」placeholder 表示） */
  value: string;
  /** 入力中の値変化。即時反映したい親があれば使う */
  onValueChange?: (v: string) => void;
  /** 値が変わって blur した時に呼ばれる */
  onSave: (v: string) => void;
  /** スクリーンリーダー向けラベル */
  ariaLabel: string;
  /** 空のときの placeholder。デフォルト "未設定" */
  placeholder?: string;
  /** 個別用途で高さやスクロール挙動を調整したい場合に付与する class */
  className?: string;
};

export function InlineTextareaField({
  value,
  onValueChange,
  onSave,
  ariaLabel,
  placeholder,
  className,
}: InlineTextareaFieldProps) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  return (
    <Textarea
      value={draftValue}
      placeholder={placeholder ?? "未設定"}
      aria-label={ariaLabel}
      onChange={(e) => {
        setDraftValue(e.target.value);
        onValueChange?.(e.target.value);
      }}
      onBlur={(e) => {
        if (draftValue !== value) onSave(draftValue);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          (e.target as HTMLTextAreaElement).blur();
        } else if (e.key === "Escape") {
          setDraftValue(value);
          onValueChange?.(value);
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      className={cn(
        "min-h-24 bg-card leading-relaxed whitespace-pre-line",
        className,
      )}
    />
  );
}
