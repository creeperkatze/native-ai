import { onMounted, onUnmounted, readonly, ref } from 'vue'
import { browser } from 'wxt/browser'

import { WebLLMBackend } from '../ai/backends/webllm'
import type { FromOffscreenMessage } from '../ai/messages'
import { TOOLS } from '../ai/tools'
import type { ChatMessage, Tool } from '../ai/types'
import { getActiveTabContent } from '../helpers/pageContent'
import { getSettings } from '../helpers/settings'

export type AIStatus = 'idle' | 'initializing' | 'ready' | 'error'

export interface ToolCallState {
	name: string
	done: boolean
}

export interface PermissionRequest {
	toolId: string
	toolName: string
	resolve: (allowed: boolean) => void
}

// UIMessage extends ChatMessage with optional UI-only metadata (not sent to the model)
export interface UIMessage extends ChatMessage {
	toolCall?: ToolCallState
}

export function useChat() {
	const messages = ref<UIMessage[]>([])
	const status = ref<AIStatus>('idle')
	const errorMessage = ref('')
	const isStreaming = ref(false)
	const initProgress = ref(0)
	const initStatus = ref('')
	const permissionRequest = ref<PermissionRequest | null>(null)

	let backend: WebLLMBackend | null = null
	let abortController: AbortController | null = null
	let activeTools: Tool[] = []

	function grantPermission(allowed: boolean) {
		permissionRequest.value?.resolve(allowed)
		permissionRequest.value = null
	}

	function buildTools(enabledToolIds: string[]): Tool[] {
		return enabledToolIds.flatMap((id) => {
			const meta = TOOLS.find((t) => t.id === id)
			if (!meta) return []

			if (id === 'get_page_content') {
				return [
					{
						definition: meta.definition,
						execute: async () => {
							const lastMsg = messages.value[messages.value.length - 1]

							if (meta.requiresPermission) {
								const allowed = await new Promise<boolean>((resolve) => {
									permissionRequest.value = { toolId: id, toolName: meta.name, resolve }
								})
								if (!allowed) return 'The user denied permission to read the page.'
							}

							if (lastMsg?.role === 'assistant') {
								lastMsg.toolCall = { name: id, done: false }
							}
							const result = (await getActiveTabContent()) ?? 'Page content unavailable.'
							if (lastMsg?.role === 'assistant') {
								lastMsg.toolCall = { name: id, done: true }
							}
							return result
						},
					},
				]
			}

			return []
		})
	}

	// Persistent listener: syncs this composable instance to whatever the offscreen is doing
	function onBackgroundMessage(message: FromOffscreenMessage) {
		if (message.type === 'webllm:progress') {
			status.value = 'initializing'
			initProgress.value = message.progress
			initStatus.value = message.status
		} else if (message.type === 'webllm:ready') {
			backend = new WebLLMBackend(message.modelId)
			void getSettings().then((settings) => {
				activeTools = buildTools(settings.enabledTools)
			})
			status.value = 'ready'
		} else if (message.type === 'webllm:error' && !message.chatId) {
			status.value = 'error'
			errorMessage.value = message.message
		}
	}

	// Query the offscreen for its current state and sync — never triggers a new load
	async function connect(): Promise<void> {
		errorMessage.value = ''

		try {
			await browser.runtime.sendMessage({ type: 'ensure-offscreen', target: 'background' })
		} catch {
			// background may not be ready yet
		}

		const state = await browser.runtime
			.sendMessage({ type: 'webllm:check', target: 'offscreen' })
			.catch(() => null)

		// Offscreen not ready yet — mark initializing so the bar shows; broadcasts will fill in text
		if (!state || state.state === 'idle') {
			status.value = 'initializing'
			return
		}

		if (state.state === 'ready' && state.modelId) {
			backend = new WebLLMBackend(state.modelId as string)
			status.value = 'ready'
			initProgress.value = 1
			const settings = await getSettings()
			activeTools = buildTools(settings.enabledTools)
		} else if (state.state === 'loading') {
			status.value = 'initializing'
			initProgress.value = (state.progress as number) ?? 0
			// show whatever WebLLM has reported so far; broadcasts keep it updated
			initStatus.value = (state.statusText as string) || ''
		} else if (state.state === 'error') {
			status.value = 'error'
			errorMessage.value = (state.error as string) || 'Failed to load model'
		}
	}

	// Load a different model — called after settings have already been saved with the new modelId
	async function switchModel(): Promise<void> {
		backend = null
		status.value = 'initializing'
		initProgress.value = 0
		initStatus.value = 'Loading model…'
		errorMessage.value = ''

		const settings = await getSettings()
		activeTools = buildTools(settings.enabledTools)

		await browser.runtime
			.sendMessage({ type: 'webllm:init', target: 'offscreen', modelId: settings.webllmModel })
			.catch(() => {})
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

		const tools = activeTools.length > 0 ? activeTools : undefined

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

	onMounted(() => {
		browser.runtime.onMessage.addListener(onBackgroundMessage)
		void connect()
	})

	onUnmounted(() => {
		browser.runtime.onMessage.removeListener(onBackgroundMessage)
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
		permissionRequest: readonly(permissionRequest),
		grantPermission,
		switchModel,
		send,
		stop,
		clear,
	}
}
