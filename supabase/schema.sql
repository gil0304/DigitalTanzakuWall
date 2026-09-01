-- Digital Tanzaku Wall: データベースセットアップ
-- Supabase Dashboard → SQL Editor に貼り付けて実行してください。

create table if not exists public.tanzaku_posts (
  id           uuid primary key default gen_random_uuid(),
  wish_text    text not null check (char_length(btrim(wish_text)) between 1 and 40),
  display_name text not null default '' check (char_length(display_name) <= 12),
  is_anonymous boolean not null default false,
  color        text not null check (color in ('red', 'blue', 'yellow', 'purple', 'green', 'white')),
  is_visible   boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists tanzaku_posts_created_at_idx
  on public.tanzaku_posts (created_at desc);

alter table public.tanzaku_posts enable row level security;

-- 誰でも閲覧できる(表示画面は anon キーで接続するため)
drop policy if exists "tanzaku_public_read" on public.tanzaku_posts;
create policy "tanzaku_public_read"
  on public.tanzaku_posts for select
  to anon, authenticated
  using (true);

-- 誰でも投稿できる(内容の制約はチェック制約とアプリ側バリデーションで担保)
drop policy if exists "tanzaku_public_insert" on public.tanzaku_posts;
create policy "tanzaku_public_insert"
  on public.tanzaku_posts for insert
  to anon, authenticated
  with check (is_visible = true);

-- 更新・削除のポリシーは作らない = anon キーからは変更不可。
-- モデレーションは Dashboard(service role)から行う。

-- Realtime を有効化
do $$
begin
  alter publication supabase_realtime add table public.tanzaku_posts;
exception
  when duplicate_object then null;
end $$;

-- ---- 運用でよく使うSQL ----

-- 不適切な投稿を非表示にする(表示画面からリアルタイムで消える):
--   update public.tanzaku_posts set is_visible = false where id = '投稿ID';

-- 投稿の一覧(新しい順):
--   select id, wish_text, display_name, is_anonymous, is_visible, created_at
--   from public.tanzaku_posts order by created_at desc limit 50;

-- 全投稿をリセットする:
--   truncate public.tanzaku_posts;
