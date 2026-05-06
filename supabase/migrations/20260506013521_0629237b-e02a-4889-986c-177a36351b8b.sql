-- 1. payments 테이블
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_payment_key text,
  order_id text not null unique,
  amount integer not null check (amount >= 0),
  currency text not null default 'KRW',
  status text not null default 'pending'
    check (status in ('pending','completed','failed','cancelled','refunded')),
  product_type text not null
    check (product_type in ('single_test','pro_subscription')),
  product_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  failed_at timestamptz,
  refunded_at timestamptz
);

create index idx_payments_user_id on public.payments(user_id);
create index idx_payments_status on public.payments(status);
create index idx_payments_order_id on public.payments(order_id);

-- 2. user_test_access 테이블 (unique(user_id, test_id) 의도적으로 없음 — 재구매 가능)
create table public.user_test_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id text not null,
  payment_id uuid references public.payments(id) on delete set null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index idx_user_test_access_user_test on public.user_test_access(user_id, test_id);
create index idx_user_test_access_expires on public.user_test_access(expires_at);

-- 3. RLS
alter table public.payments enable row level security;
alter table public.user_test_access enable row level security;

create policy "users can view own payments"
  on public.payments for select
  using (auth.uid() = user_id);

create policy "users can view own test access"
  on public.user_test_access for select
  using (auth.uid() = user_id);

-- 4. 접근 권한 체크 헬퍼
create or replace function public.has_test_access(p_user_id uuid, p_test_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_test_access
    where user_id = p_user_id
      and test_id = p_test_id
      and expires_at > now()
  );
$$;

grant execute on function public.has_test_access(uuid, text) to authenticated;