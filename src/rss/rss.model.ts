import Parser from 'rss-parser'

export interface Item extends Parser.Item {
	'torrent:fileName': string
	'torrent:magnetURI': string
	'torrent:infoHash': string
	categoriesRaw?: { _: string; $: { domain: string } }[]
}

export interface Feed {
	items: Item[]
}

export interface Structured {
	title: string
	infoHash: string
	magnetURI: string
	release: string
	files: {
		name: string
		path: string
		crc32: string
	}[]
}
