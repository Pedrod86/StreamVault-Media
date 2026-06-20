import { QueryClient } from '@tanstack/react-query';
import { restoreQueryCache, saveQueryCache } from './queryPersister';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Automatically refetch when the browser reports the network is back
      refetchOnReconnect: 'always',
      retry: (failureCount, error) => {
        // Don't retry on offline — serve from cache instead
        if (!navigator.onLine) return false;
        // Retry queue: up to 4 attempts on a flaky relay before giving up
        return failureCount < 4;
      },
      // Exponential backoff with jitter — eases pressure on a recovering relay
      retryDelay: (attempt) =>
        Math.min(1000 * 2 ** attempt, 15000) + Math.floor(Math.random() * 400),
      // Keep cache data for 24h so offline browsing works
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      // Return cached data even when a refetch fails
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry writes (sync/progress saves) a few times on transient failures
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      networkMode: 'offlineFirst',
    },
  },
});

// Restore persisted cache immediately on load
restoreQueryCache(queryClientInstance);

// Save cache to localStorage whenever it changes
queryClientInstance.getQueryCache().subscribe(() => {
  saveQueryCache(queryClientInstance);
});