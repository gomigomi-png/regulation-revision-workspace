# PoC-1: 新旧対照表 Word 出力

## 目的

サンプルデータから、常務会提出用に近い `新 / 旧` 2列の新旧対照表 `.docx` を生成できるか確認する。

## 確認したいこと

- Wordで開ける `.docx` を生成できる
- 日本語が崩れない
- 見出しに修正対象規程のタイトルを表示できる
- 左列を `新`、右列を `旧` にできる
- 変更のない範囲を `第1条〜第2条 【略】` のように省略表示できる
- 末尾に `以上` を入れられる

## 実行方法

```bash
node poc/word-export/generate-shinkyutaisyo.mjs
```

## 出力先

```text
poc/word-export/generated/shinkyutaisyo-poc.docx
```

## 初回PoCの範囲

このPoCでは、通常修正1件のみを扱う。
条文削除・条文新設・複数規程・画面操作からの出力は、次のPoC以降で確認する。
