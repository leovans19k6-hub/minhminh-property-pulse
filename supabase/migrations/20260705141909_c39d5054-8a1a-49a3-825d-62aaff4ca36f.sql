
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check
  CHECK (status = ANY (ARRAY['new','contacted','qualified','nurturing','converted','lost','archived']));

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conversion_reason text,
  ADD COLUMN IF NOT EXISTS lost_at timestamptz,
  ADD COLUMN IF NOT EXISTS lost_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS merged_into_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merged_at timestamptz,
  ADD COLUMN IF NOT EXISTS merged_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leads_merged_into_idx ON public.leads(merged_into_lead_id) WHERE merged_into_lead_id IS NOT NULL;

ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_status_check;
ALTER TABLE public.registrations ADD CONSTRAINT registrations_status_check
  CHECK (status = ANY (ARRAY['new','in_progress','confirmed','completed','cancelled','no_show','rejected']));

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.registrations(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  title text NOT NULL,
  content text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_activities_type_check CHECK (activity_type = ANY (ARRAY['note','call','meeting','follow_up','status_change','assignment','registration_review','system','other'])),
  CONSTRAINT crm_activities_target_check CHECK (lead_id IS NOT NULL OR registration_id IS NOT NULL),
  CONSTRAINT crm_activities_title_len CHECK (char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT crm_activities_content_len CHECK (content IS NULL OR char_length(content) <= 5000)
);
CREATE INDEX IF NOT EXISTS crm_activities_lead_idx ON public.crm_activities(lead_id, occurred_at DESC) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_activities_reg_idx ON public.crm_activities(registration_id, occurred_at DESC) WHERE registration_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_activities_project_idx ON public.crm_activities(project_id, occurred_at DESC);
GRANT SELECT ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_activities TO service_role;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_activities_read ON public.crm_activities FOR SELECT TO authenticated
USING (
  is_active_user() AND (
    has_any_role(ARRAY['super_admin','admin','director'])
    OR (project_id IS NOT NULL AND is_project_manager(project_id))
    OR (lead_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid())))
    OR (registration_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.registrations r WHERE r.id = registration_id AND (r.assigned_to = auth.uid() OR r.created_by = auth.uid())))
  )
);

CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.registrations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  due_at timestamptz,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_tasks_target_check CHECK (lead_id IS NOT NULL OR registration_id IS NOT NULL),
  CONSTRAINT crm_tasks_status_check CHECK (status = ANY (ARRAY['open','in_progress','completed','cancelled'])),
  CONSTRAINT crm_tasks_priority_check CHECK (priority = ANY (ARRAY['low','normal','high','urgent'])),
  CONSTRAINT crm_tasks_title_len CHECK (char_length(title) BETWEEN 1 AND 200)
);
CREATE INDEX IF NOT EXISTS crm_tasks_assigned_idx ON public.crm_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS crm_tasks_due_idx ON public.crm_tasks(due_at) WHERE status IN ('open','in_progress');
CREATE INDEX IF NOT EXISTS crm_tasks_lead_idx ON public.crm_tasks(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_tasks_reg_idx ON public.crm_tasks(registration_id) WHERE registration_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_tasks_project_idx ON public.crm_tasks(project_id);
GRANT SELECT ON public.crm_tasks TO authenticated;
GRANT ALL ON public.crm_tasks TO service_role;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_tasks_read ON public.crm_tasks FOR SELECT TO authenticated
USING (
  is_active_user() AND (
    assigned_to = auth.uid() OR created_by = auth.uid()
    OR has_any_role(ARRAY['super_admin','admin','director'])
    OR (project_id IS NOT NULL AND is_project_manager(project_id))
  )
);
DROP TRIGGER IF EXISTS trg_crm_tasks_updated_at ON public.crm_tasks;
CREATE TRIGGER trg_crm_tasks_updated_at BEFORE UPDATE ON public.crm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.registration_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  decision text NOT NULL,
  note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registration_reviews_decision_check CHECK (decision = ANY (ARRAY['accept','reject','request_more_info']))
);
CREATE INDEX IF NOT EXISTS registration_reviews_reg_idx ON public.registration_reviews(registration_id, reviewed_at DESC);
GRANT SELECT ON public.registration_reviews TO authenticated;
GRANT ALL ON public.registration_reviews TO service_role;
ALTER TABLE public.registration_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY registration_reviews_read ON public.registration_reviews FOR SELECT TO authenticated
USING (
  is_active_user() AND (
    has_any_role(ARRAY['super_admin','admin','director'])
    OR (project_id IS NOT NULL AND is_project_manager(project_id))
    OR EXISTS (SELECT 1 FROM public.registrations r WHERE r.id = registration_id AND (r.assigned_to = auth.uid() OR r.created_by = auth.uid()))
  )
);

