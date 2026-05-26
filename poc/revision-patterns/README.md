# PoC-4: 削除・新設パターン

## 目的

条文の通常修正・削除・新設を、差分表示と新旧対照表Wordの両方で扱えるか確認する。

## 確認したいこと

- 通常修正を `旧文あり / 新文あり` として扱える
- 削除を `旧文あり / 新文なし` として扱える
- 新設を `旧文なし / 新文あり` として扱える
- 改正後全文用プレビューでは、削除文言を表示しない
- 差分確認用プレビューでは、削除文言を赤色・下線・二重取り消し線で表示できる
- 新旧対照表Wordでは、削除は新欄に `（削除）`、新設は旧欄に `（新設）` と出せる
- 新旧対照表Wordを横向きで出力できる
- 通常修正の新文は、差分のみ赤字下線で表示できる
- 通常修正の旧文は、旧欄のみ差分を下線で表示できる
- 削除の新欄 `（削除）` を赤字で表示できる
- 新設の新欄全文を赤字で表示できる

## 入力

```text
poc/revision-patterns/sample-patterns.json
```

## 生成

```bash
node poc/revision-patterns/generate-patterns.mjs
```

出力先:

```text
poc/revision-patterns/generated/patterns-preview.html
poc/revision-patterns/generated/revision-patterns-styled.docx
```

## テスト

```bash
node poc/revision-patterns/test-patterns.mjs
```
