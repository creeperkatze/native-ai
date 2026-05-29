import { browser } from 'wxt/browser'

type Scripting = typeof browser & {
	scripting?: {
		executeScript(opts: {
			target: { tabId: number }
			func: () => { title: string; url: string; content: string }
		}): Promise<Array<{ result: { title: string; url: string; content: string } }>>
	}
}

export async function getActiveTabContent(): Promise<string | null> {
	try {
		const scripting = (browser as Scripting).scripting
		if (!scripting) return null

		const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
		if (!tab?.id) return null

		const results = await scripting.executeScript({
			target: { tabId: tab.id },
			func: () => ({
				title: document.title,
				url: location.href,
				content: (document.body?.innerText ?? '').slice(0, 12_000),
			}),
		})

		const data = results[0]?.result
		if (!data?.content) return null

		return `[Page Context]\nTitle: ${data.title}\nURL: ${data.url}\n\n${data.content}`
	} catch {
		return null
	}
}

