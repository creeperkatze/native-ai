import { Readability } from '@mozilla/readability'
import TurndownService from 'turndown'
import { browser } from 'wxt/browser'

type Scripting = typeof browser & {
	scripting?: {
		executeScript(opts: {
			target: { tabId: number }
			func: () => { title: string; url: string; html: string }
		}): Promise<Array<{ result: { title: string; url: string; html: string } }>>
	}
}

const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' })

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
				html: document.documentElement.outerHTML,
			}),
		})

		const data = results[0]?.result
		if (!data?.html) return null

		const doc = new DOMParser().parseFromString(data.html, 'text/html')
		const article = new Readability(doc).parse()
		if (!article?.content) return null

		const markdown = td.turndown(article.content).slice(0, 12_000)
		return `# ${article.title ?? data.title}\nURL: ${data.url}\n\n${markdown}`
	} catch {
		return null
	}
}
