import type { MobileVoucherDetail } from "@/services/mobile/vouchers.service";
import { SectionCard } from "@/components/mobile/SectionCard";
import { InfoRow } from "@/components/mobile/InfoRow";
import { formatDate } from "@/utils/format";

export function VoucherCapacityCard({ detail }: { detail: MobileVoucherDetail }) {
  const v = detail.voucher;
  const my = detail.my_registration_state;
  const hasWindow = v.registration_start || v.registration_deadline;
  const hasCap =
    v.is_unlimited || v.quantity != null || v.capacity_remaining != null;
  if (!hasWindow && !hasCap && v.per_user_limit <= 1) return null;
  return (
    <SectionCard title="Sức chứa & đăng ký">
      <div className="divide-y divide-border">
        {v.is_unlimited ? (
          <InfoRow label="Số lượng" value="Không giới hạn" />
        ) : (
          v.quantity != null && (
            <InfoRow
              label="Số lượng còn lại"
              value={
                (v.capacity_remaining ?? 0) <= 0
                  ? "Đã hết suất"
                  : `${v.capacity_remaining}/${v.quantity} suất`
              }
            />
          )
        )}
        {v.registration_start && (
          <InfoRow label="Bắt đầu đăng ký" value={formatDate(v.registration_start)} />
        )}
        {v.registration_deadline && (
          <InfoRow label="Hạn đăng ký" value={formatDate(v.registration_deadline)} />
        )}
        <InfoRow
          label="Giới hạn cá nhân"
          value={
            v.per_user_limit > 1
              ? `${my.active_registration_count}/${v.per_user_limit} lượt`
              : my.active_registration_count > 0
                ? "Đã đăng ký"
                : "1 lượt"
          }
        />
      </div>
    </SectionCard>
  );
}