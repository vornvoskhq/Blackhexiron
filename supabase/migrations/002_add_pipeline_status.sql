alter table public.contracts
  add column pipeline_status text not null default 'pending';