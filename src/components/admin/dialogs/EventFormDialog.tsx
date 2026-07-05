import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowUp, ArrowDown, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceError } from "@/services/_helpers";
import { queryKeys } from "@/lib/queryKeys";
import {
  createEvent, updateEvent, getEventAdminDetail,
  slugify, validateEventSlug,
  EVENT_TYPES, EVENT_TYPE_LABELS, EVENT_LOCATION_TYPES, EVENT_LOCATION_TYPE_LABELS,
  type EventType, type EventLocationType,
  type EventAgendaItem, type EventSpeaker, type EventAttachment,
  type EventSession, type SiteTourDetails,
} from "@/services/admin/events.service";
import { listGlobalProductTypes, listProjectProductTypes } from "@/services/admin/productTypes.service";
import { searchProducts } from "@/services/admin/adminProducts.service";
import { searchPolicies } from "@/services/admin/salesPolicies.service";
import { searchVouchers } from "@/services/admin/vouchers.service";

function sid(p: string) { return `${p}-${Math.random().toString(36).slice(2, 10)}`; }
function toDT(iso: string | null | undefined): string { return iso ? new Date(iso).toISOString().slice(0, 16) : ""; }
function fromDT(v: string): string | null { return v ? new Date(v).toISOString() : null; }

const ATT_TYPES = ["pdf","image","document","spreadsheet","video","link"] as const;

