import { RSSController } from '../rss/rss.controller.js'
import { TorrentController } from '../torrent/torrent.controller.js'

class ContextContainer {
	rss: RSSController
	torrent: TorrentController
}

export const Context = new ContextContainer()
