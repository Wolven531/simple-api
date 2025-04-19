import type { Weapon } from '../enums/Weapon'

export type Player = {
    hp: number
    id: number
    name: string
    selectedWeapon: Weapon
}
