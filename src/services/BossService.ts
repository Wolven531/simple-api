// import { readFileSync } from 'fs'
// import { join } from 'path'
import { Weapon } from '../enums'
import type { ActiveBoss, Boss, Player } from '../types'

// data
import bossData from '../../data/bosses.json'

export type BossServiceType = {
    allBosses: Boss[]
    attack: (
        bossName: string,
        player: Player,
        damage: number,
    ) => Promise<
        | {
              error: string
          }
        | undefined
    >
    clear: () => Promise<void>
    load: () => Promise<void>
    statuses: Record<string, ActiveBoss>
}

export const BossService = () => {
    const allBosses: Boss[] = []
    const statuses: Record<string, ActiveBoss> = {}
    // const bossTimers = []

    const attack = (
        bossName: string,
        player: Player,
        damage: number,
    ): Promise<{ error: string } | undefined> => {
        const boss = statuses[bossName]

        if (boss.currentHp <= 0) {
            // res.status(400).json({ error: 'Boss already defeated' })
            return Promise.reject({ error: 'Boss already defeated' })
        }

        if (!boss.isStarted) {
            statuses[bossName].actions.push({
                action: 'start',
                description: `Boss ${bossName} started`,
                field: 'currentHp',
                user: player.name,
                value: 0,
            })
            statuses[bossName].isStarted = true
        }

        const description = `Player ${
            player.name
        } attacked boss ${bossName} using ${
            Weapon[player.selectedWeapon]
        } for ${damage} damage`

        statuses[bossName].actions.push({
            action: 'attack',
            description,
            field: 'currentHp',
            user: player.name,
            value: damage,
        })

        statuses[bossName].currentHp -= damage

        if (statuses[bossName].currentHp <= 0) {
            statuses[bossName].currentHp = 0
        }

        return Promise.resolve(undefined)
    }

    const clear = (): Promise<void> => {
        allBosses.length = 0

        return Promise.resolve()
    }

    const load = (): Promise<void> => {
        clear()

        // const bossesPath = join(__dirname, '../../data/bosses.json')
        // const bossData: Boss[] = JSON.parse(readFileSync(bossesPath, 'utf8'))

        bossData.forEach((b: Boss) => {
            allBosses.push(b)
            statuses[b.name.toLowerCase()] = {
                actions: [],
                currentHp: b.hp,
                damage: b.damage,
                defense: b.defense,
                hp: b.hp,
                isDefeated: false,
                isStarted: false,
                name: b.name,
            } as ActiveBoss
        })

        return Promise.resolve()
    }

    return {
        allBosses,
        attack,
        clear,
        load,
        statuses,
    } as BossServiceType
}

export default BossService
