import { ChromeAIBackend } from './backends/chrome-ai'
import { WebLLMBackend } from './backends/webllm'
import type { AIBackend, BackendId } from './types'

export async function createBackend(
	preference: BackendId | 'auto',
	webllmModelId: string,
): Promise<AIBackend | null> {
	if (preference === 'chrome-ai') {
		const b = new ChromeAIBackend()
		const avail = await b.checkAvailability()
		return avail !== 'unavailable' ? b : null
	}

	if (preference === 'webllm') {
		const b = new WebLLMBackend(webllmModelId)
		const avail = await b.checkAvailability()
		return avail !== 'unavailable' ? b : null
	}

	// auto: prefer Chrome AI (instant), fall back to WebLLM
	const chromeAI = new ChromeAIBackend()
	if ((await chromeAI.checkAvailability()) !== 'unavailable') return chromeAI

	const webllm = new WebLLMBackend(webllmModelId)
	if ((await webllm.checkAvailability()) !== 'unavailable') return webllm

	return null
}

export { ChromeAIBackend, WebLLMBackend }
export type { AIBackend, BackendId }
export * from './types'