export function EventFormDialog({
  projectId, eventId, onClose, onSaved,
}: { projectId: string; eventId: string | null; onClose: () => void; onSaved: (r: { eventId: string }) => void }) {
  const qc = useQueryClient();
  const isEdit = !!eventId;

  const detailQ = useQuery({
    queryKey: queryKeys.adminEventDetail(eventId ?? "__new__"),
    queryFn: () => getEventAdminDetail(eventId!),
    enabled: isEdit,
  });
  const existing = detailQ.data;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [eventType, setEventType] = useState<EventType>("sales_event");
  const [summary, setSummary] = useState("");
  const [featured, setFeatured] = useState(false);
  const [priority, setPriority] = useState(0);

  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh");
  const [regStart, setRegStart] = useState("");
  const [regDeadline, setRegDeadline] = useState("");

  const [locationType, setLocationType] = useState<EventLocationType>("physical");
  const [venueName, setVenueName] = useState("");
  const [addressText, setAddressText] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationNotes, setLocationNotes] = useState("");

  const [capacityMode, setCapacityMode] = useState<"unlimited"|"limited">("unlimited");
  const [capacity, setCapacity] = useState<number>(50);
  const [perUserLimit, setPerUserLimit] = useState<number>(1);

  const [agenda, setAgenda] = useState<EventAgendaItem[]>([]);
  const [speakers, setSpeakers] = useState<EventSpeaker[]>([]);
  const [attachments, setAttachments] = useState<EventAttachment[]>([]);
  const [siteTour, setSiteTour] = useState<SiteTourDetails>({});
  const [sessions, setSessions] = useState<EventSession[]>([]);

  const [ptIds, setPtIds] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [policyIds, setPolicyIds] = useState<string[]>([]);
  const [voucherIds, setVoucherIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [policySearch, setPolicySearch] = useState("");
  const [voucherSearch, setVoucherSearch] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!isEdit || !existing || initialized) return;
    const e = existing.event;
    setTitle(e.title); setSlug(e.slug); setSlugTouched(true);
    setEventType(e.event_type); setSummary(e.summary ?? "");
    setFeatured(e.is_featured); setPriority(e.priority);
    setStartAt(toDT(e.start_at)); setEndAt(toDT(e.end_at));
    setTimezone(e.timezone);
    setRegStart(toDT(e.registration_start)); setRegDeadline(toDT(e.registration_deadline));
    setLocationType(e.location_type); setVenueName(e.location_name ?? "");
    setAddressText(e.address_text ?? ""); setMeetingUrl(e.meeting_url ?? "");
    setLatitude(e.latitude != null ? String(e.latitude) : "");
    setLongitude(e.longitude != null ? String(e.longitude) : "");
    setLocationNotes(e.location_notes ?? "");
    if (e.capacity != null) { setCapacityMode("limited"); setCapacity(e.capacity); }
    setPerUserLimit(e.per_user_limit ?? 1);
    setAgenda(e.agenda_json ?? []); setSpeakers(e.speakers_json ?? []);
    setAttachments(e.attachments ?? []); setSiteTour(e.site_tour_details ?? {});
    setSessions(existing.sessions ?? []);
    setPtIds(existing.product_types.map((x) => x.id));
    setProductIds(existing.products.map((x) => x.id));
    setPolicyIds(existing.policies.map((x) => x.id));
    setVoucherIds(existing.vouchers.map((x) => x.id));
    setInitialized(true);
  }, [isEdit, existing, initialized]);

  useEffect(() => {
    if (!isEdit && !slugTouched) setSlug(slugify(title));
  }, [title, isEdit, slugTouched]);

  const slugErr = validateEventSlug(slug);

  const gPtQ = useQuery({ queryKey: ["types","global"], queryFn: listGlobalProductTypes });
  const pPtQ = useQuery({ queryKey: queryKeys.adminProjectProductTypes(projectId), queryFn: () => listProjectProductTypes(projectId) });
  const availablePts = useMemo(() => [
    ...(gPtQ.data ?? []).map(t => ({ id: t.id, name: t.name })),
    ...(pPtQ.data ?? []).map(t => ({ id: t.id, name: t.name })),
  ], [gPtQ.data, pPtQ.data]);

  const productQ = useQuery({
    queryKey: ["admin","events","product-search",projectId,productSearch],
    queryFn: () => searchProducts({ projectId, query: productSearch.trim() || undefined, limit: 20 }),
    enabled: !!productSearch || productIds.length > 0,
  });
  const policyQ = useQuery({
    queryKey: ["admin","events","policy-search",projectId,policySearch],
    queryFn: () => searchPolicies({ projectId, query: policySearch.trim() || null, limit: 20 }),
    enabled: !!policySearch || policyIds.length > 0,
  });
  const voucherQ = useQuery({
    queryKey: ["admin","events","voucher-search",projectId,voucherSearch],
    queryFn: () => searchVouchers({ projectId, query: voucherSearch.trim() || null, limit: 20 }),
    enabled: !!voucherSearch || voucherIds.length > 0,
  });

  // Agenda helpers
  const addAgenda = () => setAgenda(p => [...p, { id: sid("ag"), title: "", display_order: p.length }]);
  const rmAgenda = (i: number) => setAgenda(p => p.filter((_, idx) => idx !== i));
  const mvAgenda = (i: number, d: -1|1) => setAgenda(p => { const n=[...p]; const j=i+d; if(j<0||j>=n.length)return p; [n[i],n[j]]=[n[j],n[i]]; return n.map((x,idx)=>({...x,display_order:idx})); });
  const patchAgenda = (i: number, patch: Partial<EventAgendaItem>) => setAgenda(p => p.map((a, idx) => idx===i ? { ...a, ...patch } : a));

  // Speakers helpers
  const addSpeaker = () => setSpeakers(p => [...p, { id: sid("sp"), name: "", display_order: p.length }]);
  const rmSpeaker = (i: number) => setSpeakers(p => p.filter((_, idx) => idx !== i));
  const mvSpeaker = (i: number, d: -1|1) => setSpeakers(p => { const n=[...p]; const j=i+d; if(j<0||j>=n.length)return p; [n[i],n[j]]=[n[j],n[i]]; return n.map((x,idx)=>({...x,display_order:idx})); });
  const patchSpeaker = (i: number, patch: Partial<EventSpeaker>) => setSpeakers(p => p.map((a, idx) => idx===i ? { ...a, ...patch } : a));

  // Attachments
  const addAtt = () => setAttachments(p => [...p, { id: sid("at"), label: "", url: "", type: "link" }]);
  const rmAtt = (i: number) => setAttachments(p => p.filter((_, idx) => idx !== i));
  const patchAtt = (i: number, patch: Partial<EventAttachment>) => setAttachments(p => p.map((a, idx) => idx===i ? { ...a, ...patch } : a));

  // Sessions
  const addSession = () => setSessions(p => [...p, { id: sid("s"), title: "", starts_at: startAt ? new Date(startAt).toISOString() : new Date().toISOString(), ends_at: endAt ? new Date(endAt).toISOString() : new Date().toISOString(), display_order: p.length }]);
  const rmSession = (i: number) => setSessions(p => p.filter((_, idx) => idx !== i));
  const patchSession = (i: number, patch: Partial<EventSession>) => setSessions(p => p.map((s, idx) => idx===i ? { ...s, ...patch } : s));

  // Site tour lists
  const addIncl = () => setSiteTour(t => ({ ...t, included: [...(t.included ?? []), ""] }));
  const rmIncl = (i: number) => setSiteTour(t => ({ ...t, included: (t.included ?? []).filter((_, idx) => idx !== i) }));
  const patchIncl = (i: number, v: string) => setSiteTour(t => ({ ...t, included: (t.included ?? []).map((x, idx) => idx===i ? v : x) }));
  const addReq = () => setSiteTour(t => ({ ...t, requirements: [...(t.requirements ?? []), ""] }));
  const rmReq = (i: number) => setSiteTour(t => ({ ...t, requirements: (t.requirements ?? []).filter((_, idx) => idx !== i) }));
  const patchReq = (i: number, v: string) => setSiteTour(t => ({ ...t, requirements: (t.requirements ?? []).map((x, idx) => idx===i ? v : x) }));

  const canSubmit = title.trim().length > 0 && !slugErr;

  const buildEvent = () => ({
    title: title.trim(), slug, event_type: eventType,
    summary: summary.trim() || null,
    location_type: locationType,
    location_name: venueName.trim() || null,
    address_text: addressText.trim() || null,
    meeting_url: meetingUrl.trim() || null,
    latitude: latitude ? Number(latitude) : null,
    longitude: longitude ? Number(longitude) : null,
    location_notes: locationNotes.trim() || null,
    start_at: fromDT(startAt), end_at: fromDT(endAt), timezone,
    registration_start: fromDT(regStart), registration_deadline: fromDT(regDeadline),
    capacity: capacityMode === "limited" ? capacity : null,
    per_user_limit: perUserLimit,
    agenda_json: agenda, speakers_json: speakers, attachments,
    site_tour_details: eventType === "site_tour" ? siteTour : {},
    is_featured: featured, priority,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.adminEvents(projectId) });
    if (eventId) qc.invalidateQueries({ queryKey: queryKeys.adminEventDetail(eventId) });
  };

  const doCreate = useMutation({
    mutationFn: (publish: boolean) => createEvent({
      projectId, event: buildEvent(),
      sessions: sessions.map(s => ({ ...s, starts_at: s.starts_at, ends_at: s.ends_at })),
      productTypeIds: ptIds, productIds, policyIds, voucherIds, publish,
    }),
    onSuccess: (r) => { invalidate(); toast.success("Đã tạo sự kiện"); onSaved({ eventId: r.event_id }); },
    onError: (e) => toast.error(e instanceof ServiceError ? e.message : String(e)),
  });
  const doUpdate = useMutation({
    mutationFn: () => updateEvent({
      eventId: eventId!, patch: buildEvent(),
      sessions, productTypeIds: ptIds, productIds, policyIds, voucherIds,
    }),
    onSuccess: () => { invalidate(); toast.success("Đã cập nhật sự kiện"); onSaved({ eventId: eventId! }); },
    onError: (e) => toast.error(e instanceof ServiceError ? e.message : String(e)),
  });

  const submit = (mode: "draft" | "publish") => {
    if (!canSubmit) return;
    if (isEdit) doUpdate.mutate();
    else doCreate.mutate(mode === "publish");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Chỉnh sửa sự kiện" : "Tạo sự kiện mới"}</DialogTitle></DialogHeader>

        {isEdit && detailQ.isLoading ? <p className="text-sm text-muted-foreground">Đang tải…</p> : (
        <div className="space-y-6">
          {/* General */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Thông tin chung</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2"><Label>Tiêu đề *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><Label>Slug *</Label>
                <Input value={slug} onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugTouched(true); }} />
                {slugErr && <p className="mt-1 text-xs text-destructive">{slugErr}</p>}</div>
              <div><Label>Loại sự kiện</Label>
                <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{EVENT_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div className="md:col-span-2"><Label>Tóm tắt</Label>
                <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} /></div>
              <div><Label>Ưu tiên</Label>
                <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value) || 0)} /></div>
              <div className="flex items-center gap-2 md:mt-6">
                <Switch id="e-featured" checked={featured} onCheckedChange={setFeatured} />
                <Label htmlFor="e-featured">Nổi bật</Label>
              </div>
            </div>
          </section>

          <Separator />
          {/* Time */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Thời gian sự kiện</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Bắt đầu *</Label>
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></div>
              <div><Label>Kết thúc *</Label>
                <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></div>
              <div><Label>Múi giờ</Label>
                <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Asia/Ho_Chi_Minh" /></div>
            </div>
            <h4 className="text-sm font-medium mt-4">Thời gian đăng ký</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Bắt đầu đăng ký</Label>
                <Input type="datetime-local" value={regStart} onChange={(e) => setRegStart(e.target.value)} /></div>
              <div><Label>Hạn chót đăng ký</Label>
                <Input type="datetime-local" value={regDeadline} onChange={(e) => setRegDeadline(e.target.value)} /></div>
            </div>
          </section>

          <Separator />
          {/* Location */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Địa điểm</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <div><Label>Loại địa điểm</Label>
                <Select value={locationType} onValueChange={(v) => setLocationType(v as EventLocationType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_LOCATION_TYPES.map(t => <SelectItem key={t} value={t}>{EVENT_LOCATION_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              {locationType !== "online" && (<>
                <div><Label>Tên địa điểm</Label>
                  <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} /></div>
                <div><Label>Địa chỉ</Label>
                  <Input value={addressText} onChange={(e) => setAddressText(e.target.value)} /></div>
              </>)}
              {locationType !== "physical" && (
                <div className="md:col-span-3"><Label>URL họp trực tuyến</Label>
                  <Input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://…" /></div>
              )}
              <div><Label>Vĩ độ</Label>
                <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="20.8" /></div>
              <div><Label>Kinh độ</Label>
                <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="106.6" /></div>
              <div className="md:col-span-3"><Label>Ghi chú</Label>
                <Textarea value={locationNotes} onChange={(e) => setLocationNotes(e.target.value)} rows={2} /></div>
            </div>
          </section>

          <Separator />
          {/* Capacity */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Số lượng / Giới hạn</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <div><Label>Chế độ</Label>
                <Select value={capacityMode} onValueChange={(v) => setCapacityMode(v as "unlimited"|"limited")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unlimited">Không giới hạn</SelectItem>
                    <SelectItem value="limited">Giới hạn</SelectItem>
                  </SelectContent>
                </Select></div>
              {capacityMode === "limited" && (
                <div><Label>Sức chứa</Label>
                  <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value) || 1)} />
                  {isEdit && existing && <p className="text-xs text-muted-foreground mt-1">Hiện tại đã có {existing.capacity_stats.registration_count} đăng ký.</p>}
                </div>
              )}
              <div><Label>Giới hạn mỗi người dùng</Label>
                <Input type="number" min={1} value={perUserLimit} onChange={(e) => setPerUserLimit(Number(e.target.value) || 1)} /></div>
            </div>
          </section>

          <Separator />
          {/* Audience */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Phạm vi áp dụng</h3>
            <p className="text-xs text-muted-foreground">Không chọn gì → toàn dự án. Có thể kết hợp.</p>
            <div>
              <Label>Loại sản phẩm ({ptIds.length})</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {availablePts.map((pt) => {
                  const on = ptIds.includes(pt.id);
                  return (
                    <Badge key={pt.id} variant={on ? "default" : "outline"} className="cursor-pointer"
                      onClick={() => setPtIds(prev => on ? prev.filter(x => x !== pt.id) : [...prev, pt.id])}>
                      {pt.name}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Sản phẩm cụ thể ({productIds.length})</Label>
              <div className="relative mt-2"><Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="pl-8" placeholder="Tìm mã / tên SP" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} /></div>
              <div className="max-h-40 overflow-y-auto rounded border mt-2">
                {(productQ.data ?? []).map((p) => {
                  const id = p.product_id; if (!id) return null;
                  const on = productIds.includes(id);
                  return (
                    <button type="button" key={id}
                      className={`flex w-full items-center justify-between px-2 py-1 text-left text-sm hover:bg-muted ${on ? "bg-primary/10" : ""}`}
                      onClick={() => setProductIds(prev => on ? prev.filter(x => x !== id) : [...prev, id])}>
                      <span>{p.product_code ?? "—"} — {p.product_name ?? "—"}</span>
                      {on && <Badge variant="secondary">Đã chọn</Badge>}
                    </button>
                  );
                })}
                {(productQ.data ?? []).length === 0 && <p className="p-2 text-xs text-muted-foreground">Nhập từ khóa để tìm.</p>}
              </div>
            </div>
            <div>
              <Label>Chính sách ({policyIds.length})</Label>
              <div className="relative mt-2"><Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="pl-8" placeholder="Tìm chính sách" value={policySearch} onChange={(e) => setPolicySearch(e.target.value)} /></div>
              <div className="max-h-40 overflow-y-auto rounded border mt-2">
                {(policyQ.data?.rows ?? []).map((p) => {
                  const on = policyIds.includes(p.id);
                  return (
                    <button type="button" key={p.id}
                      className={`flex w-full items-center justify-between px-2 py-1 text-left text-sm hover:bg-muted ${on ? "bg-primary/10" : ""}`}
                      onClick={() => setPolicyIds(prev => on ? prev.filter(x => x !== p.id) : [...prev, p.id])}>
                      <span>{p.title} <span className="text-xs text-muted-foreground">({p.slug})</span></span>
                      {on && <Badge variant="secondary">Đã chọn</Badge>}
                    </button>
                  );
                })}
                {(policyQ.data?.rows ?? []).length === 0 && <p className="p-2 text-xs text-muted-foreground">Nhập từ khóa để tìm.</p>}
              </div>
            </div>
            <div>
              <Label>Voucher ({voucherIds.length})</Label>
              <div className="relative mt-2"><Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="pl-8" placeholder="Tìm voucher" value={voucherSearch} onChange={(e) => setVoucherSearch(e.target.value)} /></div>
              <div className="max-h-40 overflow-y-auto rounded border mt-2">
                {(voucherQ.data?.rows ?? []).map((v) => {
                  const on = voucherIds.includes(v.id);
                  return (
                    <button type="button" key={v.id}
                      className={`flex w-full items-center justify-between px-2 py-1 text-left text-sm hover:bg-muted ${on ? "bg-primary/10" : ""}`}
                      onClick={() => setVoucherIds(prev => on ? prev.filter(x => x !== v.id) : [...prev, v.id])}>
                      <span>{v.title} <span className="text-xs text-muted-foreground">({v.slug})</span></span>
                      {on && <Badge variant="secondary">Đã chọn</Badge>}
                    </button>
                  );
                })}
                {(voucherQ.data?.rows ?? []).length === 0 && <p className="p-2 text-xs text-muted-foreground">Nhập từ khóa để tìm.</p>}
              </div>
            </div>
          </section>

          <Separator />
          {/* Sessions */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Phiên sự kiện ({sessions.length}/100)</h3>
              <Button size="sm" variant="outline" onClick={addSession} disabled={sessions.length >= 100}>
                <Plus className="mr-1 h-3 w-3" /> Thêm phiên
              </Button>
            </div>
            {sessions.map((s, i) => (
              <Card key={s.id}><CardContent className="p-3 space-y-2">
                <div className="flex gap-2">
                  <Input value={s.title} onChange={(e) => patchSession(i, { title: e.target.value })} placeholder="Tiêu đề phiên" />
                  <Button size="icon" variant="ghost" onClick={() => rmSession(i)}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <Textarea value={s.description ?? ""} onChange={(e) => patchSession(i, { description: e.target.value })} rows={2} placeholder="Mô tả" />
                <div className="grid gap-2 md:grid-cols-2">
                  <Input type="datetime-local" value={toDT(s.starts_at)} onChange={(e) => patchSession(i, { starts_at: fromDT(e.target.value) ?? s.starts_at })} />
                  <Input type="datetime-local" value={toDT(s.ends_at)} onChange={(e) => patchSession(i, { ends_at: fromDT(e.target.value) ?? s.ends_at })} />
                </div>
                <Input value={s.location_text ?? ""} onChange={(e) => patchSession(i, { location_text: e.target.value })} placeholder="Địa điểm phiên" />
              </CardContent></Card>
            ))}
          </section>

          <Separator />
          {/* Agenda */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Chương trình ({agenda.length}/100)</h3>
              <Button size="sm" variant="outline" onClick={addAgenda} disabled={agenda.length >= 100}>
                <Plus className="mr-1 h-3 w-3" /> Thêm mục
              </Button>
            </div>
            {agenda.map((a, i) => (
              <Card key={a.id}><CardContent className="p-3 space-y-2">
                <div className="flex gap-1 items-center">
                  <Input value={a.time_label ?? ""} onChange={(e) => patchAgenda(i, { time_label: e.target.value })} placeholder="09:00" className="w-24" />
                  <Input value={a.title} onChange={(e) => patchAgenda(i, { title: e.target.value })} placeholder="Tiêu đề" />
                  <Button size="icon" variant="ghost" onClick={() => mvAgenda(i, -1)} disabled={i===0}><ArrowUp className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => mvAgenda(i, 1)} disabled={i===agenda.length-1}><ArrowDown className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => rmAgenda(i)}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <Textarea value={a.description ?? ""} onChange={(e) => patchAgenda(i, { description: e.target.value })} rows={2} placeholder="Mô tả" />
                <Input value={a.location ?? ""} onChange={(e) => patchAgenda(i, { location: e.target.value })} placeholder="Địa điểm" />
              </CardContent></Card>
            ))}
          </section>

          <Separator />
          {/* Speakers */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Diễn giả ({speakers.length}/50)</h3>
              <Button size="sm" variant="outline" onClick={addSpeaker} disabled={speakers.length >= 50}>
                <Plus className="mr-1 h-3 w-3" /> Thêm
              </Button>
            </div>
            {speakers.map((s, i) => (
              <Card key={s.id}><CardContent className="p-3 space-y-2">
                <div className="flex gap-1 items-center">
                  <Input value={s.name} onChange={(e) => patchSpeaker(i, { name: e.target.value })} placeholder="Họ tên" />
                  <Button size="icon" variant="ghost" onClick={() => mvSpeaker(i, -1)} disabled={i===0}><ArrowUp className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => mvSpeaker(i, 1)} disabled={i===speakers.length-1}><ArrowDown className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => rmSpeaker(i)}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input value={s.title ?? ""} onChange={(e) => patchSpeaker(i, { title: e.target.value })} placeholder="Chức danh" />
                  <Input value={s.organization ?? ""} onChange={(e) => patchSpeaker(i, { organization: e.target.value })} placeholder="Tổ chức" />
                </div>
                <Input value={s.avatar_url ?? ""} onChange={(e) => patchSpeaker(i, { avatar_url: e.target.value })} placeholder="URL ảnh (https://…)" />
                <Textarea value={s.bio ?? ""} onChange={(e) => patchSpeaker(i, { bio: e.target.value })} rows={2} placeholder="Giới thiệu" />
              </CardContent></Card>
            ))}
          </section>

          {eventType === "site_tour" && (<>
            <Separator />
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Chi tiết Site Tour</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>Điểm tập trung</Label>
                  <Input value={siteTour.meeting_point ?? ""} onChange={(e) => setSiteTour(t => ({ ...t, meeting_point: e.target.value }))} /></div>
                <div><Label>Phương tiện</Label>
                  <Input value={siteTour.transportation ?? ""} onChange={(e) => setSiteTour(t => ({ ...t, transportation: e.target.value }))} /></div>
                <div><Label>Giờ khởi hành</Label>
                  <Input value={siteTour.departure_time ?? ""} onChange={(e) => setSiteTour(t => ({ ...t, departure_time: e.target.value }))} /></div>
                <div><Label>Giờ về</Label>
                  <Input value={siteTour.return_time ?? ""} onChange={(e) => setSiteTour(t => ({ ...t, return_time: e.target.value }))} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between"><Label>Bao gồm</Label>
                  <Button size="sm" variant="outline" onClick={addIncl}><Plus className="mr-1 h-3 w-3" />Thêm</Button></div>
                {(siteTour.included ?? []).map((v, i) => (
                  <div key={i} className="flex gap-1 mt-1">
                    <Input value={v} onChange={(e) => patchIncl(i, e.target.value)} />
                    <Button size="icon" variant="ghost" onClick={() => rmIncl(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between"><Label>Yêu cầu</Label>
                  <Button size="sm" variant="outline" onClick={addReq}><Plus className="mr-1 h-3 w-3" />Thêm</Button></div>
                {(siteTour.requirements ?? []).map((v, i) => (
                  <div key={i} className="flex gap-1 mt-1">
                    <Input value={v} onChange={(e) => patchReq(i, e.target.value)} />
                    <Button size="icon" variant="ghost" onClick={() => rmReq(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
              <div><Label>Ghi chú liên hệ</Label>
                <Textarea value={siteTour.contact_note ?? ""} onChange={(e) => setSiteTour(t => ({ ...t, contact_note: e.target.value }))} rows={2} /></div>
            </section>
          </>)}

          <Separator />
          {/* Attachments */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Tài liệu / Media links ({attachments.length}/30)</h3>
              <Button size="sm" variant="outline" onClick={addAtt} disabled={attachments.length >= 30}>
                <Plus className="mr-1 h-3 w-3" /> Thêm
              </Button>
            </div>
            {attachments.map((a, i) => (
              <Card key={a.id}><CardContent className="p-3 space-y-2">
                <div className="flex gap-2 items-center">
                  <Input value={a.label} onChange={(e) => patchAtt(i, { label: e.target.value })} placeholder="Tên hiển thị" />
                  <Select value={a.type} onValueChange={(v) => patchAtt(i, { type: v as EventAttachment["type"] })}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{ATT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" onClick={() => rmAtt(i)}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <Input value={a.url} onChange={(e) => patchAtt(i, { url: e.target.value })} placeholder="https://…" />
              </CardContent></Card>
            ))}
          </section>
        </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          {isEdit ? (
            <Button disabled={!canSubmit || doUpdate.isPending} onClick={() => submit("draft")}>Lưu</Button>
          ) : (<>
            <Button variant="outline" disabled={!canSubmit || doCreate.isPending} onClick={() => submit("draft")}>Lưu nháp</Button>
            <Button disabled={!canSubmit || doCreate.isPending} onClick={() => submit("publish")}>Lưu & Phát hành</Button>
          </>)}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}