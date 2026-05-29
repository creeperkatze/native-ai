<template>
	<div ref="rootEl" class="relative">
		<!-- Trigger -->
		<button
			class="flex items-center gap-1.5 px-2 py-1 rounded-[5px] bg-surface-3 hover:bg-surface-hover transition-colors duration-150 cursor-pointer border-0"
			@click="open = !open"
		>
			<span
				class="w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-300"
				:class="statusDotClass"
			/>
			<span class="text-xs text-muted max-w-36 truncate leading-none">{{ triggerLabel }}</span>
			<svg
				class="size-3 text-muted transition-transform duration-200 shrink-0"
				:class="open ? 'rotate-180' : ''"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="6 9 12 15 18 9" />
			</svg>
		</button>

		<!-- Dropdown -->
		<Transition name="dropdown">
			<div
				v-if="open"
				class="absolute top-full left-0 mt-1.5 w-64 bg-surface-raised border border-border rounded-xl shadow-lg z-50 overflow-hidden"
			>
				<!-- Backend header -->
				<div class="px-3 pt-2.5 pb-1.5">
					<span class="text-[10px] font-semibold uppercase tracking-widest text-muted">
						Transformers.js
					</span>
				</div>

				<!-- Model list -->
				<div class="pb-1">
					<button
						v-for="model in MODELS"
						:key="model.id"
						class="w-full flex items-center gap-2.5 px-3 py-2 text-left border-0 bg-transparent cursor-pointer hover:bg-surface-hover"
						@click="handleSelect(model.id)"
					>
						<!-- Status indicator -->
						<div class="w-3.5 shrink-0 flex justify-center">
							<svg
								v-if="model.id === currentModelId"
								class="size-3 text-accent"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polyline points="20 6 9 17 4 12" />
							</svg>
							<span class="w-1.5 h-1.5 rounded-full bg-zinc-400" />
						</div>

						<!-- Model info -->
						<div class="flex-1 min-w-0">
							<div class="text-xs font-medium text-primary leading-snug truncate">
								{{ model.label }}
							</div>
							<div class="text-[10px] text-muted leading-snug">
								~{{ formatSize(model.sizeMb) }}
							</div>
						</div>
					</button>
				</div>

				<!-- Footer -->
				<div class="px-3 py-2 border-t border-border">
					<span class="text-[10px] text-muted">Download or remove models in Settings</span>
				</div>
			</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { MODELS } from '../ai/types'
import type { AIStatus } from '../composables/useChat'
import { useModelStore } from '../composables/useModelStore'

const props = defineProps<{
	aiStatus: AIStatus
}>()

const emit = defineEmits<{
	change: []
}>()

const { currentModelId, selectModel } = useModelStore()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

const currentModel = computed(() => MODELS.find((m) => m.id === currentModelId.value))

const triggerLabel = computed(() => currentModel.value?.label ?? 'No model')

const statusDotClass = computed(() => ({
	'bg-green-500': props.aiStatus === 'ready',
	'bg-amber-400 animate-pulse': props.aiStatus === 'initializing',
	'bg-red-500': props.aiStatus === 'error',
	'bg-zinc-400': props.aiStatus === 'idle',
}))

function formatSize(mb: number) {
	return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`
}

async function handleSelect(modelId: string) {
	if (modelId === currentModelId.value) {
		open.value = false
		return
	}
	await selectModel(modelId)
	open.value = false
	emit('change')
}

function handleOutsideClick(e: MouseEvent) {
	if (rootEl.value && !rootEl.value.contains(e.target as Node)) {
		open.value = false
	}
}

function handleEscape(e: KeyboardEvent) {
	if (e.key === 'Escape') open.value = false
}

onMounted(() => {
	document.addEventListener('mousedown', handleOutsideClick)
	document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
	document.removeEventListener('mousedown', handleOutsideClick)
	document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
	transition:
		opacity 0.12s ease,
		transform 0.12s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}
</style>
