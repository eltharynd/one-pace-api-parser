import dotenv from 'dotenv'
import { Logger } from 'ez-ts-logger'
dotenv.config({ path: './.env' })

export default {
	LOG_LEVEL: process.env.LOG_LEVEL || 'info',
	DEBUGGING:
		/debug/i.test(process.env.LOG_LEVEL || 'false') ||
		/true/i.test(process.env.DEBUGGING || 'false'),

	TESTING:
		/test/i.test(process.env.NODE_ENV) || /true/i.test(process.env.TESTING),

	ADMIN_API_KEY: process.env.ADMIN_API_KEY || '',

	SCRAPE_INTERVAL:
		Number.parseInt(process.env.SCRAPE_INTERVAL || '15') * 60 * 1000,

	SCRAPE_CACHE:
		process.env.SCRAPE_CACHE ||
		`https://raw.githubusercontent.com/eltharynd/one-pace-api/refs/heads/main/pre-processed/torrents.json`,

	/**
	 * TORRENT
	 */
	TORRENT_URL: process.env.TORRENT_URL || `http://localhost:8080`,
	TORRENT_USER: process.env.TORRENT_USER || `user`,
	TORRENT_PASSWORD: process.env.TORRENT_PASSWORD || `password`,

	TORRENT_CATEGORY_FORCE: /true/i.test(
		process.env.TORRENT_CATEGORY_FORCE || 'false',
	),
	TORRENT_CATEGORY: process.env.TORRENT_CATEGORY || `onepacerr`,
	TORRENT_CATEGORY_ONCE_COMPLETED:
		process.env.TORRENT_CATEGORY_ONCE_COMPLETED || `completed`,

	TORRENT_CHECK_INTERVAL:
		Number.parseInt(process.env.TORRENT_CHECK_INTERVAL || '60') * 1000,

	MOUNT_DOWNLOADS_TORRENT:
		process.env.MOUNT_DOWNLOADS_TORRENT ||
		process.env.MOUNT_DOWNLOADS_QBITTORRENT ||
		'',
	MOUNT_DOWNLOADS_PARSER: process.env.MOUNT_DOWNLOADS_PARSER || '',
}

Logger.reloadEnvConfigs()
