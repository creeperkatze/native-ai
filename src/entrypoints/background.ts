import { browser } from 'wxt/browser'

import { getSettings } from '../helpers/settings'

// chrome is a global in extension service workers but not typed when the file is a module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const chrome: any

export default defineBackground(() => {
	async function ensureOffscreen(): Promise<void> {
		if (!chrome.offscreen) return

		const contexts = await chrome.runtime.getContexts({
			contextTypes: ['OFFSCREEN_DOCUMENT'],
		})
		if (contexts.length > 0) return

		await chrome.offscreen.createDocument({
			url: browser.runtime.getURL('/offscreen.html'),
			reasons: ['WORKERS'],
			justification: 'Run WebLLM model inference via WebGPU in a persistent context',
		})

		// Offscreen has no storage access — background reads the setting and triggers the load
		const settings = await getSettings()
		browser.runtime
			.sendMessage({ type: 'webllm:init', target: 'offscreen', modelId: settings.webllmModel })
			.catch(() => {})
	}

	function setupSidePanel() {
		if (chrome.sidePanel) {
			chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error)
		}
	}

	browser.runtime.onInstalled.addListener(() => {
		setupSidePanel()
		ensureOffscreen().catch(console.error)
	})
	browser.runtime.onStartup.addListener(() => {
		setupSidePanel()
		ensureOffscreen().catch(console.error)
	})

	browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		if ((message as { target?: string }).target !== 'background') return
		if ((message as { type: string }).type === 'ensure-offscreen') {
			ensureOffscreen()
				.then(() => sendResponse({ ready: true }))
				.catch((e) => sendResponse({ ready: false, error: String(e) }))
			return true
		}
	})
})
