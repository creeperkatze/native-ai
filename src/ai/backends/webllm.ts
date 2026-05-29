import { browser } from 'wxt/browser'

import type { FromOffscreenMessage } from '../messages'
import type { AIBackend, ChatMessage, Tool } from '../types'

export class WebLLMBackend implements AIBackend {
	readonly name = 'WebLLM'

	private modelId: string

	constructor(modelId: string) {
		this.modelId = modelId
	}

	async checkAvailability(): Promise<'readily' | 'after-download' | 'unavailable'> {
		if (typeof navigator === 'undefined' || !('gpu' in navigator)) return 'unavailable'
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const adapter = await (navigator as any).gpu.requestAdapter()
			if (!adapter) return 'unavailable'
		} catch {
			return 'unavailable'
		}
		return 'after-download'
	}

	async initialize(onProgress?: (progress: number, status: string) => void): Promise<void> {
		await browser.runtime.sendMessage({ type: 'ensure-offscreen', target: 'background' })

		const status = await browser.runtime
			.sendMessage({ type: 'webllm:check', target: 'offscreen' })
			.catch(() => null)

		if (status?.state === 'ready' && status.modelId === this.modelId) return

		return new Promise((resolve, reject) => {
			const listener = (message: FromOffscreenMessage) => {
				if (message.type === 'webllm:progress') {
					onProgress?.(message.progress, message.status)
				} else if (message.type === 'webllm:ready' && message.modelId === this.modelId) {
					browser.runtime.onMessage.removeListener(listener)
					resolve()
				} else if (message.type === 'webllm:error' && !message.chatId) {
					browser.runtime.onMessage.removeListener(listener)
					reject(new Error(message.message))
				}
			}

			browser.runtime.onMessage.addListener(listener)

			browser.runtime
				.sendMessage({ type: 'webllm:init', target: 'offscreen', modelId: this.modelId })
				.catch(() => {})
		})
	}

	async chat(
		messages: ChatMessage[],
		onChunk: (chunk: string) => void,
		signal?: AbortSignal,
		tools?: Tool[],
	): Promise<void> {
		const chatId = crypto.randomUUID()

		return new Promise((resolve, reject) => {
			const listener = (message: FromOffscreenMessage) => {
				if ('chatId' in message && message.chatId !== chatId) return

				if (message.type === 'webllm:tool_call') {
					const tool = tools?.find((t) => t.definition.function.name === message.name)
					void (async () => {
						let result = 'Tool execution failed.'
						if (tool) {
							try {
								const args = message.args
									? (JSON.parse(message.args) as Record<string, unknown>)
									: {}
								result = await tool.execute(args)
							} catch {
								result = 'Tool execution failed.'
							}
						}
						browser.runtime
							.sendMessage({
								type: 'webllm:tool_result',
								target: 'offscreen',
								chatId,
								toolCallId: message.toolCallId,
								result,
							})
							.catch(() => {})
					})()
				} else if (message.type === 'webllm:chunk') {
					onChunk(message.content)
				} else if (message.type === 'webllm:done') {
					browser.runtime.onMessage.removeListener(listener)
					resolve()
				} else if (message.type === 'webllm:error') {
					browser.runtime.onMessage.removeListener(listener)
					reject(new Error(message.message))
				}
			}

			browser.runtime.onMessage.addListener(listener)

			signal?.addEventListener('abort', () => {
				browser.runtime.onMessage.removeListener(listener)
				browser.runtime
					.sendMessage({ type: 'webllm:abort', target: 'offscreen', chatId })
					.catch(() => {})
				resolve()
			})

			browser.runtime
				.sendMessage({
					type: 'webllm:chat',
					target: 'offscreen',
					chatId,
					messages,
					tools: tools?.map((t) => t.definition),
				})
				.catch(() => {})
		})
	}

	destroy(): void {
		// Engine lives in the offscreen document — nothing to clean up here
	}
}
