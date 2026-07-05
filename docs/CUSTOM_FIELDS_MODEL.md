# Custom Fields Model (Phase 5A)

Mô hình dữ liệu 3 lớp cho trường mở rộng của sản phẩm bất động sản.

## Layers

| Layer | Bảng | Vai trò |
| --- | --- | --- |
| 1. Core | `products` | Trường lõi cố định (search/filter nhanh, realtime, reporting). Không đổi schema theo dự án. |
| 2. Field Definition | `product_field_definitions` | Cấu hình trường mở rộng theo dự án (và tuỳ chọn theo `product_type_id`). |
| 2b. Options | `product_field_options` | Danh sách lựa chọn cho `single_select`/`multi_select`. |
| 3. Value | `product_custom_values` | Giá trị của từng sản phẩm, lưu theo đúng typed column. |

## `product_field_definitions`

- `project_id` bắt buộc — trường luôn scope theo dự án.
- `product_type_id` NULL = áp dụng toàn dự án; NOT NULL = chỉ áp dụng cho loại đó.
- `field_key`: `^[a-z][a-z0-9_]{0,62}$`, không được trùng core field key (kiểm tra qua `public.is_reserved_product_field_key(text)`), UNIQUE `(project_id, field_key)`.
- `field_key` **immutable** sau khi có `product_custom_values` (trigger `guard_product_field_key_immutable`).
- `data_type` ∈ `text | long_text | integer | decimal | boolean | date | datetime | single_select | multi_select | url | phone`.
- Flags: `is_required`, `is_filterable`, `is_sortable`, `is_searchable`, `show_in_admin_table`, `show_in_mobile_list`, `show_in_product_detail`, `show_in_form`.
- `validation_rules jsonb`: min/max/regex tuỳ `data_type` — được RPC create/update product ở Phase 5C validate.

## `product_field_options`

- UNIQUE `(field_definition_id, option_value)`.
- `option_value` **immutable** khi đã được dùng trong `product_custom_values` (trigger `guard_product_field_option_value_immutable`).
- Options không lưu trong `validation_rules` để có thể index, audit và bảo toàn tính toàn vẹn.
- Xoá option đang dùng bị chặn (archive thay vì delete).

## `product_custom_values`

- UNIQUE `(product_id, field_definition_id)`.
- **Chỉ một typed column** được có giá trị:

| data_type | Cột hợp lệ |
| --- | --- |
| `text` / `long_text` / `url` / `phone` / `single_select` | `value_text` |
| `integer` | `value_integer` |
| `decimal` | `value_decimal` |
| `boolean` | `value_boolean` |
| `date` | `value_date` |
| `datetime` | `value_datetime` |
| `multi_select` | `value_jsonb` (JSON array of strings) |

### Trigger `validate_product_custom_value`

Kiểm tra khi insert/update:

1. `field_definition` tồn tại & `status = active`.
2. Product và field cùng `project_id`.
3. Nếu field có `product_type_id`, product phải cùng `product_type_id`.
4. Đúng một typed column có giá trị.
5. Đúng cột khớp `data_type`.
6. `single_select`: `value_text` phải nằm trong option active.
7. `multi_select`: mọi phần tử JSON array phải nằm trong option active.

### Required field không enforce ở trigger

`is_required` được kiểm tra bởi **RPC create/update product** (Phase 5C), vì product có thể được tạo trước rồi mới insert custom values, và trigger đơn dòng không thấy được toàn bộ payload.

## Ghi giá trị

- `product_custom_values` **không cấp** `INSERT/UPDATE/DELETE` cho `authenticated` — chỉ `SELECT`.
- Mọi mutation phải qua RPC `create_product_with_values` / `update_product_with_values` / `clone_product` / `bulk_update_products` (SECURITY DEFINER, `service_role` bypass RLS) — sẽ tạo ở Phase 5C.
- Điều này ngăn client bỏ qua required-field/permission enforcement.

## Indexes

- `product_field_definitions`: per project, product_type, status, display_order; partial cho filterable/searchable.
- `product_field_options`: per field, status, display_order.
- `product_custom_values`: per product, per field; partial typed value indexes cho query lọc theo custom field (`WHERE value_text IS NOT NULL`, …).
- **Không** tạo GIN cho `value_jsonb` cho tới khi có yêu cầu query rõ ràng.

## Reserved core keys

Hàm `public.is_reserved_product_field_key(text) → boolean` (IMMUTABLE) trả về true cho mọi cột hiện có trong `products`. Được dùng bởi CHECK constraint trên `product_field_definitions.field_key` và trigger `validate_inventory_view_field` (để cho phép `field_source='core'` chỉ chấp nhận core key hợp lệ).

## Roadmap

- Phase 5B: services `productFields.service.ts` + UI cấu hình trường / tuỳ chọn.
- Phase 5C: RPC `create_product_with_values`/`update_product_with_values` — nơi enforce required + validation_rules.
- Phase 5D: template apply — sao chép field definitions + options an toàn.