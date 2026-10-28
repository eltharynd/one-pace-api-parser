import 'reflect-metadata'
import environment from './environment.js'

import { Logger } from 'ez-ts-logger'

import { RSSController } from './rss/rss.controller.js'
import { TorrentController } from './torrent/torrent.controller.js'
import { Context } from './util/context.js'

const startApp = async () => {
	let gracefulClose = async () => {
		try {
			Logger.info('GRACEFULLY QUITTING APPLICATION...')

			Logger.info('GRACEFULLY CLOSED APPLICATION...')
			process.exit(0)
		} catch (error) {
			Logger.error('COULD NOT GRACEFULLY CLOSE APPLICATION...')
			Logger.error(error)
			process.exit(1)
		}
	}
	process.on('SIGINT', gracefulClose)
	process.on('SIGTERM', gracefulClose)

	try {
		Logger.info(`##################################`)
		Logger.info(`##################################`)
		Logger.info(`####                          ####`)
		Logger.info(
			`####  One Pace Parser ${process.env.npm_package_version || 'NO_VERS'}${String('####').padStart(12 - (process.env.npm_package_version || 'NO_VERS').length, ' ')}`,
		)
		Logger.info(`####                          ####`)
		Logger.info(`##################################`)
		Logger.info(`##################################`)
		Logger.info('')
		Logger.info('STARTING APPLICATION...')

		Context.rss = new RSSController()
		await Context.rss.init()
		Logger.info('RSS CONTROLLER INITIALIZED')

		Context.torrent = new TorrentController()
		await Context.torrent.init()
		Logger.info('TORRENT CONTROLLER INITIALIZED')

		await Context.torrent.addTorrents(Context.rss.processable)

		setInterval(async () => {
			Logger.info(`Refreshing RSS`)
			await Context.rss.fetch()
			await Context.rss.mergeWithCache()
			await Context.torrent.addTorrents(Context.rss.processable)
		}, environment.SCRAPE_INTERVAL)

		Logger.info(`Starting to watch for completed torrents`)
		await Context.torrent.processComplete()
	} catch (e) {
		Logger.error('APPLICATION COULD NOT BE STARTED...')
		return gracefulClose()
	}
}
startApp()
