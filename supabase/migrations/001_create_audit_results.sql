create table public.audit_results (
  id uuid references public.contracts(id) on delete cascade primary key,
  severity_counts jsonb not null,
  report_url text null,
  completed_at timestamp not null default now()
);