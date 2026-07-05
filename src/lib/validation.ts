import { z } from "zod";

// Inventory search filters — mirrors search_inventory RPC arguments.
export const inventorySearchSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  query: z.string().trim().optional().nullable(),
  category: z.enum(["low_rise", "apartment", "commercial", "other"]).optional().nullable(),
  zoneId: z.string().uuid().optional().nullable(),
  buildingId: z.string().uuid().optional().nullable(),
  productTypeId: z.string().uuid().optional().nullable(),
  status: z
    .enum(["available", "holding", "booked", "sold", "locked", "unavailable"])
    .optional()
    .nullable(),
  floorMin: z.number().int().optional().nullable(),
  floorMax: z.number().int().optional().nullable(),
  areaMin: z.number().nonnegative().optional().nullable(),
  areaMax: z.number().nonnegative().optional().nullable(),
  priceMin: z.number().nonnegative().optional().nullable(),
  priceMax: z.number().nonnegative().optional().nullable(),
  direction: z.string().optional().nullable(),
  limit: z.number().int().positive().max(200).optional().nullable(),
  offset: z.number().int().nonnegative().optional().nullable(),
});
export type InventorySearchInput = z.infer<typeof inventorySearchSchema>;

// Lead
const phoneRegex = /^[0-9+\-\s().]{8,20}$/;
export const leadCreateSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().regex(phoneRegex, "Số điện thoại không hợp lệ"),
  email: z.string().email().optional().nullable(),
  source_id: z.string().uuid().optional().nullable(),
  interested_project_id: z.string().uuid().optional().nullable(),
  interested_product_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  note: z.string().max(2000).optional().nullable(),
});
export type LeadCreateInput = z.infer<typeof leadCreateSchema>;

// Registration
export const registrationCreateSchema = z
  .object({
    registration_type: z.enum(["consultation", "voucher", "site_tour", "event"]),
    lead_id: z.string().uuid().optional().nullable(),
    project_id: z.string().uuid().optional().nullable(),
    product_id: z.string().uuid().optional().nullable(),
    voucher_id: z.string().uuid().optional().nullable(),
    event_id: z.string().uuid().optional().nullable(),
    note: z.string().max(2000).optional().nullable(),
    // Optional inline lead creation (for public forms)
    lead: leadCreateSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.registration_type === "voucher" && !val.voucher_id) {
      ctx.addIssue({ code: "custom", path: ["voucher_id"], message: "voucher_id bắt buộc" });
    }
    if (
      (val.registration_type === "site_tour" || val.registration_type === "event") &&
      !val.event_id
    ) {
      ctx.addIssue({ code: "custom", path: ["event_id"], message: "event_id bắt buộc" });
    }
  });
export type RegistrationCreateInput = z.infer<typeof registrationCreateSchema>;

// Project
export const projectUpsertSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "slug chỉ gồm chữ thường, số và dấu -"),
  code: z.string().trim().min(1).max(50),
  developer_id: z.string().uuid().optional().nullable(),
  location_text: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  short_description: z.string().max(500).optional().nullable(),
  description: z.string().optional().nullable(),
  thumbnail_url: z.string().url().optional().nullable(),
  cover_url: z.string().url().optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
  project_category: z
    .enum(["low_rise", "apartment", "mixed", "commercial", "other"])
    .default("mixed"),
  status: z.enum(["active", "coming_soon", "handover", "closed", "draft"]).default("active"),
  is_featured: z.boolean().default(false),
});
export type ProjectUpsertInput = z.infer<typeof projectUpsertSchema>;

// Product
export const productUpsertSchema = z.object({
  project_id: z.string().uuid(),
  zone_id: z.string().uuid().optional().nullable(),
  building_id: z.string().uuid().optional().nullable(),
  floor_id: z.string().uuid().optional().nullable(),
  product_type_id: z.string().uuid().optional().nullable(),
  product_code: z.string().trim().min(1).max(100),
  product_name: z.string().optional().nullable(),
  category: z.enum(["low_rise", "apartment", "commercial", "other"]),
  status: z
    .enum(["available", "holding", "booked", "sold", "locked", "unavailable"])
    .default("available"),
  land_area: z.number().nonnegative().optional().nullable(),
  construction_area: z.number().nonnegative().optional().nullable(),
  carpet_area: z.number().nonnegative().optional().nullable(),
  built_up_area: z.number().nonnegative().optional().nullable(),
  floor_number: z.number().int().optional().nullable(),
  bedrooms: z.number().nonnegative().optional().nullable(),
  bathrooms: z.number().nonnegative().optional().nullable(),
  direction: z.string().optional().nullable(),
  door_direction: z.string().optional().nullable(),
  balcony_direction: z.string().optional().nullable(),
  view_text: z.string().optional().nullable(),
  featured: z.boolean().default(false),
  description: z.string().optional().nullable(),
});
export type ProductUpsertInput = z.infer<typeof productUpsertSchema>;

// Product price option
export const priceOptionUpsertSchema = z.object({
  product_id: z.string().uuid(),
  price_code: z.string().trim().min(1).max(50),
  price_name: z.string().trim().min(1).max(200),
  amount: z.number().nonnegative(),
  currency: z.string().default("VND"),
  price_per_sqm: z.number().nonnegative().optional().nullable(),
  discount_amount: z.number().nonnegative().optional().nullable(),
  discount_percent: z.number().min(0).max(100).optional().nullable(),
  loan_ratio: z.number().min(0).max(100).optional().nullable(),
  grace_period_months: z.number().int().nonnegative().optional().nullable(),
  payment_term_summary: z.string().optional().nullable(),
  is_primary: z.boolean().default(false),
  effective_from: z.string().datetime().optional().nullable(),
  effective_to: z.string().datetime().optional().nullable(),
  status: z.enum(["active", "inactive", "draft", "archived"]).default("active"),
});
export type PriceOptionUpsertInput = z.infer<typeof priceOptionUpsertSchema>;