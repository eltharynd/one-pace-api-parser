import { QBittorrent } from '@ctrl/qbittorrent'
import axios from 'axios'
import { Logger } from 'ez-ts-logger'
import { readdirSync, writeFileSync } from 'node:fs'

import environment from '../environment.js'
import { Structured } from '../rss/rss.model.js'
import { Context } from '../util/context.js'
import getFileCrc32Hash from '../util/crc32.js'

export class TorrentController {
	client: QBittorrent

	async init() {
		if (!this.client) {
			this.client = await new QBittorrent({
				baseUrl: environment.TORRENT_URL,
				username: environment.TORRENT_USER,
				password: environment.TORRENT_PASSWORD,
			})
		}
	}

	async addTorrents(processable: Structured[]) {
		const torrents = await this.client.listTorrents()

		let count = 0
		for (let item of processable) {
			if (item.files.length > 0) continue
			count++

			let torrent = torrents.find(t => t.hash === item.infoHash)
			if (!torrent) {
				await this.client.addMagnet(item.magnetURI, {
					category: environment.TORRENT_CATEGORY,
				})
			} else {
				if (
					torrent.category != environment.TORRENT_CATEGORY &&
					environment.TORRENT_CATEGORY_FORCE
				) {
					await this.client.setTorrentCategory(
						torrent.hash,
						environment.TORRENT_CATEGORY,
					)
				}
			}
		}

		Logger.info(`Added ${count}/${processable.length} torrents`)
	}

	async processComplete() {
		const processable = Context.rss.processable
		const unprocessed = processable.filter(p => p.files.length == 0)

		let processed = 0

		let completed = (
			await this.client.listTorrents({
				category: environment.TORRENT_CATEGORY,
			})
		).filter(t => t.progress >= 1)

		if (completed.length == 0) {
			Logger.info(
				`No completed torrents to process out of ${unprocessed.length}`,
			)
			setTimeout(() => {
				this.processComplete()
			}, environment.TORRENT_CHECK_INTERVAL)
			return
		}

		Logger.info(`Processing ${completed.length} completed torrents`)

		let i = 0
		for (let torrent of completed) {
			let target = processable.find(s => s.infoHash == torrent.hash)

			if (!target) {
				await this.client.setTorrentCategory(
					torrent.hash,
					environment.TORRENT_CATEGORY_ONCE_COMPLETED,
				)
				continue
			}
			/* if (!target.files)  */ target.files = []

			let paths: string[] = []
			let bundle = false
			if (!/\.[\w\d]{3}$/i.test(torrent.content_path)) {
				bundle = true
				let dir = readdirSync(
					torrent.content_path.replace(
						environment.MOUNT_DOWNLOADS_TORRENT,
						environment.MOUNT_DOWNLOADS_PARSER,
					),
				)
				for (let path of dir) paths.push(`${torrent.content_path}/${path}`)
			} else paths.push(torrent.content_path)

			for (let path of paths) {
				let formatted = path.replace(
					environment.MOUNT_DOWNLOADS_TORRENT,
					environment.MOUNT_DOWNLOADS_PARSER,
				)
				let crc32 = await getFileCrc32Hash(formatted)
				console.log(crc32)
				let p = path
					.replace(environment.MOUNT_DOWNLOADS_TORRENT, '')
					.replace(/^.+\//, '')

				target.files.push({
					name: bundle ? p.replace(/^.+\//, '') : p,
					path: p,
					crc32: crc32,
				})
			}

			writeFileSync(
				`output/processed-torrents.json`,
				JSON.stringify(processable, null, 2),
			)

			Logger.info(`Processed ${torrent.hash}`)
			processed++
			await this.client.setTorrentCategory(
				torrent.hash,
				environment.TORRENT_CATEGORY_ONCE_COMPLETED,
			)

			if (++i >= 1) {
				i = 0
				Logger.info(`Sending update`)
				const body = JSON.stringify(processable)
				const bytes = Buffer.byteLength(body, 'utf8')
				Logger.info(
					`Payload size: ${(bytes / 1024 / 1024).toFixed(2)} MB (${bytes} bytes)`,
				)
				try {
					let response = await axios.post(
						`https://onepacerr.com/api/v1/admin/update/processed-torrents`,
						//`http://localhost:3001/api/v1/admin/update/processed-torrents`,
						processable,
						{
							headers: {
								Authorization: environment.ADMIN_API_KEY,
							},
							timeout: 120_000,
						},
					)

					if (response.status == 200) Logger.info(`Update sent`)
				} catch (e) {
					Logger.error(e)
				}
			}
		}

		Logger.info(`Processed ${processed}/${unprocessed.length} torrents`)
		Logger.info(
			`Still waiting for ${unprocessed.length - processed} torrents to complete`,
		)
		setTimeout(() => {
			this.processComplete()
		}, environment.TORRENT_CHECK_INTERVAL)
	}
}
