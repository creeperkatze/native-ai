import type { ToolDefinition } from './types'

export interface ToolMeta {
	id: string
	name: string
	description: string
	requiresPermission: boolean
	definition: ToolDefinition
}

export const TOOLS: ToolMeta[] = [
	{
		id: 'get_page_content',
		name: 'Read page content',
		description: 'Lets the model read the text of the current web page when it decides it is needed.',
		requiresPermission: true,
		definition: {
			type: 'function',
			function: {
				name: 'get_page_content',
				description:
					'Get the full text content of the current web page the user is viewing. Call this when the user asks about the page or when page context is needed to answer.',
				parameters: { type: 'object', properties: {}, required: [] },
			},
		},
	},
]
