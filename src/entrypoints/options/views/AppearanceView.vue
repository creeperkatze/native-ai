<template>
	<div class="max-w-xl px-8 py-8">
		<h1 class="text-base font-semibold text-primary">Appearance</h1>
		<p class="text-sm text-secondary mt-1">Customize how Native AI looks.</p>

		<div v-if="settings" class="mt-6 flex flex-col gap-6">
			<!-- Theme -->
			<section>
				<h2 class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Theme</h2>
				<div class="flex gap-2">
					<label
						v-for="opt in themeOptions"
						:key="opt.value"
						class="flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors duration-150 flex-1"
						:class="
							settings.theme === opt.value
								? 'border-accent-border bg-accent-bg'
								: 'border-border bg-surface-raised hover:bg-surface-hover'
						"
					>
						<input
							type="radio"
							name="theme"
							:value="opt.value"
							:checked="settings.theme === opt.value"
							class="sr-only"
							@change="update({ theme: opt.value as ExtensionSettings['theme'] })"
						/>
						<component
							:is="opt.icon"
							class="size-5"
							:class="settings.theme === opt.value ? 'text-accent' : 'text-secondary'"
						/>
						<span
							class="text-xs font-medium"
							:class="settings.theme === opt.value ? 'text-accent' : 'text-secondary'"
							>{{ opt.label }}</span
						>
					</label>
				</div>
			</section>
		</div>
	</div>
</template>

<script setup lang="ts">
import { Monitor, Moon, Sun } from '@lucide/vue'

import { useSettings } from '../../../composables/useSettings'
import type { ExtensionSettings } from '../../../helpers/settings'

const { settings, update } = useSettings()

const themeOptions = [
	{ value: 'system', label: 'System', icon: Monitor },
	{ value: 'light', label: 'Light', icon: Sun },
	{ value: 'dark', label: 'Dark', icon: Moon },
]
</script>
