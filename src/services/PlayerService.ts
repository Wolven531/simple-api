import { Weapon } from '../enums'
import type { Player } from '../types'

export const PlayerService = () => {
    const players: Player[] = []

    const add = (name: string, selectedWeapon: Weapon) => {
        players.push({
            name: name.toLowerCase(),
            selectedWeapon,
            hp: 100,
            id: players.length,
        })
    }

    const clear = () => {
        players.length = 0
    }

    const load = () => {
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
    }

    const search = (query: string) => {
        const normalizedQuery = query.toLowerCase().trim()

        return players.find(
            (p) =>
                p.name.toLowerCase() === normalizedQuery ||
                p.id.toString() === normalizedQuery,
        )
    }

    return {
        add,
        clear,
        load,
        players,
        search,
    }
}

export default PlayerService
