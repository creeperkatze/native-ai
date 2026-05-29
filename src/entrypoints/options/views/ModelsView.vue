<template>
	<div class="max-w-xl px-8 py-8">
		<h1 class="text-base font-semibold text-primary">AI Models</h1>
		<p class="text-sm text-secondary mt-1">Choose how Local AI runs models on your device.</p>

		<div v-if="settings" class="mt-6 flex flex-col gap-6">
			<!-- Backend selector -->
			<section>
				<h2 class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Backend</h2>
				<div class="flex flex-col gap-2">
					<label
						v-for="opt in backendOptions"
						:key="opt.value"
						class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors duration-150"
						:class="
							settings.backend === opt.value
								? 'border-accent-border bg-accent-bg'
								: 'border-border bg-surface-raised hover:bg-surface-hover'
						"
					>
						<input
							type="radio"
							name="backend"
							:value="opt.value"
							:checked="settings.backend === opt.value"
							class="mt-0.5 accent-[var(--color-accent)]"
							@change="update({ backend: opt.value as ExtensionSettings['backend'] })"
						/>
						<div class="min-w-0">
							<div class="text-sm font-medium text-primary">{{ opt.label }}</div>
							<div class="text-xs text-secondary mt-0.5">{{ opt.description }}</div>
						</div>
					</label>
				</div>
			</section>

			<!-- WebLLM model picker (shown when webllm or auto is selected) -->
			<section v-if="settings.backend !== 'chrome-ai'">
				<h2 class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">WebLLM Model</h2>
				<p class="text-xs text-secondary mb-3">
					Models are downloaded once and cached locally. Requires WebGPU support.
				</p>
				<div class="flex flex-col gap-2">
					<label
						v-for="model in WEBLLM_MODELS"
						:key="model.id"
						class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors duration-150"
						:class="
							settings.webllmModel === model.id
								? 'border-accent-border bg-accent-bg'
								: 'border-border bg-surface-raised hover:bg-surface-hover'
						"
					>
						<input
							type="radio"
							name="webllmModel"
							:value="model.id"
							:checked="settings.webllmModel === model.id"
							class="accent-[var(--color-accent)]"
							@change="update({ webllmModel: model.id })"
						/>
						<div class="flex-1 min-w-0">
							<div class="text-sm font-medium text-primary">{{ model.label }}</div>
							<div class="text-xs text-muted">~{{ formatSize(model.sizeMb) }}</div>
						</div>
					</label>
				</div>
			</section>

			<!-- System prompt -->
			<section>
				<h2 class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">System Prompt</h2>
				<Textarea
					:model-value="settings.systemPrompt"
					rows="4"
					placeholder="You are a helpful assistant."
					class="w-full text-sm"
					@update:model-value="debouncedSavePrompt"
				/>
				<p class="text-xs text-muted mt-1.5">Sent with every conversation as context for the AI.</p>
			</section>
		</div>
	</div>
</template>

<script setup lang="ts">
import { WEBLLM_MODELS } from '../../../ai/types'
import Textarea from '../../../components/Textarea.vue'
import { useSettings } from '../../../composables/useSettings'
import type { ExtensionSettings } from '../../../helpers/settings'

const { settings, update } = useSettings()

const backendOptions = [
	{
		value: 'auto',
		label: 'Auto',
		description: 'Use Chrome Built-in AI if available, otherwise fall back to WebLLM.',
	},
	{
		value: 'chrome-ai',
		label: 'Chrome Built-in AI',
		description: 'Uses Gemini Nano built into Chrome. No download required. Chrome 127+ only.',
	},
	{
		value: 'webllm',
		label: 'WebLLM',
		description: 'Runs open-source models via WebGPU. Works in any WebGPU-capable browser.',
	},
]

function formatSize(mb: number): string {
	return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`
}

let promptTimer: ReturnType<typeof setTimeout> | null = null
function debouncedSavePrompt(value: string): void {
	if (promptTimer) clearTimeout(promptTimer)
	promptTimer = setTimeout(() => update({ systemPrompt: value }), 500)
}
</script>
