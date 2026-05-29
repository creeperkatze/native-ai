export type ColorScheme = 'system' | 'light' | 'dark'

export function applyColorScheme(scheme: ColorScheme): void {
	document.documentElement.classList.remove('dark', 'light')
	if (scheme !== 'system') {
		document.documentElement.classList.add(scheme)
		localStorage.setItem('colorScheme', scheme)
	} else {
		localStorage.removeItem('colorScheme')
	}
}

export function getStoredColorScheme(): ColorScheme {
	const stored = localStorage.getItem('colorScheme')
	if (stored === 'dark' || stored === 'light') return stored
	return 'system'
}
