-- Add length and non-empty constraints to messages.content so the database
-- enforces what server-side validation already checks. Defends against direct
-- inserts that bypass app/actions.ts (e.g. SQL editor, future endpoints).

alter table messages
  add constraint messages_content_not_empty
  check (length(trim(content)) > 0);

alter table messages
  add constraint messages_content_max_length
  check (length(content) <= 280);
