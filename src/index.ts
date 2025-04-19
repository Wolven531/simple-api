import express, { Request, Response } from 'express'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { Server } from 'node:http'
import { resolve } from 'node:path'
import { ENERGY_TIMER_MS, PERMS_READ_WRITE_EXEC } from './constants'
import { Weapon } from './enums'
import { BossService } from './services/BossService'
import { PlayerService } from './services/PlayerService'
import type { AttackResult, GameState } from './types'

// grab port from env or default to 3000
const port = process.env.PORT ?? 3000

// persistence
const saveDir = resolve(__dirname, '..', 'save-data')
const savePath = resolve(saveDir, 'currentState.json')

// create services
const bossService = BossService()
const playerService = PlayerService()

const weaponDamage: Record<Weapon, number> = {
    [Weapon.Shield]: 0,
    [Weapon.Fist]: 2,
    [Weapon.Wand]: 5,
    [Weapon.Staff]: 6,
    [Weapon.Dagger]: 7,
    [Weapon.Bow]: 8,
    [Weapon.Spear]: 9,
    [Weapon.Sword]: 10,
    [Weapon.Crossbow]: 10,
    [Weapon.Mace]: 11,
    [Weapon.Axe]: 12,
    [Weapon.Flail]: 13,
    [Weapon.Hammer]: 14,
    [Weapon.Scythe]: 15,
    [Weapon.Whip]: 4,
    [Weapon.Gun]: 20,
    [Weapon.Grenade]: 25,
    [Weapon.Bomb]: 30,
    [Weapon.Rocket]: 35,
    [Weapon.Laser]: 40000,
}

const onServerShutdown = (server: Server, sig: NodeJS.Signals) => {
    console.info(`Received signal: ${sig}`)
    console.info('HTTP server is shutting down...')

    if (energyTimer) {
        clearInterval(energyTimer as NodeJS.Timeout)
    }

    server.close(() => {
        console.log('HTTP server closed')
    })

    // create save dir if missing
    if (!existsSync(saveDir)) {
        mkdirSync(saveDir, {
            mode: PERMS_READ_WRITE_EXEC,
        })
    }

    // create save file
    writeFileSync(
        savePath,
        JSON.stringify(
            {
                bosses: bossService.statuses,
                players: playerService.statuses,
                version: 1,
            } as GameState,
            null,
            2,
        ),
        {
            encoding: 'utf-8',
            mode: PERMS_READ_WRITE_EXEC,
        },
    )
}

const onServerStart = () => {
    energyTimer = setInterval(() => {
        const d = new Date().toUTCString()

        console.info(`[${d}] Energy timer tick`)
        playerService.restoreEnergy()
    }, ENERGY_TIMER_MS)

    console.log(`Server is running on port ${port}`)
}

let energyTimer: NodeJS.Timeout | undefined = undefined
let parsedGameState: GameState | undefined = undefined

// load save file (if exists)
if (existsSync(savePath)) {
    const data = readFileSync(savePath, {
        encoding: 'utf-8',
        flag: 'r',
    })

    parsedGameState = JSON.parse(data) as GameState
}

