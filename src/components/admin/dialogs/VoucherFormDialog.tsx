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
  createVoucher, updateVoucher, getVoucherAdminDetail,
  slugify, validateVoucherSlug,
  VOUCHER_BENEFIT_TYPES, VOUCHER_BENEFIT_TYPE_LABELS,
  type VoucherBenefit, type VoucherCondition, type VoucherAttachment,
} from "@/services/admin/vouchers.service";
import { listGlobalProductTypes, listProjectProductTypes } from "@/services/admin/productTypes.service";
import { searchProducts } from "@/services/admin/adminProducts.service";
import { searchPolicies } from "@/services/admin/salesPolicies.service";

function stableId(p: string) { return `${p}-${Math.random().toString(36).slice(2, 10)}`; }
function toDT(iso: string | null | undefined): string { return iso ? new Date(iso).toISOString().slice(0, 16) : ""; }
function fromDT(v: string): string | null { return v ? new Date(v).toISOString() : null; }

const ATT_TYPES = ["pdf","image","document","spreadsheet","link"] as const;

export function VoucherFormDialog({
  projectId, voucherId, onClose, onSaved,
}: { projectId: string; voucherId: string | null; onClose: () => void; onSaved: (r: { voucherId: string }) => void }) {
  const qc = useQueryClient();
  const isEdit = !!voucherId;

  const detailQ = useQuery({
    queryKey: queryKeys.adminVoucherDetail(voucherId ?? "__new__"),
    queryFn: () => getVoucherAdminDetail(voucherId!),
    enabled: isEdit,
  });
  const existing = detailQ.data;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [code, setCode] = useState("");
  const [summary, setSummary] = useState("");
  const [featured, setFeatured] = useState(false);
  const [priority, setPriority] = useState(0);
  const [regStart, setRegStart] = useState("");
  const [regDeadline, setRegDeadline] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [capacityMode, setCapacityMode] = useState<"unlimited"|"limited">("unlimited");
  const [capacity, setCapacity] = useState<number>(1);
  const [perUserLimit, setPerUserLimit] = useState<number>(1);
  const [benefits, setBenefits] = useState<VoucherBenefit[]>([]);
  const [conditions, setConditions] = useState<VoucherCondition[]>([]);
  const [attachments, setAttachments] = useState<VoucherAttachment[]>([]);
  const [ptIds, setPtIds] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [policyIds, setPolicyIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [policySearch, setPolicySearch] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!isEdit || !existing || initialized) return;
    const v = existing.voucher;
    setTitle(v.title); setSlug(v.slug); setSlugTouched(true); setCode(v.code ?? "");
    setSummary(v.summary ?? ""); setFeatured(v.is_featured); setPriority(v.priority);
    setRegStart(toDT(v.registration_start)); setRegDeadline(toDT(v.registration_deadline));
    setValidFrom(toDT(v.effective_from)); setValidTo(toDT(v.effective_to));
    if (v.quantity != null) { setCapacityMode("limited"); setCapacity(v.quantity); }
    setPerUserLimit(v.per_user_limit ?? 1);
    setBenefits(v.benefits_json ?? []); setConditions(v.conditions_json ?? []);
    setAttachments(v.attachments ?? []);
    setPtIds(existing.product_types.map((x) => x.id));
    setProductIds(existing.products.map((x) => x.id));
    setPolicyIds(existing.policies.map((x) => x.id));
    setInitialized(true);
  }, [isEdit, existing, initialized]);

  useEffect(() => {
    if (!isEdit && !slugTouched) setSlug(slugify(title));
  }, [title, isEdit, slugTouched]);

  const slugErr = validateVoucherSlug(slug);

  const gPtQ = useQuery({ queryKey: ["types","global"], queryFn: listGlobalProductTypes });
  const pPtQ = useQuery({ queryKey: queryKeys.adminProjectProductTypes(projectId), queryFn: () => listProjectProductTypes(projectId) });
  const availablePts = useMemo(() => [
    ...(gPtQ.data ?? []).map(t => ({ id: t.id, name: t.name })),
    ...(pPtQ.data ?? []).map(t => ({ id: t.id, name: t.name })),
  ], [gPtQ.data, pPtQ.data]);

  const productQ = useQuery({
    queryKey: ["admin","vouchers","product-search",projectId,productSearch],
    queryFn: () => searchProducts({ projectId, query: productSearch.trim() || undefined, limit: 20 }),
    enabled: !!productSearch || productIds.length > 0,
  });
  const policyQ = useQuery({
    queryKey: ["admin","vouchers","policy-search",projectId,policySearch],
    queryFn: () => searchPolicies({ projectId, query: policySearch.trim() || null, limit: 20 }),
    enabled: !!policySearch || policyIds.length > 0,
  });

  // Benefit helpers
  const addBenefit = () => setBenefits(p => [...p, { id: stableId("b"), title: "", value_type: "other", display_order: p.length }]);
  const rmBenefit = (i: number) => setBenefits(p => p.filter((_, idx) => idx !== i));
  const mvBenefit = (i: number, d: -1|1) => setBenefits(p => { const n = [...p]; const j = i+d; if (j<0||j>=n.length) return p; [n[i],n[j]]=[n[j],n[i]]; return n.map((x,idx)=>({...x,display_order:idx})); });
  const patchBenefit = (i: number, patch: Partial<VoucherBenefit>) => setBenefits(p => p.map((b, idx) => idx===i ? { ...b, ...patch } : b));

  const addCondition = () => setConditions(p => [...p, { id: stableId("c"), title: "", display_order: p.length }]);
  const rmCondition = (i: number) => setConditions(p => p.filter((_, idx) => idx !== i));
  const mvCondition = (i: number, d: -1|1) => setConditions(p => { const n = [...p]; const j = i+d; if (j<0||j>=n.length) return p; [n[i],n[j]]=[n[j],n[i]]; return n.map((x,idx)=>({...x,display_order:idx})); });
  const patchCondition = (i: number, patch: Partial<VoucherCondition>) => setConditions(p => p.map((c, idx) => idx===i ? { ...c, ...patch } : c));

  const addAtt = () => setAttachments(p => [...p, { id: stableId("a"), label: "", url: "", type: "link" }]);
  const rmAtt = (i: number) => setAttachments(p => p.filter((_, idx) => idx !== i));
  const patchAtt = (i: number, patch: Partial<VoucherAttachment>) => setAttachments(p => p.map((a, idx) => idx===i ? { ...a, ...patch } : a));

  const canSubmit = title.trim().length > 0 && !slugErr;

  const buildVoucher = () => ({
    title: title.trim(), slug, code: code.trim() || null,
    summary: summary.trim() || null,
    voucher_type: "other",
    registration_start: fromDT(regStart),
    registration_deadline: fromDT(regDeadline),
    valid_from: fromDT(validFrom), valid_to: fromDT(validTo),
    quantity: capacityMode === "limited" ? capacity : null,
    per_user_limit: perUserLimit,
    benefits_json: benefits, conditions_json: conditions, attachments,
    is_featured: featured, priority,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.adminVouchers(projectId) });
    if (voucherId) qc.invalidateQueries({ queryKey: queryKeys.adminVoucherDetail(voucherId) });
  };

  const doCreate = useMutation({
    mutationFn: (publish: boolean) => createVoucher({
      projectId, voucher: buildVoucher(),
      productTypeIds: ptIds, productIds, policyIds, publish,
    }),
    onSuccess: (r) => { invalidate(); toast.success("Đã tạo voucher"); onSaved({ voucherId: r.voucher_id }); },
    onError: (e) => toast.error(e instanceof ServiceError ? e.message : String(e)),
  });
  const doUpdate = useMutation({
    mutationFn: () => updateVoucher({
      voucherId: voucherId!, patch: buildVoucher(),
      productTypeIds: ptIds, productIds, policyIds,
    }),
    onSuccess: () => { invalidate(); toast.success("Đã cập nhật voucher"); onSaved({ voucherId: voucherId! }); },
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
        <DialogHeader>
          <DialogTitle>{isEdit ? "Chỉnh sửa voucher" : "Tạo voucher mới"}</DialogTitle>
        </DialogHeader>

        {isEdit && detailQ.isLoading ? <p className="text-sm text-muted-foreground">Đang tải…</p> : (
        <div className="space-y-6">
          {/* GENERAL */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Thông tin chung</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Tiêu đề *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>Slug *</Label>
                <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} />
                {slugErr && <p className="mt-1 text-xs text-destructive">{slugErr}</p>}
              </div>
              <div>
                <Label>Mã voucher</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VOUCHER-2026" />
              </div>
              <div className="md:col-span-2">
                <Label>Tóm tắt</Label>
                <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Ưu tiên</Label>
                <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value) || 0)} />
              </div>
              <div className="flex items-center gap-2 md:mt-6">
                <Switch id="v-featured" checked={featured} onCheckedChange={setFeatured} />
                <Label htmlFor="v-featured">Nổi bật</Label>
              </div>
            </div>
          </section>

          <Separator />
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Thời gian</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Bắt đầu đăng ký</Label>
                <Input type="datetime-local" value={regStart} onChange={(e) => setRegStart(e.target.value)} /></div>
              <div><Label>Hạn chót đăng ký</Label>
                <Input type="datetime-local" value={regDeadline} onChange={(e) => setRegDeadline(e.target.value)} /></div>
              <div><Label>Hiệu lực từ</Label>
                <Input type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} /></div>
              <div><Label>Hiệu lực đến</Label>
                <Input type="datetime-local" value={validTo} onChange={(e) => setValidTo(e.target.value)} /></div>
            </div>
          </section>

          <Separator />
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Số lượng / Giới hạn</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Chế độ</Label>
                <Select value={capacityMode} onValueChange={(v) => setCapacityMode(v as "unlimited"|"limited")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unlimited">Không giới hạn</SelectItem>
                    <SelectItem value="limited">Giới hạn số lượng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {capacityMode === "limited" && (
                <div>
                  <Label>Tổng số lượng</Label>
                  <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value) || 1)} />
                  {isEdit && existing && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Hiện tại đã có {existing.capacity_stats.registration_count} đăng ký.
                    </p>
                  )}
                </div>
              )}
              <div>
                <Label>Giới hạn mỗi người dùng</Label>
                <Input type="number" min={1} value={perUserLimit} onChange={(e) => setPerUserLimit(Number(e.target.value) || 1)} />
              </div>
            </div>
          </section>

          <Separator />
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Phạm vi áp dụng</h3>
            <p className="text-xs text-muted-foreground">
              Không chọn gì → áp dụng toàn dự án. Có thể kết hợp nhiều loại (mixed).
            </p>

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
                {availablePts.length === 0 && <span className="text-xs text-muted-foreground">Chưa có loại SP.</span>}
              </div>
            </div>

            <div>
              <Label>Sản phẩm cụ thể ({productIds.length})</Label>
              <div className="relative mt-2"><Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="pl-8" placeholder="Tìm mã / tên SP" value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)} />
              </div>
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
                {(productQ.data ?? []).length === 0 && (
                  <p className="p-2 text-xs text-muted-foreground">Nhập từ khóa để tìm.</p>
                )}
              </div>
            </div>

            <div>
              <Label>Chính sách áp dụng ({policyIds.length})</Label>
              <div className="relative mt-2"><Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="pl-8" placeholder="Tìm chính sách" value={policySearch}
                  onChange={(e) => setPolicySearch(e.target.value)} />
              </div>
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
                {(policyQ.data?.rows ?? []).length === 0 && (
                  <p className="p-2 text-xs text-muted-foreground">Nhập từ khóa để tìm.</p>
                )}
              </div>
            </div>
          </section>

          <Separator />
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Quyền lợi ({benefits.length}/30)</h3>
              <Button size="sm" variant="outline" onClick={addBenefit} disabled={benefits.length >= 30}>
                <Plus className="mr-1 h-3 w-3" /> Thêm
              </Button>
            </div>
            <div className="space-y-2">
              {benefits.map((b, i) => (
                <Card key={b.id}><CardContent className="space-y-2 p-3">
                  <div className="flex items-center gap-1">
                    <Input value={b.title} onChange={(e) => patchBenefit(i, { title: e.target.value })} placeholder="Tiêu đề" />
                    <Button size="icon" variant="ghost" onClick={() => mvBenefit(i, -1)} disabled={i===0}><ArrowUp className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => mvBenefit(i, 1)} disabled={i===benefits.length-1}><ArrowDown className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => rmBenefit(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  <Textarea value={b.description ?? ""} onChange={(e) => patchBenefit(i, { description: e.target.value })} rows={2} placeholder="Mô tả" />
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={b.value_type} onValueChange={(v) => patchBenefit(i, { value_type: v as VoucherBenefit["value_type"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VOUCHER_BENEFIT_TYPES.map(t => <SelectItem key={t} value={t}>{VOUCHER_BENEFIT_TYPE_LABELS[t]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" value={b.value ?? ""} onChange={(e) => patchBenefit(i, { value: e.target.value === "" ? null : Number(e.target.value) })} placeholder="Giá trị" />
                    <Input value={b.unit ?? ""} onChange={(e) => patchBenefit(i, { unit: e.target.value })} placeholder="Đơn vị (%, VND…)" />
                  </div>
                </CardContent></Card>
              ))}
              {benefits.length === 0 && <p className="text-xs text-muted-foreground">Chưa có quyền lợi.</p>}
            </div>
          </section>

          <Separator />
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Điều kiện ({conditions.length}/50)</h3>
              <Button size="sm" variant="outline" onClick={addCondition} disabled={conditions.length >= 50}>
                <Plus className="mr-1 h-3 w-3" /> Thêm
              </Button>
            </div>
            <div className="space-y-2">
              {conditions.map((c, i) => (
                <Card key={c.id}><CardContent className="space-y-2 p-3">
                  <div className="flex items-center gap-1">
                    <Input value={c.title} onChange={(e) => patchCondition(i, { title: e.target.value })} placeholder="Tiêu đề điều kiện" />
                    <Button size="icon" variant="ghost" onClick={() => mvCondition(i, -1)} disabled={i===0}><ArrowUp className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => mvCondition(i, 1)} disabled={i===conditions.length-1}><ArrowDown className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => rmCondition(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  <Textarea value={c.description ?? ""} onChange={(e) => patchCondition(i, { description: e.target.value })} rows={2} placeholder="Mô tả" />
                  <div className="flex items-center gap-2">
                    <Switch checked={!!c.required} onCheckedChange={(v) => patchCondition(i, { required: v })} />
                    <Label>Bắt buộc</Label>
                  </div>
                </CardContent></Card>
              ))}
              {conditions.length === 0 && <p className="text-xs text-muted-foreground">Chưa có điều kiện.</p>}
            </div>
          </section>

          <Separator />
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Tài liệu ({attachments.length}/20)</h3>
              <Button size="sm" variant="outline" onClick={addAtt} disabled={attachments.length >= 20}>
                <Plus className="mr-1 h-3 w-3" /> Thêm
              </Button>
            </div>
            <div className="space-y-2">
              {attachments.map((a, i) => (
                <div key={a.id} className="grid grid-cols-12 items-center gap-2">
                  <Input className="col-span-4" value={a.label} onChange={(e) => patchAtt(i, { label: e.target.value })} placeholder="Nhãn" />
                  <Input className="col-span-5" value={a.url} onChange={(e) => patchAtt(i, { url: e.target.value })} placeholder="https://..." />
                  <Select value={a.type} onValueChange={(v) => patchAtt(i, { type: v as VoucherAttachment["type"] })}>
                    <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                    <SelectContent>{ATT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="col-span-1" onClick={() => rmAtt(i)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
              {attachments.length === 0 && <p className="text-xs text-muted-foreground">Chưa có tài liệu.</p>}
            </div>
          </section>
        </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          {!isEdit && (
            <>
              <Button variant="secondary" disabled={!canSubmit || doCreate.isPending} onClick={() => submit("draft")}>
                Lưu nháp
              </Button>
              <Button disabled={!canSubmit || doCreate.isPending} onClick={() => submit("publish")}>
                Lưu & phát hành
              </Button>
            </>
          )}
          {isEdit && (
            <Button disabled={!canSubmit || doUpdate.isPending} onClick={() => submit("draft")}>
              Lưu thay đổi
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}