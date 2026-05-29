<template>
	<div class="md" v-html="rendered"></div>
</template>

<script setup lang="ts">
import { marked } from 'marked'
import { computed } from 'vue'

const props = defineProps<{ content: string }>()

const renderer = new marked.Renderer()

// Downscale headings to fit chat context
renderer.heading = ({ text, depth }) => {
	const sizes: Record<number, string> = { 1: 'text-sm', 2: 'text-sm', 3: 'text-xs' }
	const cls = sizes[depth] ?? 'text-xs'
	return `<p class="font-semibold ${cls} mt-1">${text}</p>`
}

marked.setOptions({ renderer })

const rendered = computed(() => marked.parse(props.content) as string)
</script>

<style scoped>
.md :deep(p) {
	margin: 0 0 0.4em;
}
.md :deep(p:last-child) {
	margin-bottom: 0;
}
.md :deep(ul),
.md :deep(ol) {
	padding-left: 1.25em;
	margin: 0.25em 0;
}
.md :deep(li) {
	margin: 0.1em 0;
}
.md :deep(li p) {
	margin: 0;
}
.md :deep(strong) {
	font-weight: 600;
}
.md :deep(em) {
	font-style: italic;
}
.md :deep(code) {
	font-family: ui-monospace, monospace;
	font-size: 0.85em;
	background-color: var(--color-surface-1);
	border: 1px solid var(--color-border);
	border-radius: 3px;
	padding: 0.1em 0.35em;
}
.md :deep(pre) {
	background-color: var(--color-surface-1);
	border: 1px solid var(--color-border);
	border-radius: 5px;
	padding: 0.6em 0.75em;
	overflow-x: auto;
	margin: 0.4em 0;
}
.md :deep(pre code) {
	background: none;
	border: none;
	padding: 0;
	font-size: 0.82em;
}
.md :deep(blockquote) {
	border-left: 2px solid var(--color-border);
	margin: 0.4em 0;
	padding-left: 0.75em;
	color: var(--color-secondary);
}
.md :deep(hr) {
	border: none;
	border-top: 1px solid var(--color-border);
	margin: 0.5em 0;
}
.md :deep(a) {
	color: var(--color-accent);
	text-decoration: underline;
	text-underline-offset: 2px;
}
</style>
