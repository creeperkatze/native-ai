import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, mkdirSync, readdirSync } from 'fs'
import { createRequire } from 'module'
import path from 'path'
import svgLoader from 'vite-svg-loader'
import { defineConfig } from 'wxt'

function findOrtDist(): string {
	const req = createRequire(import.meta.url)
	try {
		const pkgPath = req.resolve('onnxruntime-web/package.json')
		return path.join(path.dirname(pkgPath), 'dist')
	} catch {
		// pnpm isolated linker: search the .pnpm directory
		const pnpmDir = path.join(process.cwd(), 'node_modules/.pnpm')
		const entry = readdirSync(pnpmDir).find((e) => e.startsWith('onnxruntime-web@'))
		if (!entry) throw new Error('onnxruntime-web not found in .pnpm')
		return path.join(pnpmDir, entry, 'node_modules/onnxruntime-web/dist')
	}
}

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
			{
				name: 'copy-ort-wasm',
				buildStart() {
					const ortDist = findOrtDist()
					const destDir = path.join(process.cwd(), 'src/public/ort')
					mkdirSync(destDir, { recursive: true })
					for (const file of readdirSync(ortDist)) {
						if (file.startsWith('ort-wasm-simd-threaded.')) {
							copyFileSync(path.join(ortDist, file), path.join(destDir, file))
						}
					}
				},
			},
		],
	}),
	publicDir: 'src/public',
	modules: ['@wxt-dev/module-vue'],
	manifest: {
		name: 'Native AI',
		description:
			'A browser extension to run AI models locally in your browser using native WebGPU capabilities.',
		icons: {
			16: 'icon-16.png',
			32: 'icon-32.png',
			48: 'icon-48.png',
			64: 'icon-64.png',
			128: 'icon-128.png',
		},
		action: {
			default_icon: {
				16: 'icon-16.png',
				32: 'icon-32.png',
				48: 'icon-48.png',
				64: 'icon-64.png',
				128: 'icon-128.png',
			},
		},
		permissions: ['storage', 'activeTab', 'offscreen', 'scripting', 'sidePanel'],
		host_permissions: ['<all_urls>'],
		options_ui: { open_in_tab: true },
		content_security_policy: {
			extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
		},
	},
	zip: {
		artifactTemplate: 'native-ai-{{version}}-{{browser}}.zip',
		sourcesTemplate: 'native-ai-{{version}}-sources.zip',
	},
})
