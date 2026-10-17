-- Daily mission claims with atomic, server-validated token rewards.

create table if not exists public.mission_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  mission_id text not null check (mission_id in ('daily_spin_1', 'daily_spin_3', 'daily_login')),
  tokens_awarded integer not null check (tokens_awarded > 0),
  claimed_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, mission_id, claimed_on)
);

alter table public.mission_claims enable row level security;

create policy "Users can read their own mission claims"
on public.mission_claims for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.claim_daily_mission(p_mission_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_required integer;
  v_progress integer;
  v_reward integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select required, reward into v_required, v_reward
  from (values
    ('daily_spin_1'::text, 1, 25),
    ('daily_spin_3'::text, 3, 75),
    ('daily_login'::text, 1, 30)
  ) as missions(id, required, reward)
  where id = p_mission_id;

  if v_required is null then raise exception 'Unknown mission'; end if;

  if p_mission_id like 'daily_spin_%' then
    select count(*)::integer into v_progress
    from public.spin_history
    where user_id = v_user_id and created_at >= current_date;
  else
    select count(*)::integer into v_progress
    from public.daily_rewards
    where user_id = v_user_id and claimed_at >= current_date;
  end if;

  if v_progress < v_required then raise exception 'Mission is not complete yet'; end if;

  insert into public.mission_claims (user_id, mission_id, tokens_awarded)
  values (v_user_id, p_mission_id, v_reward);

  update public.users
  set tokens = tokens + v_reward,
      total_earned = total_earned + v_reward
  where id = v_user_id;

  return jsonb_build_object('success', true, 'tokens_awarded', v_reward);
exception
  when unique_violation then raise exception 'Mission reward already claimed today';
end;
$$;

grant execute on function public.claim_daily_mission(text) to authenticated;
