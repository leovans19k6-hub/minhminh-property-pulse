
-- =====================================================================
-- Phase 6D.1 — Operations Engine hardening (additive)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. search_assignable_users (single project)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_assignable_users(
  p_project_id uuid,
  p_target_type text,
  p_query text DEFAULT NULL,
  p_limit int DEFAULT 20
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  v_q text := NULLIF(trim(COALESCE(p_query, '')), '');
BEGIN
  IF NOT is_active_user() THEN RAISE EXCEPTION 'inactive_user'; END IF;
  IF p_target_type NOT IN ('lead','registration','task') THEN
    RAISE EXCEPTION 'invalid_target_type';
  END IF;
  IF NOT public._ops_can_manage_project(p_project_id) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x)) FROM (
      SELECT
        p.id AS user_id,
        p.full_name,
        p.email,
        p.employee_code,
        p.position,
        p.branch,
        p.department,
        (SELECT COALESCE(jsonb_agg(DISTINCT pm.role), '[]'::jsonb)
           FROM public.project_members pm
          WHERE pm.user_id = p.id AND pm.project_id = p_project_id) AS project_roles,
        (SELECT COALESCE(jsonb_agg(DISTINCT r.code), '[]'::jsonb)
           FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
          WHERE ur.user_id = p.id AND r.code IN ('super_admin','admin','director','manager')) AS system_roles
      FROM public.profiles p
      WHERE p.status = 'active'
        AND public.is_valid_assignee(p.id, p_project_id)
        AND (v_q IS NULL
             OR p.full_name ILIKE '%'||v_q||'%'
             OR COALESCE(p.email,'') ILIKE '%'||v_q||'%'
             OR COALESCE(p.employee_code,'') ILIKE '%'||v_q||'%')
      ORDER BY p.full_name ASC NULLS LAST, p.employee_code ASC NULLS LAST, p.id ASC
      LIMIT v_limit
    ) x
  ), '[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.search_assignable_users(uuid,text,text,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_assignable_users(uuid,text,text,int) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2. search_bulk_assignable_users (intersection across projects)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_bulk_assignable_users(
  p_project_ids uuid[],
  p_target_type text,
  p_query text DEFAULT NULL,
  p_limit int DEFAULT 20
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  v_q text := NULLIF(trim(COALESCE(p_query, '')), '');
  v_ids uuid[];
  v_pid uuid;
BEGIN
  IF NOT is_active_user() THEN RAISE EXCEPTION 'inactive_user'; END IF;
  IF p_target_type NOT IN ('lead','registration','task') THEN
    RAISE EXCEPTION 'invalid_target_type';
  END IF;
  IF p_project_ids IS NULL OR array_length(p_project_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'invalid_project_set';
  END IF;
  SELECT array_agg(DISTINCT pid) INTO v_ids FROM unnest(p_project_ids) pid WHERE pid IS NOT NULL;
  IF v_ids IS NULL OR array_length(v_ids,1) > 100 THEN
    RAISE EXCEPTION 'invalid_project_set';
  END IF;

  FOREACH v_pid IN ARRAY v_ids LOOP
    IF NOT public._ops_can_manage_project(v_pid) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  END LOOP;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x)) FROM (
      SELECT
        p.id AS user_id,
        p.full_name,
        p.email,
        p.employee_code,
        p.position,
        p.branch,
        p.department
      FROM public.profiles p
      WHERE p.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM unnest(v_ids) pid
          WHERE NOT public.is_valid_assignee(p.id, pid)
        )
        AND (v_q IS NULL
             OR p.full_name ILIKE '%'||v_q||'%'
             OR COALESCE(p.email,'') ILIKE '%'||v_q||'%'
             OR COALESCE(p.employee_code,'') ILIKE '%'||v_q||'%')
      ORDER BY p.full_name ASC NULLS LAST, p.employee_code ASC NULLS LAST, p.id ASC
      LIMIT v_limit
    ) x
  ), '[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.search_bulk_assignable_users(uuid[],text,text,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_bulk_assignable_users(uuid[],text,text,int) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. validate_operations_registration_transition — canonical domain gate
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_operations_registration_transition(
  p_registration_id uuid,
  p_new_status text,
  p_operation text
) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  v_domain text;
  v_voucher record;
  v_event record;
