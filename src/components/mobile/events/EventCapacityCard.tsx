import type { MobileEventDetail } from "@/services/mobile/events.service";
import { SectionCard } from "@/components/mobile/SectionCard";
import { InfoRow } from "@/components/mobile/InfoRow";
import { formatDateTime } from "@/utils/format";

export function EventCapacityCard({ detail }: { detail: MobileEventDetail }) {
  const e = detail.event;
  const my = detail.my_registration_state;
  return (
    <SectionCard title="Sức chứa & đăng ký">
      <div className="divide-y divide-border">
        {e.is_unlimited ? (
          <InfoRow label="Số lượng" value="Không giới hạn" />
        ) : (
          e.capacity != null && (
            <InfoRow
              label="Số suất còn lại"
              value={
                (e.capacity_remaining ?? 0) <= 0
                  ? "Đã hết suất"
                  : `${e.capacity_remaining}/${e.capacity} suất`
              }
            />
          )
        )}
        {e.registration_start && (
          <InfoRow label="Bắt đầu đăng ký" value={formatDateTime(e.registration_start)} />
        )}
        {e.registration_deadline && (
          <InfoRow label="Hạn đăng ký" value={formatDateTime(e.registration_deadline)} />
        )}
        <InfoRow
          label="Giới hạn cá nhân"
          value={
            e.per_user_limit > 1
              ? `${my.active_registration_count}/${e.per_user_limit} lượt`
              : my.active_registration_count > 0
                ? "Đã đăng ký"
                : "1 lượt"
          }
        />
      </div>
    </SectionCard>
  );
}