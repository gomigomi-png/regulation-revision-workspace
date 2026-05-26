# PoC-3: 赤字下線差分プレビュー

## 目的

選択中条文について、旧文と新文を比較し、新文側の追加部分を赤字下線で表示できるか確認する。

## 確認したいこと

- 旧文と新文の差分を検出できる
- 追加部分を赤字下線用のHTMLにできる
- 差分なしを判定できる
- 削除された文言を赤色・下線・二重取り消し線で表示できる
- 改正後全文用プレビューでは削除文言を表示しない

## 入力

```text
poc/diff-preview/sample-diff.json
```

## プレビュー生成

```bash
node poc/diff-preview/generate-preview.mjs
```

出力先:

```text
poc/diff-preview/generated/preview.html
```

## テスト

```bash
node poc/diff-preview/test-diff-preview.mjs
```

## 初回PoCの範囲

このPoCでは、画面部品には組み込まず、HTMLとして赤字下線プレビューを生成するところまで確認する。

このPoCでは、プレビューを2種類に分ける。

- 改正後全文用プレビュー
  - 追加文言だけを赤字下線で表示する
  - 削除文言は表示しない
- 差分確認用プレビュー
  - 追加文言を赤字下線で表示する
  - 削除文言を赤色・下線・二重取り消し線で表示する
