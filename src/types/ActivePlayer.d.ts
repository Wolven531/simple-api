import type { Player } from './Player'

export type ActivePlayer = Player & {
    currentEnergy: number
    currentHp: number
}
