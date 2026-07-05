# Phase 5D — Smoke Tests

Kiểm thử nhanh cho Templates, Bulk Import & Product History.
Chạy với user có role phù hợp; tất cả kiểm tra RLS ở server.

## Điều kiện tiên quyết

- Đã có ≥1 dự án (`P1`) với zone/building/floor tối thiểu.
- User A: super_admin.
- User B: project_director của `P1`.
- User C: sales (không phải manager).

## A. Templates

| # | Bước | Kỳ vọng |
|---|------|---------|
| A1 | User A vào `/admin/inventory-templates` → **Tạo template** `apartment_std` | Template tạo thành công. |
| A2 | Mở chi tiết template → thêm 2 fields (`view_text` text, `bedrooms_ext` integer) + 1 view `admin_default` (view_type admin_table, columns có product_code/product_name/status/bedrooms_ext) | Fields & view hiển thị. |
| A3 | User C mở list templates | Xem được (read-only), không có nút Tạo/Sửa. |
| A4 | User B mở list templates | Xem được, không có nút Tạo. Có thể apply. |
| A5 | User C thử gọi `apply_inventory_template` (dev tools) | Lỗi `insufficient_privilege`. |

## B. Apply Template vào dự án

| # | Bước | Kỳ vọng |
|---|------|---------|
| B1 | User B vào `P1 → Trường tuỳ chỉnh → Áp dụng template` chọn `apartment_std` (bật fields + views, tắt overwrite) | Toast báo `+2 fields · +1 views`. Fields hiển thị trong `P1`. View `admin_default` xuất hiện tab **Bảng hiển thị**. |
| B2 | Áp dụng lại lần 2 (không overwrite) | Toast báo `skip 2 fields · skip 1 view`. Không tạo bản sao. |
| B3 | Sửa nhãn 1 field trong template → apply lại với **overwrite** ON | Field trong dự án cập nhật nhãn mới. |
| B4 | Cùng field_key trong template có kiểu `text`, nếu đã có `product_custom_values` tham chiếu → apply overwrite | Kiểu dữ liệu **không đổi** (bảo vệ dữ liệu). Các thuộc tính khác cập nhật. |

## C. Snapshot template từ dự án

| # | Bước | Kỳ vọng |
|---|------|---------|
| C1 | User A trong `P1 → Trường tuỳ chỉnh → Chụp template`, code `p1_snapshot`, name "P1 snapshot" | Toast báo thành công. Template mới xuất hiện chứa fields + views hiện tại. |
| C2 | User B thử Chụp template | Nút không hiển thị (chỉ super_admin/admin). |

## D. Bulk Import CSV

Dữ liệu mẫu (paste vào ô Import):

```csv
product_code,product_name,status,category,bedrooms_ext,view_text
A-01-01,Căn 01 tầng 01,available,apartment,2,Sông
A-01-02,Căn 02 tầng 01,reserved,apartment,3,Hồ
A-01-03,,available,apartment,,
```

| # | Bước | Kỳ vọng |
|---|------|---------|
| D1 | User B: Bảng hàng → Import CSV → paste dữ liệu → Phân tích | Auto-map: `product_code`, `product_name`, `status`, `category` → core; `bedrooms_ext`, `view_text` → custom. |
| D2 | Commit | Kết quả: success 3, failed 0 (dòng A-01-03 sẽ dùng product_code làm product_name mặc định). |
| D3 | Reload danh sách bảng hàng | 3 sản phẩm mới xuất hiện. Custom values `bedrooms_ext = 2/3/null`, `view_text` đúng. |
| D4 | Import lại chính CSV | Upsert theo `product_code` — chỉ update, không tạo trùng. |
| D5 | Dòng thiếu `product_code` (cột trống) | Row status `failed`, error_message `product_code_required`. Job status `completed_with_errors`. |
| D6 | User C thử commit | RLS chặn (không phải project manager) — `insufficient_privilege`. |

## E. Product History

| # | Bước | Kỳ vọng |
|---|------|---------|
| E1 | User B mở `A-01-01` → sửa status `available → reserved` | Bản ghi mới trong `product_status_history` (via trigger). |
| E2 | Nhấn nút Lịch sử trên hàng | Dialog mở, tab Trạng thái hiển thị bản ghi mới nhất trước. |
| E3 | Thêm price option 3.5 tỷ, is_primary=true | Bản ghi mới trong `product_price_history`. Tab Giá trong dialog hiển thị. |
| E4 | User C mở Lịch sử | Xem được (RLS `is_active_user` cho phép read). |

## F. RLS & Security

- `apply_inventory_template`, `commit_inventory_import`, `inventory_import_add_rows` đều SECURITY DEFINER + tự kiểm tra `is_project_manager`.
- `snapshot_template_from_project` yêu cầu `has_any_role(['super_admin','admin'])`.
- Ghi audit_logs cho mọi thao tác apply / snapshot / commit.

## G. Regression

Không được ảnh hưởng các phase trước:

- Products CRUD (5C-b) vẫn hoạt động.
- FieldsTab / ViewsTab / InventorySettings (5C-a) không lỗi.
- Realtime products trên ProductsTab vẫn cập nhật.