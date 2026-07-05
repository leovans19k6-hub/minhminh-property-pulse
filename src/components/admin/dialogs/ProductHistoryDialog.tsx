import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/queryKeys";
import { listPriceHistory, listStatusHistory } from "@/services/admin/productHistory.service";

export function ProductHistoryDialog({
  productId,
  productLabel,
  onClose,
}: {
  productId: string;
  productLabel?: string;
  onClose: () => void;
}) {
  const statusQ = useQuery({
    queryKey: queryKeys.adminProductStatusHistory(productId),
    queryFn: () => listStatusHistory(productId),
  });
  const priceQ = useQuery({
    queryKey: queryKeys.adminProductPriceHistory(productId),
    queryFn: () => listPriceHistory(productId),
  });

  return (
    <Dialog open onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Lịch sử sản phẩm{productLabel ? ` — ${productLabel}` : ""}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="status">
          <TabsList>
            <TabsTrigger value="status">Trạng thái</TabsTrigger>
            <TabsTrigger value="price">Giá</TabsTrigger>
          </TabsList>
          <TabsContent value="status" className="mt-3">
            {statusQ.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (statusQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có thay đổi trạng thái.</p>
            ) : (
              <div className="rounded border overflow-x-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời điểm</TableHead>
                      <TableHead>Từ</TableHead>
                      <TableHead>Sang</TableHead>
                      <TableHead>Nguồn</TableHead>
                      <TableHead>Lý do</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(statusQ.data ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{new Date(r.changed_at).toLocaleString("vi-VN")}</TableCell>
                        <TableCell><Badge variant="outline">{r.old_status ?? "—"}</Badge></TableCell>
                        <TableCell><Badge>{r.new_status}</Badge></TableCell>
                        <TableCell className="text-xs">{r.source ?? "—"}</TableCell>
                        <TableCell className="text-xs">{r.reason ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
          <TabsContent value="price" className="mt-3">
            {priceQ.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (priceQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có thay đổi giá.</p>
            ) : (
              <div className="rounded border overflow-x-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời điểm</TableHead>
                      <TableHead>Bảng giá</TableHead>
                      <TableHead className="text-right">Cũ</TableHead>
                      <TableHead className="text-right">Mới</TableHead>
                      <TableHead>Nguồn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(priceQ.data ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{new Date(r.changed_at).toLocaleString("vi-VN")}</TableCell>
                        <TableCell className="font-mono text-xs">{r.price_code ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs">
                          {r.old_amount != null ? r.old_amount.toLocaleString("vi-VN") : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          {r.new_amount.toLocaleString("vi-VN")} {r.currency}
                        </TableCell>
                        <TableCell className="text-xs">{r.source ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}