# 規程改正ワークスペース 作業ガイド

このドキュメントは、ひな形（採用管理サンプル）と混ざっているリポジトリの中で、**規程改正ワークスペースを開く・見つける・GitHub / Vercel / Neon で進める**ための手引です。

設計の理由やペイン責務は、検討メモ `docs/regulation-revision-workspace-notes.md` を正本にする。
画面・データ・出力の流れは `docs/regulation-revision-visual-explainer.md` を見る。

## 結論

- 自分の PC で見る画面は **http://localhost:3000**（`npm run dev`）
- **公開 URL** は **https://regulation-revision-workspace.vercel.app**（Vercel の Visit。他の人も開ける）
- 規程改正の本体は `components/regulation-revision/`。初期見本は `data/regulation-revision-workspace.json`
- `components/workspace/` と `data/candidates.json` は採用管理サンプル。今のトップページには出ない
- データの正本は **Neon**。編集は自動保存され、リロードしても残る（手元も公開 URL も同じ箱を見る）

## GitHub / Vercel / Neon の違い

3つは別物である。混ぜると「コードを直したのに画面が変わらない」「箱はあるのに消える」が起きる。

| 名前 | たとえ | このプロジェクトでの役割 |
|---|---|---|
| **GitHub** | 原稿の倉庫 | コードの履歴を置く。リモート名は `github`。リポジトリは `gomigomi-png/regulation-revision-workspace` |
| **Vercel** | 公開用の店 | GitHub のコードを組み立てて URL で公開する。プロジェクト名は `regulation-revision-workspace` |
| **Neon** | 店の奥のキャビネット | 表形式のデータベース（中身は Postgres）。案件・規程・条文をしまっておく箱 |

コードの公開と、データの保存は別物である。

```text
手元の編集（コード）
  → GitHub に push（原稿を倉庫へ）
  → Vercel が組み立てて公開（店に並べる）

手元 / 公開画面での編集（データ）
  → Neon に保存する（キャビネットへ）
```

### 似ているが違う言葉

| 言葉 | 意味 |
|---|---|
| **リポジトリ** | GitHub 上の1つの倉庫。コードが入る |
| **Vercel プロジェクト** | Vercel 上の1つの店。公開設定と環境変数を持つ |
| **デプロイ** | 倉庫の原稿から店の商品を組み立てて並べること。成功すると Ready |
| **環境変数** | コードに書かない設定。接続先 `DATABASE_URL` など。値はパスワードと同じ |
| **Postgres** | 表（行と列）でデータを置くデータベースの種類。Neon の中身 |
| **Hobby** | Vercel の無料枠。鍵つきリポジトリの共同公開は制限がある |

手元の `localhost:3000` は自分の PC の確認用である。**公開 URL**（`https://regulation-revision-workspace.vercel.app`）は他の人も開ける公開用である。どちらも Neon の同じデータを読む。

学校配布のリモートは `origin`、自分の GitHub は `github` である。公開と Neon は自分の GitHub / Vercel 側で進めている。

## 学習の5ステップと、ここまでやったこと

勉強のゴールは次の3つである。

- リロードしても、入力したデータが消えない
- 別の端末や他の人からも、公開したアプリを開ける
- 「どのデータを、どこに、なぜ保存したか」を自分の言葉で説明できる

進め方は5ステップである。

| ステップ | 内容 | 状態 |
|---|---|---|
| ① | 何をどこに保存するか決める | 完了。案Aの3表 |
| ② | データベースの箱を用意する | 完了。Neon と `DATABASE_URL` |
| ③ | 保存の仕組みを作る | 完了。3表 + 読み書き + 自動保存 |
| ④ | リロードで消えないか確認する | 完了。手元（localhost）で確認 |
| ⑤ | Vercel に公開する | 完了。公開 URL でも保存・リロードを確認 |

### ①で決めたこと

画面の入れ子を、そのまま3つの表にする（案A）。

| 表 | 何を置くか |
|---|---|
| `workspaces` | 改正案件（例: 看護休暇制度の改正） |
| `regulations` | 対象規程（例: 就業規則） |
| `articles` | 条文（例: 第24条） |

紐付けは「案件 1 対 多 規程」「規程 1 対 多 条文」。
差分ありや赤字下線は保存せず、旧文と新文から計算する。
履歴表（案D）は将来必ず欲しいが、今は作らない。
ブラウザの `localStorage`（その PC のメモ帳）にはしない。公開と説明のため、Neon 上の表にする。

### 画面側で直したこと（保存の前）

- 条文候補の生成前に確認する。誤って押し直すと編集が消えるため
- Pane 4 の赤字下線を、サンプル第24条専用ではなく、どの条文でも同じ文字比較にする
- 本番ビルド（`npm run build`）で落ちていた条文分割の型エラーを直す

