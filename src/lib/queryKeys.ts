// Deterministic query-key factory for TanStack Query.
// All filter objects are normalized so identical filters produce identical keys.

export type InventoryFilters = {
  projectId?: string | null;
  query?: string | null;
  category?: string | null;
  zoneId?: string | null;
  buildingId?: string | null;
  productTypeId?: string | null;
  status?: string | null;
  floorMin?: number | null;
  floorMax?: number | null;
  areaMin?: number | null;
  areaMax?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  direction?: string | null;
  limit?: number | null;
  offset?: number | null;
};

function normalize<T extends Record<string, unknown>>(input: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.keys(input)
    .sort()
    .forEach((k) => {
      const v = input[k];
      if (v === undefined || v === null || v === "") return;
      out[k] = v;
    });
  return out;
}

export const queryKeys = {
  projects: () => ["projects"] as const,
  projectDetail: (id: string) => ["projects", "detail", id] as const,
  projectStats: (id: string) => ["projects", "stats", id] as const,

  inventory: () => ["inventory"] as const,
  inventorySearch: (filters: InventoryFilters = {}) =>
    ["inventory", "search", normalize(filters)] as const,

  productDetail: (id: string) => ["products", "detail", id] as const,
  productPrices: (id: string) => ["products", "prices", id] as const,

  policies: (projectId?: string | null) => ["policies", projectId ?? "all"] as const,
  policyDetail: (id: string) => ["policies", "detail", id] as const,

  vouchers: (projectId?: string | null) => ["vouchers", projectId ?? "all"] as const,
  voucherDetail: (id: string) => ["vouchers", "detail", id] as const,

  events: (projectId?: string | null) => ["events", projectId ?? "all"] as const,
  eventDetail: (id: string) => ["events", "detail", id] as const,

  registrations: () => ["registrations"] as const,
  myRegistrations: (userId: string) => ["registrations", "mine", userId] as const,

  favorites: (userId: string) => ["favorites", userId] as const,

  notifications: (userId: string) => ["notifications", userId] as const,
  unreadNotificationCount: (userId: string) =>
    ["notifications", userId, "unread-count"] as const,

  // Admin portal
  adminUsers: (filters: Record<string, unknown> = {}) =>
    ["admin", "users", normalize(filters as Record<string, unknown>)] as const,
  adminUserDetail: (userId: string) => ["admin", "users", "detail", userId] as const,
  adminDevelopers: () => ["admin", "developers"] as const,
  adminDeveloperDetail: (id: string) => ["admin", "developers", "detail", id] as const,
  adminProjects: (filters: Record<string, unknown> = {}) =>
    ["admin", "projects", normalize(filters as Record<string, unknown>)] as const,
  adminProjectDetail: (id: string) => ["admin", "projects", "detail", id] as const,
  adminProjectZones: (projectId: string) => ["admin", "projects", projectId, "zones"] as const,
  adminProjectBuildings: (projectId: string) => ["admin", "projects", projectId, "buildings"] as const,
  adminProjectFloors: (buildingId: string) => ["admin", "buildings", buildingId, "floors"] as const,
  adminProjectProductTypes: (projectId: string) => ["admin", "projects", projectId, "product-types"] as const,
  adminProjectMembers: (projectId: string) => ["admin", "projects", projectId, "members"] as const,
} as const;

export type QueryKeys = typeof queryKeys;