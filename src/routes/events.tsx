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
import { MobileEventCard } from "@/components/mobile/events/MobileEventCard";
import { useMobileEvents } from "@/features/events/queries";
import { useMobileProjectDetail } from "@/features/projects/queries";

const searchSchema = z.object({
  projectId: z.string().uuid().optional(),
  q: z.string().optional(),
  eventType: z.enum(["site_tour","sales_event","training","opening","customer_event","other","event","launch"]).optional(),
  featured: z.coerce.boolean().optional(),
  derivedState: z
    .enum(["upcoming_registration","registration_open","upcoming","ongoing","full","registration_closed","completed"])
    .optional(),
  productId: z.string().uuid().optional(),
});

type SearchState = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/events")({
  validateSearch: searchSchema,
  component: EventsPage,
  head: () => ({
    meta: [
      { title: "Sự kiện — Minh Minh Portal" },
      {
        name: "description",
        content: "Danh sách sự kiện và site tour đang diễn ra ở các dự án bạn phụ trách.",
      },
    ],
  }),
});

function EventsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/events" });

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
    data, isLoading, isError, error, refetch,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useMobileEvents({
    projectId: search.projectId ?? null,
    query: search.q ?? null,
    eventType: search.eventType ?? null,
    featured: search.featured ?? null,
    derivedState: search.derivedState ?? null,
    productId: search.productId ?? null,
  });

  const items = useMemo(() => {
    const flat = (data?.pages ?? []).flat();
    const seen = new Set<string>();
    return flat.filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)));
  }, [data]);

  const { data: projectDetail } = useMobileProjectDetail(search.projectId);
  const projectName = projectDetail?.project?.name as string | undefined;

  const toggle = <K extends keyof SearchState>(key: K, value: SearchState[K]) =>
    navigate({
      search: ((prev: SearchState) => ({
        ...prev,
        [key]: prev[key] === value ? undefined : value,
      })) as never,
    });

  return (
    <MobileShell showHeader={false}>
      <PageHeader
        title="Sự kiện & Site tour"
        subtitle={search.projectId ? projectName : "Toàn bộ dự án bạn phụ trách"}
      />
      <div className="space-y-3 p-4 pb-8">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]" />
          <Input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Tìm theo tên, mô tả hoặc địa điểm"
            className="h-11 rounded-full pl-9 pr-9"
            aria-label="Tìm sự kiện"
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
          <FilterChip active={!!search.featured} onClick={() => toggle("featured", true)}>
            Nổi bật
          </FilterChip>
          <FilterChip
            active={search.eventType === "site_tour"}
            onClick={() => toggle("eventType", "site_tour")}
          >
            Site tour
          </FilterChip>
          <FilterChip
            active={search.derivedState === "registration_open"}
            onClick={() => toggle("derivedState", "registration_open")}
          >
            Đang mở đăng ký
          </FilterChip>
          <FilterChip
            active={search.derivedState === "upcoming"}
            onClick={() => toggle("derivedState", "upcoming")}
          >
            Sắp diễn ra
          </FilterChip>
          <FilterChip
            active={search.derivedState === "ongoing"}
            onClick={() => toggle("derivedState", "ongoing")}
          >
            Đang diễn ra
          </FilterChip>
          {search.projectId && projectName && (
            <FilterChip
              active
              onRemove={() =>
                navigate({
                  search: ((prev: SearchState) => ({ ...prev, projectId: undefined })) as never,
                })
              }
            >
              {projectName}
            </FilterChip>
          )}
          {(items.length > 0 || isLoading) && (
            <span className="ml-auto text-[11px] text-[color:var(--text-tertiary)]">
              {isLoading ? "Đang tải…" : `${items.length} sự kiện`}
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
          <div className="space-y-3">
            <MobileEmptyState title="Chưa có sự kiện phù hợp" />
            {!search.projectId && (
              <div className="flex justify-center">
                <Link to="/projects" className="text-xs font-semibold text-[color:var(--brand-navy)]">
                  Xem dự án
                </Link>
              </div>
            )}
          </div>
        ) : (
          <ul className="space-y-2.5">
            {items.map((it) => (
              <li key={it.id}>
                <MobileEventCard
                  item={it}
                  showProject={!search.projectId}
                  productId={search.productId ?? null}
                />
              </li>
            ))}
          </ul>
        )}

        {hasNextPage && !isLoading && !isError && (
          <div className="flex justify-center pt-2">
            {isFetchingNextPage ? (
              <MobileInlineLoader />
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => fetchNextPage()}>
                Tải thêm
              </Button>
            )}
          </div>
        )}
      </div>
    </MobileShell>
  );
}