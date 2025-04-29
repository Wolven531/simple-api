import type { ActionAgainstBoss } from './ActionAgainstBoss'
import type { Boss } from './Boss'

export type ActiveBoss = Boss & {
	actions: ActionAgainstBoss[]
	currentHp: number
	isDefeated: boolean
	isStarted: boolean
}
