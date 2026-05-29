import { browser } from 'wxt/browser'

import { WEBLLM_MODELS } from '../ai/types'

export interface ExtensionSettings {
	backend: 'chrome-ai' | 'webllm' | 'auto'
	webllmModel: string
	systemPrompt: string
	temperature: number
	theme: 'system' | 'light' | 'dark'
	includePageContext: boolean
}

const defaults: ExtensionSettings = {
	backend: 'auto',
	webllmModel: WEBLLM_MODELS[0].id,
	systemPrompt: 'You are a helpful assistant.',
	temperature: 0.7,
	theme: 'system',
	includePageContext: false,
}

export async function getSettings(): Promise<ExtensionSettings> {
	const stored = await browser.storage.local.get('settings')
	const patch = (stored.settings ?? {}) as Partial<ExtensionSettings>
	return { ...defaults, ...patch }
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
	const current = await getSettings()
	await browser.storage.local.set({ settings: { ...current, ...settings } })
}
