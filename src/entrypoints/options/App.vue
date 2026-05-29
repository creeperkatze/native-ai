<template>
	<div class="flex h-screen overflow-hidden bg-surface-1">
		<!-- Sidebar -->
		<aside class="w-52 shrink-0 flex flex-col border-r border-border-subtle bg-surface-2">
			<div class="px-4 py-4 border-b border-border-subtle">
				<Logo class="w-32 text-primary" />
			</div>

			<nav class="flex flex-col gap-1 p-2 flex-1">
				<SidebarTab
					v-for="tab in tabs"
					:key="tab.id"
					:icon="tab.icon"
					:label="tab.label"
					:active="route.path === '/' + tab.id"
					@click="router.push('/' + tab.id)"
				/>
			</nav>

			<div class="flex shrink-0 items-center gap-2 px-3 py-2.5 border-t border-border-subtle">
				<span class="text-xs text-muted">v{{ version }}</span>
			</div>
		</aside>

		<!-- Content -->
		<main class="flex-1 overflow-y-auto">
			<RouterView />
		</main>
	</div>
</template>

<script setup lang="ts">
import { Cpu, Palette, Wrench } from '@lucide/vue'
import Logo from '../../assets/logo.svg?component'
import { useRoute, useRouter } from 'vue-router'
import { browser } from 'wxt/browser'

import SidebarTab from '../../components/options/SidebarTab.vue'
import { useSettings } from '../../composables/useSettings'

useSettings()

const router = useRouter()
const route = useRoute()

const version = browser.runtime.getManifest().version

const tabs = [
	{ id: 'models', label: 'AI Models', icon: Cpu },
	{ id: 'tools', label: 'Tools', icon: Wrench },
	{ id: 'appearance', label: 'Appearance', icon: Palette },
]
</script>
