-- Behaviour checks for 0001_init.sql. Run via scripts/verify-schema.sh.
-- Lines marked "^ expect: …" must be preceded by exactly that ERROR.
\set ON_ERROR_STOP 0
\pset footer off
-- ---------- fixtures (as a trusted server process) ----------
begin;
insert into auth.users values ('aaaaaaaa-0000-4000-8000-000000000001','meera@example.test'),('bbbbbbbb-0000-4000-8000-000000000002','suresh@example.test'),('cccccccc-0000-4000-8000-000000000003','anjali@example.test');
set local role service_role;
set local app.actor_id = '00000000-0000-4000-8000-000000000000';
insert into organizations (id, name, actor_id) values ('0a000000-0000-4000-8000-000000000001','RecoveryOS', '00000000-0000-4000-8000-000000000000');
insert into users (id, auth_user_id, role, full_name, actor_id, organization_id) values
 ('11111111-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001','client','Meera Raghunathan','00000000-0000-4000-8000-000000000000',null),
 ('22222222-0000-4000-8000-000000000002','bbbbbbbb-0000-4000-8000-000000000002','client','Suresh Kulkarni','00000000-0000-4000-8000-000000000000',null),
 ('33333333-0000-4000-8000-000000000003','cccccccc-0000-4000-8000-000000000003','case_lead','Anjali Deshmukh','00000000-0000-4000-8000-000000000000','0a000000-0000-4000-8000-000000000001');
insert into cases (id, reference, organization_id, client_user_id, case_lead_id, title, actor_id) values
 ('c0000000-0000-4000-8000-000000000147','RC-2026-0147','0a000000-0000-4000-8000-000000000001','11111111-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000003','Konkan Coastal — 400 shares','00000000-0000-4000-8000-000000000000'),
 ('c0000000-0000-4000-8000-000000000132','RC-2026-0132','0a000000-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000002','33333333-0000-4000-8000-000000000003','Sahyadri — 250 shares','00000000-0000-4000-8000-000000000000');
insert into evidence_files (id, case_id, file_name, category, mime_type, byte_size, storage_path, sha256, uploaded_by, actor_id) values
 ('e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000147','Share certificate 18834.pdf','share_certificate','application/pdf',1842311,'cases/0147/doc1.pdf','bffe4e8e14ab97719b3b9fad3139bebe146a05ccdd71e617e0126a25a68a13be','11111111-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000000');
insert into extracted_fields (id, case_id, evidence_file_id, field_key, label, value_text, source_page, source_snippet, confidence, confidence_reason, extractor, needs_client_check, actor_id) values
 ('f0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000147','e0000000-0000-4000-8000-000000000001','folio_number','Folio number','KCI0004127',1,'Folio No. : KCI0004127','high','Printed text','ocr-rules v0.3',true,'00000000-0000-4000-8000-000000000000'),
 ('f0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000147','e0000000-0000-4000-8000-000000000001','dividend_amount','Unclaimed dividend amount',null,null,null,'not_found','Letter lists shares only','ocr-rules v0.3',false,'00000000-0000-4000-8000-000000000000');
commit;
select 'T01 fixtures + audit rows' as test, count(*) as audit_rows from audit_events;

-- ---------- actor is mandatory ----------
begin; set local role service_role;
insert into organizations (name) values ('No actor');
rollback;
select 'T02 ^ expect: actor required' as test;

-- ---------- honesty constraints ----------
begin; set local role service_role; set local app.actor_id = '00000000-0000-4000-8000-000000000000';
insert into extracted_fields (case_id, evidence_file_id, field_key, label, value_text, confidence, confidence_reason, extractor, actor_id)
values ('c0000000-0000-4000-8000-000000000147','e0000000-0000-4000-8000-000000000001','cert_no','Certificate number','18834','high','x','x','00000000-0000-4000-8000-000000000000');
rollback;
select 'T03 ^ expect: value_has_provenance violation' as test;
begin; set local role service_role; set local app.actor_id = '00000000-0000-4000-8000-000000000000';
insert into extracted_fields (case_id, evidence_file_id, field_key, label, value_text, source_page, source_snippet, confidence, confidence_reason, extractor, actor_id)
values ('c0000000-0000-4000-8000-000000000147','e0000000-0000-4000-8000-000000000001','guess','Guess','1000',1,'x','not_found','x','x','00000000-0000-4000-8000-000000000000');
rollback;
select 'T04 ^ expect: not_found_means_no_value violation' as test;

