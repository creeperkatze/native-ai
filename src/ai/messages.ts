import type { ChatMessage } from './types'

// Popup → Offscreen
export type ToOffscreenMessage =
	| { type: 'webllm:check'; target: 'offscreen' }
	| { type: 'webllm:init'; target: 'offscreen'; modelId: string }
	| { type: 'webllm:chat'; target: 'offscreen'; chatId: string; messages: ChatMessage[] }
	| { type: 'webllm:abort'; target: 'offscreen'; chatId: string }

// Offscreen → Popup (broadcast via chrome.runtime.sendMessage)
export type FromOffscreenMessage =
	| { type: 'webllm:status'; state: 'idle' | 'loading' | 'ready' | 'error'; modelId?: string }
	| { type: 'webllm:progress'; progress: number; status: string }
	| { type: 'webllm:ready'; modelId: string }
	| { type: 'webllm:chunk'; chatId: string; content: string }
	| { type: 'webllm:done'; chatId: string }
	| { type: 'webllm:error'; chatId?: string; message: string }

// Popup → Background
export type ToBackgroundMessage = { type: 'ensure-offscreen'; target: 'background' }
