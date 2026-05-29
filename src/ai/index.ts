import { WebLLMBackend } from './backends/webllm'
import type { AIBackend } from './types'

export async function createBackend(modelId: string): Promise<AIBackend | null> {
	const b = new WebLLMBackend(modelId)
	return (await b.checkAvailability()) !== 'unavailable' ? b : null
}

export { WebLLMBackend }
export type { AIBackend }
export * from './types'
