/** Share in-flight reads and run one fresh pass for requests received during a read. */
export function coalesceRefresh(read: () => Promise<void>): () => Promise<void> {
  let active: Promise<void> | null = null;
  let requested = false;
  return () => {
    requested = true;
    if (!active) {
      active = Promise.resolve().then(async () => {
        try {
          do {
            requested = false;
            await read();
          } while (requested);
        } finally {
          active = null;
        }
      });
    }
    return active;
  };
}
