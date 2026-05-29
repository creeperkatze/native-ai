<template>
	<button :type="type" :data-variant="variant" :class="classes">
		<slot />
	</button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
	defineProps<{
		variant?: 'default' | 'primary' | 'danger' | 'outline' | 'ghost'
		size?: 'default' | 'small'
		type?: 'button' | 'submit' | 'reset'
	}>(),
	{
		variant: 'default',
		size: 'default',
		type: 'button',
	},
)

const variantClasses: Record<string, string> = {
	default: 'border-border bg-surface-3 text-primary',
	primary: 'bg-accent border-accent text-white',
	danger: 'bg-red-600 border-red-600 text-white',
	outline: 'bg-transparent border-border text-primary',
	ghost: 'bg-transparent border-transparent text-secondary',
}

const classes = computed(() => [
	'inline-flex items-center gap-1.5 border rounded-[5px] font-medium transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
	props.size === 'small' ? 'px-2.5 py-[3px] text-xs' : 'px-3.5 py-1.5',
	variantClasses[props.variant],
])
</script>

<style scoped>
button:hover:not(:disabled) {
	background-color: var(--color-surface-hover);
}

button[data-variant='primary']:hover:not(:disabled) {
	background-color: var(--color-accent-hover);
}

button[data-variant='danger']:hover:not(:disabled) {
	background-color: #991111;
}

button[data-variant='ghost']:hover:not(:disabled) {
	background-color: var(--color-surface-3);
	color: var(--color-primary);
}
</style>
