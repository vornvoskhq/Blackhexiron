create table public.compliance_proofs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.contracts(id),
  threshold int not null,
  proof jsonb not null,
  created_at timestamp not null default now()
);