<template>
	<button
		class="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer border-0 text-left relative"
		:class="
			active
				? 'bg-surface-3 text-primary'
				: 'bg-transparent text-secondary hover:bg-surface-3 hover:text-primary'
		"
		@click="$emit('click')"
	>
		<component :is="icon" class="size-4 shrink-0" />
		<span class="truncate flex-1">{{ label }}</span>
		<span v-if="active" class="w-1 h-4 rounded-full bg-accent shrink-0"></span>
	</button>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
	icon: Component
	label: string
	active?: boolean
}>()

defineEmits<{ click: [] }>()
</script>
