import { browser } from 'wxt/browser'

import type { ChatMessage, ToolDefinition } from '../../ai/types'

type EngineState = 'idle' | 'loading' | 'ready' | 'error'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipe: any = null
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

	if (message.type === 'ai:check') {
		sendResponse({
			state,
			modelId: loadedModelId,
			progress: currentProgress,
			statusText: currentStatusText,
			error: currentError,
		})
		return
	}

	if (message.type === 'ai:init') {
		initModel(message.modelId as string)
		sendResponse({ ok: true })
		return
	}

	if (message.type === 'ai:chat') {
		runChat(
			message.chatId as string,
			message.messages as ChatMessage[],
			message.tools as ToolDefinition[] | undefined,
		)
		sendResponse({ ok: true })
		return
	}

	if (message.type === 'ai:abort') {
		abortControllers.get(message.chatId as string)?.abort()
		abortControllers.delete(message.chatId as string)
		sendResponse({ ok: true })
		return
	}
})

async function initModel(modelId: string): Promise<void> {
	if (state === 'ready' && loadedModelId === modelId) {
		broadcast({ type: 'ai:ready', modelId })
		return
	}

	if (state === 'loading') return

	state = 'loading'
	currentProgress = 0
	currentStatusText = ''
	currentError = ''

	try {
		const { pipeline } = await import('@huggingface/transformers')

		pipe = await pipeline('text-generation', modelId, {
			device: 'webgpu',
			dtype: 'q4f16',
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			progress_callback: (info: any) => {
				if (info.status === 'progress') {
					const progress = (info.progress ?? 0) / 100
					currentProgress = progress
					currentStatusText = info.file ?? ''
					broadcast({ type: 'ai:progress', progress, status: currentStatusText, modelId })
				}
			},
		})

		loadedModelId = modelId
		state = 'ready'
		currentProgress = 1
		broadcast({ type: 'ai:ready', modelId })
	} catch (e) {
		state = 'error'
		currentError = e instanceof Error ? e.message : 'Failed to load model'
		broadcast({ type: 'ai:error', message: currentError })
	}
}

async function runChat(
	chatId: string,
	messages: ChatMessage[],
	tools?: ToolDefinition[],
): Promise<void> {
	if (!pipe) {
		broadcast({ type: 'ai:error', chatId, message: 'Engine not initialized' })
		return
	}

	const controller = new AbortController()
	abortControllers.set(chatId, controller)

	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const allMessages: any[] = [...messages]

		if (tools && tools.length > 0) {
			// Non-streaming first pass to detect tool calls
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const firstPass: any = await pipe(allMessages, {
				max_new_tokens: 512,
				tools,
				return_full_text: false,
			})

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const assistantMsg: any = Array.isArray(firstPass[0]?.generated_text)
				? firstPass[0].generated_text.at(-1)
				: { role: 'assistant', content: firstPass[0]?.generated_text ?? '' }

			if (assistantMsg?.tool_calls?.length > 0 && !controller.signal.aborted) {
				// Transformers.js tool calls have no id — assign UUIDs now so the assistant
				// message and the matching tool result entries share the same id.
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const toolCallsWithIds = assistantMsg.tool_calls.map((tc: any) => ({
					...tc,
					id: crypto.randomUUID(),
				}))
				allMessages.push({
					...assistantMsg,
					content: assistantMsg.content ?? '',
					tool_calls: toolCallsWithIds,
				})

				for (const toolCall of toolCallsWithIds) {
					if (controller.signal.aborted) break

					const toolCallId = toolCall.id

					broadcast({
						type: 'ai:tool_call',
						chatId,
						toolCallId,
						name: toolCall.function.name,
						args:
							typeof toolCall.function.arguments === 'string'
								? toolCall.function.arguments
								: JSON.stringify(toolCall.function.arguments ?? {}),
					})

					// Wait for popup to execute the tool and send back the result
					const result = await new Promise<string>((resolve) => {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						const listener = (msg: any) => {
							if (
								msg.type === 'ai:tool_result' &&
								msg.chatId === chatId &&
								msg.toolCallId === toolCallId
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

					allMessages.push({ role: 'tool', tool_call_id: toolCallId, content: result })
				}
			} else if (!controller.signal.aborted) {
				// Model answered directly without calling a tool
				const content = assistantMsg?.content ?? ''
				if (content) broadcast({ type: 'ai:chunk', chatId, content })
				broadcast({ type: 'ai:done', chatId })
				return
			}
		}

		if (controller.signal.aborted) return

		// Streaming final pass (no tools — avoids ambiguity with streamed tool call tokens)
		const { TextStreamer } = await import('@huggingface/transformers')
		const streamer = new TextStreamer(pipe.tokenizer, {
			skip_prompt: true,
			skip_special_tokens: true,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			callback_function: (text: any) => {
				if (!controller.signal.aborted) {
					broadcast({ type: 'ai:chunk', chatId, content: String(text) })
				}
			},
		})

		await pipe(allMessages, {
			max_new_tokens: 512,
			streamer,
			return_full_text: false,
		})

		if (!controller.signal.aborted) {
			broadcast({ type: 'ai:done', chatId })
		}
	} catch (e) {
		if (!controller.signal.aborted) {
			broadcast({
				type: 'ai:error',
				chatId,
				message: e instanceof Error ? e.message : 'Chat failed',
			})
		}
	} finally {
		abortControllers.delete(chatId)
	}
}
