export type RequestWaitCtx = {
  waitUntil: (promise: Promise<unknown>) => void
}

export type ScopedResource<T> = {
  value: T
  close: () => Promise<void>
}

/**
 * One resource per request context. `scheduleRelease` must resolve only after
 * the response is finished (Next.js `after`). `ctx.waitUntil` then closes it
 * so the Worker stays alive until the socket is gone.
 */
export function scopeToRequest<T>(
  ctx: RequestWaitCtx,
  cache: WeakMap<object, T>,
  create: () => ScopedResource<T>,
  scheduleRelease: (release: () => void) => void,
): T {
  const cached = cache.get(ctx)
  if (cached) return cached

  let release!: () => void
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  scheduleRelease(release)

  const created = create()
  cache.set(ctx, created.value)
  ctx.waitUntil(released.then(() => created.close()))
  return created.value
}
