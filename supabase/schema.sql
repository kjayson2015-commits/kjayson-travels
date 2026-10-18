-- KJayson Travels: comments, likes and page visits.
-- Lives in the kjayson-blog Supabase project; every table starts with travel_.
-- Anyone can read and add. Only you (from the Supabase dashboard) can hide or delete.

create table if not exists public.travel_comments (
  id bigint generated always as identity primary key,
  thread_slug text not null check (char_length(thread_slug) between 1 and 120),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists travel_comments_slug_idx on public.travel_comments (thread_slug, created_at);

create table if not exists public.travel_likes (
  id bigint generated always as identity primary key,
  thread_slug text not null check (char_length(thread_slug) between 1 and 120),
  visitor_id text not null check (char_length(visitor_id) between 8 and 64),
  created_at timestamptz not null default now(),
  unique (thread_slug, visitor_id)
);

create table if not exists public.travel_page_views (
  id bigint generated always as identity primary key,
  path text not null check (char_length(path) between 1 and 300),
  title text check (char_length(title) <= 200),
  referrer text check (char_length(referrer) <= 300),
  visitor_id text check (char_length(visitor_id) <= 64),
  device text check (device in ('mobile', 'tablet', 'desktop')),
  created_at timestamptz not null default now()
);
create index if not exists travel_page_views_time_idx on public.travel_page_views (created_at);

alter table public.travel_comments enable row level security;
alter table public.travel_likes enable row level security;
alter table public.travel_page_views enable row level security;

drop policy if exists "anyone reads visible comments" on public.travel_comments;
create policy "anyone reads visible comments" on public.travel_comments
  for select to anon, authenticated using (hidden = false);
drop policy if exists "anyone adds comments" on public.travel_comments;
create policy "anyone adds comments" on public.travel_comments
  for insert to anon, authenticated with check (hidden = false);

drop policy if exists "anyone adds page views" on public.travel_page_views;
create policy "anyone adds page views" on public.travel_page_views
  for insert to anon, authenticated with check (true);

-- Light spam guard: at most 5 comments per thread per minute.
create or replace function public.travel_comment_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.travel_comments
      where thread_slug = new.thread_slug and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'Too many comments right now. Try again in a minute.';
  end if;
  new.name := btrim(new.name);
  new.body := btrim(new.body);
  return new;
end $$;
drop trigger if exists travel_comment_guard on public.travel_comments;
create trigger travel_comment_guard before insert on public.travel_comments
  for each row execute function public.travel_comment_guard();

-- Likes: read and toggle through functions only.
create or replace function public.travel_like_state(p_slug text, p_visitor text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'count', (select count(*) from public.travel_likes where thread_slug = p_slug),
    'liked', exists (select 1 from public.travel_likes where thread_slug = p_slug and visitor_id = p_visitor));
$$;

create or replace function public.travel_toggle_like(p_slug text, p_visitor text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if char_length(coalesce(p_visitor, '')) < 8 or char_length(coalesce(p_slug, '')) < 1 then
    raise exception 'bad request';
  end if;
  if exists (select 1 from public.travel_likes where thread_slug = p_slug and visitor_id = p_visitor) then
    delete from public.travel_likes where thread_slug = p_slug and visitor_id = p_visitor;
  else
    insert into public.travel_likes (thread_slug, visitor_id) values (p_slug, p_visitor);
  end if;
  return public.travel_like_state(p_slug, p_visitor);
end $$;

create or replace function public.travel_like_counts()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_object_agg(thread_slug, n), '{}'::json)
  from (select thread_slug, count(*) n from public.travel_likes group by thread_slug) s;
$$;

-- Dashboard numbers (totals only, no personal data).
create or replace function public.travel_stats(p_days int default 30)
returns json language sql stable security definer set search_path = public as $$
  with v as (
    select * from public.travel_page_views
    where created_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
  )
  select json_build_object(
    'views', (select count(*) from v),
    'visitors', (select count(distinct visitor_id) from v),
    'today', (select count(*) from public.travel_page_views where created_at > date_trunc('day', now())),
    'all_time', (select count(*) from public.travel_page_views),
    'likes', (select count(*) from public.travel_likes),
    'comments', (select count(*) from public.travel_comments where hidden = false),
    'by_day', (select coalesce(json_agg(d order by d.day), '[]'::json) from (
        select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day, count(*) as views, count(distinct visitor_id) as visitors
        from v group by 1) d),
    'top_pages', (select coalesce(json_agg(p), '[]'::json) from (
        select path, max(title) as title, count(*) as views from v group by path order by count(*) desc limit 15) p),
    'referrers', (select coalesce(json_agg(r), '[]'::json) from (
        select coalesce(nullif(referrer, ''), 'Direct') as source, count(*) as views from v group by 1 order by 2 desc limit 10) r),
    'devices', (select coalesce(json_agg(x), '[]'::json) from (
        select coalesce(device, 'unknown') as device, count(*) as views from v group by 1 order by 2 desc) x),
    'latest_comments', (select coalesce(json_agg(c), '[]'::json) from (
        select thread_slug, name, body, created_at from public.travel_comments where hidden = false order by created_at desc limit 10) c)
  );
$$;

revoke all on function public.travel_toggle_like(text, text) from public;
grant execute on function public.travel_like_state(text, text) to anon, authenticated;
grant execute on function public.travel_toggle_like(text, text) to anon, authenticated;
grant execute on function public.travel_like_counts() to anon, authenticated;
grant execute on function public.travel_stats(int) to anon, authenticated;
grant select, insert on public.travel_comments to anon, authenticated;
grant insert on public.travel_page_views to anon, authenticated;
