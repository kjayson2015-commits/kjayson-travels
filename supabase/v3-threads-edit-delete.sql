-- v3: nested reply threads, edit and delete.
-- Replies are now read and written only through the functions below, so each
-- reply's private edit key never leaves the browser that posted it.

alter table public.travel_comments add column if not exists parent_id bigint references public.travel_comments (id) on delete cascade;
alter table public.travel_comments add column if not exists edit_token text;
alter table public.travel_comments add column if not exists edited_at timestamptz;
alter table public.travel_comments add column if not exists deleted boolean not null default false;
alter table public.travel_comments add column if not exists user_id uuid;
alter table public.travel_comments add column if not exists avatar_url text check (char_length(avatar_url) <= 500);
alter table public.travel_comments add column if not exists verified boolean not null default false;
create index if not exists travel_comments_parent_idx on public.travel_comments (parent_id);

create table if not exists public.travel_blocked (user_id uuid primary key, created_at timestamptz not null default now());
alter table public.travel_blocked enable row level security;

-- Close direct table access; everything goes through the functions.
drop policy if exists "anyone reads visible comments" on public.travel_comments;
drop policy if exists "anyone adds comments" on public.travel_comments;
revoke select, insert, update, delete on public.travel_comments from anon, authenticated;

create or replace function public.travel_is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'kjayson2015@gmail.com'
     and coalesce((auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean, true);
$$;

create or replace function public.travel_list_replies(p_slug text)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object(
    'id', c.id, 'parent_id', c.parent_id, 'post_index', c.post_index,
    'name', case when c.deleted then '' else c.name end,
    'avatar_url', case when c.deleted then null else c.avatar_url end,
    'verified', c.verified and not c.deleted,
    'body', case when c.deleted then '' else c.body end,
    'deleted', c.deleted, 'created_at', c.created_at, 'edited_at', c.edited_at,
    'mine', (c.user_id is not null and c.user_id = auth.uid())
  ) order by c.created_at), '[]'::json)
  from public.travel_comments c
  where c.thread_slug = p_slug and c.hidden = false;
$$;

create or replace function public.travel_add_reply(p_slug text, p_name text, p_body text, p_post_index int default null, p_parent_id bigint default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_name text := left(btrim(coalesce(p_name, '')), 60);
  v_avatar text := null;
  v_verified boolean := false;
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_post int := p_post_index;
  r public.travel_comments;
begin
  if char_length(btrim(coalesce(p_body, ''))) = 0 then raise exception 'Write something first.'; end if;
  if p_parent_id is not null then
    select post_index into v_post from public.travel_comments where id = p_parent_id and thread_slug = p_slug and hidden = false;
    if not found then raise exception 'That reply no longer exists.'; end if;
  end if;
  if v_uid is not null then
    if exists (select 1 from public.travel_blocked where user_id = v_uid) then raise exception 'You can''t reply here.'; end if;
    v_name := left(coalesce(nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''), nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''), v_name), 60);
    v_avatar := left(coalesce(auth.jwt() -> 'user_metadata' ->> 'avatar_url', auth.jwt() -> 'user_metadata' ->> 'picture'), 500);
    v_verified := true;
  end if;
  if char_length(v_name) = 0 then v_name := 'Visitor'; end if;
  insert into public.travel_comments (thread_slug, name, body, post_index, parent_id, edit_token, user_id, avatar_url, verified)
  values (p_slug, v_name, left(btrim(p_body), 1000), v_post, p_parent_id, v_token, v_uid, v_avatar, v_verified)
  returning * into r;
  return json_build_object('id', r.id, 'parent_id', r.parent_id, 'post_index', r.post_index, 'name', r.name,
    'avatar_url', r.avatar_url, 'verified', r.verified, 'body', r.body, 'deleted', false,
    'created_at', r.created_at, 'edited_at', null, 'mine', v_uid is not null, 'edit_token', v_token);
end $$;

create or replace function public.travel_edit_reply(p_id bigint, p_token text, p_body text)
returns json language plpgsql security definer set search_path = public as $$
declare r public.travel_comments;
begin
  if char_length(btrim(coalesce(p_body, ''))) = 0 then raise exception 'Write something first.'; end if;
  update public.travel_comments set body = left(btrim(p_body), 1000), edited_at = now()
  where id = p_id and deleted = false
    and ((p_token is not null and edit_token = p_token) or (auth.uid() is not null and user_id = auth.uid()))
  returning * into r;
  if not found then raise exception 'You can only edit your own reply.'; end if;
  return json_build_object('id', r.id, 'body', r.body, 'edited_at', r.edited_at);
end $$;

create or replace function public.travel_delete_reply(p_id bigint, p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare v_ok boolean;
begin
  select ((p_token is not null and edit_token = p_token) or (auth.uid() is not null and user_id = auth.uid()) or public.travel_is_owner())
    into v_ok from public.travel_comments where id = p_id;
  if not coalesce(v_ok, false) then raise exception 'You can only delete your own reply.'; end if;
  if exists (select 1 from public.travel_comments where parent_id = p_id) then
    update public.travel_comments set deleted = true, body = '', avatar_url = null where id = p_id;
    return json_build_object('id', p_id, 'soft', true);
  end if;
  delete from public.travel_comments where id = p_id;
  return json_build_object('id', p_id, 'soft', false);
end $$;

-- Dashboard: skip deleted replies.
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
    'comments', (select count(*) from public.travel_comments where hidden = false and deleted = false),
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
        select thread_slug, name, body, created_at from public.travel_comments where hidden = false and deleted = false order by created_at desc limit 10) c)
  );
$$;

grant execute on function public.travel_list_replies(text) to anon, authenticated;
grant execute on function public.travel_add_reply(text, text, text, int, bigint) to anon, authenticated;
grant execute on function public.travel_edit_reply(bigint, text, text) to anon, authenticated;
grant execute on function public.travel_delete_reply(bigint, text) to anon, authenticated;
grant execute on function public.travel_is_owner() to anon, authenticated;
notify pgrst, 'reload schema';
