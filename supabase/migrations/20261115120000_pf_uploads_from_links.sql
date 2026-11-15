-- CivilEng Portfolio: upload records can also come from a pasted profile link
-- (e.g. LinkedIn), with no file. Keeps every other rule from
-- 20261115090000_pf_resume_uploads.sql. Changes constraints only.

alter table public.pf_resume_uploads
  drop constraint pf_resume_uploads_source_check,
  add constraint pf_resume_uploads_source_check check (source in ('file', 'paste', 'link'));

-- A file upload still needs its file; pasted text and links have none.
alter table public.pf_resume_uploads
  drop constraint pf_resume_uploads_check,
  add constraint pf_resume_uploads_check check (source <> 'file' or file_path is not null);
