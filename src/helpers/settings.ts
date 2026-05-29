import { browser } from 'wxt/browser'

import { WEBLLM_MODELS } from '../ai/types'

export interface ExtensionSettings {
	webllmModel: string
	theme: 'system' | 'light' | 'dark'
	enabledTools: string[]
}

const defaults: ExtensionSettings = {
	webllmModel: WEBLLM_MODELS[0].id,
	theme: 'system',
	enabledTools: [],
}

export async function getSettings(): Promise<ExtensionSettings> {
	const stored = await browser.storage.local.get('settings')
	const patch = (stored.settings ?? {}) as Partial<ExtensionSettings>
	const merged = { ...defaults, ...patch }
	// Reset to default if stored model is no longer in the model list
	if (!WEBLLM_MODELS.some((m) => m.id === merged.webllmModel)) {
		merged.webllmModel = defaults.webllmModel
	}
	return merged
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
	const current = await getSettings()
	await browser.storage.local.set({ settings: { ...current, ...settings } })
}
