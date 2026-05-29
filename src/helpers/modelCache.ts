// Scan all browser Cache Storage entries for files matching any of the given model IDs.
// Works from any extension context (popup, options, offscreen) — no WebLLM import needed.
export async function getCachedModelIds(modelIds: string[]): Promise<Set<string>> {
	if (!('caches' in globalThis)) return new Set()
	try {
		const cacheNames = await caches.keys()
		const allUrls: string[] = []
		for (const name of cacheNames) {
			const cache = await caches.open(name)
			const keys = await cache.keys()
			allUrls.push(...keys.map((r) => decodeURIComponent(r.url)))
		}
		const cached = new Set<string>()
		for (const id of modelIds) {
			if (allUrls.some((url) => url.includes(id))) cached.add(id)
		}
		return cached
	} catch {
		return new Set()
	}
}

// Delete all cache entries whose URL contains the given model ID.
export async function deleteModelFromCache(modelId: string): Promise<void> {
	if (!('caches' in globalThis)) return
	try {
		const cacheNames = await caches.keys()
		for (const name of cacheNames) {
			const cache = await caches.open(name)
			const keys = await cache.keys()
			await Promise.all(
				keys
					.filter((r) => decodeURIComponent(r.url).includes(modelId))
					.map((r) => cache.delete(r)),
			)
		}
	} catch {
		// silent
	}
}
