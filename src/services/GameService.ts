import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
	ENERGY_TIMER_MS,
	PERMS_READ_WRITE_EXEC,
	SAVE_TIMER_MS,
} from '../constants'
import { Weapon } from '../enums'
import type { GameState, GameStatus } from '../types'
import { log } from '../utils'
import { BossService, type BossServiceType } from './BossService'
import { PlayerService, type PlayerServiceType } from './PlayerService'

export type GameServiceType = {
	bossService: BossServiceType
	getStatus: () => Promise<GameStatus>
	load: () => Promise<void>
	playerService: PlayerServiceType
	save: () => Promise<void>
	shutdown: () => Promise<void>
	start: () => Promise<void>
	weaponDamage: Record<Weapon, number>
}

// persistence
const saveDir = resolve(__dirname, '..', '..', 'save-data')
const savePath = resolve(saveDir, 'currentState.json')

export const GameService = (
	initialBossService?: BossServiceType,
	initialPlayerService?: PlayerServiceType,
) => {
	const bossService = initialBossService ?? BossService()
	const playerService = initialPlayerService ?? PlayerService()
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

	let lastEnergyRestore: Date = new Date()
	let lastSave: Date = new Date()
	let parsedGameState: GameState | undefined = undefined
	let timerEnergy: NodeJS.Timeout | undefined = undefined
	let timerSave: NodeJS.Timeout | undefined = undefined

	const getStatus = async () => {
		const status: GameStatus = {
			energyTimer: ENERGY_TIMER_MS,
			lastEnergyRestore: lastEnergyRestore.toISOString(),
			lastEnergyRestoreTimestamp: lastEnergyRestore.getTime(),
			lastSave: lastSave.toISOString(),
			lastSaveTimestamp: lastSave.getTime(),
			saveTimer: SAVE_TIMER_MS,
		}

		return Promise.resolve(status)
	}

	const load = async () => {
		log('Loading game...')

		// load save file (if exists)
		if (existsSync(savePath)) {
			log('Loading game state from disk...')

			const data = readFileSync(savePath, {
				encoding: 'utf-8',
				flag: 'r',
			})

			parsedGameState = JSON.parse(data) as GameState
		}

		// pass loaded data to services
		return Promise.all([
			bossService.load(parsedGameState),
			playerService.load(parsedGameState),
		]).then(() => {
			return
		})
	}

	const save = async () => {
		log('Saving game...')

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

		log('Saving game state to disk...')
		// create save file
		writeFileSync(savePath, JSON.stringify(saveData, null, 2), {
			encoding: 'utf-8',
			mode: PERMS_READ_WRITE_EXEC,
		})
	}

	const shutdown = async () => {
		log('Stopping game...')

		if (timerEnergy) {
			clearInterval(timerEnergy as NodeJS.Timeout)
		}
		if (timerSave) {
			clearInterval(timerSave as NodeJS.Timeout)
		}

		return save()
	}

	const start = async () => {
		log('Starting game...')

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

			save()

			lastSave = new Date()
		}, SAVE_TIMER_MS)
	}

	const instance: GameServiceType = {
		bossService,
		getStatus,
		load,
		playerService,
		save,
		shutdown,
		start,
		weaponDamage,
	}

	return instance
}

export default GameService
