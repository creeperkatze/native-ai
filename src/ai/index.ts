import { TransformersBackend } from './backends/transformers'
import type { AIBackend } from './types'

export async function createBackend(modelId: string): Promise<AIBackend | null> {
	const b = new TransformersBackend(modelId)
	return (await b.checkAvailability()) !== 'unavailable' ? b : null
}

export { TransformersBackend }
export type { AIBackend }
export * from './types'
