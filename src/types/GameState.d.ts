export type GameState = {
	bosses: Record<string, ActiveBoss>
	lastEnergyRestore: number
	lastSave: number
	players: Record<string, ActivePlayer>
	version: number
}
