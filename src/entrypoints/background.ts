export default defineBackground(() => {
	async function ensureOffscreen(): Promise<void> {
		// chrome.runtime.getContexts and chrome.offscreen are Chrome 116+ APIs
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const cr = chrome as any
		if (!cr.offscreen) return

		const contexts = await cr.runtime.getContexts({
			contextTypes: ['OFFSCREEN_DOCUMENT'],
		})
		if (contexts.length > 0) return

		await cr.offscreen.createDocument({
			url: chrome.runtime.getURL('/offscreen.html'),
			reasons: ['WORKERS'],
			justification: 'Run WebLLM model inference via WebGPU in a persistent context',
		})
	}

	// Create offscreen document on install/startup so it's ready before popup opens
	chrome.runtime.onInstalled.addListener(() => {
		ensureOffscreen().catch(console.error)
	})
	chrome.runtime.onStartup.addListener(() => {
		ensureOffscreen().catch(console.error)
	})

	// Popup can also explicitly ask for it (handles first-open after install)
	chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		if (message.target !== 'background') return
		if (message.type === 'ensure-offscreen') {
			ensureOffscreen()
				.then(() => sendResponse({ ready: true }))
				.catch((e) => sendResponse({ ready: false, error: String(e) }))
			return true // keep channel open for async response
		}
	})
})
