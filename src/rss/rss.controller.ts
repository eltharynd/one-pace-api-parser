import axios from 'axios'
import { Logger } from 'ez-ts-logger'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import Parser from 'rss-parser'
import { Feed, Item, Structured } from './rss.model.js'

const CACHE_ROOT = './cache'
const CACHE_RSS_FEED = `${CACHE_ROOT}/rss.json`
const RSS_FEED_URL = `https://onepace.net/en/releases/rss.xml`

export class RSSController {
	private readonly parser: Parser<Feed, Item> = new Parser({
		customFields: {
			item: [
				'torrent:fileName',
				'torrent:magnetURI',
				'torrent:infoHash',
				['category', 'categoriesRaw', { keepArray: true }],
			],
		},
	})

	feed: Parser.Output<Item>

	processable: Structured[]

	public async init() {
		if (existsSync(CACHE_RSS_FEED)) {
			try {
				Logger.debug('Loading RSS from cache')
				if (!this.feed)
					this.feed = JSON.parse(readFileSync(CACHE_RSS_FEED).toString())

				try {
					//@ts-ignore
					const lastLocalUpdate = new Date(this.feed.lastBuildDate)

					const remote = await this.fetch()
					//@ts-ignore
					const lastRemoteUpdate = new Date(remote.lastBuildDate)
					if (lastRemoteUpdate > lastLocalUpdate) {
						Logger.info(`New RSS updates, updating Local`)
						this.feed = await this.fetch()
					} else {
						Logger.info('Loaded RSS from cache')
					}
				} catch (e) {
					Logger.warn(`Couldn't fetch RSS. Keeping cached one`)
				}
			} catch (e) {
				Logger.warn(`Couldn't parse cached file. Re-scraping`)
				unlinkSync(CACHE_RSS_FEED)
				this.feed = await this.fetch()
			}
		} else {
			this.feed = await this.fetch()
			Logger.info('Fetched RSS from remote')
		}
		await this.mergeWithCache()
	}

	async fetch() {
		Logger.debug(`Fetching OnePace RSS Feed`)
		try {
			const response = await axios.get(RSS_FEED_URL, { timeout: 5 * 60_000 })
			Logger.debug(`Gotten RSS feed, parsing...`)

			const feed = await this.parser.parseString(response.data)
			writeFileSync(CACHE_RSS_FEED, JSON.stringify(feed, null, 2))
			return feed
		} catch (e) {
			Logger.error(`Error while fetching RSS feed...`)
			Logger.error(e)
			throw e
		}
	}

	async mergeWithCache() {
		const items = this.feed.items.filter(i => !!i['torrent:infoHash'])
		const structured: Structured[] = []
		for (let item of items) {
			if (!structured.find(i => i.infoHash == item['torrent:infoHash'])) {
				structured.push({
					title: item['title'],
					infoHash: item['torrent:infoHash'],
					magnetURI: item['torrent:magnetURI'],
					release: item.isoDate,
					files: [],
				})
			}
		}
		Logger.info(`Found ${structured.length} entries in RSS feed`)

		if (await existsSync(`output/processed-torrents.json`)) {
			let cached = JSON.parse(
				readFileSync(`output/processed-torrents.json`).toString(),
			)
			for (let c of cached) {
				let s = structured.find(s => s.infoHash == c.infoHash)
				if (s) {
					for (let key of Object.keys(c)) {
						s[key] = c[key]
					}
				} else {
					structured.push(c)
				}
			}
			Logger.info(`Merged ${cached.length} entries from cache`)
		}

		this.processable = structured

		//TODO also download from repo
		// try {
		// 	let repo = (await axios.get(environment.SCRAPE_CACHE)).data
		// 	console.log(repo)
		// } catch (e) {
		// 	Logger.error(e)
		// }
	}

	public async getLastUdate(): Promise<Date> {
		if (!this.feed) {
			this.feed = await this.fetch()
		}
		//@ts-ignore
		return new Date(this.feed.lastBuildDate)
	}

	getAll(): Parser.Output<any> {
		return this.feed
	}

	public getItems(): Item[] {
		return structuredClone(this.feed.items)
	}
}
