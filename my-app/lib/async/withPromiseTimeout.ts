/** Reject when `promise` does not settle within `ms` (used for IAP / trial actions). */
export function withPromiseTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(timeoutMessage ?? `Operation timed out after ${Math.round(ms / 1000)}s`)),
      ms,
    );
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
