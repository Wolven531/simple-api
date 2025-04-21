import express, { type Request, type Response } from 'express'
import type { Server } from 'node:http'
import { Weapon } from './enums'
import { GameService } from './services/GameService'
import type { ActiveBoss, AttackResult } from './types'
import { generateDocs, log } from './utils'

// grab port from env or default to 3000
const port = process.env.PORT ?? 3000

const gameService = GameService()

/**
 * This function is called when the server shuts down
 */
const onServerShutdown = (server: Server, sig: NodeJS.Signals) => {
	log(`Received signal: ${sig}`)
	log('HTTP server is shutting down...')

	gameService
		.shutdown()
		.then(() => {
			log('Game service shutdown complete')
		})
		.finally(() => {
			server.close(() => {
				log('HTTP server closed')
			})
		})
}

/**
 * This function is called when the server starts
 */
const onServerStart = () => {
	log(`Server is running on port ${port}`)

	gameService.start().then(() => {
		log('Game service started')
	})
}

// load game service
gameService
	.load()
	.then(() => {
		// create server (express app)
		const app = express()

		// !! ----------
		// !! Only setup middleware and routes if game service loaded successfully
		// !! ----------

		// middleware
		app.use(express.json())
		app.use(express.urlencoded({ extended: true }))

		// routes
		app.get('/', (req: Request, res: Response) => {
			const docHtml = generateDocs({
				gameService,
				pageTitle: 'Boss Fight API',
			})

			res.status(200).contentType('text/html').send(docHtml)
		})

		app.get('/favicon.ico', (req: Request, res: Response) => {
			res.status(200).contentType('image/svg+xml').send(`
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
	<circle cx="50" cy="50" r="47.5"  fill="#0ff" stroke="#00f" stroke-width="5" />
</svg>`)
		})

		// attack routes
		app.post('/attack', async (req: Request, res: Response) => {
			// TODO - grab player info from headers
			const { name, player } = req.body

			const normalizedBossQuery = String(name).toLowerCase().trim()

			const boss = gameService.bossService.statuses[normalizedBossQuery]
			const p = gameService.playerService.statuses[player]

			if (!boss) {
				res.status(400).json({ error: 'Boss not found' })
				return
			}

			if (!p) {
				res.status(400).json({ error: 'Player not found' })
				return
			}

			if (p.currentEnergy <= 0) {
				res.status(400).json({ error: 'Not enough energy' })
				return
			}

			const attackResult: AttackResult = await gameService.bossService
				.attack(
					normalizedBossQuery,
					p,
					gameService.weaponDamage[p.selectedWeapon],
				)
				.catch((err) => err)

			if (attackResult?.error) {
				res.status(400).json(attackResult)
				return
			}

			const enegeryBeforeAttack =
				gameService.playerService.statuses[p.name].currentEnergy
			const enegeryAfterAttack = enegeryBeforeAttack - 1
			const hpBeforeAttack =
				gameService.playerService.statuses[p.name].currentHp
			const hpAfterAttack = hpBeforeAttack - attackResult.bossDamage

			// if attack results in negative energy, set to 0; otherwise subtract energy
			gameService.playerService.statuses[p.name].currentEnergy =
				enegeryAfterAttack < 0 ? 0 : enegeryAfterAttack
			// if attack results in negative hp, set to 0; otherwise subtract damage
			gameService.playerService.statuses[p.name].currentHp =
				hpAfterAttack < 0 ? 0 : hpAfterAttack

			res.status(201).json({
				boss: gameService.bossService.statuses[normalizedBossQuery],
				player: gameService.playerService.statuses[p.name],
			})
		})

		// boss routes
		app.get('/boss', (req: Request, res: Response) => {
			res.status(200).json(gameService.bossService.statuses)
		})

		app.get('/boss/:idOrName', (req: Request, res: Response) => {
			const normalizedBossQuery = String(req.params.idOrName)
				.toLowerCase()
				.trim()

			const [, boss] = Object.entries(
				gameService.bossService.statuses,
			).find(
				([bossName, activeBoss]) =>
					bossName.includes(normalizedBossQuery) ||
					activeBoss.id.toString().includes(normalizedBossQuery),
			) as [string, ActiveBoss]

			if (!boss) {
				res.status(404).send({ error: 'Boss not found' })
				return
			}

			res.status(200).json(boss)
		})

		// player routes
		app.get('/player', (req: Request, res: Response) => {
			res.status(200).json(
				gameService.playerService.players.map((p) => ({
					...p,
					selectedWeaponDamage:
						gameService.weaponDamage[p.selectedWeapon],
					selectedWeaponName: Weapon[p.selectedWeapon],
				})),
			)
		})

		app.get('/player/:idOrName', async (req: Request, res: Response) => {
			const normalizedPlayerQuery = String(req.params.idOrName)
				.toLowerCase()
				.trim()

			const player = gameService.playerService.players.find(
				(p) =>
					p.id.toString().includes(normalizedPlayerQuery) ||
					p.name.toLowerCase().includes(normalizedPlayerQuery),
			)

			if (!player) {
				res.status(404).send({ error: 'Player not found' })
				return
			}

			const status = gameService.playerService.statuses[player.name]

			res.status(200).json({
				...status,
				selectedWeaponDamage:
					gameService.weaponDamage[player.selectedWeapon],
				selectedWeaponName: Weapon[player.selectedWeapon],
			})
		})

		app.post('/player', async (req: Request, res: Response) => {
			const { name, selectedWeapon } = req.body

			const normalizedPlayerQuery = String(name).toLowerCase().trim()
			const isValidWeapon = Object.values(Weapon).includes(selectedWeapon)
			const playerExists =
				gameService.playerService.players.find(
					(p) => p.name.toLowerCase() === normalizedPlayerQuery,
				) !== undefined

			if (!isValidWeapon || playerExists) {
				res.status(400).json({ error: 'Bad player data' })
				return
			}

			gameService.playerService.add(name, selectedWeapon)

			res.status(201).json(gameService.playerService.statuses[name])
		})

		// timer routes
		app.get('/timer', async (req: Request, res: Response) => {
			const status = await gameService.getStatus()

			res.status(200).json(status)
		})

		// weapon routes
		app.get('/weapon', (req: Request, res: Response) => {
			const weaponEntries = Object.entries(Weapon).map(
				([enumNumber, enumValueName]) => ({
					damage: gameService.weaponDamage[
						enumNumber as unknown as Weapon
					],
					name: enumValueName,
				}),
			)

			res.status(200).json(weaponEntries)
		})

		app.get('/weapon/:idOrName', (req: Request, res: Response) => {
			const normalizedWeaponQuery = req.params.idOrName
				.toLowerCase()
				.trim()

			const weaponEntries = Object.entries(Weapon).find(
				([enumNumber, enumValueName]) =>
					enumNumber === normalizedWeaponQuery ||
					enumValueName
						.toString()
						.toLowerCase()
						.includes(normalizedWeaponQuery),
			) as [string, Weapon]

			if (!weaponEntries) {
				res.status(404).send({ error: 'Weapon not found' })
				return
			}

			res.status(200).json({
				damage: gameService.weaponDamage[
					weaponEntries[0] as unknown as Weapon
				],
				name: weaponEntries[1],
			})
		})

		// startup server
		const server = app.listen(port, onServerStart)

		process.on('SIGBREAK', (s) => {
			onServerShutdown(server, s)
		})
		process.on('SIGINT', (s) => {
			onServerShutdown(server, s)
		})
		process.on('SIGTERM', (s) => {
			onServerShutdown(server, s)
		})
		// below listener causes crash
		// process.on('SIGKILL', (s) => {
		// 	onServerShutdown(server, s)
		// })
	})
	.catch((err) => {
		log('Error loading game service', true)
		log(err, true)
		log('Exiting...', true)

		process.exit(1)
	})
