-- ============================================
-- Supabase Database Schema
-- AI Scheduler MVP
-- ============================================

-- 1. Users テーブル
-- Supabase Auth と連携するユーザー情報
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  avatar_url text,
  google_refresh_token text, -- 暗号化して保存推奨
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Friendships テーブル
-- フレンド関係の管理
create table public.friendships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  friend_id uuid references public.users(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, friend_id)
);

-- 3. Chat Messages テーブル
-- チャット履歴の保存
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  role text check (role in ('user', 'assistant')) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- インデックス
create index chat_messages_user_id_created_at_idx on public.chat_messages(user_id, created_at desc);
create index friendships_user_id_idx on public.friendships(user_id);
create index friendships_friend_id_idx on public.friendships(friend_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- RLS を有効化
alter table public.users enable row level security;
alter table public.friendships enable row level security;
alter table public.chat_messages enable row level security;

-- Users ポリシー
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can view friends' profiles"
  on public.users for select
  using (
    id in (
      select friend_id from public.friendships
      where user_id = auth.uid() and status = 'accepted'
      union
      select user_id from public.friendships
      where friend_id = auth.uid() and status = 'accepted'
    )
  );

-- Friendships ポリシー
create policy "Users can view their friendships"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can create friend requests"
  on public.friendships for insert
  with check (auth.uid() = user_id);

create policy "Users can update friendships they received"
  on public.friendships for update
  using (auth.uid() = friend_id);

create policy "Users can delete their friendships"
  on public.friendships for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- Chat Messages ポリシー
create policy "Users can view their own messages"
  on public.chat_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert their own messages"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

-- ============================================
-- Triggers
-- ============================================

-- updated_at を自動更新
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger on_users_updated
  before update on public.users
  for each row execute procedure public.handle_updated_at();

-- 新規ユーザー登録時に users テーブルにも追加
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
