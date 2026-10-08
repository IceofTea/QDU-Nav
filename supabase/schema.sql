-- Supabase 建表（在 SQL Editor 粘贴执行一次即可）
-- 对应 src/wall/cloud.js；RLS 演示级开放读写，上线答辩够用，
-- 正式运营再收紧为“读开放、写需登录”。

create table if not exists wall_posts (
  id bigint generated always as identity primary key,
  title text default '',
  content text default '',
  tag text default 'chat',
  ptype text default 'normal',
  author text default '匿名同学',
  anonymous boolean default false,
  vote jsonb,
  bounty jsonb,
  resource jsonb,
  likes integer default 0,
  views integer default 0,
  reactions jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_wall_posts_tag_time on wall_posts (tag, created_at desc);

create table if not exists wall_replies (
  id bigint generated always as identity primary key,
  post_id bigint references wall_posts (id) on delete cascade,
  author text default '匿名同学',
  content text default '',
  likes integer default 0,
  parent_cloud bigint,
  reply_to text default '',
  created_at timestamptz default now()
);
create index if not exists idx_wall_replies_post on wall_replies (post_id, created_at asc);

alter table wall_posts enable row level security;
alter table wall_replies enable row level security;

drop policy if exists "open_read_posts" on wall_posts;
create policy "open_read_posts" on wall_posts for select using (true);
drop policy if exists "open_write_posts" on wall_posts;
create policy "open_write_posts" on wall_posts for all using (true) with check (true);

drop policy if exists "open_read_replies" on wall_replies;
create policy "open_read_replies" on wall_replies for select using (true);
drop policy if exists "open_write_replies" on wall_replies;
create policy "open_write_replies" on wall_replies for all using (true) with check (true);
