import type { AIBackend, BackendAvailability, ChatMessage } from '../types'

export class ChromeAIBackend implements AIBackend {
	readonly id = 'chrome-ai' as const
	readonly name = 'Chrome Built-in AI'

	private session: LanguageModel | null = null
	private systemPrompt = 'You are a helpful assistant.'

	async checkAvailability(): Promise<BackendAvailability> {
		if (!('LanguageModel' in self)) return 'unavailable'
		try {
			const avail = await LanguageModel.availability()
			if (avail === 'unavailable') return 'unavailable'
			if (avail === 'downloadable' || avail === 'downloading') return 'after-download'
			return 'readily'
		} catch {
			return 'unavailable'
		}
	}

	async initialize(
		onProgress?: (progress: number, status: string) => void,
		systemPrompt?: string,
	): Promise<void> {
		if (!('LanguageModel' in self)) throw new Error('Chrome AI not available')
		if (systemPrompt) this.systemPrompt = systemPrompt
		this.session?.destroy()
		this.session = await LanguageModel.create({
			initialPrompts: [{ role: 'system', content: this.systemPrompt }],
			monitor(m) {
				m.addEventListener('downloadprogress', (e: Event) => {
					const ev = e as ProgressEvent
					if (ev.total > 0) onProgress?.(ev.loaded / ev.total, 'Downloading Gemini Nano...')
					else onProgress?.(0, 'Downloading Gemini Nano...')
				})
			},
		})
	}

	async chat(
		messages: ChatMessage[],
		onChunk: (chunk: string) => void,
		signal?: AbortSignal,
	): Promise<void> {
		if (!('LanguageModel' in self)) throw new Error('Chrome AI not available')

		const chatMessages = messages.filter((m) => m.role !== 'system')
		const lastMsg = chatMessages.at(-1)
		if (!lastMsg || lastMsg.role !== 'user') throw new Error('Last message must be from user')

		const history = chatMessages.slice(0, -1)

		// Recreate session each turn seeded with prior conversation so history is preserved
		// while the model only sees the latest user message as new input.
		this.session?.destroy()
		this.session = await LanguageModel.create({
			initialPrompts: [
				{ role: 'system', content: this.systemPrompt },
				...history.map((m) => ({
					role: m.role as LanguageModelMessageRole,
					content: m.content,
				})),
			],
			signal,
		})

		const stream = this.session.promptStreaming(lastMsg.content, { signal })

		for await (const chunk of stream) {
			if (signal?.aborted) break
			if (chunk) onChunk(chunk as string)
		}
	}

	destroy(): void {
		this.session?.destroy()
		this.session = null
	}
}
