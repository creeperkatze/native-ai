import { onMounted, ref } from 'vue'

import { applyColorScheme } from '../helpers/colorScheme'
import { type ExtensionSettings, getSettings, saveSettings } from '../helpers/settings'

export function useSettings() {
	const settings = ref<ExtensionSettings | null>(null)
	const loading = ref(true)

	onMounted(async () => {
		settings.value = await getSettings()
		if (settings.value) applyColorScheme(settings.value.theme)
		loading.value = false
	})

	async function update(patch: Partial<ExtensionSettings>): Promise<void> {
		await saveSettings(patch)
		settings.value = await getSettings()
		if (patch.theme) applyColorScheme(patch.theme)
	}

	return { settings, loading, update }
}
