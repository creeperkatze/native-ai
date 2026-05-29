export interface ToolCall {
	id: string
	type: 'function'
	function: { name: string; arguments: string }
}

export interface ChatMessage {
	role: 'user' | 'assistant' | 'system' | 'tool'
	content: string
	tool_call_id?: string
	tool_calls?: ToolCall[]
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
	execute(args: Record<string, unknown>, toolCallId: string): Promise<string>
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

export interface ModelInfo {
	id: string
	label: string
	sizeMb: number
}

export const MODELS: ModelInfo[] = [
	{ id: 'onnx-community/Qwen2.5-0.5B-Instruct', label: 'Qwen 2.5 · 0.5B', sizeMb: 395 },
	{ id: 'onnx-community/Qwen2.5-1.5B-Instruct', label: 'Qwen 2.5 · 1.5B', sizeMb: 986 },
	{ id: 'onnx-community/Qwen2.5-3B-Instruct', label: 'Qwen 2.5 · 3B', sizeMb: 1880 },
]
