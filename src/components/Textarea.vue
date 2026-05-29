<template>
	<textarea
		v-bind="$attrs"
		:value="modelValue"
		class="px-3 py-2 border border-border rounded-[5px] bg-surface-3 text-primary transition-colors duration-150 outline-none focus:border-accent resize-none"
		@input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
	></textarea>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

defineProps<{
	modelValue?: string
}>()

defineEmits<{
	'update:modelValue': [value: string]
}>()
</script>
