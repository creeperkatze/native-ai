import { createRouter, createWebHashHistory } from 'vue-router'

import AppearanceView from './views/AppearanceView.vue'
import ModelsView from './views/ModelsView.vue'

export const router = createRouter({
	history: createWebHashHistory(),
	routes: [
		{ path: '/', redirect: '/models' },
		{ path: '/models', component: ModelsView },
		{ path: '/appearance', component: AppearanceView },
	],
})