// first load data from saved game state or disk
Promise.all([
    bossService.load(parsedGameState),
    playerService.load(parsedGameState),
])
    .then(() => {
        // create server (express app)
        const app = express()

        // middleware
        app.use(express.json())
        app.use(express.urlencoded({ extended: true }))

        // !! Only setup routes if data loaded successfully
        app.get('/', (req: Request, res: Response) => {
            res.status(200).contentType('text/html').send(`
<!DOCTYPE html>
    <html>
    <head>
        <title>Boss Fight API</title>
    </head>
    <body>
        <h1>Welcome to the Boss Fight API</h1>
        <h2>Boss</h2>
        <ul>
            <li>GET <a href="/boss">/boss</a> - Get all bosses</li>
            <li>GET <code>/boss/:name</code> - Get boss by name
                <ul>
                    ${bossService.allBosses
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
                    ${playerService.players
                        .map(
                            (p) =>
                                `<li><a href="/player/${p.name}">${p.name}</a></li>`,
                        )
                        .join('')}
                </ul>
            </li>
            <li>POST <code>/player</code> - Create a new player</li>
        </ul>
        <h2>Weapons</h2>
        <ul>
            <li>GET <code>/weapon/:idOrName</code> Get weapon
                <ul>
                    ${Object.entries(Weapon)
                        .filter(
                            ([key, val]) =>
                                weaponDamage[val as unknown as Weapon] !==
                                undefined,
                        )
                        .map(
                            ([key, val]) =>
                                `<li><a href="/weapon/${val}">${
                                    Weapon[val as any]
                                }</a> (${weaponDamage[val as Weapon]})</li>`,
                        )
                        .join('')}
                </ul>
            </li>
        </ul>
    </body>
</html>`)
        })

        // TODO - grab player info from headers
        // attack routes
        app.post('/attack', async (req: Request, res: Response) => {
            const { name, player } = req.body

            const normalizedBossQuery = String(name).toLowerCase().trim()

            const p = playerService.statuses[player]
            const boss = bossService.statuses[normalizedBossQuery]

            if (!boss) {
                res.status(400).json({ error: 'Boss not found' })
                return
            }

            if (!p) {
                res.status(400).json({ error: 'Player not found' })
                return
            }

            if (p.currentEnergy <= 0) {
                res.status(400).json({ error: 'Not enough energy' })
                return
            }

            const attackResult: AttackResult = await bossService
                .attack(normalizedBossQuery, p, weaponDamage[p.selectedWeapon])
                .catch((err) => err)

            if (attackResult?.error) {
                res.status(400).json(attackResult)
                return
            }

            const enegeryBeforeAttack =
                playerService.statuses[p.name].currentEnergy
            const enegeryAfterAttack = enegeryBeforeAttack - 1
            const hpBeforeAttack = playerService.statuses[p.name].currentHp
            const hpAfterAttack = hpBeforeAttack - attackResult.bossDamage

            // if attack results in negative energy, set to 0; otherwise subtract energy
            playerService.statuses[p.name].currentEnergy =
                enegeryAfterAttack < 0 ? 0 : enegeryAfterAttack
            // if attack results in negative hp, set to 0; otherwise subtract damage
            playerService.statuses[p.name].currentHp =
                hpAfterAttack < 0 ? 0 : hpAfterAttack

            res.status(201).json({
                boss: bossService.statuses[normalizedBossQuery],
            })
        })

        // boss routes
        app.get('/boss', (req: Request, res: Response) => {
            res.status(200).json(bossService.statuses)
        })

        app.get('/boss/:name', (req: Request, res: Response) => {
            const normalizedBossQuery = String(req.params.name)
                .toLowerCase()
                .trim()
            const boss = bossService.statuses[normalizedBossQuery]

            boss
                ? res.status(200).json(boss)
                : res.status(404).send({ error: 'Boss not found' })
        })

        // player routes
        app.get('/player', (req: Request, res: Response) => {
            res.status(200).json(
                playerService.players.map((p) => ({
                    ...p,
                    selectedWeaponDamage: weaponDamage[p.selectedWeapon],
                    selectedWeaponName: Weapon[p.selectedWeapon],
                })),
            )
        })

        app.get('/player/:idOrName', async (req: Request, res: Response) => {
            const normalizedPlayerQuery = String(req.params.idOrName)
            const player = playerService.statuses[normalizedPlayerQuery]

            playerService.statuses[normalizedPlayerQuery]
                ? res.status(200).json({
                      ...player,
                      selectedWeaponDamage: weaponDamage[player.selectedWeapon],
                      selectedWeaponName: Weapon[player.selectedWeapon],
                  })
                : res.status(404).send({
                      error: 'Player not found',
                  })
        })

        app.post('/player', async (req: Request, res: Response) => {
            const { name, selectedWeapon } = req.body

            const normalizedPlayerQuery = String(name).toLowerCase().trim()
            const isValidWeapon = Object.values(Weapon).includes(selectedWeapon)
            const playerExists =
                playerService.players.find(
                    (p) => p.name.toLowerCase() === normalizedPlayerQuery,
                ) !== undefined

            if (!isValidWeapon || playerExists) {
                res.status(400).json({ error: 'Bad player data' })
                return
            }

            playerService.add(name, selectedWeapon)

            res.status(201).json(playerService.statuses[name])
        })

        // weapon routes
        app.get('/weapon', (req: Request, res: Response) => {
            const weaponEntries = Object.entries(Weapon).map(
                ([enumNumber, enumValueName]) => ({
                    damage: weaponDamage[enumNumber as unknown as Weapon],
                    name: enumValueName,
                }),
            )

            res.status(200).json(weaponEntries)
        })

        app.get('/weapon/:idOrName', (req: Request, res: Response) => {
            const normalizedWeaponQuery = req.params.idOrName
                .toLowerCase()
                .trim()

            const weaponEntries = Object.entries(Weapon).find(
                ([enumNumber, enumValueName]) =>
                    enumNumber === normalizedWeaponQuery ||
                    enumValueName
                        .toString()
                        .toLowerCase()
                        .includes(normalizedWeaponQuery),
            ) as [string, Weapon]

            weaponEntries
                ? res.status(200).json({
                      damage: weaponDamage[
                          weaponEntries[0] as unknown as Weapon
                      ],
                      name: weaponEntries[1],
                  })
                : res.status(404).send({
                      error: 'Weapon not found',
                  })
        })

        // startup server
        const server = app.listen(port, onServerStart)

        process.on('SIGBREAK', (s) => {
            onServerShutdown(server, s)
        })
        process.on('SIGINT', (s) => {
            onServerShutdown(server, s)
        })
        process.on('SIGTERM', (s) => {
            onServerShutdown(server, s)
        })
        // below listener causes crash
        // process.on('SIGKILL', (s) => {
        //     onServerShutdown(server, s)
        // })
    })
    .catch((err) => {
        console.error('Error loading data from disk')
        console.error(err)
        console.error('Exiting...')

        process.exit(1)
    })