規程追加・条文の新設削除・Word 出力は、記憶の前提ではないので後回しである。

### ②でやったこと（箱と店）

- GitHub に規程改正のコードを push した
- Vercel に `regulation-revision-workspace` を作り、GitHub から輸入（Import）してデプロイした
- Hobby の鍵つきリポジトリ制限でデプロイがブロックされたため、GitHub リポジトリを Public にし、Vercel プロジェクトを消してもう一度輸入した。その結果 Ready になった
- Visit で公開画面が出る
- このプロジェクトの Storage に Neon を足した
- Environment Variables に `DATABASE_URL` がある。Neon が足した別名（`PGHOST` など）も並ぶが、消さない。アプリが使うのは `DATABASE_URL`
- 無関係だった Vercel プロジェクト `commenting-visual-explainers` は削除した
- 手元用のひな形は `.env.example`。本物の値は `.env.local` に書き、GitHub には上げない

接続文字列はチャットや GitHub に貼らない。

### ③〜⑤でやったこと（保存と公開）

- Neon に `workspaces` / `regulations` / `articles` の3表を作った（`npm run db:setup`）
- 画面の読み書きを Neon に切り替えた。JSON は初期投入・フォールバック用
- 編集はデバウンスで自動保存。ヘッダーに「保存済み」が出る
- 手元（`http://localhost:3000`）でリロードしても残ることを確認した
- 公開 URL（`https://regulation-revision-workspace.vercel.app`）でも同様に確認した
- 公開ページは毎回 Neon から読む（`force-dynamic`）。静的化すると保存してもリロードで戻る

## ひな形との関係

このリポジトリは、もともと採用管理サンプルのひな形である。
規程改正ワークスペースは、そのひな形を土台に作った別画面である。

採用管理サンプルのファイルは残っている。
ただし `app/page.tsx` は、すでに規程改正ワークスペースを直接呼び出している。

| 見ているもの | 役割 |
|---|---|
| `README.md` | 採用管理ひな形の手引。先頭に規程改正ドキュメントへの案内あり |
| `docs/regulation-revision-workspace-notes.md` | 規程改正の設計検討メモ（目的・方針・ペイン責務） |
| このドキュメント | 規程改正のファイルのありか・開き方・GitHub / Vercel / Neon の整理 |

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
| `npm run db:setup` | Neon に3表を作り、初期データを入れる |

規程改正の画面テストは `__tests__/regulation-revision-*.ts(x)` にある。

## 画面が出るまでの経路

1. `app/page.tsx`（入口。Neon から読み、失敗時は JSON）
2. `lib/regulation-revision/db/`（Neon の接続・読み書き）
3. `components/regulation-revision/RegulationRevisionWorkspace.tsx`（画面本体。自動保存）

初期見本データは `data/regulation-revision-workspace.json`。Cursor で中身を追うときは、この順で開く。

## フォルダの見分け方

名前に `regulation-revision` が付くものが、規程改正側である。

### 規程改正（今見たいもの）

| 役割 | 場所 |
|---|---|
| ブラウザの入口 | `app/page.tsx` |
| 画面本体 | `components/regulation-revision/RegulationRevisionWorkspace.tsx` |
| 初期見本データ | `data/regulation-revision-workspace.json` |
| Neon の表定義・読み書き | `lib/regulation-revision/db/` |
| 保存 Server Action | `app/actions/regulation-revision.ts` |
| 型・検証 | `lib/regulation-revision/schema.ts` |
| 条文分割 | `lib/regulation-revision/article-split.ts` |
| 赤字下線の比較 | `lib/regulation-revision/diff.ts` |
| 接続設定のひな形 | `.env.example`（値は入れない。本物は `.env.local`） |
| DB セットアップ | `npm run db:setup` |
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

### merge 後（習慣: Merge したら pull）

GitHub 上で merge すると、**GitHub の `main` だけが先に新しくなる**。  
手元（自分の PC）の `main` は古いまま残る。次の作業前に必ずそろえる。

習慣は **Merge したら pull** である。ターミナル（Cursor の Terminal など）で、リポジトリ直下から次を打つ。

```bash
git switch main
git pull github main
```

- `git switch main` … 手元で本番用の本線（`main`）を開く
- `git pull github main` … GitHub の最新 `main` を手元に取り込む

不要なら作業ブランチも削除する。

```bash
git branch -d feature/今回の作業名
```

merge 後に Vercel が Ready になったら、**公開 URL**（`https://regulation-revision-workspace.vercel.app`）でも動作確認する。