BEGIN
  SELECT * INTO r FROM public.registrations WHERE id = p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;

  v_domain := public.get_registration_domain(r.registration_type);

  -- Generic cancel/complete restrictions for domain-owned registrations.
  IF v_domain = 'VOUCHER' THEN
    IF p_new_status = 'cancelled' THEN
      RAISE EXCEPTION 'voucher_registration_use_domain_cancel';
    END IF;
    IF p_new_status = 'completed' THEN
      RAISE EXCEPTION 'voucher_registration_completion_not_supported';
    END IF;
    IF p_new_status = 'confirmed' AND p_operation IN ('transition','review') THEN
      SELECT id, status, archived_at INTO v_voucher FROM public.vouchers WHERE id = r.voucher_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'voucher_not_found'; END IF;
      IF v_voucher.archived_at IS NOT NULL THEN RAISE EXCEPTION 'voucher_archived'; END IF;
    END IF;
  ELSIF v_domain = 'EVENT' THEN
    IF p_new_status = 'cancelled' THEN
      RAISE EXCEPTION 'event_registration_use_domain_cancel';
    END IF;
    IF p_new_status = 'completed' THEN
      RAISE EXCEPTION 'event_registration_completion_not_supported';
    END IF;
    IF p_new_status = 'confirmed' AND p_operation IN ('transition','review') THEN
      SELECT id, status, archived_at INTO v_event FROM public.events WHERE id = r.event_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'event_not_found'; END IF;
      IF v_event.archived_at IS NOT NULL THEN RAISE EXCEPTION 'event_archived'; END IF;
      IF v_event.status IN ('cancelled','completed') THEN RAISE EXCEPTION 'event_not_confirmable'; END IF;
    END IF;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.validate_operations_registration_transition(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_operations_registration_transition(uuid,text,text) TO service_role;

-- ---------------------------------------------------------------------
-- 4. Harden transition_registration_status (domain safety)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transition_registration_status(
  p_registration_id uuid, p_status text, p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old record; v_domain text;
BEGIN
  SELECT * INTO v_old FROM public.registrations WHERE id = p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;
  IF NOT public._ops_can_manage_project(v_old.project_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  IF NOT public.can_transition_registration_status(v_old.status, p_status) THEN
    RAISE EXCEPTION 'invalid_registration_transition';
  END IF;
  PERFORM public.validate_operations_registration_transition(p_registration_id, p_status, 'transition');
  v_domain := public.get_registration_domain(v_old.registration_type);
  UPDATE public.registrations SET status = p_status WHERE id = p_registration_id;
  PERFORM public._log_crm_activity(v_old.project_id, v_old.lead_id, p_registration_id, 'status_change',
    'Chuyển trạng thái đăng ký', p_reason,
    jsonb_build_object('old_status', v_old.status, 'new_status', p_status, 'domain', v_domain));
  PERFORM public.write_audit_log('transition_registration_status','registration', p_registration_id,
    jsonb_build_object('status', v_old.status),
    jsonb_build_object('status', p_status),
    jsonb_build_object('reason', p_reason, 'domain', v_domain));
  RETURN (SELECT to_jsonb(r) FROM public.registrations r WHERE id = p_registration_id);
END; $$;

-- ---------------------------------------------------------------------
-- 5. Harden review_registration (accept re-checks domain invariants)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_registration(
  p_registration_id uuid, p_decision text, p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old record; v_review_id uuid; v_new_status text;
BEGIN
  IF p_decision NOT IN ('accept','reject','request_more_info') THEN
    RAISE EXCEPTION 'invalid_review_decision';
  END IF;
  SELECT * INTO v_old FROM public.registrations WHERE id = p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;
  IF NOT public._ops_can_manage_project(v_old.project_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  IF v_old.status NOT IN ('new','in_progress') THEN RAISE EXCEPTION 'registration_not_reviewable'; END IF;

  v_new_status := CASE p_decision WHEN 'accept' THEN 'confirmed' WHEN 'reject' THEN 'rejected' ELSE 'in_progress' END;

  IF p_decision = 'accept' THEN
    PERFORM public.validate_operations_registration_transition(p_registration_id, 'confirmed', 'review');
  END IF;

  INSERT INTO public.registration_reviews (registration_id, project_id, decision, note, reviewed_by)
  VALUES (p_registration_id, v_old.project_id, p_decision, p_note, auth.uid())
  RETURNING id INTO v_review_id;

  IF v_new_status <> v_old.status THEN
    UPDATE public.registrations SET status = v_new_status WHERE id = p_registration_id;
  END IF;

  PERFORM public._log_crm_activity(v_old.project_id, v_old.lead_id, p_registration_id, 'registration_review',
    'Duyệt đăng ký', p_note,
    jsonb_build_object('decision', p_decision, 'old_status', v_old.status, 'new_status', v_new_status, 'review_id', v_review_id));
  PERFORM public.write_audit_log('review_registration','registration', p_registration_id,
    jsonb_build_object('status', v_old.status),
    jsonb_build_object('status', v_new_status),
    jsonb_build_object('decision', p_decision, 'review_id', v_review_id));
  RETURN jsonb_build_object('review_id', v_review_id, 'status', v_new_status);
END; $$;

-- ---------------------------------------------------------------------
-- 6. Bulk assign leads — stable contract, no-op skip, atomic
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bulk_assign_leads(p_lead_ids uuid[], p_assigned_to uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ids uuid[];
  v_requested int;
  v_fetched int;
  v_changed int := 0;
  v_unchanged int := 0;
  v_affected uuid[] := ARRAY[]::uuid[];
  v_row record;
BEGIN
  IF p_lead_ids IS NULL OR array_length(p_lead_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'empty_bulk_input';
  END IF;
  SELECT array_agg(DISTINCT lid) INTO v_ids FROM unnest(p_lead_ids) lid WHERE lid IS NOT NULL;
  v_requested := COALESCE(array_length(v_ids, 1), 0);
  IF v_requested = 0 THEN RAISE EXCEPTION 'empty_bulk_input'; END IF;
  IF v_requested > 100 THEN RAISE EXCEPTION 'too_many_bulk_rows'; END IF;

  -- Validate all rows first (all-or-nothing).
  SELECT count(*) INTO v_fetched FROM public.leads WHERE id = ANY(v_ids);
  IF v_fetched <> v_requested THEN RAISE EXCEPTION 'lead_not_found'; END IF;

  FOR v_row IN SELECT id, interested_project_id, assigned_to FROM public.leads WHERE id = ANY(v_ids) LOOP
    IF NOT public._ops_can_manage_project(v_row.interested_project_id) THEN
      RAISE EXCEPTION 'permission_denied';
    END IF;
    IF p_assigned_to IS NOT NULL AND NOT public.is_valid_assignee(p_assigned_to, v_row.interested_project_id) THEN
      RAISE EXCEPTION 'invalid_assignee';
    END IF;
  END LOOP;

  -- Apply.
  FOR v_row IN SELECT id, interested_project_id, assigned_to, full_name FROM public.leads WHERE id = ANY(v_ids) LOOP
    IF v_row.assigned_to IS NOT DISTINCT FROM p_assigned_to THEN
      v_unchanged := v_unchanged + 1;
      CONTINUE;
    END IF;
    UPDATE public.leads SET assigned_to = p_assigned_to WHERE id = v_row.id;
    v_changed := v_changed + 1;
    v_affected := array_append(v_affected, v_row.id);
    PERFORM public._log_crm_activity(v_row.interested_project_id, v_row.id, NULL, 'assignment',
      'Phân công hàng loạt', NULL,
      jsonb_build_object('old_assignee', v_row.assigned_to, 'new_assignee', p_assigned_to));
    IF p_assigned_to IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, notification_type, title, message, entity_type, entity_id)
      VALUES (p_assigned_to, 'lead_assigned', 'Bạn được phân công một lead', v_row.full_name, 'lead', v_row.id);
    END IF;
  END LOOP;

  IF v_changed > 0 THEN
    PERFORM public.write_audit_log('bulk_assign_leads','lead', NULL, NULL, NULL,
      jsonb_build_object('requested', v_requested, 'changed', v_changed, 'unchanged', v_unchanged,
                         'assignee', p_assigned_to, 'affected_ids', to_jsonb(v_affected)));
  END IF;

  RETURN jsonb_build_object(
    'requested_count', v_requested,
    'changed_count', v_changed,
    'unchanged_count', v_unchanged,
    'affected_ids', to_jsonb(v_affected)
  );
END; $$;

-- ---------------------------------------------------------------------
-- 7. Bulk assign registrations — stable contract, no-op skip, atomic
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bulk_assign_registrations(p_registration_ids uuid[], p_assigned_to uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ids uuid[];
  v_requested int;
  v_fetched int;
  v_changed int := 0;
  v_unchanged int := 0;
  v_affected uuid[] := ARRAY[]::uuid[];
  v_row record;
BEGIN
  IF p_registration_ids IS NULL OR array_length(p_registration_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'empty_bulk_input';
  END IF;
  SELECT array_agg(DISTINCT rid) INTO v_ids FROM unnest(p_registration_ids) rid WHERE rid IS NOT NULL;
  v_requested := COALESCE(array_length(v_ids, 1), 0);
  IF v_requested = 0 THEN RAISE EXCEPTION 'empty_bulk_input'; END IF;
  IF v_requested > 100 THEN RAISE EXCEPTION 'too_many_bulk_rows'; END IF;

  SELECT count(*) INTO v_fetched FROM public.registrations WHERE id = ANY(v_ids);
  IF v_fetched <> v_requested THEN RAISE EXCEPTION 'registration_not_found'; END IF;

  FOR v_row IN SELECT id, project_id, assigned_to FROM public.registrations WHERE id = ANY(v_ids) LOOP
    IF NOT public._ops_can_manage_project(v_row.project_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
    IF p_assigned_to IS NOT NULL AND NOT public.is_valid_assignee(p_assigned_to, v_row.project_id) THEN
      RAISE EXCEPTION 'invalid_assignee';
    END IF;
  END LOOP;

  FOR v_row IN SELECT id, project_id, lead_id, assigned_to, registration_code FROM public.registrations WHERE id = ANY(v_ids) LOOP
    IF v_row.assigned_to IS NOT DISTINCT FROM p_assigned_to THEN
      v_unchanged := v_unchanged + 1;
      CONTINUE;
    END IF;
    UPDATE public.registrations SET assigned_to = p_assigned_to WHERE id = v_row.id;
    v_changed := v_changed + 1;
    v_affected := array_append(v_affected, v_row.id);
    PERFORM public._log_crm_activity(v_row.project_id, v_row.lead_id, v_row.id, 'assignment',
      'Phân công hàng loạt', NULL,
      jsonb_build_object('old_assignee', v_row.assigned_to, 'new_assignee', p_assigned_to));
    IF p_assigned_to IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, notification_type, title, message, entity_type, entity_id)
      VALUES (p_assigned_to, 'registration_assigned', 'Bạn được phân công một đăng ký', v_row.registration_code, 'registration', v_row.id);
    END IF;
  END LOOP;

  IF v_changed > 0 THEN
    PERFORM public.write_audit_log('bulk_assign_registrations','registration', NULL, NULL, NULL,
      jsonb_build_object('requested', v_requested, 'changed', v_changed, 'unchanged', v_unchanged,
                         'assignee', p_assigned_to, 'affected_ids', to_jsonb(v_affected)));
  END IF;

  RETURN jsonb_build_object(
    'requested_count', v_requested,
    'changed_count', v_changed,
    'unchanged_count', v_unchanged,
    'affected_ids', to_jsonb(v_affected)
  );
END; $$;
