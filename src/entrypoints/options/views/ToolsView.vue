<template>
	<div class="max-w-xl px-8 py-8">
		<h1 class="text-base font-semibold text-primary">Tools</h1>
		<p class="text-sm text-secondary mt-1">
			Enable tools the model can call on its own when needed.
		</p>

		<div class="mt-6 flex flex-col gap-2">
			<div
				v-for="tool in TOOLS"
				:key="tool.id"
				class="flex items-start justify-between gap-4 p-3 rounded-lg border border-border bg-surface-raised"
			>
				<div class="min-w-0">
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium text-primary">{{ tool.name }}</span>
						<span
							v-if="tool.requiresPermission"
							class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-3 text-muted border border-border"
						>Asks permission</span>
					</div>
					<p class="text-xs text-secondary mt-0.5">{{ tool.description }}</p>
				</div>
				<Toggle
					v-if="settings"
					:model-value="settings.enabledTools.includes(tool.id)"
					class="mt-0.5 shrink-0"
					@update:model-value="toggleTool(tool.id, $event)"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { TOOLS } from '../../../ai/tools'
import Toggle from '../../../components/Toggle.vue'
import { useSettings } from '../../../composables/useSettings'

const { settings, update } = useSettings()

function toggleTool(toolId: string, enabled: boolean): void {
	if (!settings.value) return
	const current = settings.value.enabledTools
	const next = enabled ? [...current, toolId] : current.filter((id) => id !== toolId)
	update({ enabledTools: next })
}
</script>
