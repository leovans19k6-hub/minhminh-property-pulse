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

  // Phase 7A — Mobile
  mobileProjects: () => ["mobile", "projects"] as const,
  mobileProjectDetail: (id: string) => ["mobile", "projects", "detail", id] as const,
  mobileInventory: (filters: Record<string, unknown> = {}) =>
    ["mobile", "inventory", "search", normalize(filters)] as const,
  mobileInventoryFilters: (projectId?: string | null) =>
    ["mobile", "inventory", "filters", projectId ?? "all"] as const,

  // Phase 7B — Mobile Product Detail + Favorites
  mobileProductDetail: (id: string) => ["mobile", "products", "detail", id] as const,
  mobileFavorites: (filters: Record<string, unknown> = {}) =>
    ["mobile", "favorites", normalize(filters)] as const,

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

  // Inventory Engine (Phase 5)
  adminProjectInventorySettings: (projectId: string) =>
    ["admin", "projects", projectId, "inventory-settings"] as const,
  adminProductFields: (projectId: string, filters: Record<string, unknown> = {}) =>
    ["admin", "projects", projectId, "product-fields", normalize(filters)] as const,
  adminProductFieldDetail: (fieldId: string) =>
    ["admin", "product-fields", "detail", fieldId] as const,
  adminProductFieldOptions: (fieldId: string) =>
    ["admin", "product-fields", fieldId, "options"] as const,
  adminInventoryViews: (projectId: string, filters: Record<string, unknown> = {}) =>
    ["admin", "projects", projectId, "inventory-views", normalize(filters)] as const,
  adminInventoryViewDetail: (viewId: string) =>
    ["admin", "inventory-views", "detail", viewId] as const,
  adminInventoryViewFields: (viewId: string) =>
    ["admin", "inventory-views", viewId, "fields"] as const,
  adminInventoryTemplates: (filters: Record<string, unknown> = {}) =>
    ["admin", "inventory-templates", normalize(filters)] as const,
  adminInventoryTemplateDetail: (templateId: string) =>
    ["admin", "inventory-templates", "detail", templateId] as const,
  adminInventoryProducts: (projectId: string, filters: Record<string, unknown> = {}) =>
    ["admin", "projects", projectId, "inventory-products", normalize(filters)] as const,
  adminInventoryProductDetail: (productId: string) =>
    ["admin", "inventory-products", "detail", productId] as const,
  adminProductHistory: (productId: string) =>
    ["admin", "inventory-products", productId, "history"] as const,
  adminInventoryTemplateFields: (templateId: string) =>
    ["admin", "inventory-templates", templateId, "fields"] as const,
  adminInventoryTemplateViews: (templateId: string) =>
    ["admin", "inventory-templates", templateId, "views"] as const,
  adminInventoryImportJobs: (projectId: string) =>
    ["admin", "projects", projectId, "import-jobs"] as const,
  adminInventoryImportJobDetail: (jobId: string) =>
    ["admin", "import-jobs", "detail", jobId] as const,
  adminInventoryImportJobRows: (jobId: string) =>
    ["admin", "import-jobs", jobId, "rows"] as const,
  adminProductStatusHistory: (productId: string) =>
    ["admin", "inventory-products", productId, "status-history"] as const,
  adminProductPriceHistory: (productId: string) =>
    ["admin", "inventory-products", productId, "price-history"] as const,
  adminProductDetail: (productId: string) =>
    ["admin", "inventory-products", productId, "detail"] as const,

  // Phase 6A — Sales Policies
  adminSalesPolicies: (projectId: string, filters: Record<string, unknown> = {}) =>
    ["admin", "projects", projectId, "sales-policies", normalize(filters)] as const,
  adminSalesPolicyDetail: (policyId: string) =>
    ["admin", "sales-policies", "detail", policyId] as const,
  adminSalesPolicyVersions: (policyId: string) =>
    ["admin", "sales-policies", policyId, "versions"] as const,
  activeProjectPolicies: (
    projectId: string,
    productId?: string | null,
    productTypeId?: string | null,
  ) =>
    ["policies", "active", projectId, productId ?? null, productTypeId ?? null] as const,

  // Phase 6B — Vouchers
  adminVouchers: (projectId: string, filters: Record<string, unknown> = {}) =>
    ["admin", "projects", projectId, "vouchers", normalize(filters)] as const,
  adminVoucherDetail: (voucherId: string) =>
    ["admin", "vouchers", "detail", voucherId] as const,
  activeProjectVouchers: (projectId: string, ctx: Record<string, unknown> = {}) =>
    ["vouchers", "active", projectId, normalize(ctx)] as const,
  activeVoucherDetail: (voucherId: string, ctx: Record<string, unknown> = {}) =>
    ["vouchers", "active", "detail", voucherId, normalize(ctx)] as const,
  myVoucherRegistrations: (filters: Record<string, unknown> = {}) =>
    ["registrations", "vouchers", "mine", normalize(filters)] as const,
  voucherEligibility: (voucherId: string, ctx: Record<string, unknown> = {}) =>
    ["vouchers", "eligibility", voucherId, normalize(ctx)] as const,

  // Phase 6C — Events
  adminEvents: (projectId: string, filters: Record<string, unknown> = {}) =>
    ["admin", "projects", projectId, "events", normalize(filters)] as const,
  adminEventDetail: (eventId: string) =>
    ["admin", "events", "detail", eventId] as const,
  activeProjectEvents: (projectId: string, ctx: Record<string, unknown> = {}) =>
    ["events", "active", projectId, normalize(ctx)] as const,
  activeEventDetail: (eventId: string, ctx: Record<string, unknown> = {}) =>
    ["events", "active", "detail", eventId, normalize(ctx)] as const,
  myEventRegistrations: (filters: Record<string, unknown> = {}) =>
    ["registrations", "events", "mine", normalize(filters)] as const,
  eventEligibility: (eventId: string, ctx: Record<string, unknown> = {}) =>
    ["events", "eligibility", eventId, normalize(ctx)] as const,

  // Phase 6D — Operations Engine
  adminOperationsDashboard: (projectId?: string | null) =>
    ["admin", "operations", "dashboard", projectId ?? "all"] as const,
  adminLeads: (filters: Record<string, unknown> = {}) =>
    ["admin", "leads", normalize(filters)] as const,
  adminLeadDetail: (leadId: string) => ["admin", "leads", "detail", leadId] as const,
  adminLeadTimeline: (leadId: string, filters: Record<string, unknown> = {}) =>
    ["admin", "leads", leadId, "timeline", normalize(filters)] as const,
  adminRegistrations: (filters: Record<string, unknown> = {}) =>
    ["admin", "registrations", normalize(filters)] as const,
  adminRegistrationDetail: (registrationId: string) =>
    ["admin", "registrations", "detail", registrationId] as const,
  adminRegistrationTimeline: (registrationId: string, filters: Record<string, unknown> = {}) =>
    ["admin", "registrations", registrationId, "timeline", normalize(filters)] as const,
  adminCrmTasks: (filters: Record<string, unknown> = {}) =>
    ["admin", "crm-tasks", normalize(filters)] as const,
  myCrmTasks: (filters: Record<string, unknown> = {}) =>
    ["crm-tasks", "mine", normalize(filters)] as const,
  myOperationsWork: (filters: Record<string, unknown> = {}) =>
    ["operations", "my-work", normalize(filters)] as const,

  // Phase 6D.1 — assignable-user pickers
  assignableUsers: (projectId: string, targetType: string, query?: string | null) =>
    ["ops", "assignable-users", projectId, targetType, (query ?? "").toLowerCase()] as const,
  bulkAssignableUsers: (projectIds: string[], targetType: string, query?: string | null) =>
    [
      "ops",
      "bulk-assignable-users",
      Array.from(new Set(projectIds)).sort(),
      targetType,
      (query ?? "").toLowerCase(),
    ] as const,
} as const;

export type QueryKeys = typeof queryKeys;