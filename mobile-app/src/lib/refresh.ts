/**
 * Pull-to-refresh handler for the tabs. Data is still mocked, so this only
 * waits long enough for the ring to read as "loading"; swap for real fetches
 * once backend-core exposes the endpoints.
 */
export function refreshMockData(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 1100));
}
