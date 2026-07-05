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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceError } from "@/services/_helpers";
import { queryKeys } from "@/lib/queryKeys";
import {
  createPolicy,
  updatePolicy,
  slugify,
  validatePolicySlug,
  ATTACHMENT_TYPES,
  type AttachmentType,
  type PolicyAttachment,
  type PolicyRow,
  type PolicySection,
  type PolicyApplicabilityScope,
} from "@/services/admin/salesPolicies.service";
import { listGlobalProductTypes, listProjectProductTypes } from "@/services/admin/productTypes.service";
import { searchProducts } from "@/services/admin/adminProducts.service";

type ExistingPolicy = Pick<
  PolicyRow,
  "id" | "project_id" | "slug" | "title" | "summary" | "content_json" | "attachments"
  | "effective_from" | "effective_to" | "is_featured" | "priority" | "status" | "applicability_scope"
> & { product_type_ids?: string[]; product_ids?: string[] };

interface Props {
  projectId: string;
  policy: ExistingPolicy | null; // null = create
  initialPtIds?: string[];
  initialProductIds?: string[];
  onClose: () => void;
  onSaved: (result: { policyId: string; slug: string }) => void;
}

function stableId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 16);
}
function fromDateInput(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

export function PolicyFormDialog({ projectId, policy, initialPtIds = [], initialProductIds = [], onClose, onSaved }: Props) {
  const qc = useQueryClient();
  const isEdit = !!policy;

  const [title, setTitle] = useState(policy?.title ?? "");
  const [slug, setSlug] = useState(policy?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!policy);
  const [summary, setSummary] = useState(policy?.summary ?? "");
  const [isFeatured, setFeatured] = useState(!!policy?.is_featured);
  const [priority, setPriority] = useState<number>(policy?.priority ?? 0);
  const [effFrom, setEffFrom] = useState(toDateInput(policy?.effective_from));
  const [effTo, setEffTo] = useState(toDateInput(policy?.effective_to));

  const [scope, setScope] = useState<PolicyApplicabilityScope>(
    (policy?.applicability_scope as PolicyApplicabilityScope) ?? "project_wide",
  );
  const [ptIds, setPtIds] = useState<string[]>(initialPtIds);
  const [productIds, setProductIds] = useState<string[]>(initialProductIds);
  const [productSearch, setProductSearch] = useState("");

  const [sections, setSections] = useState<PolicySection[]>(
    policy?.content_json?.sections?.length ? policy.content_json.sections : [],
  );
  const [attachments, setAttachments] = useState<PolicyAttachment[]>(policy?.attachments ?? []);
  const [submitting, setSubmitting] = useState<false | "draft" | "publish">(false);

  useEffect(() => {
    if (!isEdit && !slugTouched) setSlug(slugify(title));
  }, [title, isEdit, slugTouched]);

  const slugError = validatePolicySlug(slug);

  // Applicability data sources
  const globalPtQ = useQuery({ queryKey: ["types", "global"], queryFn: listGlobalProductTypes });
  const projectPtQ = useQuery({
    queryKey: queryKeys.adminProjectProductTypes(projectId),
    queryFn: () => listProjectProductTypes(projectId),
  });
  const availablePts = useMemo(() => {
    const g = (globalPtQ.data ?? []).map((t) => ({ id: t.id, name: t.name }));
    const p = (projectPtQ.data ?? []).map((t) => ({ id: t.id, name: t.name }));
    return [...g, ...p];
  }, [globalPtQ.data, projectPtQ.data]);

  const productSearchQ = useQuery({
    queryKey: ["admin", "policies", "product-search", projectId, productSearch],
    queryFn: () => searchProducts({ projectId, query: productSearch.trim() || undefined, limit: 20 }),
    enabled: scope === "specific_products" || productIds.length > 0,
  });
  const productsById = useMemo(() => {
    const map = new Map<string, { id: string; product_code: string; product_name: string | null }>();
    (productSearchQ.data ?? []).forEach((p) => map.set(p.id, {
      id: p.id,
      product_code: (p as { product_code: string }).product_code,
      product_name: (p as { product_name: string | null }).product_name ?? null,
    }));
    return map;
  }, [productSearchQ.data]);

  // ----- section helpers -----
  const addSection = () => setSections((prev) => [...prev, { id: stableId("sec"), title: "", content: "", display_order: prev.length }]);
  const removeSection = (i: number) => setSections((prev) => prev.filter((_, idx) => idx !== i));
  const moveSection = (i: number, dir: -1 | 1) => setSections((prev) => {
    const next = [...prev];
    const j = i + dir;
    if (j < 0 || j >= next.length) return prev;
    [next[i], next[j]] = [next[j], next[i]];
    return next.map((s, idx) => ({ ...s, display_order: idx }));
  });
  const patchSection = (i: number, patch: Partial<PolicySection>) =>
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  // ----- attachment helpers -----
  const addAttachment = () => setAttachments((prev) => [...prev, { id: stableId("att"), label: "", url: "", type: "link" }]);
  const removeAttachment = (i: number) => setAttachments((prev) => prev.filter((_, idx) => idx !== i));
  const patchAttachment = (i: number, patch: Partial<PolicyAttachment>) =>
    setAttachments((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

  const canSubmit = title.trim().length > 0 && !slugError;

  const buildPayload = () => ({
    title: title.trim(),
    slug,
    summary: summary.trim() || null,
    content_json: { sections: sections.map((s, idx) => ({ ...s, display_order: idx })) },
    attachments,
    effective_from: fromDateInput(effFrom),
    effective_to: fromDateInput(effTo),
    is_featured: isFeatured,
    priority,
  });

  const scopedPts = scope === "project_wide" ? [] : ptIds;
  const scopedPids = scope === "project_wide" ? [] : productIds;

  const doCreate = useMutation({
    mutationFn: (publish: boolean) =>
      createPolicy({
        projectId,
        policy: buildPayload(),
        productTypeIds: scopedPts,
        productIds: scopedPids,
        publish,
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: queryKeys.adminSalesPolicies(projectId) });
      onSaved({ policyId: r.policy_id, slug: r.slug });
      toast.success("Đã tạo chính sách");
    },
    onError: (e) => toast.error(e instanceof ServiceError ? e.message : String(e)),
    onSettled: () => setSubmitting(false),
  });

  const doUpdate = useMutation({
    mutationFn: () =>
      updatePolicy({
        policyId: policy!.id,
        patch: buildPayload(),
        productTypeIds: scopedPts,
        productIds: scopedPids,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminSalesPolicies(projectId) });
      qc.invalidateQueries({ queryKey: queryKeys.adminSalesPolicyDetail(policy!.id) });
      onSaved({ policyId: policy!.id, slug });
      toast.success("Đã cập nhật chính sách");
    },
    onError: (e) => toast.error(e instanceof ServiceError ? e.message : String(e)),
    onSettled: () => setSubmitting(false),
  });

  const submit = (mode: "draft" | "publish") => {
    if (!canSubmit) return;
    setSubmitting(mode);
    if (isEdit) doUpdate.mutate();
    else doCreate.mutate(mode === "publish");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Chỉnh sửa chính sách" : "Tạo chính sách mới"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* GENERAL */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Thông tin chung</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Tiêu đề *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chính sách bán hàng đợt 1" />
              </div>
              <div>
                <Label>Slug *</Label>
                <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="chinh-sach-dot-1" />
                {slugError && <p className="mt-1 text-xs text-destructive">{slugError}</p>}
              </div>
              <div>
                <Label>Ưu tiên</Label>
                <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value) || 0)} />
              </div>
              <div className="md:col-span-2">
                <Label>Tóm tắt</Label>
                <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="featured" checked={isFeatured} onCheckedChange={setFeatured} />
                <Label htmlFor="featured">Nổi bật</Label>
              </div>
            </div>
          </section>

          <Separator />

          {/* DATES */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Thời gian hiệu lực</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Từ</Label>
                <Input type="datetime-local" value={effFrom} onChange={(e) => setEffFrom(e.target.value)} />
              </div>
              <div>
                <Label>Đến</Label>
                <Input type="datetime-local" value={effTo} onChange={(e) => setEffTo(e.target.value)} />
              </div>
            </div>
          </section>

          <Separator />

          {/* APPLICABILITY */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Phạm vi áp dụng</h3>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as PolicyApplicabilityScope)}>
              <div className="flex items-center gap-2"><RadioGroupItem id="scope-pw" value="project_wide" /><Label htmlFor="scope-pw">Toàn dự án</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem id="scope-pt" value="product_types" /><Label htmlFor="scope-pt">Theo loại sản phẩm</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem id="scope-sp" value="specific_products" /><Label htmlFor="scope-sp">Sản phẩm cụ thể</Label></div>
            </RadioGroup>

            {scope !== "project_wide" && (
              <div className="space-y-2">
                <Label>Loại sản phẩm áp dụng</Label>
                <div className="flex flex-wrap gap-2">
                  {availablePts.map((pt) => {
                    const on = ptIds.includes(pt.id);
                    return (
                      <Badge key={pt.id} variant={on ? "default" : "outline"} className="cursor-pointer"
                        onClick={() => setPtIds((prev) => on ? prev.filter((x) => x !== pt.id) : [...prev, pt.id])}>
                        {pt.name}
                      </Badge>
                    );
                  })}
                  {availablePts.length === 0 && <span className="text-xs text-muted-foreground">Chưa có loại sản phẩm.</span>}
                </div>
              </div>
            )}

            {scope === "specific_products" && (
              <div className="space-y-2">
                <Label>Sản phẩm áp dụng</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input className="pl-8" placeholder="Tìm mã / tên sản phẩm" value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)} />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto rounded border">
                  {(productSearchQ.data ?? []).map((p) => {
                    const on = productIds.includes(p.id);
                    return (
                      <button type="button" key={p.id}
                        className={`flex w-full items-center justify-between px-2 py-1 text-left text-sm hover:bg-muted ${on ? "bg-primary/10" : ""}`}
                        onClick={() => setProductIds((prev) => on ? prev.filter((x) => x !== p.id) : [...prev, p.id])}>
                        <span>{(p as { product_code: string }).product_code} — {(p as { product_name: string | null }).product_name ?? "—"}</span>
                        {on && <Badge variant="secondary">Đã chọn</Badge>}
                      </button>
                    );
                  })}
                  {productIds.length === 0 && (productSearchQ.data ?? []).length === 0 && (
                    <p className="p-2 text-xs text-muted-foreground">Nhập từ khóa để tìm sản phẩm.</p>
                  )}
                </div>
                {productIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 text-xs">
                    {productIds.map((id) => {
                      const p = productsById.get(id);
                      return (
                        <Badge key={id} variant="secondary" className="cursor-pointer"
                          onClick={() => setProductIds((prev) => prev.filter((x) => x !== id))}>
                          {p?.product_code ?? id} ✕
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          <Separator />

          {/* CONTENT */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Nội dung chính sách ({sections.length}/50)</h3>
              <Button size="sm" variant="outline" onClick={addSection} disabled={sections.length >= 50}>
                <Plus className="mr-1 h-3 w-3" /> Thêm mục
              </Button>
            </div>
            <div className="space-y-2">
              {sections.map((s, i) => (
                <Card key={s.id}>
                  <CardContent className="space-y-2 p-3">
                    <div className="flex items-center gap-1">
                      <Input value={s.title} onChange={(e) => patchSection(i, { title: e.target.value })} placeholder="Tiêu đề mục" />
                      <Button size="icon" variant="ghost" onClick={() => moveSection(i, -1)} disabled={i === 0}><ArrowUp className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => removeSection(i)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                    <Input value={s.subtitle ?? ""} onChange={(e) => patchSection(i, { subtitle: e.target.value })} placeholder="Phụ đề (tuỳ chọn)" />
                    <Textarea value={s.content} onChange={(e) => patchSection(i, { content: e.target.value })} rows={4} placeholder="Nội dung mục" />
                    <Textarea value={s.note ?? ""} onChange={(e) => patchSection(i, { note: e.target.value })} rows={2} placeholder="Ghi chú (tuỳ chọn)" />
                  </CardContent>
                </Card>
              ))}
              {sections.length === 0 && <p className="text-xs text-muted-foreground">Chưa có mục nội dung.</p>}
            </div>
          </section>

          <Separator />

          {/* ATTACHMENTS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Tài liệu đính kèm ({attachments.length}/20)</h3>
              <Button size="sm" variant="outline" onClick={addAttachment} disabled={attachments.length >= 20}>
                <Plus className="mr-1 h-3 w-3" /> Thêm
              </Button>
            </div>
            <div className="space-y-2">
              {attachments.map((a, i) => (
                <div key={a.id} className="grid grid-cols-12 items-center gap-2">
                  <Input className="col-span-4" value={a.label} onChange={(e) => patchAttachment(i, { label: e.target.value })} placeholder="Nhãn" />
                  <Input className="col-span-5" value={a.url} onChange={(e) => patchAttachment(i, { url: e.target.value })} placeholder="https://..." />
                  <Select value={a.type} onValueChange={(v) => patchAttachment(i, { type: v as AttachmentType })}>
                    <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                    <SelectContent>{ATTACHMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" onClick={() => removeAttachment(i)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
              {attachments.length === 0 && <p className="text-xs text-muted-foreground">Chưa có tài liệu.</p>}
            </div>
          </section>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          {!isEdit && (
            <Button variant="outline" disabled={!canSubmit || !!submitting} onClick={() => submit("draft")}>
              Lưu nháp
            </Button>
          )}
          <Button disabled={!canSubmit || !!submitting} onClick={() => submit(isEdit ? "draft" : "publish")}>
            {isEdit ? "Lưu thay đổi" : "Lưu & phát hành"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
