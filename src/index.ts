import express, { type Request, type Response } from 'express'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { Server } from 'node:http'
import { resolve } from 'node:path'
import {
	ENERGY_TIMER_MS,
	PERMS_READ_WRITE_EXEC,
	SAVE_TIMER_MS,
} from './constants'
import { Weapon } from './enums'
import { BossService } from './services/BossService'
import { PlayerService } from './services/PlayerService'
import type { ActiveBoss, AttackResult, GameState } from './types'
import { generateDocs, log } from './utils'

// grab port from env or default to 3000
const port = process.env.PORT ?? 3000

// persistence
const saveDir = resolve(__dirname, '..', 'save-data')
const savePath = resolve(saveDir, 'currentState.json')

// create services
const bossService = BossService()
const playerService = PlayerService()

const weaponDamage: Record<Weapon, number> = {
	[Weapon.Shield]: 0,
	[Weapon.Fist]: 2,
	[Weapon.Wand]: 5,
	[Weapon.Staff]: 6,
	[Weapon.Dagger]: 7,
	[Weapon.Bow]: 8,
	[Weapon.Spear]: 9,
	[Weapon.Sword]: 10,
	[Weapon.Crossbow]: 10,
	[Weapon.Mace]: 11,
	[Weapon.Axe]: 12,
	[Weapon.Flail]: 13,
	[Weapon.Hammer]: 14,
	[Weapon.Scythe]: 15,
	[Weapon.Whip]: 4,
	[Weapon.Gun]: 20,
	[Weapon.Grenade]: 25,
	[Weapon.Bomb]: 30,
	[Weapon.Rocket]: 35,
	[Weapon.Laser]: 40000,
}

const onServerShutdown = (server: Server, sig: NodeJS.Signals) => {
	log(`Received signal: ${sig}`)
	log('HTTP server is shutting down...')

	if (timerEnergy) {
		clearInterval(timerEnergy as NodeJS.Timeout)
	}
	if (timerSave) {
		clearInterval(timerSave as NodeJS.Timeout)
	}

	saveToDisk()

	server.close(() => {
		log('HTTP server closed')
	})
}

const onServerStart = () => {
	timerEnergy = setInterval(() => {
		log(`Energy timer tick`)

		playerService
			.restoreEnergy()
			.then(() => {
				lastEnergyRestore = new Date()
			})
			.catch((err) => log(err, true))
	}, ENERGY_TIMER_MS)

	timerSave = setInterval(() => {
		log(`Save timer tick`)

		saveToDisk()

		lastSave = new Date()
	}, SAVE_TIMER_MS)

	log(`Server is running on port ${port}`)
}

const saveToDisk = () => {
	log('Saving game state to disk...')

	// create save dir if missing
	if (!existsSync(saveDir)) {
		mkdirSync(saveDir, {
			mode: PERMS_READ_WRITE_EXEC,
		})
	}

	const saveData: GameState = {
		bosses: bossService.statuses,
		lastEnergyRestore: lastEnergyRestore?.getTime() ?? Date.now(),
		lastSave: lastSave?.getTime() ?? Date.now(),
		players: playerService.statuses,
		version: 1,
	}

	// create save file
	writeFileSync(savePath, JSON.stringify(saveData, null, 2), {
		encoding: 'utf-8',
		mode: PERMS_READ_WRITE_EXEC,
	})
}

let lastEnergyRestore: Date = new Date()
let lastSave: Date = new Date()
let parsedGameState: GameState | undefined = undefined
let timerEnergy: NodeJS.Timeout | undefined = undefined
let timerSave: NodeJS.Timeout | undefined = undefined

// load save file (if exists)
if (existsSync(savePath)) {
	const data = readFileSync(savePath, {
		encoding: 'utf-8',
		flag: 'r',
	})

	parsedGameState = JSON.parse(data) as GameState
}

