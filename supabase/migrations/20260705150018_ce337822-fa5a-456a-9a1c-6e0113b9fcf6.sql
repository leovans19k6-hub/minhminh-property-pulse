
-- Phase 6D.2 — Server-authoritative registration capabilities.
-- Additive: new capability RPC + get_registration_admin_detail cutover.

CREATE OR REPLACE FUNCTION public.get_operations_registration_capabilities(
  p_registration_id uuid,
  p_caller_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  r public.registrations;
  v_domain text;
  v_status text;
  v_terminal boolean;
  v_reviewable boolean;
  v_allowed jsonb := '[]'::jsonb;
  v_reviews jsonb := '[]'::jsonb;
  v_restrictions jsonb := '[]'::jsonb;
  v_can_review boolean := false;
  v_can_use_cancel boolean := true;
  v_can_use_complete boolean := true;
  v_can_assign boolean := false;
  v_can_task boolean := false;
  v_can_activity boolean := false;
  v_voucher record;
  v_event record;
  v_active boolean;
  s text;
  v_decisions text[] := ARRAY[]::text[];
BEGIN
  IF p_caller_id IS NULL THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  -- Active user check
  SELECT (status = 'active') INTO v_active FROM public.profiles WHERE id = p_caller_id;
  IF NOT COALESCE(v_active, false) THEN
    RAISE EXCEPTION 'inactive_user';
  END IF;

  IF NOT public._ops_can_access_registration(p_registration_id) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  SELECT * INTO r FROM public.registrations WHERE id = p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;

  v_status := r.status;
  v_domain := public.get_registration_domain(r.registration_type);
  v_terminal := v_status IN ('completed', 'cancelled', 'rejected', 'no_show');
  v_reviewable := v_status IN ('new', 'in_progress');

  -- Base can_* permissions for authorized readers
  v_can_assign := NOT v_terminal;
  v_can_task := true;
  v_can_activity := true;

  -- Domain-specific restrictions on generic cancel/complete
  IF v_domain IN ('VOUCHER', 'EVENT') THEN
    v_can_use_cancel := false;
    v_can_use_complete := false;
    IF v_domain = 'VOUCHER' THEN
      v_restrictions := v_restrictions
        || jsonb_build_object('code','voucher_cancel_requires_domain_flow','message','Hủy đăng ký voucher phải dùng luồng voucher chuyên dụng.')
        || jsonb_build_object('code','voucher_completion_not_supported','message','Chưa hỗ trợ hoàn tất đăng ký voucher ở lớp vận hành.');
    ELSE
      v_restrictions := v_restrictions
        || jsonb_build_object('code','event_cancel_requires_domain_flow','message','Hủy đăng ký sự kiện phải dùng luồng sự kiện chuyên dụng.')
        || jsonb_build_object('code','event_completion_not_supported','message','Chưa hỗ trợ hoàn tất đăng ký sự kiện ở lớp vận hành.');
    END IF;
  END IF;

  -- Allowed generic transitions (respect can_transition + domain filters)
  FOR s IN SELECT unnest(ARRAY['new','in_progress','confirmed','completed','cancelled','no_show','rejected']) LOOP
    IF NOT public.can_transition_registration_status(v_status, s) THEN CONTINUE; END IF;
    IF NOT v_can_use_cancel AND s = 'cancelled' THEN CONTINUE; END IF;
    IF NOT v_can_use_complete AND s = 'completed' THEN CONTINUE; END IF;
    -- Confirm gating for domain-owned rows
    IF s = 'confirmed' AND v_domain = 'VOUCHER' AND r.voucher_id IS NOT NULL THEN
      SELECT archived_at INTO v_voucher FROM public.vouchers WHERE id = r.voucher_id;
      IF v_voucher.archived_at IS NOT NULL THEN
        v_restrictions := v_restrictions || jsonb_build_object('code','voucher_archived','message','Voucher đã lưu trữ.');
        CONTINUE;
      END IF;
    ELSIF s = 'confirmed' AND v_domain = 'EVENT' AND r.event_id IS NOT NULL THEN
      SELECT archived_at, status INTO v_event FROM public.events WHERE id = r.event_id;
      IF v_event.archived_at IS NOT NULL THEN
        v_restrictions := v_restrictions || jsonb_build_object('code','event_archived','message','Sự kiện đã lưu trữ.');
        CONTINUE;
      END IF;
      IF v_event.status IN ('cancelled','completed') THEN
        v_restrictions := v_restrictions || jsonb_build_object('code','event_'||v_event.status,'message','Sự kiện đã ' || CASE v_event.status WHEN 'cancelled' THEN 'hủy' ELSE 'kết thúc' END || ', không thể xác nhận.');
        CONTINUE;
      END IF;
    END IF;
    v_allowed := v_allowed || to_jsonb(s);
  END LOOP;

  -- Review decisions
  IF v_terminal THEN
    v_restrictions := v_restrictions || jsonb_build_object('code','registration_terminal','message','Đăng ký đã ở trạng thái kết thúc.');
  ELSIF NOT v_reviewable THEN
    v_restrictions := v_restrictions || jsonb_build_object('code','registration_not_reviewable','message','Đăng ký không ở trạng thái duyệt.');
  ELSE
    -- request_more_info always allowed if reviewable
    v_decisions := v_decisions || 'request_more_info' || 'reject';
    -- accept gated by domain lifecycle
    IF v_domain = 'VOUCHER' AND r.voucher_id IS NOT NULL THEN
      SELECT archived_at INTO v_voucher FROM public.vouchers WHERE id = r.voucher_id;
      IF v_voucher.archived_at IS NULL THEN v_decisions := v_decisions || 'accept'; END IF;
    ELSIF v_domain = 'EVENT' AND r.event_id IS NOT NULL THEN
      SELECT archived_at, status INTO v_event FROM public.events WHERE id = r.event_id;
      IF v_event.archived_at IS NULL AND v_event.status NOT IN ('cancelled','completed') THEN
        v_decisions := v_decisions || 'accept';
      END IF;
    ELSE
      v_decisions := v_decisions || 'accept';
    END IF;
    v_can_review := true;
  END IF;

  RETURN jsonb_build_object(
    'domain', v_domain,
    'status', v_status,
    'allowed_transitions', v_allowed,
    'allowed_review_decisions', to_jsonb(v_decisions),
    'can_review', v_can_review,
    'can_assign', v_can_assign,
    'can_create_task', v_can_task,
    'can_create_activity', v_can_activity,
    'can_use_generic_cancel', v_can_use_cancel,
    'can_use_generic_complete', v_can_use_complete,
    'domain_restrictions', v_restrictions
  );
END; $$;

REVOKE ALL ON FUNCTION public.get_operations_registration_capabilities(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_operations_registration_capabilities(uuid, uuid) TO authenticated, service_role;

-- Cutover: get_registration_admin_detail embeds capabilities and derives compat fields.
CREATE OR REPLACE FUNCTION public.get_registration_admin_detail(p_registration_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_reg jsonb; v_lead jsonb; v_reviews jsonb; v_tasks jsonb; v_acts jsonb;
  v_caps jsonb;
BEGIN
  IF NOT public._ops_can_access_registration(p_registration_id) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  SELECT to_jsonb(r) INTO v_reg FROM public.registrations r WHERE id = p_registration_id;
  IF v_reg IS NULL THEN RAISE EXCEPTION 'registration_not_found'; END IF;

  SELECT to_jsonb(l) INTO v_lead FROM public.leads l
   WHERE id = (SELECT lead_id FROM public.registrations WHERE id = p_registration_id);

  SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) INTO v_reviews FROM
    (SELECT id, decision, note, reviewed_by, reviewed_at FROM public.registration_reviews
      WHERE registration_id = p_registration_id ORDER BY reviewed_at DESC) x;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_tasks FROM
    (SELECT id, title, status, priority, due_at, assigned_to FROM public.crm_tasks
      WHERE registration_id = p_registration_id ORDER BY created_at DESC) t;

  SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::jsonb) INTO v_acts FROM
    (SELECT id, activity_type, title, content, occurred_at, created_by FROM public.crm_activities
      WHERE registration_id = p_registration_id ORDER BY occurred_at DESC LIMIT 20) a;

  v_caps := public.get_operations_registration_capabilities(p_registration_id);

  RETURN jsonb_build_object(
    'registration', v_reg,
    'domain', v_caps->>'domain',
    'lead', v_lead,
    'reviews', v_reviews,
    'tasks', v_tasks,
    'activities', v_acts,
    'capabilities', v_caps,
    'allowed_transitions', v_caps->'allowed_transitions',
    'can_review', v_caps->'can_review',
    'domain_restrictions', v_caps->'domain_restrictions'
  );
END; $$;
