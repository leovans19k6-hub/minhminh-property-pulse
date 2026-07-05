import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ServiceError } from "@/services/_helpers";
import {
  parseCsv,
  createImportJob,
  addImportRows,
  commitImport,
  type ImportRowPayload,
} from "@/services/admin/inventoryImport.service";
import { listFieldDefinitions, type FieldDefRow } from "@/services/admin/fieldDefinitions.service";
import { queryKeys } from "@/lib/queryKeys";
import { useQuery } from "@tanstack/react-query";

/** Core keys that map directly to products columns. */
const CORE_KEYS = [
  "product_code",
  "product_name",
  "category",
  "status",
  "featured",
  "external_code",
  "description",
] as const;

const IGNORE = "__ignore__";
const CORE_PREFIX = "core:";
const CUSTOM_PREFIX = "custom:";

export function InventoryImportDialog({
  projectId,
  onClose,
  onCommitted,
}: {
  projectId: string;
  onClose: () => void;
  onCommitted?: () => void;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState<"paste" | "map" | "result">("paste");
  const [rawText, setRawText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({}); // col index -> "core:xxx" | "custom:field_key" | "__ignore__"
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const fieldsQ = useQuery({
    queryKey: queryKeys.adminProductFields(projectId, {}),
    queryFn: () => listFieldDefinitions(projectId, { includeArchived: false }),
  });
  const customFields: FieldDefRow[] = fieldsQ.data ?? [];

  const commitMut = useMutation({
    mutationFn: async () => {
      const payload: ImportRowPayload[] = dataRows.map((row, idx) => {
        const core: Record<string, unknown> = {};
        const custom: ImportRowPayload["raw_data"]["custom"] = [];
        let product_code = "";

        row.forEach((cell, colIdx) => {
          const m = mapping[colIdx];
          if (!m || m === IGNORE) return;
          const v = cell?.trim() ?? "";
          if (m.startsWith(CORE_PREFIX)) {
            const key = m.slice(CORE_PREFIX.length);
            if (key === "product_code") product_code = v;
            if (v === "") return;
            if (key === "featured") core[key] = v.toLowerCase() === "true" || v === "1";
            else core[key] = v;
          } else if (m.startsWith(CUSTOM_PREFIX)) {
            const fk = m.slice(CUSTOM_PREFIX.length);
            const def = customFields.find((d) => d.field_key === fk);
            if (!def || v === "") return;
            const dt = def.data_type;
            if (dt === "integer") custom!.push({ field_key: fk, value_integer: Number(v) });
            else if (dt === "decimal") custom!.push({ field_key: fk, value_decimal: Number(v) });
            else if (dt === "boolean") custom!.push({ field_key: fk, value_boolean: v.toLowerCase() === "true" || v === "1" });
            else if (dt === "date") custom!.push({ field_key: fk, value_date: v });
            else if (dt === "datetime") custom!.push({ field_key: fk, value_datetime: v });
            else if (dt === "multi_select") custom!.push({ field_key: fk, value_jsonb: v.split("|").map((s) => s.trim()).filter(Boolean) });
            else custom!.push({ field_key: fk, value_text: v });
          }
        });

        return {
          row_number: idx + 1,
          product_code,
          raw_data: { core, custom },
        };
      });

      const job = await createImportJob({
        projectId,
        fileName: `paste-${new Date().toISOString()}`,
        importType: "products",
        metadata: { headers, mapping },
      });
      await addImportRows(job.id, payload);
      return commitImport(job.id);
    },
    onSuccess: (r) => {
      setResult(r);
      setStep("result");
      qc.invalidateQueries({ queryKey: ["admin", "projects", projectId, "inventory-products"] });
      qc.invalidateQueries({ queryKey: queryKeys.adminInventoryImportJobs(projectId) });
      onCommitted?.();
    },
    onError: (e: unknown) => toast.error(e instanceof ServiceError ? e.message : "Lỗi"),
  });

  const handleParse = () => {
    const rows = parseCsv(rawText);
    if (rows.length < 2) { toast.error("Cần tối thiểu 2 dòng (header + data)"); return; }
    const [hd, ...rest] = rows;
    setHeaders(hd);
    setDataRows(rest);
    // Auto-map by header name
    const auto: Record<number, string> = {};
    hd.forEach((h, i) => {
      const norm = h.trim().toLowerCase();
      const core = CORE_KEYS.find((k) => k === norm);
      if (core) { auto[i] = CORE_PREFIX + core; return; }
      const cf = customFields.find((f) => f.field_key === norm);
      if (cf) { auto[i] = CUSTOM_PREFIX + cf.field_key; return; }
      auto[i] = IGNORE;
    });
    setMapping(auto);
    setStep("map");
  };

  const preview = dataRows.slice(0, 5);
  const codeCol = useMemo(
    () => Object.entries(mapping).find(([, v]) => v === CORE_PREFIX + "product_code")?.[0],
    [mapping],
  );
  const canCommit = codeCol !== undefined && dataRows.length > 0;

  return (
    <Dialog open onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import bảng hàng (CSV)</DialogTitle>
          <DialogDescription>Dán dữ liệu CSV (dòng đầu là header). Phải map cột <code>product_code</code>.</DialogDescription>
        </DialogHeader>

        {step === "paste" ? (
          <div className="space-y-3">
            <Label>Dữ liệu CSV</Label>
            <Textarea
              rows={14}
              className="font-mono text-xs"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={"product_code,product_name,status,carpet_area\nA-01-01,Căn 01 tầng 01,available,68.5"}
            />
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Huỷ</Button>
              <Button disabled={!rawText.trim()} onClick={handleParse}>Phân tích</Button>
            </DialogFooter>
          </div>
        ) : step === "map" ? (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              {dataRows.length} dòng dữ liệu. Map từng cột — bỏ qua nếu không cần.
            </div>
            <div className="rounded border overflow-x-auto max-h-[380px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h, i) => (
                      <TableHead key={i} className="min-w-[180px]">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold">{h}</div>
                          <Select value={mapping[i] ?? IGNORE} onValueChange={(v) => setMapping((m) => ({ ...m, [i]: v }))}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={IGNORE}>— Bỏ qua —</SelectItem>
                              {CORE_KEYS.map((k) => (
                                <SelectItem key={k} value={CORE_PREFIX + k}>core: {k}</SelectItem>
                              ))}
                              {customFields.map((f) => (
                                <SelectItem key={f.id} value={CUSTOM_PREFIX + f.field_key}>
                                  custom: {f.field_key}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((r, ri) => (
                    <TableRow key={ri}>
                      {r.map((c, ci) => <TableCell key={ci} className="text-xs">{c}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!codeCol ? <Badge variant="destructive">Chưa map product_code</Badge> : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("paste")}>Quay lại</Button>
              <Button disabled={!canCommit || commitMut.isPending} onClick={() => commitMut.mutate()}>
                {commitMut.isPending ? "Đang xử lý…" : `Commit ${dataRows.length} dòng`}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded border p-4">
              <p className="text-sm">Thành công: <span className="font-semibold text-emerald-600">{result?.success ?? 0}</span></p>
              <p className="text-sm">Thất bại: <span className="font-semibold text-destructive">{result?.failed ?? 0}</span></p>
            </div>
            <DialogFooter>
              <Button onClick={onClose}>Đóng</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}