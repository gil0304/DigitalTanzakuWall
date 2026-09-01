# 🎋 Digital Tanzaku Wall

スマホで願いごとを書くと、会場の大画面にデジタル短冊として飾られていく、七夕参加型メッセージウォール。

| ルート | 画面 | 想定デバイス |
| --- | --- | --- |
| `/` | 投稿画面 | スマホ(QRコードからアクセス) |
| `/wall` | 表示画面 | PC + プロジェクター / 大型モニター |

## セットアップ

```bash
npm install
npm run dev
```

- 投稿画面: http://localhost:5173/
- 表示画面: http://localhost:5173/wall

### ローカルデモモード

Supabase の設定がなくてもそのまま動きます(同一ブラウザ内の別タブ間で共有される簡易モード)。
`/wall` を開いてブラウザのコンソールで `addDemoPost(10)` を実行すると、サンプルの短冊を流せます。

### Supabase を使う(本番運用)

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. Dashboard → SQL Editor で [supabase/schema.sql](supabase/schema.sql) を実行
3. `.env.example` をコピーして `.env` を作成し、Project Settings → API の値を設定

```bash
cp .env.example .env
# VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を記入
```

4. `npm run dev` を再起動すると自動的に Supabase モードになります(投稿画面下部の「ローカルデモモード」表記が消えます)

## ビルド・デプロイ

```bash
npm run build   # dist/ に出力
```

静的ホスティング(Vercel / Netlify / Cloudflare Pages など)にそのままデプロイできます。
`/wall` はクリーンURL(`wall.html`)として配信されます。ホスティング側でクリーンURLが無効な場合は `/wall.html` でアクセスしてください。

## 当日の運用

- **表示画面**: `/wall` を開いてダブルクリックするとフルスクリーンになります
- **QRコード**: デプロイしたURL(`/`)のQRコードを作成して会場に掲示してください
- **モデレーション**: Supabase Dashboard で対象の投稿を `is_visible = false` に更新すると、大画面からリアルタイムで消えます([schema.sql](supabase/schema.sql) 末尾に運用SQLあり)
- **リセット**: `truncate public.tanzaku_posts;` で全投稿を削除できます(表示画面はリロードしてください)

## 投稿の制御(MVP)

- 願いごと: 必須・40文字以内・改行不可・空白のみ禁止
- 名前: 任意・12文字以内(未入力は「匿名」表示)
- 匿名投稿: ON にすると名前を表示しない
- URLを含む投稿の禁止
- NGワードの簡易チェック([src/moderation.ts](src/moderation.ts) の `NG_WORDS` で調整)
- 連投防止: 同一端末から20秒間隔

## 表示のしくみ

- 手前のロープ2本に最大16枚を大きく表示
- 手前が埋まると、いちばん古い短冊が奥のロープ(最大20枚・小さく表示)へ流れる
- 奥も埋まると、古いものからフェードアウト
- 投稿数が増えるほど、星と光の粒が増えてにぎやかになる
- Realtime が切断されても約45秒ごとに自動で補正取得

## 構成

```
index.html            投稿画面
wall.html             表示画面
src/
  types.ts            型定義・バックエンドインターフェース
  moderation.ts       バリデーション・NGワード
  backend/            Supabase / ローカルデモの切り替え
  post/               投稿画面(フォーム・投稿完了)
  wall/               表示画面(短冊配置・笹の装飾・星空)
supabase/schema.sql   DBセットアップ + 運用SQL
```