// first load data from saved game state or disk
Promise.all([
	bossService.load(parsedGameState),
	playerService.load(parsedGameState),
])
	.then(() => {
		// create server (express app)
		const app = express()

		// middleware
		app.use(express.json())
		app.use(express.urlencoded({ extended: true }))

		// !! Only setup routes if data loaded successfully
		app.get('/', (req: Request, res: Response) => {
			const docHtml = generateDocs({
				bossService,
				pageTitle: 'Boss Fight API',
				playerService,
				weaponDamage,
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

			const boss = bossService.statuses[normalizedBossQuery]
			const p = playerService.statuses[player]

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

			const attackResult: AttackResult = await bossService
				.attack(normalizedBossQuery, p, weaponDamage[p.selectedWeapon])
				.catch((err) => err)

			if (attackResult?.error) {
				res.status(400).json(attackResult)
				return
			}

			const enegeryBeforeAttack =
				playerService.statuses[p.name].currentEnergy
			const enegeryAfterAttack = enegeryBeforeAttack - 1
			const hpBeforeAttack = playerService.statuses[p.name].currentHp
			const hpAfterAttack = hpBeforeAttack - attackResult.bossDamage

			// if attack results in negative energy, set to 0; otherwise subtract energy
			playerService.statuses[p.name].currentEnergy =
				enegeryAfterAttack < 0 ? 0 : enegeryAfterAttack
			// if attack results in negative hp, set to 0; otherwise subtract damage
			playerService.statuses[p.name].currentHp =
				hpAfterAttack < 0 ? 0 : hpAfterAttack

			res.status(201).json({
				boss: bossService.statuses[normalizedBossQuery],
				player: playerService.statuses[p.name],
			})
		})

		// boss routes
		app.get('/boss', (req: Request, res: Response) => {
			res.status(200).json(bossService.statuses)
		})

		app.get('/boss/:idOrName', (req: Request, res: Response) => {
			const normalizedBossQuery = String(req.params.idOrName)
				.toLowerCase()
				.trim()

			const [, boss] = Object.entries(bossService.statuses).find(
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
				playerService.players.map((p) => ({
					...p,
					selectedWeaponDamage: weaponDamage[p.selectedWeapon],
					selectedWeaponName: Weapon[p.selectedWeapon],
				})),
			)
		})

		app.get('/player/:idOrName', async (req: Request, res: Response) => {
			const normalizedPlayerQuery = String(req.params.idOrName)
				.toLowerCase()
				.trim()

			const player = playerService.players.find(
				(p) =>
					p.id.toString().includes(normalizedPlayerQuery) ||
					p.name.toLowerCase().includes(normalizedPlayerQuery),
			)

			if (!player) {
				res.status(404).send({ error: 'Player not found' })
				return
			}

			const status = playerService.statuses[player.name]

			res.status(200).json({
				...status,
				selectedWeaponDamage: weaponDamage[player.selectedWeapon],
				selectedWeaponName: Weapon[player.selectedWeapon],
			})
		})

		app.post('/player', async (req: Request, res: Response) => {
			const { name, selectedWeapon } = req.body

			const normalizedPlayerQuery = String(name).toLowerCase().trim()
			const isValidWeapon = Object.values(Weapon).includes(selectedWeapon)
			const playerExists =
				playerService.players.find(
					(p) => p.name.toLowerCase() === normalizedPlayerQuery,
				) !== undefined

			if (!isValidWeapon || playerExists) {
				res.status(400).json({ error: 'Bad player data' })
				return
			}

			playerService.add(name, selectedWeapon)

			res.status(201).json(playerService.statuses[name])
		})

		// timer routes
		app.get('/timer', (req: Request, res: Response) => {
			res.status(200).json({
				energyTimer: ENERGY_TIMER_MS,
				lastEnergyRestore: lastEnergyRestore.toISOString(),
				lastEnergyRestoreTimestamp: lastEnergyRestore.getTime(),
				lastSave: lastSave.toISOString(),
				lastSaveTimestamp: lastSave.getTime(),
				saveTimer: SAVE_TIMER_MS,
			})
		})

		// weapon routes
		app.get('/weapon', (req: Request, res: Response) => {
			const weaponEntries = Object.entries(Weapon).map(
				([enumNumber, enumValueName]) => ({
					damage: weaponDamage[enumNumber as unknown as Weapon],
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
				damage: weaponDamage[weaponEntries[0] as unknown as Weapon],
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
		log('Error loading data from disk', true)
		log(err, true)
		log('Exiting...', true)

		process.exit(1)
	})
