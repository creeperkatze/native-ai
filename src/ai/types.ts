export interface ChatMessage {
	role: 'user' | 'assistant' | 'system'
	content: string
}

export interface ToolDefinition {
	type: 'function'
	function: {
		name: string
		description: string
		parameters?: {
			type: 'object'
			properties: Record<string, unknown>
			required?: string[]
		}
	}
}

export interface Tool {
	definition: ToolDefinition
	execute(args: Record<string, unknown>): Promise<string>
}

export interface AIBackend {
	readonly name: string
	checkAvailability(): Promise<'readily' | 'after-download' | 'unavailable'>
	initialize(onProgress?: (progress: number, status: string) => void): Promise<void>
	chat(
		messages: ChatMessage[],
		onChunk: (chunk: string) => void,
		signal?: AbortSignal,
		tools?: Tool[],
	): Promise<void>
	destroy(): void
}

export interface WebLLMModelInfo {
	id: string
	label: string
	sizeMb: number
}

export const WEBLLM_MODELS: WebLLMModelInfo[] = [
	{ id: 'Hermes-3-Llama-3.1-8B-q4f16_1-MLC', label: 'Hermes 3 · Llama 3.1 8B', sizeMb: 4800 },
	{ id: 'Hermes-3-Llama-3.1-8B-q4f32_1-MLC', label: 'Hermes 3 · Llama 3.1 8B (fp32)', sizeMb: 8500 },
	{ id: 'Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC', label: 'Hermes 2 Pro · Llama 3 8B', sizeMb: 4800 },
	{ id: 'Hermes-2-Pro-Mistral-7B-q4f16_1-MLC', label: 'Hermes 2 Pro · Mistral 7B', sizeMb: 4200 },
]
