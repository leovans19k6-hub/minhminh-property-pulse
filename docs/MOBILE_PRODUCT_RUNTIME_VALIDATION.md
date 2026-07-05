# Mobile Product Runtime Validation (Phase 7B.1)

`get_mobile_product_detail` returns `jsonb`, which the generated Supabase types surface as the opaque `Json` type. The mobile service boundary (`src/services/mobile/products.service.ts::getMobileProductDetail`) narrows that payload with a runtime shape guard before returning the typed `MobileProductDetail` to consumers.

## Contract validated

`assertProductDetailShape(v)` requires:

- `v` is a non-null object.
- Top-level keys present: `product`, `project`, `media`, `price_options`, `custom_fields`, `price_history_summary`, `status_history_summary`, `applicable_policies`, `project_vouchers`, `upcoming_events`, `permissions`.
- Arrays: `media`, `price_options`, `custom_fields`, `applicable_policies`, `project_vouchers`, `upcoming_events`.
- `product.id` and `product.project_id` are strings.

Any failure throws a friendly `ServiceError("Dữ liệu sản phẩm không hợp lệ.")` — the UI renders `MobileQueryErrorState` with a retry action; raw JSON / parse errors are never surfaced to the client.

## Why a light guard rather than Zod

The RPC contract is server-authored and stable; the guard only needs to catch (a) a null payload from a permission edge case and (b) shape drift after a future migration. Full schema mirroring is deferred until real drift risk emerges — it would duplicate the admin schemas without additional safety.

## Related

Favorites, projects, and inventory services still `as unknown as <T>` because their generated `Returns: Json` follows the same pattern; the same guard approach can be applied opportunistically if drift risk grows.