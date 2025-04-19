import { Weapon } from '../enums'
import type { Player } from '../types'

export type PlayerServiceType = {
    add: (name: string, selectedWeapon: Weapon) => Promise<void>
    clear: () => Promise<void>
    load: () => Promise<void>
    players: Player[]
    search: (query: string) => Promise<Player | undefined>
}

export const PlayerService = () => {
    const players: Player[] = []

    const add = (name: string, selectedWeapon: Weapon): Promise<void> => {
        players.push({
            name: name.toLowerCase(),
            selectedWeapon,
            hp: 100,
            id: players.length,
        })

        return Promise.resolve()
    }

    const clear = (): Promise<void> => {
        players.length = 0

        return Promise.resolve()
    }

    const load = (): Promise<void> => {
        clear()

        players.push(
            {
                hp: 100,
                id: 1,
                name: 'Wolven531',
                selectedWeapon: Weapon.Fist,
            },
            {
                hp: 100,
                id: 2,
                name: 'Zorven',
                selectedWeapon: Weapon.Laser,
            },
            {
                hp: 100,
                id: 3,
                name: 'Merlin',
                selectedWeapon: Weapon.Flail,
            },
            {
                hp: 100,
                id: 4,
                name: 'RoughNick',
                selectedWeapon: Weapon.Shield,
            },
        )

        return Promise.resolve()
    }

    const search = (query: string): Promise<Player | undefined> => {
        const normalizedQuery = query.toLowerCase().trim()

        return Promise.resolve(
            players.find(
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
        players,
        search,
    } as PlayerServiceType
}

export default PlayerService
