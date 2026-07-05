export function formatVND(value: number): string {
  if (value >= 1_000_000_000) {
    const b = value / 1_000_000_000;
    return `${b.toFixed(b >= 10 ? 1 : 2).replace(/\.?0+$/, "")} tỷ`;
  }
  if (value >= 1_000_000) {
    return `${Math.round(value / 1_000_000)} tr`;
  }
  return value.toLocaleString("vi-VN");
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}