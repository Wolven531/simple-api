import type { Player } from './Player'

export type ActivePlayer = Player & {
    currentHp: number
}
