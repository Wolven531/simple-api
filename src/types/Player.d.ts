import type { Weapon } from '../enums/Weapon'

export type Player = {
    energy: number
    hp: number
    id: number
    name: string
    selectedWeapon: Weapon
}
