import { onUnmounted, readonly, ref } from 'vue'

import { createBackend } from '../ai'
import type { AIBackend, ChatMessage, Tool } from '../ai/types'
import { getActiveTabContent } from '../helpers/pageContent'
import { getSettings } from '../helpers/settings'

export type AIStatus = 'idle' | 'initializing' | 'ready' | 'error'

export interface ToolCallState {
	name: string
	done: boolean
}

// UIMessage extends ChatMessage with optional UI-only metadata (not sent to the model)
export interface UIMessage extends ChatMessage {
	toolCall?: ToolCallState
}

export function useAI() {
	const messages = ref<UIMessage[]>([])
	const status = ref<AIStatus>('idle')
	const errorMessage = ref('')
	const isStreaming = ref(false)
	const initProgress = ref(0)
	const initStatus = ref('')

	let backend: AIBackend | null = null
	let abortController: AbortController | null = null
	let pageContextTool: Tool | null = null

	async function initialize(): Promise<void> {
		status.value = 'initializing'
		errorMessage.value = ''
		initProgress.value = 0
		initStatus.value = 'Checking availability...'
		pageContextTool = null

		try {
			const settings = await getSettings()
			backend = await createBackend(settings.webllmModel)

			if (!backend) {
				status.value = 'error'
				errorMessage.value =
					'WebGPU is not available. A WebGPU-capable browser and GPU are required.'
				return
			}

			if (settings.includePageContext) {
				pageContextTool = {
					definition: {
						type: 'function',
						function: {
							name: 'get_page_content',
							description:
								'Get the full text content of the current web page the user is viewing. Call this when the user asks about the page or when context from the page is needed to answer.',
							parameters: { type: 'object', properties: {}, required: [] },
						},
					},
					execute: async () => {
						const lastMsg = messages.value[messages.value.length - 1]
						if (lastMsg?.role === 'assistant') {
							lastMsg.toolCall = { name: 'get_page_content', done: false }
						}
						const result = (await getActiveTabContent()) ?? 'Page content unavailable.'
						if (lastMsg?.role === 'assistant') {
							lastMsg.toolCall = { name: 'get_page_content', done: true }
						}
						return result
					},
				}
			}

			initStatus.value = 'Initializing...'
			await backend.initialize((progress, msg) => {
				initProgress.value = progress
				initStatus.value = msg
			})
			status.value = 'ready'
		} catch (e) {
			status.value = 'error'
			errorMessage.value = e instanceof Error ? e.message : 'Failed to initialize AI backend'
		}
	}

	async function send(content: string): Promise<void> {
		if (!backend || status.value !== 'ready' || isStreaming.value) return

		messages.value.push({ role: 'user', content })
		messages.value.push({ role: 'assistant', content: '' })
		isStreaming.value = true

		abortController = new AbortController()

		const history: ChatMessage[] = messages.value
			.slice(0, -1)
			.map((m) => ({ role: m.role, content: m.content }))
		const tools = pageContextTool ? [pageContextTool] : undefined

		try {
			await backend.chat(
				history,
				(chunk) => {
					messages.value[messages.value.length - 1].content += chunk
				},
				abortController.signal,
				tools,
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
		initialize,
		send,
		stop,
		clear,
	}
}
