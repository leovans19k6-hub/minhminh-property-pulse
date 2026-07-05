import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { queryKeys } from "@/lib/queryKeys";
import { listDevelopers } from "@/services/admin/developers.service";
import type { ProjectInsert, ProjectRow } from "@/services/admin/projects.service";

const schema = z.object({
  developer_id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1, "Tên bắt buộc").max(200),
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9-]+$/, "Slug chỉ chữ thường, số, dấu -"),
  code: z.string().trim().min(1).max(50),
  location_text: z.string().trim().max(300).optional().nullable(),
  province: z.string().trim().max(100).optional().nullable(),
  district: z.string().trim().max(100).optional().nullable(),
  short_description: z.string().trim().max(500).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  thumbnail_url: z.string().trim().url().optional().nullable().or(z.literal("").transform(() => null)),
  cover_url: z.string().trim().url().optional().nullable().or(z.literal("").transform(() => null)),
  logo_url: z.string().trim().url().optional().nullable().or(z.literal("").transform(() => null)),
  project_category: z.string().optional().nullable(),
  status: z.enum(["active", "coming_soon", "handover", "closed", "draft"]).default("active"),
  display_order: z.coerce.number().int().default(0),
  is_featured: z.boolean().default(false),
});

export function ProjectForm({
  initial,
  onSubmit,
}: {
  initial?: ProjectRow;
  onSubmit: (values: ProjectInsert) => Promise<void>;
}) {
  const devs = useQuery({ queryKey: queryKeys.adminDevelopers(), queryFn: listDevelopers });
  const [form, setForm] = useState({
    developer_id: initial?.developer_id ?? "",
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    code: initial?.code ?? "",
    location_text: initial?.location_text ?? "",
    province: initial?.province ?? "",
    district: initial?.district ?? "",
    short_description: initial?.short_description ?? "",
    description: initial?.description ?? "",
    thumbnail_url: initial?.thumbnail_url ?? "",
    cover_url: initial?.cover_url ?? "",
    logo_url: initial?.logo_url ?? "",
    project_category: initial?.project_category ?? "low_rise",
    status: (initial?.status ?? "active") as "active" | "coming_soon" | "handover" | "closed" | "draft",
    display_order: initial?.display_order ?? 0,
    is_featured: initial?.is_featured ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function slugify(name: string) {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d").replace(/[^a-z0-9\s-]/g, "")
      .trim().replace(/\s+/g, "-");
  }

  async function handleSubmit() {
    setErrors({});
    const parsed = schema.safeParse({
      ...form,
      developer_id: form.developer_id || null,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path.join(".")] = i.message; });
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(parsed.data as ProjectInsert);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field label="Nhà phát triển" error={errors["developer_id"]}>
        <Select value={form.developer_id} onValueChange={(v) => setForm({ ...form, developer_id: v })}>
          <SelectTrigger><SelectValue placeholder={devs.isLoading ? "Đang tải…" : "Chọn"} /></SelectTrigger>
          <SelectContent>
            {devs.data?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Danh mục" error={errors["project_category"]}>
        <Select value={form.project_category ?? ""} onValueChange={(v) => setForm({ ...form, project_category: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low_rise">Thấp tầng</SelectItem>
            <SelectItem value="apartment">Chung cư</SelectItem>
            <SelectItem value="mixed">Tổng hợp</SelectItem>
            <SelectItem value="commercial">Thương mại</SelectItem>
            <SelectItem value="other">Khác</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Tên dự án *" error={errors["name"]}>
        <Input value={form.name} onChange={(e) => {
          const name = e.target.value;
          setForm({ ...form, name, slug: form.slug || slugify(name) });
        }} />
      </Field>
      <Field label="Mã dự án *" error={errors["code"]}>
        <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
      </Field>
      <Field label="Slug *" error={errors["slug"]}>
        <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
      </Field>
      <Field label="Trạng thái">
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">active</SelectItem>
            <SelectItem value="coming_soon">coming_soon</SelectItem>
            <SelectItem value="handover">handover</SelectItem>
            <SelectItem value="closed">closed</SelectItem>
            <SelectItem value="draft">draft</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Địa chỉ"><Input value={form.location_text ?? ""} onChange={(e) => setForm({ ...form, location_text: e.target.value })} /></Field>
      <Field label="Tỉnh/Thành"><Input value={form.province ?? ""} onChange={(e) => setForm({ ...form, province: e.target.value })} /></Field>
      <Field label="Quận/Huyện"><Input value={form.district ?? ""} onChange={(e) => setForm({ ...form, district: e.target.value })} /></Field>
      <Field label="Thứ tự hiển thị"><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} /></Field>
      <div className="flex items-center gap-2 md:col-span-2">
        <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
        <Label>Đưa lên nổi bật</Label>
      </div>
      <Field label="Mô tả ngắn" full><Textarea rows={2} value={form.short_description ?? ""} onChange={(e) => setForm({ ...form, short_description: e.target.value })} /></Field>
      <Field label="Mô tả" full><Textarea rows={5} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      <Field label="Thumbnail URL" full error={errors["thumbnail_url"]}><Input value={form.thumbnail_url ?? ""} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} /></Field>
      <Field label="Cover URL" full error={errors["cover_url"]}><Input value={form.cover_url ?? ""} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} /></Field>
      <Field label="Logo URL" full error={errors["logo_url"]}><Input value={form.logo_url ?? ""} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></Field>

      <div className="flex justify-end gap-2 md:col-span-2">
        <Button disabled={saving} onClick={handleSubmit}>{saving ? "Đang lưu…" : "Lưu"}</Button>
      </div>
    </div>
  );
}

function Field({ label, children, error, full }: { label: string; children: React.ReactNode; error?: string; full?: boolean }) {
  return (
    <div className={`space-y-1 ${full ? "md:col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}