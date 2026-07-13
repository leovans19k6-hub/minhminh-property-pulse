import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { z } from "zod";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/mobile/PageHeader";
import { FilterChip } from "@/components/mobile/FilterChip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MobileEmptyState,
  MobileInlineLoader,
  MobileListSkeleton,
  MobileQueryErrorState,
} from "@/components/mobile/MobileStates";
import { MobileRegistrationCard } from "@/components/mobile/registrations/MobileRegistrationCard";
import { useMyMobileRegistrations } from "@/features/registrations/queries";

const searchSchema = z.object({
  q: z.string().optional(),
  projectId: z.string().uuid().optional(),
  domain: z.enum(["CONSULTATION", "VOUCHER", "EVENT", "OTHER"]).optional(),
  type: z.enum(["consultation", "voucher", "event", "site_tour"]).optional(),
  status: z
    .enum(["new", "in_progress", "confirmed", "completed", "cancelled", "no_show", "rejected"])
    .optional(),
});
type SearchState = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/registrations")({
  validateSearch: searchSchema,
  component: RegistrationsPage,
  head: () => ({
    meta: [
      { title: "Đăng ký của tôi — Minh Minh Sales Hub" },
      {
        name: "description",
        content: "Theo dõi yêu cầu tư vấn, đăng ký voucher, sự kiện và site tour của bạn.",
      },
    ],
  }),
});

function RegistrationsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/registrations" });

  const [qDraft, setQDraft] = useState(search.q ?? "");
  useEffect(() => setQDraft(search.q ?? ""), [search.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if ((search.q ?? "") !== qDraft) {
        navigate({
          search: ((prev: SearchState) => ({
            ...prev,
            q: qDraft.trim() ? qDraft : undefined,
          })) as never,
        });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMyMobileRegistrations({
    projectId: search.projectId ?? null,
    domain: search.domain ?? null,
    registrationType: search.type ?? null,
    status: search.status ?? null,
    query: search.q ?? null,
  });

  const items = useMemo(() => (data?.pages ?? []).flat(), [data]);

  function setSearch(patch: Partial<SearchState>) {
    navigate({ search: ((prev: SearchState) => ({ ...prev, ...patch })) as never });
  }

  const activeDomain = search.domain ?? null;
  const activeStatus = search.status ?? null;

  return (
    <MobileShell showHeader={false}>
      <PageHeader
        title="Đăng ký của tôi"
        subtitle="Yêu cầu tư vấn, voucher, sự kiện và site tour"
      />

      <div className="space-y-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]" />
          <Input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Tìm theo mã, dự án, voucher, sự kiện..."
            className="pl-9"
            inputMode="search"
          />
          {qDraft && (
            <button
              type="button"
              onClick={() => setQDraft("")}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[color:var(--text-tertiary)] hover:bg-muted"
              aria-label="Xoá tìm kiếm"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <FilterChip
            label="Tất cả"
            active={!activeDomain}
            onClick={() => setSearch({ domain: undefined })}
          />
          <FilterChip
            label="Tư vấn"
            active={activeDomain === "CONSULTATION"}
            onClick={() =>
              setSearch({ domain: activeDomain === "CONSULTATION" ? undefined : "CONSULTATION" })
            }
          />
          <FilterChip
            label="Voucher"
            active={activeDomain === "VOUCHER"}
            onClick={() =>
              setSearch({ domain: activeDomain === "VOUCHER" ? undefined : "VOUCHER" })
            }
          />
          <FilterChip
            label="Sự kiện"
            active={activeDomain === "EVENT"}
            onClick={() => setSearch({ domain: activeDomain === "EVENT" ? undefined : "EVENT" })}
          />
        </div>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {(
            [
              ["new", "Mới"],
              ["in_progress", "Đang xử lý"],
              ["confirmed", "Đã xác nhận"],
              ["completed", "Hoàn tất"],
              ["cancelled", "Đã huỷ"],
            ] as const
          ).map(([code, label]) => (
            <FilterChip
              key={code}
              label={label}
              active={activeStatus === code}
              onClick={() => setSearch({ status: activeStatus === code ? undefined : code })}
            />
          ))}
        </div>

        {isLoading ? (
          <MobileListSkeleton count={5} />
        ) : isError ? (
          <MobileQueryErrorState
            message={error instanceof Error ? error.message : "Không thể tải danh sách đăng ký."}
            onRetry={() => void refetch()}
          />
        ) : items.length === 0 ? (
          <MobileEmptyState
            title="Chưa có đăng ký nào"
            description="Các đăng ký voucher, sự kiện, tư vấn của bạn sẽ hiển thị tại đây."
          />
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <MobileRegistrationCard key={it.id} item={it} />
            ))}
            {hasNextPage && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
                </Button>
              </div>
            )}
            {isFetchingNextPage && <MobileInlineLoader />}
          </div>
        )}
      </div>
    </MobileShell>
  );
}