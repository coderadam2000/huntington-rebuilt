# Updates waiting for server access

These items from `2026_11_20_prompt.md` need changes on the **Grapevine server** (accounts, goons, leaderboards,
reports, admin). The server code is not in this repository and was not available, so they are not done yet.
Everything that could be done in the games and the launcher is already live.

When we have access: put the Grapevine repository next to this one (`~/Documents/grapevine`), then work through the
list top to bottom. Each item says what the launcher already has, so nothing is built twice.

---

## 1. Leaderboards for the new games (small, do first)

The launcher already sends these scores. It only waits for the server to list the boards (`feedHasBoard` in
`launcher/js/10-hub/050-goons-feed.js`). To do: add the boards to the server's catalog, then check them in the
Leaderboards tab.

| Board | Value | Game |
|---|---|---|
| `mini:chess-elo`, `mini:checkers-elo` | highest rating | Chess and Checkers |
| `mini:chess-wins`, `mini:checkers-wins` | most wins | Chess and Checkers |
| `zoom:wins` | race wins | Zoom |
| `zoom:trophies` | Grand Prix trophies | Zoom |
| `lumi:linear` | best LINEAR Run | Last Light |

Also: 100 Levels of Spikes already sends a "victor" tag for players who beat all 100 (and all 100 in one life). The
server should keep that tag so victors sort above everyone else at level 100.

## 2. Admin system

- **Admin list.** BobertoDaRoberto, Alexander tomato, BillyBobJonetheTheThirds, Levybowls, Clover; the owner is Adaboy.
  The launcher already colours these names (admins blue, owner yellow) from a list in `launcher/js/10-hub/001-util.js`.
  To do: make the server the source of who is an admin, so it is not only a list in the launcher.
- **See reports and reply to them.** Admins get a reports inbox; a reply reaches the player who reported. (Check what
  exists first: the launcher already shows a note to a player when a report is answered.)
- **Ban players.** The server can already ban an account and all its devices (`launcher/js/10-hub/005-ban.js`). To do:
  let admins ban from the launcher, not only the owner.
- **Paycheck: 25 goons a week** for each admin.
- **Special admin titles** that only admins can wear.

## 3. Weekly goons

If you play on at least 3 of the 7 days in a week, you get 2 goons at the end of the week. The server already counts
play time per day (the Activity chart), so it can check the days and pay out once a week.

## 4. Likes and dislikes on games

A like / dislike on every game, one vote per player per game, with the totals shown on the game cards. The server
stores the votes and the totals.

## 5. More profile pictures

More picture choices in the Profile tab. The pictures themselves live in the server's catalog (with the other shop
items), so new ones are added there.

## 6. Battle Pass

- A new pass every 2 weeks, 10 rewards, costs 10 goons.
- One level every 10 minutes of play (the server already counts play time; the AFK rule still applies).
- Reward order: 1 Title, 2 Frame, 3 Banner, 4 Sidekick, 5 Music, 6 Chat banner, 7 Blocky skin, 8 Blocky avatar,
  9 Picture, 10 15 goons.
- **Season 1: Sports** (fits Sports Mix): Baller title, Baseball frame, Bowling Lane banner, Helmet sidekick, "Batter Up"
  music, Hockey Arena chat banner, USA Colors Blocky skin, Football Player Blocky avatar, Basketball picture, 15 goons.
- Server: passes, purchases, levels, claiming rewards, the catalog items. Launcher: a Battle Pass screen.
  Blocky Shooter: wear the pass skins and avatars.

## 7. Goon Points (one rating for the whole platform)

- An Elo-style rating that games raise on a win and lower on a loss, by how strong the bot or player was.
- One combined number per player, shown in the Leaderboards tab with the ranks Rookie, Contender, Veteran, Elite,
  Master, Grandmaster, Legendary and Unreal (Chess and Checkers already uses these ranks for its own ratings).
- Goons can be spent to boost Goon Points.
- Server: the rating, the checks (a game cannot just send any number), the board, the goon boost. Games: report
  each ranked result (Chess and Checkers, Zoom, Sports Mix, Steel Storm Duel are good first ones).

## 8. Final checks (from the roadmap)

- Everything above works together: Battle Pass, Goon Points, ranks and game progress.
- Menus still fit on small screens with the new tabs and buttons.
- Saves still sync (any new save key needs its prefix in `GAME_KEYS`).
- Database egress stays low (free plan): no reading lists or rows per message or on a timer without caching
  (`bash tools/rig/test.sh gv-egress`).