-- ---------- optimistic locking + version ----------
begin; set local role service_role; set local app.actor_id = '33333333-0000-4000-8000-000000000003';
update cases set status = 'consented' where reference = 'RC-2026-0147';
select 'T05 version after update' as test, version, actor_id = '33333333-0000-4000-8000-000000000003' as actor_is_lead from cases where reference = 'RC-2026-0147';
update cases set status = 'scoped', version = 1 where reference = 'RC-2026-0147';
rollback;
select 'T06 ^ expect: version conflict (40001)' as test;

-- ---------- anon: nothing ----------
begin; set local role anon;
select count(*) from cases;
rollback;
select 'T07 ^ expect: anon permission denied' as test;

-- ---------- client A sees only their case ----------
begin; set local role authenticated; set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';
select 'T08 Meera sees cases' as test, string_agg(reference, ',') from cases;
select 'T09 Meera sees fields' as test, count(*) from extracted_fields;
select 'T10 Meera sees users' as test, string_agg(full_name, ',') from users;
select 'T11 Meera sees own audit' as test, count(*) > 0 as has_rows, bool_and(case_id = 'c0000000-0000-4000-8000-000000000147') as only_own from audit_events;
rollback;

begin; set local role authenticated; set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';
update extracted_fields set review_status = 'approved';
rollback;
select 'T12 ^ expect: direct update denied' as test;

begin; set local role authenticated; set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';
insert into cases (reference, organization_id, client_user_id, title) values ('RC-2026-9999','0a000000-0000-4000-8000-000000000001','11111111-0000-4000-8000-000000000001','x');
rollback;
select 'T13 ^ expect: insert denied' as test;

-- ---------- client B cannot touch A's field via the RPC ----------
begin; set local role authenticated; set local request.jwt.claim.sub = 'bbbbbbbb-0000-4000-8000-000000000002';
select 'T14 Suresh sees cases' as test, string_agg(reference, ',') from cases;
select review_extracted_field('f0000000-0000-4000-8000-000000000001', 'approve');
rollback;
select 'T15 ^ expect: field not found' as test;

-- ---------- client A approves via RPC; cannot approve a gap ----------
begin; set local role authenticated; set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';
select 'T16 approve' as test, review_status, version, reviewed_by = '11111111-0000-4000-8000-000000000001' as by_meera, actor_id = '11111111-0000-4000-8000-000000000001' as actor_meera
  from review_extracted_field('f0000000-0000-4000-8000-000000000001', 'approve', null, null, 1);
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';
select review_extracted_field('f0000000-0000-4000-8000-000000000002', 'approve');
rollback;
select 'T17 ^ expect: not waiting for your review (not_found field)' as test;
begin; set local role authenticated; set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';
select review_extracted_field('f0000000-0000-4000-8000-000000000001', 'approve');
rollback;
select 'T18 ^ expect: already reviewed' as test;

select 'T19 audit of review' as test, action, entity_table, actor_id = '11111111-0000-4000-8000-000000000001' as actor_meera, after->>'review_status' as status
  from audit_events where entity_table = 'extracted_fields' order by seq desc limit 1;

-- ---------- audit log is append-only and chained ----------
begin; set local role service_role; update audit_events set action = 'insert' where seq = 1; rollback;
select 'T20 ^ expect: append-only (update)' as test;
begin; delete from audit_events where seq = 1; rollback;
select 'T21 ^ expect: append-only (delete, even as owner)' as test;
begin; truncate audit_events cascade; rollback;
select 'T22 ^ expect: append-only (truncate)' as test;
select 'T23 chain intact' as test, count(*) as rows,
       bool_and(prev_hash is not distinct from lag_hash) as links_ok
  from (select prev_hash, lag(hash) over (order by seq) as lag_hash from audit_events) x;

-- ---------- published rules are frozen ----------
begin; set local role service_role; set local app.actor_id = '00000000-0000-4000-8000-000000000000';
insert into rule_versions (rule_set, rule_version, status, effective_from, definition, published_at, actor_id)
values ('iepf-triage','2026.09-r1','published','2026-09-01','{"unclaimed_years":7}', now(), '00000000-0000-4000-8000-000000000000');
select 'T24 rule checksum' as test, length(checksum) from rule_versions;
update rule_versions set definition = '{"unclaimed_years":6}';
rollback;
select 'T25 ^ expect: published rule versions are immutable' as test;
