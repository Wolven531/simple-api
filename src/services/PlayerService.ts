import { DEFAULT_ENERGY, DEFAULT_HP } from '../constants'
import { Weapon } from '../enums'
import type { ActivePlayer, GameState, Player } from '../types'
// import { readFileSync } from 'node:fs'
// import { join } from 'node:path'

// data
import playerData from '../../data/players.json'

export type PlayerServiceType = {
	add: (name: string, selectedWeapon: Weapon) => Promise<void>
	clear: () => Promise<void>
	load: (parsedGameState?: GameState) => Promise<void>
	restoreEnergy: () => Promise<void>
	players: Player[]
	statuses: Record<string, ActivePlayer>
}

export const PlayerService = () => {
	const allPlayers: Player[] = []
	const statuses: Record<string, ActivePlayer> = {}

	const add = (name: string, selectedWeapon: Weapon): Promise<void> => {
		const newPlayer: Player = {
			energy: DEFAULT_ENERGY,
			hp: DEFAULT_HP,
			id: allPlayers.length,
			name,
			selectedWeapon,
		}

		allPlayers.push(newPlayer)
		statuses[name] = {
			...newPlayer,
			currentEnergy: newPlayer.energy,
			currentHp: newPlayer.hp,
		}

		return Promise.resolve()
	}

	const clear = (): Promise<void> => {
		allPlayers.length = 0

		return Promise.resolve()
	}

	const load = (parsedGameState?: GameState): Promise<void> => {
		clear()

		// if saved game state, use it
		if (parsedGameState?.players) {
			const parsedPlayers = parsedGameState.players as Record<
				string,
				ActivePlayer
			>

			Object.entries(parsedPlayers).forEach(([k, v]) => {
				allPlayers.push({
					energy: v.energy,
					hp: v.hp,
					id: v.id,
					name: v.name,
					selectedWeapon: v.selectedWeapon,
				} as Player)

				statuses[v.name] = v
			})

			return Promise.resolve()
		}

		// otherwise, load from file data
		// const playersPath = join(__dirname, '../../data/players.json')
		// const playerData: Player[] = JSON.parse(readFileSync(playersPath, 'utf8'))

		// use imported JSON instead of reading from file
		playerData.forEach((p: Player) => {
			allPlayers.push(p)
			statuses[p.name] = {
				...p,
				currentEnergy: p.energy, // default full energy
				currentHp: p.hp, // default full hp
			} as ActivePlayer
		})

		return Promise.resolve()
	}

	const restoreEnergy = (): Promise<void> => {
		Object.entries(statuses).forEach(([playerName, player]) => {
			if (player.currentEnergy < player.energy) {
				const newEnergy = player.currentEnergy + 1
				console.info(
					`Incrementing energy for ${playerName} to ${newEnergy}`,
				)

				player.currentEnergy = newEnergy
			}
		})

		return Promise.resolve()
	}

	return {
		add,
		clear,
		load,
		players: allPlayers,
		restoreEnergy,
		statuses,
	} as PlayerServiceType
}

export default PlayerService
