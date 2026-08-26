# 規程改正ワークスペース 作業ガイド

このドキュメントは、ひな形（採用管理サンプル）と混ざっているリポジトリの中で、**規程改正ワークスペースを開く・見つける・GitHub で進める**ための手引です。

設計の理由やペイン責務は、検討メモ `docs/regulation-revision-workspace-notes.md` を正本にする。
画面・データ・出力の流れは `docs/regulation-revision-visual-explainer.md` を見る。

## 結論

- ブラウザで見る画面は **http://localhost:3000** だけ。別URLはない
- 起動コマンドは `npm run dev`
- 規程改正の本体は `components/regulation-revision/` と `data/regulation-revision-workspace.json`
- `components/workspace/` と `data/candidates.json` は採用管理サンプル。今のトップページには出ない

## ひな形との関係

このリポジトリは、もともと採用管理サンプルのひな形である。
規程改正ワークスペースは、そのひな形を土台に作った別画面である。

採用管理サンプルのファイルは残っている。
ただし `app/page.tsx` は、すでに規程改正ワークスペースを直接呼び出している。

| 見ているもの | 役割 |
|---|---|
| `README.md` | 採用管理ひな形の手引。先頭に規程改正ドキュメントへの案内あり |
| `docs/regulation-revision-workspace-notes.md` | 規程改正の設計検討メモ（目的・方針・ペイン責務） |
| このドキュメント | 規程改正のファイルのありか・開き方・GitHub 作業 |

README のスクリーンショットは採用管理のままなので、見た目の手がかりには使わない。

## 開き方

1. 作業フォルダをリポジトリのルートにする（例: `C:\Users\oosum\src\workspace-ui-kit`）
2. 初回だけ、依存パッケージを入れる

```bash
npm install
```

3. 開発サーバーを起動する

```bash
npm run dev
```

4. ブラウザで **http://localhost:3000** を開く

正しく開けていれば、「看護休暇制度の改正」などの規程改正画面が出る。
候補者リストが出る場合は、採用管理サンプルを見ている。`app/page.tsx` が規程改正を呼んでいるかを確認する。

止めるときは、そのターミナルで `Ctrl + C` を押す。

`npm run dev` は、`package.json` の `dev` スクリプト（中身は `next dev`）を実行する命令である。
自分の PC の中で画面を確認するための開発サーバーを起動する。インターネット公開ではない。

## 開発コマンド

ひな形 README と同じコマンドが使える。

| コマンド | 役割 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLint チェック |
| `npm run test` | スモークテスト（Vitest） |
| `npm run format` | Prettier で整形 |
| `npm run check:radius` | 角丸ドリフト検出（独自スクリプト） |

規程改正の画面テストは `__tests__/regulation-revision-*.ts(x)` にある。

## 画面が出るまでの経路

1. `app/page.tsx`（入口）
2. `data/regulation-revision-workspace.json`（表示データ）
3. `components/regulation-revision/RegulationRevisionWorkspace.tsx`（画面本体）

Cursor で中身を追うときは、この順で開く。

## フォルダの見分け方

名前に `regulation-revision` が付くものが、規程改正側である。

### 規程改正（今見たいもの）

| 役割 | 場所 |
|---|---|
| ブラウザの入口 | `app/page.tsx` |
| 画面本体 | `components/regulation-revision/RegulationRevisionWorkspace.tsx` |
| 画面データ | `data/regulation-revision-workspace.json` |
| 型・検証 | `lib/regulation-revision/schema.ts` |
| 条文分割 | `lib/regulation-revision/article-split.ts` |
| テスト | `__tests__/regulation-revision-*.ts(x)` |
| 検討メモ | `docs/regulation-revision-workspace-notes.md` |
| 図解 | `docs/regulation-revision-visual-explainer.md` |
| この作業ガイド | `docs/regulation-revision-workspace-guide.md` |

### 採用管理サンプル（残っているが、今は表示されない）

| 役割 | 場所 |
|---|---|
| 画面本体 | `components/workspace/`（`Workspace.tsx` など） |
| 画面データ | `data/candidates.json` / `data/positions.json` / `data/workspace.json` |
| 型 | `lib/schema.ts` |

`components/workspace/` は採用管理用である。
規程改正側は、トグルなど一部部品を借りているだけで、画面の中身ではない。

### 両方で使う共通部品

| 役割 | 場所 |
|---|---|
| shadcn の UI 部品 | `components/ui/` |
| インライン編集などの独自部品 | `components/primitives/` |
| 色・角丸などのトークン | `app/globals.css` |

## 自分の GitHub で作業する基本コマンド

このリポジトリを学校配布の `origin` ではなく、自分の GitHub リモート `github` で運用する場合の基本パターン。
手順はひな形 README と同じである。

### 作業前

`main` を自分の GitHub の最新にそろえ、新しい作業ブランチを切る。

```bash
git switch main
git pull github main
git switch -c feature/今回の作業名
```

例:

```bash
git switch main
git pull github main
git switch -c feature/regulation-revision-export
```

### 作業後

作業してコミットしたら、作業ブランチを自分の GitHub に push する。

```bash
git push -u github HEAD
```

そのあと GitHub 上で Pull Request を作成し、`main` に merge する。

### merge 後

GitHub 上で merge したあと、手元の `main` を最新化し、不要なら作業ブランチを削除する。

```bash
git switch main
git pull github main
git branch -d feature/今回の作業名
```
