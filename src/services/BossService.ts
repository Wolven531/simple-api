// import { readFileSync } from 'fs'
// import { join } from 'path'
import { Weapon } from '../enums'
import type { ActiveBoss, Boss, Player } from '../types'

// data
import bossData from '../../data/bosses.json'

export const BossService = () => {
    const allBosses: Boss[] = []
    const statuses: Record<string, ActiveBoss> = {}
    // const bossTimers = []

    const attack = (
        bossName: string,
        player: Player,
        damage: number,
    ): { error: string } | undefined => {
        const boss = statuses[bossName]

        if (boss.currentHp <= 0) {
            // res.status(400).json({ error: 'Boss already defeated' })
            return { error: 'Boss already defeated' }
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

        statuses[bossName].actions.push({
            action: 'attack',
            description: `Player ${
                player.name
            } attacked boss ${bossName} using ${
                Weapon[player.selectedWeapon]
            } for ${damage} damage`,
            field: 'currentHp',
            user: player.name,
            value: damage,
        })

        statuses[bossName].currentHp -= damage

        if (statuses[bossName].currentHp <= 0) {
            statuses[bossName].currentHp = 0
        }
    }

    const clear = () => {
        allBosses.length = 0
    }

    const load = () => {
        clear()

        // const bossesPath = join(__dirname, '../../data/bosses.json')
        // const bossData: Boss[] = JSON.parse(readFileSync(bossesPath, 'utf8'))

        bossData.forEach((b) => {
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
            }
        })
    }

    return {
        allBosses,
        attack,
        clear,
        load,
        statuses,
    }
}

export default BossService
