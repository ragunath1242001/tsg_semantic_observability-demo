export type InitPromise = Promise<void> & {
  resolve: () => void;
  reject: (reason?: any) => void;
};

export function createInitPromise(): InitPromise {
  let resolver!: () => void;
  let rejecter!: (reason?: any) => void;
  const promise = new Promise<void>((resolve, reject) => {
    resolver = resolve;
    rejecter = reject;
  });
  return Object.assign(promise, { resolve: resolver, reject: rejecter });
}
