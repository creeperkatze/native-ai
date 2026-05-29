import { createRouter, createWebHashHistory } from 'vue-router'

import AppearanceView from './views/AppearanceView.vue'
import ModelsView from './views/ModelsView.vue'
import ToolsView from './views/ToolsView.vue'

export const router = createRouter({
	history: createWebHashHistory(),
	routes: [
		{ path: '/', redirect: '/models' },
		{ path: '/models', component: ModelsView },
		{ path: '/tools', component: ToolsView },
		{ path: '/appearance', component: AppearanceView },
	],
})
