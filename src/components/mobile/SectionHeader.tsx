import type { ReactNode } from "react";

interface Props {
  title: string;
  action?: ReactNode;
}
export function SectionHeader({ title, action }: Props) {
  return (
    <div className="mb-3 flex items-center justify-between px-4">
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      {action}
    </div>
  );
}