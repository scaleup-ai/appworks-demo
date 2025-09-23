// Small async helpers used by handler factories to reduce repeated loading boilerplate.
export async function withLoading<T>(setLoading: (b: boolean) => void, fn: () => Promise<T>): Promise<T> {
  setLoading(true);
  try {
    const res = await fn();
    return res;
  } finally {
    try {
      setLoading(false);
    } catch {
      // ignore errors when toggling loading off
    }
  }
}

export default { withLoading };
