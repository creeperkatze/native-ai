export interface ChatMessage {
	role: 'user' | 'assistant' | 'system'
	content: string
}

export type BackendId = 'chrome-ai' | 'webllm'

export type BackendAvailability = 'readily' | 'after-download' | 'unavailable'

export interface AIBackend {
	readonly id: BackendId
	readonly name: string
	checkAvailability(): Promise<BackendAvailability>
	initialize(
		onProgress?: (progress: number, status: string) => void,
		systemPrompt?: string,
	): Promise<void>
	chat(
		messages: ChatMessage[],
		onChunk: (chunk: string) => void,
		signal?: AbortSignal,
	): Promise<void>
	destroy(): void
}

export interface WebLLMModelInfo {
	id: string
	label: string
	sizeMb: number
}

export const WEBLLM_MODELS: WebLLMModelInfo[] = [
	{ id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Qwen 2.5 1.5B', sizeMb: 1000 },
	{ id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 3B', sizeMb: 1900 },
	{ id: 'gemma-2-2b-it-q4f16_1-MLC', label: 'Gemma 2 2B', sizeMb: 1500 },
	{ id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', label: 'Phi-3.5 Mini', sizeMb: 2200 },
]
