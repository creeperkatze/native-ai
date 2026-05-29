<template>
	<div class="tool-call" :class="done ? 'done' : 'loading'">
		<div class="icon-wrap">
			<svg
				v-if="!done"
				class="spinner"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
			>
				<path d="M12 2a10 10 0 0 1 10 10" />
			</svg>
			<svg
				v-else
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="20 6 9 17 4 12" />
			</svg>
		</div>

		<span class="label">{{ done ? displayName.done : displayName.loading }}</span>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
	name: string
	done: boolean
}>()

const TOOL_LABELS: Record<string, { loading: string; done: string }> = {
	get_page_content: { loading: 'Reading page…', done: 'Read page' },
}

const displayName = computed(
	() => TOOL_LABELS[props.name] ?? { loading: `Calling ${props.name}…`, done: props.name },
)
</script>

<style scoped>
.tool-call {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 3px 8px 3px 5px;
	border-radius: 999px;
	font-size: 0.72rem;
	font-weight: 500;
	letter-spacing: 0.01em;
	width: fit-content;
	transition:
		background-color 0.3s ease,
		border-color 0.3s ease,
		color 0.3s ease;
}

.tool-call.loading {
	background-color: var(--color-accent-bg);
	border: 1px solid var(--color-accent-border);
	color: var(--color-accent);
}

.tool-call.done {
	background-color: var(--color-surface-3);
	border: 1px solid var(--color-border);
	color: var(--color-muted);
}

.icon-wrap {
	width: 13px;
	height: 13px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.icon-wrap svg {
	width: 11px;
	height: 11px;
}

.spinner {
	animation: spin 0.75s linear infinite;
	transform-origin: center;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.label {
	line-height: 1;
}
</style>
