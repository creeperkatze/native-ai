import { getSettings } from '../../helpers/settings'
import type { ChatMessage } from '../../ai/types'

type EngineState = 'idle' | 'loading' | 'ready' | 'error'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let engine: any = null
let state: EngineState = 'idle'
let loadedModelId: string | null = null
let abortControllers = new Map<string, AbortController>()

function broadcast(message: object) {
	chrome.runtime.sendMessage(message).catch(() => {
		// Popup may be closed — ignore
	})
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.target !== 'offscreen') return

	if (message.type === 'webllm:check') {
		sendResponse({ state, modelId: loadedModelId })
		return
	}

	if (message.type === 'webllm:init') {
		initModel(message.modelId)
		sendResponse({ ok: true })
		return
	}

	if (message.type === 'webllm:chat') {
		runChat(message.chatId, message.messages)
		sendResponse({ ok: true })
		return
	}

	if (message.type === 'webllm:abort') {
		abortControllers.get(message.chatId)?.abort()
		abortControllers.delete(message.chatId)
		sendResponse({ ok: true })
		return
	}
})

async function initModel(modelId: string): Promise<void> {
	if (state === 'ready' && loadedModelId === modelId) {
		broadcast({ type: 'webllm:ready', modelId })
		return
	}

	if (state === 'loading') return

	state = 'loading'

	try {
		const webllm = await import('@mlc-ai/web-llm')
		engine = await webllm.CreateMLCEngine(modelId, {
			initProgressCallback: (info: { progress: number; text: string }) => {
				broadcast({ type: 'webllm:progress', progress: info.progress, status: info.text })
			},
		})
		loadedModelId = modelId
		state = 'ready'
		broadcast({ type: 'webllm:ready', modelId })
	} catch (e) {
		state = 'error'
		broadcast({
			type: 'webllm:error',
			message: e instanceof Error ? e.message : 'Failed to load model',
		})
	}
}

async function runChat(chatId: string, messages: ChatMessage[]): Promise<void> {
	if (!engine) {
		broadcast({ type: 'webllm:error', chatId, message: 'Engine not initialized' })
		return
	}

	const controller = new AbortController()
	abortControllers.set(chatId, controller)

	try {
		const reply = await engine.chat.completions.create({
			messages,
			stream: true,
		})

		for await (const chunk of reply) {
			if (controller.signal.aborted) break
			const content = chunk.choices[0]?.delta?.content
			if (content) broadcast({ type: 'webllm:chunk', chatId, content })
		}

		if (!controller.signal.aborted) {
			broadcast({ type: 'webllm:done', chatId })
		}
	} catch (e) {
		if (!controller.signal.aborted) {
			broadcast({
				type: 'webllm:error',
				chatId,
				message: e instanceof Error ? e.message : 'Chat failed',
			})
		}
	} finally {
		abortControllers.delete(chatId)
	}
}

// Auto-start model loading as soon as the offscreen document is created,
// so it's ready (or already downloading) before the popup opens.
getSettings().then((settings) => {
	if (settings.backend === 'chrome-ai') return
	initModel(settings.webllmModel)
})
