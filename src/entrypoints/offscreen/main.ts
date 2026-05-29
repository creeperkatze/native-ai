import { browser } from 'wxt/browser'

import type { ChatMessage, ToolDefinition } from '../../ai/types'

type EngineState = 'idle' | 'loading' | 'ready' | 'error'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let engine: any = null
let state: EngineState = 'idle'
let loadedModelId: string | null = null
let currentProgress = 0
let currentStatusText = ''
let currentError = ''
const abortControllers = new Map<string, AbortController>()

function broadcast(message: object) {
	browser.runtime.sendMessage(message).catch(() => {
		// Popup may be closed — ignore
	})
}

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.target !== 'offscreen') return

	if (message.type === 'webllm:check') {
		sendResponse({
			state,
			modelId: loadedModelId,
			progress: currentProgress,
			statusText: currentStatusText,
			error: currentError,
		})
		return
	}

	if (message.type === 'webllm:init') {
		initModel(message.modelId as string)
		sendResponse({ ok: true })
		return
	}

	if (message.type === 'webllm:chat') {
		runChat(
			message.chatId as string,
			message.messages as ChatMessage[],
			message.tools as ToolDefinition[] | undefined,
		)
		sendResponse({ ok: true })
		return
	}

	if (message.type === 'webllm:abort') {
		abortControllers.get(message.chatId as string)?.abort()
		abortControllers.delete(message.chatId as string)
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
	currentProgress = 0
	currentStatusText = ''
	currentError = ''

	try {
		const webllm = await import('@mlc-ai/web-llm')
		engine = await webllm.CreateMLCEngine(modelId, {
			initProgressCallback: (info: { progress: number; text: string }) => {
				currentProgress = info.progress
				currentStatusText = info.text
				broadcast({ type: 'webllm:progress', progress: info.progress, status: info.text, modelId })
			},
		})
		loadedModelId = modelId
		state = 'ready'
		currentProgress = 1
		broadcast({ type: 'webllm:ready', modelId })
	} catch (e) {
		state = 'error'
		currentError = e instanceof Error ? e.message : 'Failed to load model'
		broadcast({
			type: 'webllm:error',
			message: currentError,
		})
	}
}

async function runChat(
	chatId: string,
	messages: ChatMessage[],
	tools?: ToolDefinition[],
): Promise<void> {
	if (!engine) {
		broadcast({ type: 'webllm:error', chatId, message: 'Engine not initialized' })
		return
	}

	const controller = new AbortController()
	abortControllers.set(chatId, controller)

	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const allMessages: any[] = [...messages]

		if (tools && tools.length > 0) {
			// Non-streaming first pass so we can inspect tool_calls before emitting output
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const firstPass: any = await engine.chat.completions.create({
				messages: allMessages,
				tools,
				stream: false,
			})

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const assistantMsg: any = firstPass.choices[0]?.message

			if (assistantMsg?.tool_calls?.length > 0 && !controller.signal.aborted) {
				// Normalize content to '' — the engine rejects null content in history
				allMessages.push({ ...assistantMsg, content: assistantMsg.content ?? '' })

				for (const toolCall of assistantMsg.tool_calls) {
					if (controller.signal.aborted) break

					broadcast({
						type: 'webllm:tool_call',
						chatId,
						toolCallId: toolCall.id,
						name: toolCall.function.name,
						args: toolCall.function.arguments,
					})

					// Wait for popup to execute the tool and send back the result
					const result = await new Promise<string>((resolve) => {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						const listener = (msg: any) => {
							if (
								msg.type === 'webllm:tool_result' &&
								msg.chatId === chatId &&
								msg.toolCallId === toolCall.id
							) {
								browser.runtime.onMessage.removeListener(listener)
								resolve(msg.result as string)
							}
						}
						browser.runtime.onMessage.addListener(listener)
						controller.signal.addEventListener(
							'abort',
							() => {
								browser.runtime.onMessage.removeListener(listener)
								resolve('')
							},
							{ once: true },
						)
					})

					allMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: result })
				}
			} else if (assistantMsg?.content && !controller.signal.aborted) {
				// Model answered directly without calling any tool — emit and finish
				broadcast({ type: 'webllm:chunk', chatId, content: assistantMsg.content })
				broadcast({ type: 'webllm:done', chatId })
				return
			}
		}

		if (controller.signal.aborted) return

		// Streaming pass — either after tool results or when no tools were requested
		const reply = await engine.chat.completions.create({
			messages: allMessages,
			stream: true,
		})

		for await (const chunk of reply) {
			if (controller.signal.aborted) break
			const content = chunk.choices[0]?.delta?.content
			if (content) broadcast({ type: 'webllm:chunk', chatId, content })
			// Yield to the event loop so the browser and other processes get CPU time
			await new Promise((resolve) => setTimeout(resolve, 0))
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

