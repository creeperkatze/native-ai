import { onUnmounted, readonly, ref } from 'vue'

import { createBackend } from '../ai'
import type { AIBackend, ChatMessage } from '../ai/types'
import { getSettings } from '../helpers/settings'

export type AIStatus = 'idle' | 'initializing' | 'ready' | 'error'

export function useAI() {
	const messages = ref<ChatMessage[]>([])
	const status = ref<AIStatus>('idle')
	const errorMessage = ref('')
	const isStreaming = ref(false)
	const initProgress = ref(0)
	const initStatus = ref('')
	const backendName = ref('')

	let backend: AIBackend | null = null
	let abortController: AbortController | null = null

	async function initialize(): Promise<void> {
		status.value = 'initializing'
		errorMessage.value = ''
		initProgress.value = 0
		initStatus.value = 'Checking availability...'

		const settings = await getSettings()
		backend = await createBackend(settings.backend, settings.webllmModel)

		if (!backend) {
			status.value = 'error'
			errorMessage.value =
				'No AI backend available. Enable Chrome Built-in AI or configure WebLLM in settings.'
			return
		}

		backendName.value = backend.name
		initStatus.value = 'Initializing...'

		try {
			await backend.initialize((progress, msg) => {
				initProgress.value = progress
				initStatus.value = msg
			}, settings.systemPrompt)
			status.value = 'ready'
		} catch (e) {
			status.value = 'error'
			errorMessage.value = e instanceof Error ? e.message : 'Failed to initialize AI backend'
		}
	}

	async function send(content: string): Promise<void> {
		if (!backend || status.value !== 'ready' || isStreaming.value) return

		const settings = await getSettings()

		const systemMessage: ChatMessage = { role: 'system', content: settings.systemPrompt }
		messages.value.push({ role: 'user', content })

		const assistantMsg: ChatMessage = { role: 'assistant', content: '' }
		messages.value.push(assistantMsg)
		isStreaming.value = true

		abortController = new AbortController()

		const history: ChatMessage[] = [systemMessage, ...messages.value.slice(0, -1)]

		try {
			await backend.chat(
				history,
				(chunk) => {
					messages.value[messages.value.length - 1].content += chunk
				},
				abortController.signal,
			)
		} catch (e) {
			if (e instanceof Error && e.name !== 'AbortError') {
				messages.value[messages.value.length - 1].content = `Error: ${e.message}`
			}
		} finally {
			isStreaming.value = false
			abortController = null
		}
	}

	function stop(): void {
		abortController?.abort()
	}

	function clear(): void {
		messages.value = []
	}

	onUnmounted(() => {
		abortController?.abort()
		backend?.destroy()
	})

	return {
		messages: readonly(messages),
		status,
		errorMessage,
		isStreaming,
		initProgress,
		initStatus,
		backendName,
		initialize,
		send,
		stop,
		clear,
	}
}
