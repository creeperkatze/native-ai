import { browser } from 'wxt/browser'

import type { FromOffscreenMessage } from '../messages'
import type { AIBackend, BackendAvailability, ChatMessage } from '../types'

export class WebLLMBackend implements AIBackend {
	readonly id = 'webllm' as const
	readonly name = 'WebLLM'

	private modelId: string

	constructor(modelId: string) {
		this.modelId = modelId
	}

	async checkAvailability(): Promise<BackendAvailability> {
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

	async initialize(
		onProgress?: (progress: number, status: string) => void,
		_systemPrompt?: string,
	): Promise<void> {
		// Ensure the offscreen document is alive (wakes background if needed)
		await browser.runtime.sendMessage({ type: 'ensure-offscreen', target: 'background' })

		// Check if model is already loaded in the offscreen document
		const status = await browser.runtime
			.sendMessage({ type: 'webllm:check', target: 'offscreen' })
			.catch(() => null)

		if (status?.state === 'ready' && status.modelId === this.modelId) return

		// Send init and wait for webllm:ready / webllm:error
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
	): Promise<void> {
		const chatId = crypto.randomUUID()

		return new Promise((resolve, reject) => {
			const listener = (message: FromOffscreenMessage) => {
				if ('chatId' in message && message.chatId !== chatId) return

				if (message.type === 'webllm:chunk') {
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
				.sendMessage({ type: 'webllm:chat', target: 'offscreen', chatId, messages })
				.catch(() => {})
		})
	}

	destroy(): void {
		// Engine lives in the offscreen document — nothing to clean up here
	}
}
