-- add escalated flag to conversations for admin escalation
alter table public.conversations add column if not exists escalated boolean not null default false;
create index if not exists idx_conversations_escalated on public.conversations(escalated);