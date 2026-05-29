import { browser } from 'wxt/browser'

import { MODELS } from '../ai/types'

export interface ExtensionSettings {
	model: string
	theme: 'system' | 'light' | 'dark'
	enabledTools: string[]
}

const defaults: ExtensionSettings = {
	model: MODELS[0].id,
	theme: 'system',
	enabledTools: [],
}

export async function getSettings(): Promise<ExtensionSettings> {
	const stored = await browser.storage.local.get('settings')
	const patch = (stored.settings ?? {}) as Partial<ExtensionSettings>
	const merged = { ...defaults, ...patch }
	// Reset to default if stored model is no longer in the model list
	if (!MODELS.some((m) => m.id === merged.model)) {
		merged.model = defaults.model
	}
	return merged
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
	const current = await getSettings()
	await browser.storage.local.set({ settings: { ...current, ...settings } })
}
