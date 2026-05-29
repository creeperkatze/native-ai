<template>
	<div class="max-w-xl px-8 py-8">
		<h1 class="text-base font-semibold text-primary">AI Models</h1>
		<p class="text-sm text-secondary mt-1">
			Download models to use them. Select the active model from the popup.
		</p>

		<div v-if="!loading" class="mt-6 flex flex-col gap-6">
			<!-- Model library -->
			<section>
				<h2 class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Transformers.js</h2>
				<div class="flex flex-col gap-2">
					<div
						v-for="model in MODELS"
						:key="model.id"
						class="flex flex-col gap-2 p-3 rounded-lg border border-border bg-surface-raised"
					>
						<div class="flex items-center gap-3">
							<!-- Status dot -->
							<div
								class="w-1.5 h-1.5 rounded-full shrink-0 mt-0.5"
								:class="cachedIds.has(model.id) ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'"
							/>

							<!-- Info -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<span class="text-sm font-medium text-primary">{{ model.label }}</span>
									<span
										v-if="model.id === currentModelId && cachedIds.has(model.id)"
										class="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-accent-bg text-accent border border-accent-border"
										>Active</span
									>
								</div>
								<div class="text-xs text-muted mt-0.5">~{{ formatSize(model.sizeMb) }}</div>
							</div>

							<!-- Action button -->
							<div class="shrink-0">
								<button
									v-if="cachedIds.has(model.id)"
									class="text-xs px-2.5 py-1 rounded-md border border-border text-secondary hover:border-red-400 hover:text-red-500 transition-colors duration-150 cursor-pointer bg-transparent"
									:disabled="downloadingId !== null"
									@click="deleteModel(model.id)"
								>
									Delete
								</button>
								<button
									v-else-if="downloadingId !== model.id"
									class="text-xs px-2.5 py-1 rounded-md border border-accent-border text-accent bg-accent-bg hover:bg-accent hover:text-white transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
									:disabled="downloadingId !== null"
									@click="downloadModel(model.id)"
								>
									Download
								</button>
							</div>
						</div>

						<!-- Download progress -->
						<div v-if="downloadingId === model.id" class="flex flex-col gap-1.5">
							<div class="h-1 w-full bg-surface-3 rounded-full overflow-hidden">
								<div
									class="h-full bg-accent rounded-full transition-all duration-300"
									:class="downloadProgress > 0 ? '' : 'animate-pulse w-full opacity-40'"
									:style="
										downloadProgress > 0 ? { width: `${Math.round(downloadProgress * 100)}%` } : {}
									"
								/>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-xs text-muted">Downloading…</span>
								<span v-if="downloadProgress > 0" class="text-xs text-muted">
									{{ Math.round(downloadProgress * 100) }}%
								</span>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	</div>
</template>

<script setup lang="ts">
import { MODELS } from '../../../ai/types'
import { useModelStore } from '../../../composables/useModelStore'

const {
	loading,
	cachedIds,
	downloadingId,
	downloadProgress,
	currentModelId,
	downloadModel,
	deleteModel,
} = useModelStore()

function formatSize(mb: number): string {
	return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`
}
</script>
