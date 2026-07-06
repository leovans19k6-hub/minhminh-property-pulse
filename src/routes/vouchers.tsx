import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { MobileVoucherCard } from "@/components/mobile/vouchers/MobileVoucherCard";
import { useMobileVouchers } from "@/features/vouchers/queries";
import { useMobileProjectDetail } from "@/features/projects/queries";

const searchSchema = z.object({
  projectId: z.string().uuid().optional(),
  q: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  registrationState: z.enum(["open", "upcoming", "closed"]).optional(),
});

type SearchState = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/vouchers")({
  validateSearch: searchSchema,
  component: VouchersPage,
  head: () => ({
    meta: [
      { title: "Voucher — Minh Minh Portal" },
      {
        name: "description",
        content: "Danh sách voucher đang áp dụng cho các dự án bạn có quyền truy cập.",
      },
    ],
  }),
});

function VouchersPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/vouchers" });

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
  } = useMobileVouchers({
    projectId: search.projectId ?? null,
    query: search.q ?? null,
    featured: search.featured ?? null,
    registrationState: search.registrationState ?? null,
  });

  const items = useMemo(() => {
    const flat = (data?.pages ?? []).flat();
    const seen = new Set<string>();
    return flat.filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)));
  }, [data]);

  const { data: projectDetail } = useMobileProjectDetail(search.projectId);
  const projectName = projectDetail?.project?.name as string | undefined;
  const subtitle = search.projectId ? projectName : "Toàn bộ dự án bạn phụ trách";

  const setState = (s: SearchState["registrationState"]) =>
    navigate({
      search: ((prev: SearchState) => ({
        ...prev,
        registrationState: prev.registrationState === s ? undefined : s,
      })) as never,
    });

  const toggleFeatured = () =>
    navigate({
      search: ((prev: SearchState) => ({
        ...prev,
        featured: prev.featured ? undefined : true,
      })) as never,
    });

  const clearProject = () =>
    navigate({
      search: ((prev: SearchState) => ({ ...prev, projectId: undefined })) as never,
    });

  return (
    <MobileShell showHeader={false}>
      <PageHeader title="Voucher" subtitle={subtitle} />
      <div className="space-y-3 p-4 pb-8">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]" />
          <Input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Tìm theo tên, mã hoặc mô tả voucher"
            className="h-11 rounded-full pl-9 pr-9"
            aria-label="Tìm voucher"
          />
          {qDraft && (
            <button
              type="button"
              onClick={() => setQDraft("")}
              aria-label="Xoá tìm kiếm"
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[color:var(--text-tertiary)] hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={!!search.featured} onClick={toggleFeatured}>
            Nổi bật
          </FilterChip>
          <FilterChip
            active={search.registrationState === "open"}
            onClick={() => setState("open")}
          >
            Đang mở đăng ký
          </FilterChip>
          <FilterChip
            active={search.registrationState === "upcoming"}
            onClick={() => setState("upcoming")}
          >
            Sắp mở
          </FilterChip>
          <FilterChip
            active={search.registrationState === "closed"}
            onClick={() => setState("closed")}
          >
            Đã đóng
          </FilterChip>
          {search.projectId && projectName && (
            <FilterChip active onRemove={clearProject}>
              {projectName}
            </FilterChip>
          )}
          {(items.length > 0 || isLoading) && (
            <span className="ml-auto text-[11px] text-[color:var(--text-tertiary)]">
              {isLoading ? "Đang tải…" : `${items.length} voucher`}
            </span>
          )}
        </div>

        {isLoading ? (
          <MobileListSkeleton count={4} />
        ) : isError ? (
          <MobileQueryErrorState
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyBlock
            projectId={search.projectId ?? null}
            isSearching={!!(search.q || search.featured || search.registrationState)}
          />
        ) : (
          <ul className="space-y-2.5">
            {items.map((it) => (
              <li key={it.id}>
                <MobileVoucherCard item={it} showProject={!search.projectId} />
              </li>
            ))}
          </ul>
        )}

        {hasNextPage && !isLoading && !isError && (
          <div className="flex justify-center pt-2">
            {isFetchingNextPage ? (
              <MobileInlineLoader />
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
              >
                Tải thêm
              </Button>
            )}
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function EmptyBlock({ projectId, isSearching }: { projectId: string | null; isSearching: boolean }) {
  if (isSearching) {
    return <MobileEmptyState title="Không tìm thấy voucher phù hợp" />;
  }
  if (projectId) {
    return (
      <div className="space-y-3">
        <MobileEmptyState title="Chưa có voucher đang áp dụng" />
        <div className="flex justify-center">
          <Link
            to="/inventory"
            search={{ projectId }}
            className="text-xs font-semibold text-[color:var(--brand-navy)]"
          >
            Xem bảng hàng
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <MobileEmptyState title="Hiện chưa có voucher đang áp dụng" />
      <div className="flex justify-center">
        <Link to="/projects" className="text-xs font-semibold text-[color:var(--brand-navy)]">
          Xem dự án
        </Link>
      </div>
    </div>
  );
}