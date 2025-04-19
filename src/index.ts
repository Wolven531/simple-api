import express, { Request, Response } from 'express'
import { Weapon } from './enums'
import { BossService } from './services/BossService'
import { PlayerService } from './services/PlayerService'

const bossService = BossService()
const playerService = PlayerService()

const app = express()
const port = 3000

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

Promise.all([bossService.load(), playerService.load()]).then(() => {})

app.get('/', (req: Request, res: Response) => {
    res.status(200)
        .contentType('text/html')
        .send(
            `<!DOCTYPE html>
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
                <li>GET <code>/attack/:name/:player</code> - Attack a boss</li>
            </ul>
            <h2>Player</h2>
            <ul>
                <li>GET <a href="/player">/player</a> - Get all players</li>
                <li>GET <code>/player/:name</code> - Get player by name
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
                <li>GET <code>/weapon/:weaponId</code> Get weapon
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
                                    }</a> (${
                                        weaponDamage[val as Weapon]
                                    })</li>`,
                            )
                            .join('')}
                    </ul>
                </li>
            </ul>
        </body>
    </html>`,
        )
})

// TODO - convert to POST
// TODO - grab player info from headers
app.get('/attack/:name/:player', async (req: Request, res: Response) => {
    const bossName = String(req.params.name).toLowerCase()

    const p = await playerService.search(req.params.player)
    const boss = bossService.statuses[bossName]

    if (!boss) {
        res.status(400).json({ error: 'Boss not found' })
        return
    }

    if (!p) {
        res.status(400).json({ error: 'Player not found' })
        return
    }

    const attackErr = await bossService.attack(
        bossName,
        p,
        weaponDamage[p.selectedWeapon],
    )

    if (attackErr) {
        res.status(400).json(attackErr)
        return
    }

    res.status(201).json(bossService.statuses[bossName])
})

app.get('/boss', (req: Request, res: Response) => {
    res.status(200).json(bossService.statuses)
})

app.get('/boss/:name', (req: Request, res: Response) => {
    const normalizedQuery = String(req.params.name).toLowerCase().trim()
    const boss = bossService.statuses[normalizedQuery]

    boss
        ? res.status(200).json(boss)
        : res.status(404).send({ error: 'Boss not found' })
})

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
    const player = await playerService.search(req.params.idOrName)

    player
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

    const isValidWeapon = Object.values(Weapon).includes(selectedWeapon)
    const existingPlayer = await playerService.search(name)

    if (!isValidWeapon || existingPlayer) {
        res.status(400).json({ error: 'Bad player data' })
        return
    }

    playerService.add(name, selectedWeapon)

    res.status(201).json(playerService.search(name))
})

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
    const normalizedQuery = req.params.idOrName.toLowerCase().trim()

    const weaponEntries = Object.entries(Weapon).find(
        ([enumNumber, enumValueName]) =>
            enumNumber === normalizedQuery ||
            enumValueName.toString().toLowerCase() === normalizedQuery,
    ) as [string, Weapon]

    weaponEntries
        ? res.status(200).json({
              damage: weaponDamage[weaponEntries[0] as unknown as Weapon],
              name: weaponEntries[1],
          })
        : res.status(404).send({
              error: 'Weapon not found',
          })
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})
