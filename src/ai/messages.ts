import type { ChatMessage, ToolDefinition } from './types'

// Popup → Offscreen
export type ToOffscreenMessage =
	| { type: 'ai:check'; target: 'offscreen' }
	| { type: 'ai:init'; target: 'offscreen'; modelId: string }
	| {
			type: 'ai:chat'
			target: 'offscreen'
			chatId: string
			messages: ChatMessage[]
			tools?: ToolDefinition[]
	  }
	| { type: 'ai:abort'; target: 'offscreen'; chatId: string }
	| {
			type: 'ai:tool_result'
			target: 'offscreen'
			chatId: string
			toolCallId: string
			result: string
	  }

// Offscreen → Popup (broadcast via chrome.runtime.sendMessage)
export type FromOffscreenMessage =
	| { type: 'ai:status'; state: 'idle' | 'loading' | 'ready' | 'error'; modelId?: string }
	| { type: 'ai:progress'; progress: number; status: string; modelId: string }
	| { type: 'ai:ready'; modelId: string }
	| { type: 'ai:chunk'; chatId: string; content: string }
	| { type: 'ai:done'; chatId: string }
	| { type: 'ai:error'; chatId?: string; modelId?: string; message: string }
	| { type: 'ai:tool_call'; chatId: string; toolCallId: string; name: string; args: string }

// Popup → Background
export type ToBackgroundMessage = { type: 'ensure-offscreen'; target: 'background' }
