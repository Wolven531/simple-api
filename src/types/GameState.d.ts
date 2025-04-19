export type GameState = {
	bosses: Record<string, ActiveBoss>
	players: Record<string, ActivePlayer>
	version: number
}
