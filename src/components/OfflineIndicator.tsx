import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Global offline detection banner. Shows a small pill when the browser
 * reports offline; on reconnect, invalidates all queries to re-fetch
 * stale data.
 */
export function OfflineIndicator() {
  const queryClient = useQueryClient();
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      // Refetch stale data on reconnect.
      void queryClient.invalidateQueries();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [queryClient]);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-3 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground shadow-lg"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>Mất kết nối mạng</span>
    </div>
  );
}