CREATE OR REPLACE FUNCTION public.get_registration_domain(p_type text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN p_type IN ('event','site_tour') THEN 'EVENT'
    WHEN p_type = 'voucher' THEN 'VOUCHER'
    WHEN p_type = 'consultation' THEN 'CONSULTATION'
    ELSE 'OTHER'
  END
$$;

CREATE OR REPLACE FUNCTION public.can_transition_lead_status(p_from text, p_to text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_from
    WHEN 'new' THEN p_to IN ('contacted','qualified','lost','archived')
    WHEN 'contacted' THEN p_to IN ('qualified','nurturing','lost','archived')
    WHEN 'qualified' THEN p_to IN ('nurturing','converted','lost','archived')
    WHEN 'nurturing' THEN p_to IN ('contacted','qualified','converted','lost','archived')
    WHEN 'lost' THEN p_to IN ('nurturing','archived')
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.can_transition_registration_status(p_from text, p_to text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_from
    WHEN 'new' THEN p_to IN ('in_progress','confirmed','rejected','cancelled')
    WHEN 'in_progress' THEN p_to IN ('confirmed','rejected','cancelled')
    WHEN 'confirmed' THEN p_to IN ('completed','cancelled','no_show')
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.is_valid_assignee(p_user uuid, p_project uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user AND p.status = 'active')
    AND (
      p_project IS NULL
      OR EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id WHERE ur.user_id = p_user AND r.code IN ('super_admin','admin','director'))
      OR EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = p_project AND pm.user_id = p_user)
    )
$$;
REVOKE ALL ON FUNCTION public.is_valid_assignee(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_valid_assignee(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public._ops_can_manage_project(p_project uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_active_user() AND (
    has_any_role(ARRAY['super_admin','admin','director'])
    OR (p_project IS NOT NULL AND is_project_manager(p_project))
  )
$$;
REVOKE ALL ON FUNCTION public._ops_can_manage_project(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._ops_can_manage_project(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public._ops_can_access_lead(p_lead uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE l record;
BEGIN
  SELECT interested_project_id, assigned_to, created_by INTO l FROM public.leads WHERE id = p_lead;
  IF NOT FOUND THEN RETURN false; END IF;
  RETURN is_active_user() AND (
    has_any_role(ARRAY['super_admin','admin','director'])
    OR l.assigned_to = auth.uid() OR l.created_by = auth.uid()
    OR (l.interested_project_id IS NOT NULL AND is_project_manager(l.interested_project_id))
  );
END; $$;
REVOKE ALL ON FUNCTION public._ops_can_access_lead(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._ops_can_access_lead(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public._ops_can_access_registration(p_reg uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  SELECT project_id, assigned_to, created_by INTO r FROM public.registrations WHERE id = p_reg;
  IF NOT FOUND THEN RETURN false; END IF;
  RETURN is_active_user() AND (
    has_any_role(ARRAY['super_admin','admin','director'])
    OR r.assigned_to = auth.uid() OR r.created_by = auth.uid()
    OR (r.project_id IS NOT NULL AND is_project_manager(r.project_id))
  );
END; $$;
REVOKE ALL ON FUNCTION public._ops_can_access_registration(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._ops_can_access_registration(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public._log_crm_activity(
  p_project uuid, p_lead uuid, p_reg uuid, p_type text, p_title text, p_content text, p_metadata jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.crm_activities (project_id, lead_id, registration_id, activity_type, title, content, metadata, created_by)
  VALUES (p_project, p_lead, p_reg, p_type, p_title, p_content, COALESCE(p_metadata,'{}'::jsonb), auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public._log_crm_activity(uuid,uuid,uuid,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._log_crm_activity(uuid,uuid,uuid,text,text,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.update_lead_profile(
  p_lead_id uuid, p_full_name text DEFAULT NULL, p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL, p_source_id uuid DEFAULT NULL,
  p_interested_project_id uuid DEFAULT NULL, p_note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old record; v_new record;
BEGIN
  IF NOT public._ops_can_access_lead(p_lead_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  SELECT * INTO v_old FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  UPDATE public.leads SET
    full_name = COALESCE(p_full_name, full_name),
    phone = COALESCE(p_phone, phone),
    email = COALESCE(p_email, email),
    source_id = COALESCE(p_source_id, source_id),
    interested_project_id = COALESCE(p_interested_project_id, interested_project_id),
    note = COALESCE(p_note, note)
  WHERE id = p_lead_id RETURNING * INTO v_new;
  PERFORM public.write_audit_log('update_lead','lead',p_lead_id, to_jsonb(v_old), to_jsonb(v_new), '{}'::jsonb);
  RETURN to_jsonb(v_new);
END; $$;
REVOKE ALL ON FUNCTION public.update_lead_profile(uuid,text,text,text,uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_lead_profile(uuid,text,text,text,uuid,uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_lead(p_lead_id uuid, p_assigned_to uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old record;
BEGIN
  SELECT * INTO v_old FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF NOT public._ops_can_manage_project(v_old.interested_project_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  IF p_assigned_to IS NOT NULL AND NOT public.is_valid_assignee(p_assigned_to, v_old.interested_project_id) THEN
    RAISE EXCEPTION 'invalid_assignee';
  END IF;
  IF v_old.assigned_to IS NOT DISTINCT FROM p_assigned_to THEN RETURN to_jsonb(v_old); END IF;
  UPDATE public.leads SET assigned_to = p_assigned_to WHERE id = p_lead_id;
  PERFORM public._log_crm_activity(v_old.interested_project_id, p_lead_id, NULL, 'assignment',
    'Phân công lead', NULL, jsonb_build_object('old_assignee', v_old.assigned_to, 'new_assignee', p_assigned_to));
  PERFORM public.write_audit_log('assign_lead','lead',p_lead_id, jsonb_build_object('assigned_to',v_old.assigned_to), jsonb_build_object('assigned_to',p_assigned_to), '{}'::jsonb);
  IF p_assigned_to IS NOT NULL AND p_assigned_to <> COALESCE(v_old.assigned_to, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications (user_id, notification_type, title, message, entity_type, entity_id)
    VALUES (p_assigned_to, 'lead_assigned', 'Bạn được phân công một lead', v_old.full_name, 'lead', p_lead_id);
  END IF;
  RETURN (SELECT to_jsonb(l) FROM public.leads l WHERE id = p_lead_id);
END; $$;
REVOKE ALL ON FUNCTION public.assign_lead(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_lead(uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_lead_priority(p_lead_id uuid, p_priority text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old record;
BEGIN
  IF p_priority NOT IN ('low','normal','high','urgent') THEN RAISE EXCEPTION 'invalid_lead_priority'; END IF;
  SELECT * INTO v_old FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF NOT public._ops_can_access_lead(p_lead_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  UPDATE public.leads SET priority = p_priority WHERE id = p_lead_id;
  PERFORM public.write_audit_log('set_lead_priority','lead',p_lead_id, jsonb_build_object('priority',v_old.priority), jsonb_build_object('priority',p_priority),'{}'::jsonb);
  RETURN (SELECT to_jsonb(l) FROM public.leads l WHERE id = p_lead_id);
END; $$;
REVOKE ALL ON FUNCTION public.set_lead_priority(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_lead_priority(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.transition_lead_status(p_lead_id uuid, p_status text, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old record;
BEGIN
  SELECT * INTO v_old FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF NOT public._ops_can_access_lead(p_lead_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  IF v_old.status = 'converted' AND p_status <> 'converted' THEN RAISE EXCEPTION 'lead_already_converted'; END IF;
  IF p_status IN ('converted','lost') THEN RAISE EXCEPTION 'invalid_lead_transition'; END IF;
  IF NOT public.can_transition_lead_status(v_old.status, p_status) THEN RAISE EXCEPTION 'invalid_lead_transition'; END IF;
  UPDATE public.leads SET status = p_status WHERE id = p_lead_id;
  PERFORM public._log_crm_activity(v_old.interested_project_id, p_lead_id, NULL, 'status_change',
    'Chuyển trạng thái lead', p_reason, jsonb_build_object('old_status',v_old.status,'new_status',p_status));
  PERFORM public.write_audit_log('transition_lead_status','lead',p_lead_id, jsonb_build_object('status',v_old.status), jsonb_build_object('status',p_status), jsonb_build_object('reason',p_reason));
  RETURN (SELECT to_jsonb(l) FROM public.leads l WHERE id = p_lead_id);
END; $$;
REVOKE ALL ON FUNCTION public.transition_lead_status(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_lead_status(uuid,text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.convert_lead(p_lead_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old record;
BEGIN
  SELECT * INTO v_old FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF NOT public._ops_can_manage_project(v_old.interested_project_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  IF v_old.status = 'converted' THEN RAISE EXCEPTION 'lead_already_converted'; END IF;
  UPDATE public.leads SET status='converted', converted_at=now(), converted_by=auth.uid(), conversion_reason=p_reason WHERE id=p_lead_id;
  PERFORM public._log_crm_activity(v_old.interested_project_id, p_lead_id, NULL, 'status_change',
    'Chuyển đổi lead', p_reason, jsonb_build_object('old_status',v_old.status,'new_status','converted'));
  PERFORM public.write_audit_log('convert_lead','lead',p_lead_id, jsonb_build_object('status',v_old.status), jsonb_build_object('status','converted'), jsonb_build_object('reason',p_reason));
  RETURN (SELECT to_jsonb(l) FROM public.leads l WHERE id=p_lead_id);
END; $$;
REVOKE ALL ON FUNCTION public.convert_lead(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_lead(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mark_lead_lost(p_lead_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old record;
BEGIN
  IF p_reason IS NULL OR char_length(trim(p_reason))=0 THEN RAISE EXCEPTION 'invalid_lead_transition'; END IF;
  SELECT * INTO v_old FROM public.leads WHERE id=p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF NOT public._ops_can_access_lead(p_lead_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  IF v_old.status='converted' THEN RAISE EXCEPTION 'lead_already_converted'; END IF;
  UPDATE public.leads SET status='lost', lost_at=now(), lost_by=auth.uid(), lost_reason=p_reason WHERE id=p_lead_id;
  PERFORM public._log_crm_activity(v_old.interested_project_id, p_lead_id, NULL, 'status_change','Đánh mất lead', p_reason, jsonb_build_object('old_status',v_old.status,'new_status','lost'));
  PERFORM public.write_audit_log('mark_lead_lost','lead',p_lead_id, jsonb_build_object('status',v_old.status), jsonb_build_object('status','lost'), jsonb_build_object('reason',p_reason));
  RETURN (SELECT to_jsonb(l) FROM public.leads l WHERE id=p_lead_id);
END; $$;
REVOKE ALL ON FUNCTION public.mark_lead_lost(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_lead_lost(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reopen_lead(p_lead_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old record;
BEGIN
  SELECT * INTO v_old FROM public.leads WHERE id=p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
  IF NOT public._ops_can_access_lead(p_lead_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  IF v_old.status <> 'lost' THEN RAISE EXCEPTION 'lead_not_lost'; END IF;
  UPDATE public.leads SET status='nurturing', lost_at=NULL, lost_by=NULL, lost_reason=NULL WHERE id=p_lead_id;
  PERFORM public._log_crm_activity(v_old.interested_project_id, p_lead_id, NULL, 'status_change','Mở lại lead', p_reason, jsonb_build_object('old_status','lost','new_status','nurturing'));
  PERFORM public.write_audit_log('reopen_lead','lead',p_lead_id, jsonb_build_object('status','lost'), jsonb_build_object('status','nurturing'), jsonb_build_object('reason',p_reason));
  RETURN (SELECT to_jsonb(l) FROM public.leads l WHERE id=p_lead_id);
END; $$;
REVOKE ALL ON FUNCTION public.reopen_lead(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reopen_lead(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_registration(p_registration_id uuid, p_assigned_to uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old record;
BEGIN
  SELECT * INTO v_old FROM public.registrations WHERE id=p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;
  IF NOT public._ops_can_manage_project(v_old.project_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  IF p_assigned_to IS NOT NULL AND NOT public.is_valid_assignee(p_assigned_to, v_old.project_id) THEN RAISE EXCEPTION 'invalid_assignee'; END IF;
  IF v_old.assigned_to IS NOT DISTINCT FROM p_assigned_to THEN RETURN to_jsonb(v_old); END IF;
  UPDATE public.registrations SET assigned_to=p_assigned_to WHERE id=p_registration_id;
  PERFORM public._log_crm_activity(v_old.project_id, v_old.lead_id, p_registration_id, 'assignment','Phân công đăng ký', NULL, jsonb_build_object('old_assignee',v_old.assigned_to,'new_assignee',p_assigned_to));
  PERFORM public.write_audit_log('assign_registration','registration',p_registration_id, jsonb_build_object('assigned_to',v_old.assigned_to), jsonb_build_object('assigned_to',p_assigned_to),'{}'::jsonb);
  IF p_assigned_to IS NOT NULL AND p_assigned_to <> COALESCE(v_old.assigned_to,'00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications (user_id, notification_type, title, message, entity_type, entity_id)
    VALUES (p_assigned_to, 'registration_assigned', 'Bạn được phân công một đăng ký', v_old.registration_code, 'registration', p_registration_id);
  END IF;
  RETURN (SELECT to_jsonb(r) FROM public.registrations r WHERE id=p_registration_id);
END; $$;
REVOKE ALL ON FUNCTION public.assign_registration(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_registration(uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.transition_registration_status(p_registration_id uuid, p_status text, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old record; v_domain text;
BEGIN
  SELECT * INTO v_old FROM public.registrations WHERE id=p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;
  IF NOT public._ops_can_manage_project(v_old.project_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  IF NOT public.can_transition_registration_status(v_old.status, p_status) THEN RAISE EXCEPTION 'invalid_registration_transition'; END IF;
  v_domain := public.get_registration_domain(v_old.registration_type);
  UPDATE public.registrations SET status=p_status WHERE id=p_registration_id;
  PERFORM public._log_crm_activity(v_old.project_id, v_old.lead_id, p_registration_id, 'status_change','Chuyển trạng thái đăng ký', p_reason, jsonb_build_object('old_status',v_old.status,'new_status',p_status,'domain',v_domain));
  PERFORM public.write_audit_log('transition_registration_status','registration',p_registration_id, jsonb_build_object('status',v_old.status), jsonb_build_object('status',p_status), jsonb_build_object('reason',p_reason,'domain',v_domain));
  RETURN (SELECT to_jsonb(r) FROM public.registrations r WHERE id=p_registration_id);
END; $$;
REVOKE ALL ON FUNCTION public.transition_registration_status(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_registration_status(uuid,text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.review_registration(p_registration_id uuid, p_decision text, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old record; v_review_id uuid; v_new_status text;
BEGIN
  IF p_decision NOT IN ('accept','reject','request_more_info') THEN RAISE EXCEPTION 'invalid_review_decision'; END IF;
  SELECT * INTO v_old FROM public.registrations WHERE id=p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;
  IF NOT public._ops_can_manage_project(v_old.project_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  IF v_old.status NOT IN ('new','in_progress') THEN RAISE EXCEPTION 'registration_not_reviewable'; END IF;
  INSERT INTO public.registration_reviews (registration_id, project_id, decision, note, reviewed_by)
  VALUES (p_registration_id, v_old.project_id, p_decision, p_note, auth.uid())
  RETURNING id INTO v_review_id;
  v_new_status := CASE p_decision WHEN 'accept' THEN 'confirmed' WHEN 'reject' THEN 'rejected' ELSE 'in_progress' END;
  IF v_new_status <> v_old.status THEN
    UPDATE public.registrations SET status=v_new_status WHERE id=p_registration_id;
  END IF;
  PERFORM public._log_crm_activity(v_old.project_id, v_old.lead_id, p_registration_id, 'registration_review','Duyệt đăng ký', p_note, jsonb_build_object('decision',p_decision,'old_status',v_old.status,'new_status',v_new_status,'review_id',v_review_id));
  PERFORM public.write_audit_log('review_registration','registration',p_registration_id, jsonb_build_object('status',v_old.status), jsonb_build_object('status',v_new_status), jsonb_build_object('decision',p_decision,'review_id',v_review_id));
  RETURN jsonb_build_object('review_id',v_review_id,'status',v_new_status);
END; $$;
REVOKE ALL ON FUNCTION public.review_registration(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_registration(uuid,text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_crm_activity(
  p_lead_id uuid, p_registration_id uuid, p_activity_type text, p_title text,
  p_content text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb, p_occurred_at timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_project uuid; v_lead uuid; v_reg uuid; v_id uuid;
BEGIN
  IF p_activity_type NOT IN ('note','call','meeting','follow_up','other') THEN RAISE EXCEPTION 'invalid_activity_type'; END IF;
  IF p_lead_id IS NULL AND p_registration_id IS NULL THEN RAISE EXCEPTION 'invalid_activity_target'; END IF;
  v_reg := p_registration_id;
  IF p_registration_id IS NOT NULL THEN
    IF NOT public._ops_can_access_registration(p_registration_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
    SELECT lead_id, project_id INTO v_lead, v_project FROM public.registrations WHERE id=p_registration_id;
  END IF;
  IF p_lead_id IS NOT NULL THEN
    IF v_lead IS NOT NULL AND v_lead <> p_lead_id THEN RAISE EXCEPTION 'invalid_activity_target'; END IF;
    IF NOT public._ops_can_access_lead(p_lead_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
    v_lead := p_lead_id;
    IF v_project IS NULL THEN SELECT interested_project_id INTO v_project FROM public.leads WHERE id=p_lead_id; END IF;
  END IF;
  INSERT INTO public.crm_activities (project_id, lead_id, registration_id, activity_type, title, content, metadata, occurred_at, created_by)
  VALUES (v_project, v_lead, v_reg, p_activity_type, p_title, p_content, COALESCE(p_metadata,'{}'::jsonb), COALESCE(p_occurred_at, now()), auth.uid())
  RETURNING id INTO v_id;
  PERFORM public.write_audit_log('create_activity','activity',v_id, NULL, jsonb_build_object('type',p_activity_type,'lead_id',v_lead,'registration_id',v_reg),'{}'::jsonb);
  RETURN (SELECT to_jsonb(a) FROM public.crm_activities a WHERE id=v_id);
END; $$;
REVOKE ALL ON FUNCTION public.create_crm_activity(uuid,uuid,text,text,text,jsonb,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_crm_activity(uuid,uuid,text,text,text,jsonb,timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_lead_timeline(p_lead_id uuid, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public._ops_can_access_lead(p_lead_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(a))
    FROM (
      SELECT * FROM public.crm_activities WHERE lead_id=p_lead_id
      ORDER BY occurred_at DESC, created_at DESC, id DESC LIMIT LEAST(p_limit,200) OFFSET GREATEST(p_offset,0)
    ) a
  ), '[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.get_lead_timeline(uuid,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lead_timeline(uuid,int,int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_registration_timeline(p_registration_id uuid, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public._ops_can_access_registration(p_registration_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(a))
    FROM (
      SELECT * FROM public.crm_activities WHERE registration_id=p_registration_id
      ORDER BY occurred_at DESC, created_at DESC, id DESC LIMIT LEAST(p_limit,200) OFFSET GREATEST(p_offset,0)
    ) a
  ), '[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.get_registration_timeline(uuid,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_registration_timeline(uuid,int,int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_crm_task(
  p_lead_id uuid, p_registration_id uuid, p_title text, p_description text DEFAULT NULL,
  p_priority text DEFAULT 'normal', p_due_at timestamptz DEFAULT NULL, p_assigned_to uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_project uuid; v_lead uuid; v_reg uuid; v_id uuid;
BEGIN
  IF p_priority NOT IN ('low','normal','high','urgent') THEN RAISE EXCEPTION 'invalid_task_priority'; END IF;
  IF p_lead_id IS NULL AND p_registration_id IS NULL THEN RAISE EXCEPTION 'invalid_task_target'; END IF;
  v_reg := p_registration_id;
  IF p_registration_id IS NOT NULL THEN
    IF NOT public._ops_can_access_registration(p_registration_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
    SELECT lead_id, project_id INTO v_lead, v_project FROM public.registrations WHERE id=p_registration_id;
  END IF;
  IF p_lead_id IS NOT NULL THEN
    IF v_lead IS NOT NULL AND v_lead <> p_lead_id THEN RAISE EXCEPTION 'invalid_task_target'; END IF;
    IF NOT public._ops_can_access_lead(p_lead_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
    v_lead := p_lead_id;
    IF v_project IS NULL THEN SELECT interested_project_id INTO v_project FROM public.leads WHERE id=p_lead_id; END IF;
  END IF;
  IF p_assigned_to IS NOT NULL AND NOT public.is_valid_assignee(p_assigned_to, v_project) THEN RAISE EXCEPTION 'invalid_assignee'; END IF;
  INSERT INTO public.crm_tasks (project_id, lead_id, registration_id, title, description, priority, due_at, assigned_to, created_by)
  VALUES (v_project, v_lead, v_reg, p_title, p_description, p_priority, p_due_at, p_assigned_to, auth.uid())
  RETURNING id INTO v_id;
  PERFORM public.write_audit_log('create_task','task',v_id, NULL, jsonb_build_object('lead_id',v_lead,'registration_id',v_reg),'{}'::jsonb);
  IF p_assigned_to IS NOT NULL AND p_assigned_to <> auth.uid() THEN
    INSERT INTO public.notifications (user_id, notification_type, title, message, entity_type, entity_id)
    VALUES (p_assigned_to, 'task_assigned', 'Bạn được giao công việc mới', p_title, 'task', v_id);
  END IF;
  RETURN (SELECT to_jsonb(t) FROM public.crm_tasks t WHERE id=v_id);
END; $$;
REVOKE ALL ON FUNCTION public.create_crm_task(uuid,uuid,text,text,text,timestamptz,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_crm_task(uuid,uuid,text,text,text,timestamptz,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public._task_access(p_task_id uuid, OUT o_id uuid, OUT o_status text, OUT o_assigned_to uuid, OUT o_project_id uuid, OUT o_title text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE t record;
BEGIN
  SELECT * INTO t FROM public.crm_tasks WHERE id=p_task_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'task_not_found'; END IF;
  IF NOT (is_active_user() AND (t.assigned_to=auth.uid() OR t.created_by=auth.uid() OR has_any_role(ARRAY['super_admin','admin','director']) OR (t.project_id IS NOT NULL AND is_project_manager(t.project_id)))) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  o_id := t.id; o_status := t.status; o_assigned_to := t.assigned_to; o_project_id := t.project_id; o_title := t.title;
END; $$;
REVOKE ALL ON FUNCTION public._task_access(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._task_access(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.update_crm_task(p_task_id uuid, p_title text DEFAULT NULL, p_description text DEFAULT NULL, p_priority text DEFAULT NULL, p_due_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record;
BEGIN
  SELECT * INTO t FROM public._task_access(p_task_id);
  IF t.o_status IN ('completed','cancelled') THEN RAISE EXCEPTION 'task_already_terminal'; END IF;
  IF p_priority IS NOT NULL AND p_priority NOT IN ('low','normal','high','urgent') THEN RAISE EXCEPTION 'invalid_task_priority'; END IF;
  UPDATE public.crm_tasks SET
    title=COALESCE(p_title,title), description=COALESCE(p_description,description),
    priority=COALESCE(p_priority,priority), due_at=COALESCE(p_due_at,due_at)
  WHERE id=p_task_id;
  PERFORM public.write_audit_log('update_task','task',p_task_id,NULL,NULL,'{}'::jsonb);
  RETURN (SELECT to_jsonb(x) FROM public.crm_tasks x WHERE id=p_task_id);
END; $$;
REVOKE ALL ON FUNCTION public.update_crm_task(uuid,text,text,text,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_crm_task(uuid,text,text,text,timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_crm_task(p_task_id uuid, p_assigned_to uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record;
BEGIN
  SELECT * INTO t FROM public._task_access(p_task_id);
  IF t.o_status IN ('completed','cancelled') THEN RAISE EXCEPTION 'task_already_terminal'; END IF;
  IF p_assigned_to IS NOT NULL AND NOT public.is_valid_assignee(p_assigned_to, t.o_project_id) THEN RAISE EXCEPTION 'invalid_assignee'; END IF;
  UPDATE public.crm_tasks SET assigned_to=p_assigned_to WHERE id=p_task_id;
  PERFORM public.write_audit_log('assign_task','task',p_task_id, jsonb_build_object('assigned_to',t.o_assigned_to), jsonb_build_object('assigned_to',p_assigned_to),'{}'::jsonb);
  IF p_assigned_to IS NOT NULL AND p_assigned_to <> COALESCE(t.o_assigned_to,'00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications (user_id, notification_type, title, message, entity_type, entity_id)
    VALUES (p_assigned_to, 'task_assigned', 'Bạn được giao công việc', t.o_title, 'task', p_task_id);
  END IF;
  RETURN (SELECT to_jsonb(x) FROM public.crm_tasks x WHERE id=p_task_id);
END; $$;
REVOKE ALL ON FUNCTION public.assign_crm_task(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_crm_task(uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.start_crm_task(p_task_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record;
BEGIN
  SELECT * INTO t FROM public._task_access(p_task_id);
  IF t.o_status <> 'open' THEN RAISE EXCEPTION 'invalid_task_transition'; END IF;
  UPDATE public.crm_tasks SET status='in_progress' WHERE id=p_task_id;
  PERFORM public.write_audit_log('start_task','task',p_task_id, jsonb_build_object('status','open'), jsonb_build_object('status','in_progress'),'{}'::jsonb);
  RETURN (SELECT to_jsonb(x) FROM public.crm_tasks x WHERE id=p_task_id);
END; $$;
REVOKE ALL ON FUNCTION public.start_crm_task(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_crm_task(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.complete_crm_task(p_task_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record;
BEGIN
  SELECT * INTO t FROM public._task_access(p_task_id);
  IF t.o_status NOT IN ('open','in_progress') THEN RAISE EXCEPTION 'invalid_task_transition'; END IF;
  UPDATE public.crm_tasks SET status='completed', completed_at=now(), completed_by=auth.uid() WHERE id=p_task_id;
  PERFORM public.write_audit_log('complete_task','task',p_task_id, jsonb_build_object('status',t.o_status), jsonb_build_object('status','completed'),'{}'::jsonb);
  RETURN (SELECT to_jsonb(x) FROM public.crm_tasks x WHERE id=p_task_id);
END; $$;
REVOKE ALL ON FUNCTION public.complete_crm_task(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_crm_task(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cancel_crm_task(p_task_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record;
BEGIN
  SELECT * INTO t FROM public._task_access(p_task_id);
  IF t.o_status IN ('completed','cancelled') THEN RAISE EXCEPTION 'task_already_terminal'; END IF;
  UPDATE public.crm_tasks SET status='cancelled', cancelled_at=now(), cancelled_by=auth.uid() WHERE id=p_task_id;
  PERFORM public.write_audit_log('cancel_task','task',p_task_id, jsonb_build_object('status',t.o_status), jsonb_build_object('status','cancelled'), jsonb_build_object('reason',p_reason));
  RETURN (SELECT to_jsonb(x) FROM public.crm_tasks x WHERE id=p_task_id);
END; $$;
REVOKE ALL ON FUNCTION public.cancel_crm_task(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_crm_task(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.bulk_assign_leads(p_lead_ids uuid[], p_assigned_to uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_project uuid; v_count int := 0;
BEGIN
  IF p_lead_ids IS NULL OR array_length(p_lead_ids,1) IS NULL THEN RETURN jsonb_build_object('affected',0); END IF;
  IF array_length(p_lead_ids,1) > 100 THEN RAISE EXCEPTION 'too_many_bulk_rows'; END IF;
  FOREACH v_id IN ARRAY p_lead_ids LOOP
    SELECT interested_project_id INTO v_project FROM public.leads WHERE id=v_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'lead_not_found'; END IF;
    IF NOT public._ops_can_manage_project(v_project) THEN RAISE EXCEPTION 'permission_denied'; END IF;
    IF p_assigned_to IS NOT NULL AND NOT public.is_valid_assignee(p_assigned_to, v_project) THEN RAISE EXCEPTION 'invalid_assignee'; END IF;
  END LOOP;
  FOREACH v_id IN ARRAY p_lead_ids LOOP
    UPDATE public.leads SET assigned_to=p_assigned_to WHERE id=v_id;
    v_count := v_count + 1;
    PERFORM public._log_crm_activity((SELECT interested_project_id FROM public.leads WHERE id=v_id), v_id, NULL, 'assignment', 'Phân công hàng loạt', NULL, jsonb_build_object('new_assignee',p_assigned_to));
  END LOOP;
  PERFORM public.write_audit_log('bulk_assign_leads','lead',NULL,NULL,NULL, jsonb_build_object('count',v_count,'assignee',p_assigned_to));
  RETURN jsonb_build_object('affected',v_count);
END; $$;
REVOKE ALL ON FUNCTION public.bulk_assign_leads(uuid[],uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_assign_leads(uuid[],uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.bulk_assign_registrations(p_registration_ids uuid[], p_assigned_to uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_project uuid; v_count int := 0;
BEGIN
  IF p_registration_ids IS NULL OR array_length(p_registration_ids,1) IS NULL THEN RETURN jsonb_build_object('affected',0); END IF;
  IF array_length(p_registration_ids,1) > 100 THEN RAISE EXCEPTION 'too_many_bulk_rows'; END IF;
  FOREACH v_id IN ARRAY p_registration_ids LOOP
    SELECT project_id INTO v_project FROM public.registrations WHERE id=v_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'registration_not_found'; END IF;
    IF NOT public._ops_can_manage_project(v_project) THEN RAISE EXCEPTION 'permission_denied'; END IF;
    IF p_assigned_to IS NOT NULL AND NOT public.is_valid_assignee(p_assigned_to, v_project) THEN RAISE EXCEPTION 'invalid_assignee'; END IF;
  END LOOP;
  FOREACH v_id IN ARRAY p_registration_ids LOOP
    UPDATE public.registrations SET assigned_to=p_assigned_to WHERE id=v_id;
    v_count := v_count + 1;
  END LOOP;
  PERFORM public.write_audit_log('bulk_assign_registrations','registration',NULL,NULL,NULL, jsonb_build_object('count',v_count,'assignee',p_assigned_to));
  RETURN jsonb_build_object('affected',v_count);
END; $$;
REVOKE ALL ON FUNCTION public.bulk_assign_registrations(uuid[],uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_assign_registrations(uuid[],uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.search_leads(
  p_project_id uuid DEFAULT NULL, p_query text DEFAULT NULL, p_status text DEFAULT NULL,
  p_priority text DEFAULT NULL, p_source_id uuid DEFAULT NULL, p_assigned_to uuid DEFAULT NULL,
  p_unassigned boolean DEFAULT NULL, p_created_from timestamptz DEFAULT NULL, p_created_to timestamptz DEFAULT NULL,
  p_limit int DEFAULT 50, p_offset int DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_limit int := LEAST(GREATEST(p_limit,1),100); v_offset int := GREATEST(p_offset,0);
BEGIN
  IF NOT is_active_user() THEN RAISE EXCEPTION 'inactive_user'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x)) FROM (
      SELECT l.id, l.full_name, l.phone, l.email, l.status, l.priority,
             l.assigned_to, l.created_by, l.interested_project_id,
             l.source_id, l.created_at, l.updated_at,
             (SELECT count(*) FROM public.registrations r WHERE r.lead_id=l.id) AS registration_count,
             (SELECT count(*) FROM public.crm_tasks t WHERE t.lead_id=l.id AND t.status IN ('open','in_progress')) AS open_tasks,
             (SELECT count(*) FROM public.crm_tasks t WHERE t.lead_id=l.id AND t.status IN ('open','in_progress') AND t.due_at < now()) AS overdue_tasks
      FROM public.leads l
      WHERE (p_project_id IS NULL OR l.interested_project_id=p_project_id)
        AND (p_status IS NULL OR l.status=p_status)
        AND (p_priority IS NULL OR l.priority=p_priority)
        AND (p_source_id IS NULL OR l.source_id=p_source_id)
        AND (p_assigned_to IS NULL OR l.assigned_to=p_assigned_to)
        AND (p_unassigned IS NULL OR (p_unassigned = (l.assigned_to IS NULL)))
        AND (p_created_from IS NULL OR l.created_at >= p_created_from)
        AND (p_created_to IS NULL OR l.created_at <= p_created_to)
        AND (p_query IS NULL OR l.full_name ILIKE '%'||p_query||'%' OR l.phone ILIKE '%'||p_query||'%' OR COALESCE(l.email,'') ILIKE '%'||p_query||'%')
        AND (
          has_any_role(ARRAY['super_admin','admin','director'])
          OR l.assigned_to=auth.uid() OR l.created_by=auth.uid()
          OR (l.interested_project_id IS NOT NULL AND is_project_manager(l.interested_project_id))
        )
      ORDER BY CASE l.priority WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'normal' THEN 2 ELSE 1 END DESC,
               l.updated_at DESC, l.id ASC
      LIMIT v_limit OFFSET v_offset
    ) x
  ), '[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.search_leads(uuid,text,text,text,uuid,uuid,boolean,timestamptz,timestamptz,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_leads(uuid,text,text,text,uuid,uuid,boolean,timestamptz,timestamptz,int,int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_lead_admin_detail(p_lead_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead jsonb; v_regs jsonb; v_tasks jsonb; v_acts jsonb;
BEGIN
  IF NOT public._ops_can_access_lead(p_lead_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  SELECT to_jsonb(l) INTO v_lead FROM public.leads l WHERE id=p_lead_id;
  SELECT COALESCE(jsonb_agg(row_to_json(r)),'[]'::jsonb) INTO v_regs
    FROM (SELECT id, registration_code, registration_type, status, project_id, assigned_to, created_at FROM public.registrations WHERE lead_id=p_lead_id ORDER BY created_at DESC) r;
  SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) INTO v_tasks
    FROM (SELECT id, title, status, priority, due_at, assigned_to FROM public.crm_tasks WHERE lead_id=p_lead_id AND status IN ('open','in_progress') ORDER BY created_at DESC) t;
  SELECT COALESCE(jsonb_agg(row_to_json(a)),'[]'::jsonb) INTO v_acts
    FROM (SELECT id, activity_type, title, content, occurred_at, created_by FROM public.crm_activities WHERE lead_id=p_lead_id ORDER BY occurred_at DESC LIMIT 20) a;
  RETURN jsonb_build_object('lead',v_lead,'registrations',v_regs,'tasks',v_tasks,'activities',v_acts);
END; $$;
REVOKE ALL ON FUNCTION public.get_lead_admin_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lead_admin_detail(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.search_registrations(
  p_project_id uuid DEFAULT NULL, p_query text DEFAULT NULL, p_domain text DEFAULT NULL,
  p_registration_type text DEFAULT NULL, p_status text DEFAULT NULL, p_assigned_to uuid DEFAULT NULL,
  p_unassigned boolean DEFAULT NULL, p_created_from timestamptz DEFAULT NULL, p_created_to timestamptz DEFAULT NULL,
  p_limit int DEFAULT 50, p_offset int DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_limit int := LEAST(GREATEST(p_limit,1),100); v_offset int := GREATEST(p_offset,0);
BEGIN
  IF NOT is_active_user() THEN RAISE EXCEPTION 'inactive_user'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x)) FROM (
      SELECT r.id, r.registration_code, r.registration_type,
             public.get_registration_domain(r.registration_type) AS domain,
             r.status, r.project_id, r.lead_id, r.assigned_to, r.created_by, r.created_at, r.updated_at,
             (SELECT full_name FROM public.leads WHERE id=r.lead_id) AS lead_name,
             (SELECT phone FROM public.leads WHERE id=r.lead_id) AS lead_phone
      FROM public.registrations r
      WHERE (p_project_id IS NULL OR r.project_id=p_project_id)
        AND (p_registration_type IS NULL OR r.registration_type=p_registration_type)
        AND (p_domain IS NULL OR public.get_registration_domain(r.registration_type)=p_domain)
        AND (p_status IS NULL OR r.status=p_status)
        AND (p_assigned_to IS NULL OR r.assigned_to=p_assigned_to)
        AND (p_unassigned IS NULL OR (p_unassigned = (r.assigned_to IS NULL)))
        AND (p_created_from IS NULL OR r.created_at >= p_created_from)
        AND (p_created_to IS NULL OR r.created_at <= p_created_to)
        AND (p_query IS NULL OR r.registration_code ILIKE '%'||p_query||'%')
        AND (
          has_any_role(ARRAY['super_admin','admin','director'])
          OR r.assigned_to=auth.uid() OR r.created_by=auth.uid()
          OR (r.project_id IS NOT NULL AND is_project_manager(r.project_id))
        )
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT v_limit OFFSET v_offset
    ) x
  ), '[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.search_registrations(uuid,text,text,text,text,uuid,boolean,timestamptz,timestamptz,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_registrations(uuid,text,text,text,text,uuid,boolean,timestamptz,timestamptz,int,int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_registration_admin_detail(p_registration_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reg jsonb; v_lead jsonb; v_reviews jsonb; v_tasks jsonb; v_acts jsonb; v_dom text; v_status text;
BEGIN
  IF NOT public._ops_can_access_registration(p_registration_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  SELECT to_jsonb(r), r.status, public.get_registration_domain(r.registration_type) INTO v_reg, v_status, v_dom FROM public.registrations r WHERE id=p_registration_id;
  SELECT to_jsonb(l) INTO v_lead FROM public.leads l WHERE id=(SELECT lead_id FROM public.registrations WHERE id=p_registration_id);
  SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]'::jsonb) INTO v_reviews
    FROM (SELECT id, decision, note, reviewed_by, reviewed_at FROM public.registration_reviews WHERE registration_id=p_registration_id ORDER BY reviewed_at DESC) x;
  SELECT COALESCE(jsonb_agg(row_to_json(t)),'[]'::jsonb) INTO v_tasks
    FROM (SELECT id, title, status, priority, due_at, assigned_to FROM public.crm_tasks WHERE registration_id=p_registration_id ORDER BY created_at DESC) t;
  SELECT COALESCE(jsonb_agg(row_to_json(a)),'[]'::jsonb) INTO v_acts
    FROM (SELECT id, activity_type, title, content, occurred_at, created_by FROM public.crm_activities WHERE registration_id=p_registration_id ORDER BY occurred_at DESC LIMIT 20) a;
  RETURN jsonb_build_object('registration',v_reg,'domain',v_dom,'lead',v_lead,'reviews',v_reviews,'tasks',v_tasks,'activities',v_acts,
    'allowed_transitions', COALESCE((SELECT jsonb_agg(s) FROM unnest(ARRAY['new','in_progress','confirmed','completed','cancelled','no_show','rejected']) s WHERE public.can_transition_registration_status(v_status, s)), '[]'::jsonb));
END; $$;
REVOKE ALL ON FUNCTION public.get_registration_admin_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_registration_admin_detail(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_operations_dashboard(p_project_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_active_user() THEN RAISE EXCEPTION 'inactive_user'; END IF;
  RETURN jsonb_build_object(
    'leads_by_status', (SELECT COALESCE(jsonb_object_agg(status,cnt),'{}'::jsonb) FROM (
      SELECT status, count(*) cnt FROM public.leads
      WHERE (p_project_id IS NULL OR interested_project_id=p_project_id)
        AND (has_any_role(ARRAY['super_admin','admin','director']) OR assigned_to=auth.uid() OR created_by=auth.uid() OR (interested_project_id IS NOT NULL AND is_project_manager(interested_project_id)))
      GROUP BY status) s),
    'unassigned_leads', (SELECT count(*) FROM public.leads WHERE assigned_to IS NULL AND (p_project_id IS NULL OR interested_project_id=p_project_id)
      AND (has_any_role(ARRAY['super_admin','admin','director']) OR (interested_project_id IS NOT NULL AND is_project_manager(interested_project_id)))),
    'registrations_by_domain', (SELECT COALESCE(jsonb_object_agg(domain,cnt),'{}'::jsonb) FROM (
      SELECT public.get_registration_domain(registration_type) domain, count(*) cnt FROM public.registrations
      WHERE (p_project_id IS NULL OR project_id=p_project_id)
        AND (has_any_role(ARRAY['super_admin','admin','director']) OR assigned_to=auth.uid() OR created_by=auth.uid() OR (project_id IS NOT NULL AND is_project_manager(project_id)))
      GROUP BY 1) s),
    'registrations_by_status', (SELECT COALESCE(jsonb_object_agg(status,cnt),'{}'::jsonb) FROM (
      SELECT status, count(*) cnt FROM public.registrations
      WHERE (p_project_id IS NULL OR project_id=p_project_id)
        AND (has_any_role(ARRAY['super_admin','admin','director']) OR assigned_to=auth.uid() OR created_by=auth.uid() OR (project_id IS NOT NULL AND is_project_manager(project_id)))
      GROUP BY status) s),
    'unassigned_registrations', (SELECT count(*) FROM public.registrations WHERE assigned_to IS NULL AND (p_project_id IS NULL OR project_id=p_project_id)
      AND (has_any_role(ARRAY['super_admin','admin','director']) OR (project_id IS NOT NULL AND is_project_manager(project_id)))),
    'open_tasks', (SELECT count(*) FROM public.crm_tasks WHERE status IN ('open','in_progress') AND (p_project_id IS NULL OR project_id=p_project_id)
      AND (has_any_role(ARRAY['super_admin','admin','director']) OR assigned_to=auth.uid() OR (project_id IS NOT NULL AND is_project_manager(project_id)))),
    'overdue_tasks', (SELECT count(*) FROM public.crm_tasks WHERE status IN ('open','in_progress') AND due_at < now() AND (p_project_id IS NULL OR project_id=p_project_id)
      AND (has_any_role(ARRAY['super_admin','admin','director']) OR assigned_to=auth.uid() OR (project_id IS NOT NULL AND is_project_manager(project_id)))),
    'my_leads', (SELECT count(*) FROM public.leads WHERE assigned_to=auth.uid()),
    'my_registrations', (SELECT count(*) FROM public.registrations WHERE assigned_to=auth.uid()),
    'my_open_tasks', (SELECT count(*) FROM public.crm_tasks WHERE assigned_to=auth.uid() AND status IN ('open','in_progress'))
  );
END; $$;
REVOKE ALL ON FUNCTION public.get_operations_dashboard(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_operations_dashboard(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_operations_work(p_project_id uuid DEFAULT NULL, p_limit int DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_limit int := LEAST(GREATEST(p_limit,1),100);
BEGIN
  IF NOT is_active_user() THEN RAISE EXCEPTION 'inactive_user'; END IF;
  RETURN jsonb_build_object(
    'leads', (SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]'::jsonb) FROM (
      SELECT id, full_name, phone, status, priority, interested_project_id, updated_at
      FROM public.leads WHERE assigned_to=auth.uid()
        AND (p_project_id IS NULL OR interested_project_id=p_project_id)
      ORDER BY updated_at DESC LIMIT v_limit) x),
    'registrations', (SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]'::jsonb) FROM (
      SELECT id, registration_code, registration_type, status, project_id, created_at
      FROM public.registrations WHERE assigned_to=auth.uid()
        AND (p_project_id IS NULL OR project_id=p_project_id)
      ORDER BY created_at DESC LIMIT v_limit) x),
    'tasks', (SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]'::jsonb) FROM (
      SELECT id, title, status, priority, due_at, lead_id, registration_id, project_id
      FROM public.crm_tasks WHERE assigned_to=auth.uid() AND status IN ('open','in_progress')
        AND (p_project_id IS NULL OR project_id=p_project_id)
      ORDER BY due_at NULLS LAST, created_at DESC LIMIT v_limit) x),
    'overdue_tasks', (SELECT count(*) FROM public.crm_tasks WHERE assigned_to=auth.uid() AND status IN ('open','in_progress') AND due_at < now())
  );
END; $$;
REVOKE ALL ON FUNCTION public.get_my_operations_work(uuid,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_operations_work(uuid,int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.search_crm_tasks(
  p_project_id uuid DEFAULT NULL, p_query text DEFAULT NULL, p_status text DEFAULT NULL,
  p_priority text DEFAULT NULL, p_assigned_to uuid DEFAULT NULL, p_overdue boolean DEFAULT NULL,
  p_due_today boolean DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_limit int := LEAST(GREATEST(p_limit,1),100); v_offset int := GREATEST(p_offset,0);
BEGIN
  IF NOT is_active_user() THEN RAISE EXCEPTION 'inactive_user'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x)) FROM (
      SELECT t.id, t.title, t.status, t.priority, t.due_at, t.assigned_to, t.created_by,
             t.lead_id, t.registration_id, t.project_id, t.created_at, t.updated_at
      FROM public.crm_tasks t
      WHERE (p_project_id IS NULL OR t.project_id=p_project_id)
        AND (p_status IS NULL OR t.status=p_status)
        AND (p_priority IS NULL OR t.priority=p_priority)
        AND (p_assigned_to IS NULL OR t.assigned_to=p_assigned_to)
        AND (p_overdue IS NULL OR (p_overdue = (t.due_at IS NOT NULL AND t.due_at < now() AND t.status IN ('open','in_progress'))))
        AND (p_due_today IS NULL OR (p_due_today = (t.due_at::date = current_date)))
        AND (p_query IS NULL OR t.title ILIKE '%'||p_query||'%')
        AND (has_any_role(ARRAY['super_admin','admin','director'])
          OR t.assigned_to=auth.uid() OR t.created_by=auth.uid()
          OR (t.project_id IS NOT NULL AND is_project_manager(t.project_id)))
      ORDER BY CASE WHEN t.due_at IS NULL THEN 1 ELSE 0 END, t.due_at ASC, t.created_at DESC
      LIMIT v_limit OFFSET v_offset
    ) x
  ), '[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.search_crm_tasks(uuid,text,text,text,uuid,boolean,boolean,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_crm_tasks(uuid,text,text,text,uuid,boolean,boolean,int,int) TO authenticated, service_role;
