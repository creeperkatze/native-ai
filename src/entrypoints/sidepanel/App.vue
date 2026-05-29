<template>
	<div class="flex flex-col h-screen">
		<!-- Header -->
		<header class="flex items-center justify-between px-3.5 py-3 shrink-0">
			<div class="flex items-center gap-2">
				<div class="w-5 h-5 rounded-md bg-accent flex items-center justify-center shrink-0">
					<Sparkles class="size-3 text-white" />
				</div>
				<span class="font-semibold text-primary text-sm">Native AI</span>
			</div>
			<div class="flex items-center gap-1">
				<ModelChooser :ai-status="status" @change="handleModelChange" />

				<button
					v-if="messages.length > 0"
					class="flex items-center justify-center p-1.5 border-0 rounded-[5px] bg-transparent text-secondary hover:bg-surface-hover hover:text-primary transition-colors duration-150 cursor-pointer"
					title="Clear conversation"
					@click="clear"
				>
					<RotateCcw class="size-4" />
				</button>
				<button
					class="flex items-center justify-center p-1.5 border-0 rounded-[5px] bg-transparent text-secondary hover:bg-surface-hover hover:text-primary transition-colors duration-150 cursor-pointer"
					title="Settings"
					@click="openOptions"
				>
					<Settings class="size-4" />
				</button>
			</div>
		</header>

		<div class="h-px bg-border shrink-0"></div>

		<!-- Messages -->
		<div ref="messagesEl" class="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col gap-3 min-h-0">
			<div
				v-if="messages.length === 0"
				class="flex-1 flex flex-col items-center justify-center gap-1.5 py-8 text-center"
			>
				<p class="text-sm text-secondary">Ask anything.</p>
				<p class="text-xs text-muted">Runs entirely on-device.</p>
			</div>

			<template v-for="(msg, i) in messages" :key="i">
				<div v-if="msg.role === 'user'" class="flex justify-end">
					<div
						class="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm bg-accent text-white text-sm leading-relaxed"
					>
						{{ msg.content }}
					</div>
				</div>
				<div v-else-if="msg.role === 'assistant'" class="flex justify-start">
					<div
						class="max-w-[85%] px-3 py-2 rounded-2xl rounded-tl-sm bg-surface-3 border border-border text-primary text-sm leading-relaxed"
					>
						<ToolCallMessage
							v-if="msg.toolCall"
							:name="msg.toolCall.name"
							:done="msg.toolCall.done"
							:class="msg.content ? 'mb-2' : ''"
						/>
						<MarkdownContent v-if="msg.content" :content="msg.content" />
						<span
							v-else-if="
								isStreaming && i === messages.length - 1 && (!msg.toolCall || msg.toolCall.done)
							"
							class="streaming-cursor"
							>▋</span
						>
					</div>
				</div>
			</template>
		</div>

		<!-- Permission request -->
		<div v-if="permissionRequest" class="shrink-0 px-3.5 py-3 border-t border-border bg-surface-2">
			<p class="text-xs font-medium text-primary mb-0.5">
				Allow <span class="text-accent">{{ permissionRequest.toolName }}</span
				>?
			</p>
			<p class="text-xs text-muted mb-2.5">The model wants to use this tool.</p>
			<div class="flex gap-2">
				<button
					class="flex-1 py-1.5 text-xs rounded-lg border border-border text-secondary hover:bg-surface-hover transition-colors duration-150 cursor-pointer bg-transparent"
					@click="grantPermission(false)"
				>
					Deny
				</button>
				<button
					class="flex-1 py-1.5 text-xs rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors duration-150 cursor-pointer border-0"
					@click="grantPermission(true)"
				>
					Allow
				</button>
			</div>
		</div>

		<!-- Inline status bar — only shown when not ready -->
		<div v-if="status !== 'ready'" class="shrink-0 px-3.5 py-2 border-t border-border">
			<!-- Error -->
			<div v-if="status === 'error'" class="flex items-center justify-between gap-2">
				<div class="flex items-center gap-1.5 min-w-0">
					<AlertCircle class="size-3.5 text-red-500 shrink-0" />
					<span class="text-xs text-red-500 truncate">{{ errorMessage }}</span>
				</div>
				<button
					class="text-xs text-accent hover:underline shrink-0 cursor-pointer"
					@click="openOptions"
				>
					Settings
				</button>
			</div>

			<!-- Initializing / idle -->
			<template v-else>
				<div class="flex items-center justify-between gap-2 mb-1.5">
					<span class="text-xs text-muted truncate">{{ initStatus || 'Starting…' }}</span>
					<span v-if="initProgress > 0" class="text-xs text-muted shrink-0">
						{{ Math.round(initProgress * 100) }}%
					</span>
				</div>
				<div class="h-0.5 w-full bg-surface-3 rounded-full overflow-hidden">
					<div
						class="h-full bg-accent rounded-full transition-all duration-300"
						:class="initProgress > 0 ? '' : 'animate-pulse w-full opacity-40'"
						:style="initProgress > 0 ? { width: `${Math.round(initProgress * 100)}%` } : {}"
					></div>
				</div>
			</template>
		</div>

		<!-- Input area -->
		<div class="shrink-0 border-t border-border px-3 py-2.5">
			<div class="flex items-end gap-2">
				<Textarea
					v-model="inputText"
					:placeholder="status === 'ready' ? 'Ask anything…' : 'Loading model…'"
					rows="1"
					class="flex-1 text-sm min-h-9 max-h-28"
					style="field-sizing: content"
					:disabled="status !== 'ready' || isStreaming"
					@keydown.enter.exact.prevent="handleSend"
					@keydown.enter.shift.exact="() => {}"
				/>
				<button
					v-if="isStreaming"
					class="flex items-center justify-center w-9 h-9 rounded-lg bg-surface-3 border border-border text-secondary hover:bg-surface-hover transition-colors duration-150 cursor-pointer shrink-0"
					title="Stop"
					@click="stop"
				>
					<Square class="size-3.5 fill-current" />
				</button>
				<button
					v-else
					class="flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-150 cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
					:class="
						inputText.trim() && status === 'ready'
							? 'bg-accent text-white hover:bg-accent-hover'
							: 'bg-surface-3 border border-border text-muted'
					"
					:disabled="!inputText.trim() || status !== 'ready'"
					title="Send"
					@click="handleSend"
				>
					<ArrowUp class="size-4" />
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { AlertCircle, ArrowUp, RotateCcw, Settings, Sparkles, Square } from '@lucide/vue'
import { nextTick, ref, watch } from 'vue'
import { browser } from 'wxt/browser'

import MarkdownContent from '../../components/MarkdownContent.vue'
import ModelChooser from '../../components/ModelChooser.vue'
import Textarea from '../../components/Textarea.vue'
import ToolCallMessage from '../../components/ToolCallMessage.vue'
import { useChat } from '../../composables/useChat'

const {
	messages,
	status,
	errorMessage,
	isStreaming,
	initProgress,
	initStatus,
	permissionRequest,
	grantPermission,
	switchModel,
	send,
	stop,
	clear,
} = useChat()

const inputText = ref('')
const messagesEl = ref<HTMLElement | null>(null)

async function handleModelChange(): Promise<void> {
	clear()
	await switchModel()
}

async function handleSend(): Promise<void> {
	const text = inputText.value.trim()
	if (!text || isStreaming.value || status.value !== 'ready') return
	inputText.value = ''
	await send(text)
}

function openOptions(): void {
	void browser.tabs.create({ url: browser.runtime.getURL('/options.html') })
}

watch(
	() => messages.value.length + (messages.value.at(-1)?.content.length ?? 0),
	async () => {
		await nextTick()
		if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
	},
)
</script>

<style scoped>
.streaming-cursor {
	animation: blink 1s step-end infinite;
}

@keyframes blink {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0;
	}
}
</style>
