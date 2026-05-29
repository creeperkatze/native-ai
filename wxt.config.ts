import tailwindcss from '@tailwindcss/vite'
import svgLoader from 'vite-svg-loader'
import { defineConfig } from 'wxt'

export default defineConfig({
	srcDir: 'src',
	vite: () => ({
		plugins: [
			tailwindcss(),
			svgLoader(),
			{
				name: 'inject-theme-init',
				transformIndexHtml: {
					order: 'pre',
					handler: () => [
						{ tag: 'script', injectTo: 'head-prepend', attrs: { src: '/theme-init.js' } },
					],
				},
			},
		],
	}),
	publicDir: 'src/public',
	modules: ['@wxt-dev/module-vue'],
	manifest: {
		name: 'Local AI',
		description: 'Run AI models locally in your browser using built-in browser capabilities.',
		icons: {
			16: 'icon-16.png',
			32: 'icon-32.png',
			48: 'icon-48.png',
			64: 'icon-64.png',
			128: 'icon-128.png',
		},
		permissions: ['storage', 'activeTab', 'offscreen', 'scripting'],
		host_permissions: ['https://huggingface.co/*', 'https://raw.githubusercontent.com/*'],
		options_ui: { open_in_tab: true },
		content_security_policy: {
			extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
		},
	},
	zip: {
		artifactTemplate: 'local-ai-{{version}}-{{browser}}.zip',
		sourcesTemplate: 'local-ai-{{version}}-sources.zip',
	},
})
