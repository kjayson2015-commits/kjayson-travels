-- v4: dashboard counts views from a chosen start date, and has a "Today" view.
-- Nothing is deleted: older visits stay in travel_page_views and are simply not counted.
-- To count everything again later:  update public.travel_settings set stats_since = null where id = 1;
-- To restart from zero again:       update public.travel_settings set stats_since = now() where id = 1;

create table if not exists public.travel_settings (
  id int primary key default 1 check (id = 1),
  stats_since timestamptz
);
alter table public.travel_settings enable row level security;  -- no policies: only the functions below can read it

insert into public.travel_settings (id, stats_since) values (1, now())
on conflict (id) do update set stats_since = excluded.stats_since;

-- Days are counted in Kenya time (Africa/Nairobi).
-- p_days = 1 means "today" (since midnight in Nairobi); otherwise the last p_days days.
create or replace function public.travel_stats(p_days int default 30)
returns json language sql stable security definer set search_path = public as $$
  with s as (
    select coalesce((select stats_since from public.travel_settings where id = 1), '-infinity'::timestamptz) as since,
           (date_trunc('day', now() at time zone 'Africa/Nairobi') at time zone 'Africa/Nairobi') as midnight
  ),
  w as (
    select greatest(s.since,
             case when coalesce(p_days, 30) <= 1 then s.midnight
                  else now() - make_interval(days => least(coalesce(p_days, 30), 365)) end) as start,
           s.since, s.midnight
    from s
  ),
  v as (
    select pv.* from public.travel_page_views pv, w where pv.created_at >= w.start
  )
  select json_build_object(
    'since', (select case when since = '-infinity'::timestamptz then null else since end from w),
    'views', (select count(*) from v),
    'visitors', (select count(distinct visitor_id) from v),
    'today', (select count(*) from public.travel_page_views, w where created_at >= greatest(w.since, w.midnight)),
    'all_time', (select count(*) from public.travel_page_views, w where created_at >= w.since),
    'likes', (select count(*) from public.travel_likes),
    'comments', (select count(*) from public.travel_comments where hidden = false and deleted = false),
    'by_day', (select coalesce(json_agg(d order by d.day), '[]'::json) from (
        select to_char(created_at at time zone 'Africa/Nairobi', 'YYYY-MM-DD') as day, count(*) as views, count(distinct visitor_id) as visitors
        from v group by 1) d),
    'by_hour', (select coalesce(json_agg(h order by h.hour), '[]'::json) from (
        select extract(hour from created_at at time zone 'Africa/Nairobi')::int as hour, count(*) as views
        from v group by 1) h),
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

grant execute on function public.travel_stats(int) to anon, authenticated;
notify pgrst, 'reload schema';
