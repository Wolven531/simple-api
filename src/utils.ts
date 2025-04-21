import { Weapon } from './enums'
// import type { BossServiceType } from './services/BossService'
import type { GameServiceType } from './services/GameService'
// import type { PlayerServiceType } from './services/PlayerService'

/**
 * This function logs messages to console with a timestamp
 *
 * @param { string } msg
 * @param { boolean | undefined } isError
 */
export const log = (msg: string, isError = false) => {
	const d = new Date().toUTCString()

	if (isError) {
		console.error(`[${d}] ${msg}`)
		return
	}

	console.info(`[${d}] ${msg}`)
}

/**
 * This function generates the HTML documentation for the API
 */
export const generateDocs = ({
	// bossService,
	gameService,
	pageTitle,
	// playerService,
	// weaponDamage,
}: {
	// bossService: BossServiceType
	gameService: GameServiceType
	pageTitle: string
	// playerService: PlayerServiceType
	// weaponDamage: Record<Weapon, number>
}) => {
	return `
<!DOCTYPE html>
<html>
	<head>
		<title>${pageTitle}</title>
	</head>
	<style>
		:root {
			color-scheme: light dark;

			--color-dark: light-dark(#eee, #333);
			--color-light: light-dark(#333, #ccc);
			--color-primary: light-dark(#0aa, #0cc);
		}

		body {
			background-color: var(--color-dark);
			color: var(--color-light);
			display: grid;
			font-family: Arial, sans-serif;
			grid-template-columns: 1fr 10fr 1fr;
			grid-template-rows: 5rem 1fr 3rem;
			margin: 0;
			padding: 0;

			a {
				border: 1px solid var(--color-light);
				color: var(--color-primary);
				font-family: monospace;
				padding: 0 0.5rem;
				text-decoration: none;
			}

			code {
				border: 1px solid var(--color-light);
				color: var(--color-primary);
				padding: 0 0.5rem;
			}

			footer {
				align-items: center;
				display: flex;
				flex-direction: row;
				flex-grow: 1;
				grid-column: 2 / 3;
				grid-row: 3;
				justify-content: center;
			}

			header {
				align-items: center;
				display: flex;
				flex-direction: row;
				flex-grow: 1;
				font-size: 3rem;
				grid-column: 2 / 3;
				grid-row: 1 / 2;
				justify-content: center;
			}

			main {
				grid-column: 2 / 3;
				grid-row: 2 / 3;
			}
		}
	</style>
	<body>
		<header>${pageTitle}</header>
		<main>
			<h2>Boss</h2>
			<ul>
				<li>GET <a href="/boss">/boss</a> - Get all bosses</li>
				<li>GET <code>/boss/:name</code> - Get boss by name
					<ul>
						${gameService.bossService.allBosses
							.map(
								(b) =>
									`<li><a href="/boss/${b.name}">${b.name}</a></li>`,
							)
							.join('')}
					</ul>
				</li>
				<li>POST <code>/attack</code> - Attack a boss</li>
			</ul>
			<h2>Player</h2>
			<ul>
				<li>GET <a href="/player">/player</a> - Get all players</li>
				<li>GET <code>/player/:idOrName</code> - Get player by name
					<ul>
						${gameService.playerService.players
							.map(
								(p) =>
									`<li><a href="/player/${p.name}">${p.name}</a></li>`,
							)
							.join('')}
					</ul>
				</li>
				<li>POST <code>/player</code> - Create a new player</li>
			</ul>
			<h2>Timers</h2>
			<ul>
				<li>GET <a href="/timer">/timer</a> - Get timer info</li>
			</ul>
			<h2>Weapons</h2>
			<ul>
				<li>GET <code>/weapon/:idOrName</code> Get weapon
					<ul>
						${Object.entries(Weapon)
							.filter(
								([, val]) =>
									gameService.weaponDamage[val as Weapon] !==
									undefined,
							)
							.map(
								([, val]) =>
									`<li><a href="/weapon/${val}">${
										Weapon[val as keyof typeof Weapon]
									}</a> (${
										gameService.weaponDamage[val as Weapon]
									})</li>`,
							)
							.join('')}
					</ul>
				</li>
			</ul>
		</main>
		<footer>
			<p>Created by <a href="https://github.com/wolven531">Wolven531</a> &copy; 2025</p>
		</footer>
	</body>
</html>`
}

/**
 * Generates a random number (repeated calls are uniformly distributed);
 * Maximum and minimum are inclusive by default
 *
 * More info - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#getting_a_random_integer_between_two_values_inclusive
 */
export const rand = (min: number, max: number, includeMax = true) => {
	const minCeil = Math.ceil(min)
	const maxFloor = Math.floor(max)

	return Math.floor(
		Math.random() * (maxFloor - minCeil + (includeMax ? 1 : 0)) + minCeil,
	)
}
