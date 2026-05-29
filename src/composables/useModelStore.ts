import { onMounted, onUnmounted, ref } from 'vue'
import { browser } from 'wxt/browser'

import type { FromOffscreenMessage } from '../ai/messages'
import { WEBLLM_MODELS } from '../ai/types'
import { deleteModelFromCache, getCachedModelIds } from '../helpers/modelCache'
import { getSettings, saveSettings } from '../helpers/settings'

const MODEL_IDS = WEBLLM_MODELS.map((m) => m.id)

export function useModelStore() {
	const cachedIds = ref<Set<string>>(new Set())
	const downloadingId = ref<string | null>(null)
	const downloadProgress = ref(0)
	const currentModelId = ref('')
	const loading = ref(true)

	async function refresh() {
		const [cached, settings] = await Promise.all([getCachedModelIds(MODEL_IDS), getSettings()])
		cachedIds.value = cached
		currentModelId.value = settings.webllmModel
		loading.value = false
	}

	async function selectModel(modelId: string) {
		if (!cachedIds.value.has(modelId)) return
		currentModelId.value = modelId
		await saveSettings({ webllmModel: modelId })
	}

	async function downloadModel(modelId: string) {
		if (downloadingId.value) return
		downloadingId.value = modelId
		downloadProgress.value = 0
		try {
			await browser.runtime.sendMessage({ type: 'ensure-offscreen', target: 'background' })
			await browser.runtime.sendMessage({ type: 'webllm:init', target: 'offscreen', modelId })
		} catch {
			// sendMessage errors are expected when no popup is listening; the offscreen handles it
		}
	}

	async function deleteModel(modelId: string) {
		await deleteModelFromCache(modelId)
		const next = new Set(cachedIds.value)
		next.delete(modelId)
		cachedIds.value = next

		if (currentModelId.value === modelId) {
			const fallback = WEBLLM_MODELS.find((m) => next.has(m.id))
			if (fallback) await selectModel(fallback.id)
		}
	}

	const listener = (message: FromOffscreenMessage) => {
		if (message.type === 'webllm:progress') {
			downloadingId.value = message.modelId
			downloadProgress.value = message.progress
		} else if (message.type === 'webllm:ready') {
			const next = new Set(cachedIds.value)
			next.add(message.modelId)
			cachedIds.value = next
			if (downloadingId.value === message.modelId) {
				downloadingId.value = null
				downloadProgress.value = 0
			}
		} else if (message.type === 'webllm:error' && !message.chatId) {
			downloadingId.value = null
			downloadProgress.value = 0
		}
	}

	onMounted(async () => {
		browser.runtime.onMessage.addListener(listener)
		await refresh()
	})

	onUnmounted(() => {
		browser.runtime.onMessage.removeListener(listener)
	})

	return {
		loading,
		cachedIds,
		downloadingId,
		downloadProgress,
		currentModelId,
		selectModel,
		downloadModel,
		deleteModel,
		refresh,
	}
}
