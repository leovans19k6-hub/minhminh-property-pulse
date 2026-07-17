import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { runtimeTuning } from "./lib/runtime-config";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Retry transient failures; skip retries for auth / not-found.
        retry: (failureCount, error) => {
          const msg = (error as Error | undefined)?.message ?? "";
          if (
            msg.includes("Unauthorized") ||
            msg.includes("quyền") ||
            msg.includes("Không tìm thấy") ||
            msg.includes("404")
          ) {
            return false;
          }
          return failureCount < runtimeTuning.queryMaxRetries;
        },
        retryDelay: (attempt) => runtimeTuning.retryBackoff(attempt),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
