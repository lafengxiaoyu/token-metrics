export class MemoryCache<T> {
  private readonly items = new Map<string, { value: T; expiresAt: number }>()

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | null{
    const item = this.items.get(key)
    if (!item) return null
    if (Date.now() > item.expiresAt) {
      this.items.delete(key)
      return null
    }
    return item.value
  }

  set(key: string, value: T): void {
    this.items.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  clear(): void {
    this.items.clear()
  }
}
