import { Weapon } from '../enums'
import type { ActivePlayer, Player } from '../types'
// import { readFileSync } from 'node:fs'
// import { join } from 'node:path'

// data
import playerData from '../../data/players.json'

export type PlayerServiceType = {
    add: (name: string, selectedWeapon: Weapon) => Promise<void>
    clear: () => Promise<void>
    load: (parsedGameState?: Record<string, unknown>) => Promise<void>
    players: Player[]
    search: (query: string) => Promise<Player | undefined>
    statuses: Record<string, ActivePlayer>
}

export const PlayerService = () => {
    const allPlayers: Player[] = []
    const statuses: Record<string, ActivePlayer> = {}

    const add = (name: string, selectedWeapon: Weapon): Promise<void> => {
        const newPlayer: Player = {
            name: name.toLowerCase(),
            selectedWeapon,
            hp: 100,
            id: allPlayers.length,
        }

        allPlayers.push(newPlayer)
        statuses[name] = {
            ...newPlayer,
            currentHp: newPlayer.hp, // default full hp
        }

        return Promise.resolve()
    }

    const clear = (): Promise<void> => {
        allPlayers.length = 0

        return Promise.resolve()
    }

    const load = (parsedGameState?: Record<string, unknown>): Promise<void> => {
        clear()

        // if saved game state, use it
        if (parsedGameState?.players) {
            const parsedPlayers = parsedGameState.players as ActivePlayer[]

            parsedPlayers.forEach((p) => {
                allPlayers.push({
                    hp: p.hp,
                    id: p.id,
                    name: p.name,
                    selectedWeapon: p.selectedWeapon,
                } as Player)

                statuses[p.name] = p
            })

            return Promise.resolve()
        }

        // otherwise, load from file data
        // const playersPath = join(__dirname, '../../data/players.json')
        // const playerData: Player[] = JSON.parse(readFileSync(playersPath, 'utf8'))

        // use imported JSON instead of reading from file
        playerData.forEach((p: Player) => {
            allPlayers.push(p)
            statuses[p.name] = { ...p, currentHp: p.hp } as ActivePlayer
        })

        return Promise.resolve()
    }

    const search = (query: string): Promise<Player | undefined> => {
        const normalizedQuery = query.toLowerCase().trim()

        return Promise.resolve(
            allPlayers.find(
                (p) =>
                    p.name.toLowerCase() === normalizedQuery ||
                    p.id.toString() === normalizedQuery,
            ),
        )
    }

    return {
        add,
        clear,
        load,
        players: allPlayers,
        search,
        statuses,
    } as PlayerServiceType
}

export default PlayerService
