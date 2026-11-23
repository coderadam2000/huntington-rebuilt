        // --- GAME BOARD DATA DEFINITIONS ---
        const SPACES_DATA = [
            { id: 0, name: "GO", type: "go", price: 0, group: "special" },
            { id: 1, name: "Mediterranean Ave", type: "property", price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, group: "brown" },
            { id: 2, name: "Community Chest", type: "chest", price: 0, group: "special" },
            { id: 3, name: "Baltic Ave", type: "property", price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, group: "brown" },
            { id: 4, name: "Income Tax", type: "tax", val: 200, group: "special" },
            { id: 5, name: "Reading Railroad", type: "railroad", price: 200, group: "railroad" },
            { id: 6, name: "Oriental Ave", type: "property", price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, group: "light-blue" },
            { id: 7, name: "Chance", type: "chance", price: 0, group: "special" },
            { id: 8, name: "Vermont Ave", type: "property", price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, group: "light-blue" },
            { id: 9, name: "Connecticut Ave", type: "property", price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, group: "light-blue" },
            { id: 10, name: "Jail / Visiting", type: "jail", price: 0, group: "special" },
            { id: 11, name: "St. Charles Place", type: "property", price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, group: "pink" },
            { id: 12, name: "Electric Company", type: "utility", price: 150, group: "utility" },
            { id: 13, name: "States Ave", type: "property", price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, group: "pink" },
            { id: 14, name: "Virginia Ave", type: "property", price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, group: "pink" },
            { id: 15, name: "Pennsylvania Railroad", type: "railroad", price: 200, group: "railroad" },
            { id: 16, name: "St. James Place", type: "property", price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, group: "orange" },
            { id: 17, name: "Community Chest", type: "chest", price: 0, group: "special" },
            { id: 18, name: "Tennessee Ave", type: "property", price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, group: "orange" },
            { id: 19, name: "New York Ave", type: "property", price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, group: "orange" },
            { id: 20, name: "Free Parking", type: "parking", price: 0, group: "special" },
            { id: 21, name: "Kentucky Ave", type: "property", price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, group: "red" },
            { id: 22, name: "Chance", type: "chance", price: 0, group: "special" },
            { id: 23, name: "Indiana Ave", type: "property", price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, group: "red" },
            { id: 24, name: "Illinois Ave", type: "property", price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, group: "red" },
            { id: 25, name: "B. & O. Railroad", type: "railroad", price: 200, group: "railroad" },
            { id: 26, name: "Atlantic Ave", type: "property", price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, group: "yellow" },
            { id: 27, name: "Ventnor Ave", type: "property", price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, group: "yellow" },
            { id: 28, name: "Water Works", type: "utility", price: 150, group: "utility" },
            { id: 29, name: "Marvin Gardens", type: "property", price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, group: "yellow" },
            { id: 30, name: "Go To Jail", type: "gotojail", price: 0, group: "special" },
            { id: 31, name: "Pacific Ave", type: "property", price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, group: "green" },
            { id: 32, name: "North Carolina Ave", type: "property", price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, group: "green" },
            { id: 33, name: "Community Chest", type: "chest", price: 0, group: "special" },
            { id: 34, name: "Pennsylvania Ave", type: "property", price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, group: "green" },
            { id: 35, name: "Short Line Railroad", type: "railroad", price: 200, group: "railroad" },
            { id: 36, name: "Chance", type: "chance", price: 0, group: "special" },
            { id: 37, name: "Park Place", type: "property", price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, group: "dark-blue" },
            { id: 38, name: "Luxury Tax", type: "tax", val: 100, group: "special" },
            { id: 39, name: "Boardwalk", type: "property", price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, group: "dark-blue" }
        ];

        const COLOR_MAP = {
            "brown": "#8B4513",
            "light-blue": "#87CEEB",
            "pink": "#FF69B4",
            "orange": "#FFA500",
            "red": "#FF0000",
            "yellow": "#FFD700",
            "green": "#008000",
            "dark-blue": "#00008B"
        };

        const CHANCE_CARDS = [
            { text: "Advance to GO (Collect $200)", action: p => movePlayerTo(p, 0) },
            { text: "Bank pays you dividend of $50", action: p => addMoney(p, 50) },
            { text: "Go back 3 spaces", action: p => movePlayerRelative(p, -3) },
            { text: "Go directly to Jail", action: p => sendToJail(p) },
            { text: "Pay poor tax of $15", action: p => payMoney(p, 15) },
            { text: "Your building loan matures. Collect $150", action: p => addMoney(p, 150) }
        ];

        const COMMUNITY_CARDS = [
            { text: "Advance to GO (Collect $200)", action: p => movePlayerTo(p, 0) },
            { text: "Doctor's fee. Pay $50", action: p => payMoney(p, 50) },
            { text: "From sale of stock you get $50", action: p => addMoney(p, 50) },
            { text: "Grand Opera Night. Collect $50 from every player", action: p => collectFromAll(p, 50) },
            { text: "Holiday Fund matures. Receive $100", action: p => addMoney(p, 100) },
            { text: "Life insurance matures. Collect $100", action: p => addMoney(p, 100) }
        ];

        // --- GAME STATE VARIABLES ---
        let players = [];
        let currentPlayerIdx = 0;
        let propertyState = {}; // id -> { owner: idx/null, houses: 0 }
        let diceValues = [1, 1];
        let hasRolled = false;
        let doublesCount = 0;
        let selectedCount = 4;
        let gameOver = false;   // set when one player is left: nobody rolls after that
        let gameId = 0;         // a new game makes the old game's pending bot timers do nothing

        // --- CORE GAME ENGINE INITIALIZATION ---
        function initEngine() {
            renderSetupPlayerInputs();
            setupEventListeners();
        }

        function renderSetupPlayerInputs() {
            const container = document.getElementById('player-inputs');
            container.innerHTML = '';
            for (let i = 0; i < selectedCount; i++) {
                const div = document.createElement('div');
                div.className = "flex items-center gap-2";
                div.innerHTML = `
                    <span class="w-6 h-6 rounded-full token-${i} flex items-center justify-center text-xs font-bold text-white shrink-0">${i+1}</span>
                    <input type="text" id="pname-${i}" value="${i === 0 ? 'You' : 'Bot ' + i}" class="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2 flex-1 focus:outline-none focus:border-emerald-500" placeholder="Player Name">
                    <label class="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
                        <input type="checkbox" id="pbot-${i}" ${i > 0 ? 'checked' : ''} class="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"> Bot
                    </label>
                `;
                container.appendChild(div);
            }
        }

        function startNewGame() {
            players = [];
            propertyState = {};
            gameOver = false;
            gameId++;

            // Initialize properties
            SPACES_DATA.forEach(s => {
                propertyState[s.id] = { owner: null, houses: 0 };
            });

            // Read Player Inputs
            for (let i = 0; i < selectedCount; i++) {
                const name = document.getElementById(`pname-${i}`).value.trim() || `Player ${i+1}`;
                const isBot = document.getElementById(`pbot-${i}`).checked;
                players.push({
                    id: i,
                    name: name,
                    isBot: isBot,
                    money: 1500,
                    position: 0,
                    inJail: false,
                    jailTurns: 0,
                    bankrupt: false
                });
            }

            currentPlayerIdx = 0;
            hasRolled = false;
            doublesCount = 0;

            buildBoardGrid();
            updateUI();
            logMessage(`🎮 Game Started with ${players.length} players!`, "emerald");
            
            document.getElementById('setup-modal').classList.add('hidden');
            checkBotTurn();
        }

        // --- BOARD GRID RENDERING ---
        function buildBoardGrid() {
            const board = document.getElementById('board');
            // Remove previous spaces (keep center)
            const spaces = board.querySelectorAll('.space');
            spaces.forEach(s => s.remove());

            // Build spaces in Monopoly order mapping to Grid coordinates
            SPACES_DATA.forEach((s) => {
                const el = document.createElement('div');
                el.className = `space ${getSpaceClass(s.id)}`;
                el.id = `space-${s.id}`;
                el.style.gridArea = getGridArea(s.id);

                // Space Inner HTML Structure
                let content = '';

                if (s.type === 'property') {
                    const color = COLOR_MAP[s.group] || '#ccc';
                    content += `<div class="color-bar" style="background-color: ${color}"></div>`;
                    content += `<div class="p-1 flex-1 flex flex-col justify-between w-full">
                                    <div class="font-bold text-[9px] line-clamp-2 leading-tight">${s.name}</div>
                                    <div class="text-[8px] opacity-75 font-mono">$${s.price}</div>
                                </div>`;
                } else if (s.type === 'railroad') {
                    content += `<div class="p-1 flex-1 flex flex-col items-center justify-between">
                                    <i class="fa-solid fa-train text-slate-700 my-auto text-xs"></i>
                                    <div class="font-bold text-[8px] leading-tight">${s.name}</div>
                                    <div class="text-[8px] font-mono opacity-75">$${s.price}</div>
                                </div>`;
                } else if (s.type === 'utility') {
                    const icon = s.name.includes('Electric') ? 'fa-bolt' : 'fa-droplet';
                    content += `<div class="p-1 flex-1 flex flex-col items-center justify-between">
                                    <i class="fa-solid ${icon} text-amber-600 my-auto text-xs"></i>
                                    <div class="font-bold text-[8px] leading-tight">${s.name}</div>
                                    <div class="text-[8px] font-mono opacity-75">$${s.price}</div>
                                </div>`;
                } else {
                    // Corner & Tax Spaces
                    let icon = 'fa-star';
                    if (s.type === 'go') icon = 'fa-circle-arrow-right text-emerald-600 text-base';
                    if (s.type === 'jail') icon = 'fa-lock text-slate-700';
                    if (s.type === 'parking') icon = 'fa-square-p text-blue-600 text-sm';
                    if (s.type === 'gotojail') icon = 'fa-hand-point-down text-red-600 text-sm';
                    if (s.type === 'tax') icon = 'fa-coins text-amber-600';
                    if (s.type === 'chance') icon = 'fa-question text-amber-600';
                    if (s.type === 'chest') icon = 'fa-box-archive text-blue-600';

                    content += `<div class="p-1 flex-1 flex flex-col items-center justify-center text-center">
                                    <i class="fa-solid ${icon} mb-0.5"></i>
                                    <div class="font-bold text-[8px] leading-tight">${s.name}</div>
                                </div>`;
                }

                // Tokens container for this space
                content += `<div class="tokens-container" id="tokens-${s.id}"></div>`;
                
                // Houses container
                content += `<div class="houses-container absolute bottom-0.5 left-0.5 flex gap-0.5" id="houses-${s.id}"></div>`;

                el.innerHTML = content;
                el.onclick = () => inspectSpace(s.id);
                board.appendChild(el);
            });

            renderTokens();
        }

        function getSpaceClass(id) {
            if (id >= 0 && id <= 10) return 'bottom-row';
            if (id > 10 && id < 20) return 'left-col';
            if (id >= 20 && id <= 30) return 'top-row';
            return 'right-col';
        }

        function getGridArea(id) {
            // Converts 0-39 space id to 11x11 grid row/column area
            if (id >= 0 && id <= 10) {
                return `11 / ${11 - id}`; // Bottom row: right to left
            } else if (id > 10 && id <= 20) {
                return `${11 - (id - 10)} / 1`; // Left column: bottom to top
            } else if (id > 20 && id <= 30) {
                return `1 / ${id - 19}`; // Top row: left to right
            } else {
                return `${id - 29} / 11`; // Right column: top to bottom
            }
        }

        function renderTokens() {
            // Clear tokens from all spaces
            for (let i = 0; i < 40; i++) {
                const c = document.getElementById(`tokens-${i}`);
                if (c) c.innerHTML = '';
            }

            // Draw player tokens
            players.forEach((p) => {
                if (p.bankrupt) return;
                const container = document.getElementById(`tokens-${p.position}`);
                if (container) {
                    const token = document.createElement('div');
                    token.className = `token token-${p.id}`;
                    token.title = p.name;
                    token.innerText = p.id + 1;
                    container.appendChild(token);
                }
            });
        }

        function renderHouses() {
            Object.keys(propertyState).forEach(id => {
                const state = propertyState[id];
                const container = document.getElementById(`houses-${id}`);
                if (!container) return;
                container.innerHTML = '';

                if (state.houses > 0 && state.houses < 5) {
                    for (let h = 0; h < state.houses; h++) {
                        container.innerHTML += `<i class="fa-solid fa-house house-icon"></i>`;
                    }
                } else if (state.houses === 5) {
                    container.innerHTML += `<i class="fa-solid fa-hotel hotel-icon"></i>`;
                }
            });
        }

        // --- GAME PLAY LOGIC & TURNS ---
        function rollDice() {
            if (hasRolled || gameOver) return;

            const p = players[currentPlayerIdx];
            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            diceValues = [d1, d2];
            renderDice(d1, d2);

            const isDouble = d1 === d2;
            logMessage(`${p.name} rolled ${d1} & ${d2} (${d1 + d2})`, "slate");

            if (p.inJail) {
                if (isDouble) {
                    logMessage(`${p.name} rolled doubles and broke out of Jail!`, "emerald");
                    p.inJail = false;
                    p.jailTurns = 0;
                    movePlayer(p, d1 + d2);
                } else {
                    p.jailTurns++;
                    logMessage(`${p.name} failed to roll doubles (${p.jailTurns}/3 turns in Jail).`, "amber");
                    if (p.jailTurns >= 3) {
                        logMessage(`${p.name} must pay $50 bail after 3 failed attempts.`, "red");
                        payMoney(p, 50);
                        p.inJail = false;
                        p.jailTurns = 0;
                        movePlayer(p, d1 + d2);
                    }
                }
                hasRolled = true;
                updateUI();
                return;
            }

            if (isDouble) {
                doublesCount++;
                if (doublesCount === 3) {
                    logMessage(`${p.name} rolled doubles 3 times and was sent to JAIL!`, "red");
                    sendToJail(p);
                    hasRolled = true;
                    updateUI();
                    return;
                }
            } else {
                doublesCount = 0;
            }

            hasRolled = true;
            movePlayer(p, d1 + d2);
            updateUI();
        }

        function movePlayer(player, steps) {
            let oldPos = player.position;
            player.position = (player.position + steps) % 40;

            // Passed GO
            if (player.position < oldPos && !player.inJail) {
                logMessage(`${player.name} passed GO and collected $200!`, "emerald");
                player.money += 200;
            }

            renderTokens();
            handleSpaceAction(player);
        }

        function movePlayerTo(player, targetSpace) {
            if (player.position > targetSpace) {
                logMessage(`${player.name} passed GO and collected $200!`, "emerald");
                player.money += 200;
            }
            player.position = targetSpace;
            renderTokens();
            handleSpaceAction(player);
        }

        function movePlayerRelative(player, offset) {
            player.position = (player.position + offset + 40) % 40;
            renderTokens();
            handleSpaceAction(player);
        }

        function handleSpaceAction(player) {
            const space = SPACES_DATA[player.position];
            const pState = propertyState[space.id];

            inspectSpace(space.id);

            // 1. Unowned Property
            if ((space.type === 'property' || space.type === 'railroad' || space.type === 'utility') && pState.owner === null) {
                logMessage(`${player.name} landed on unowned ${space.name}.`, "blue");
                if (player.isBot) {
                    // Bot AI decision
                    if (player.money >= space.price + 100) {
                        buyProperty(player, space);
                    } else {
                        logMessage(`${player.name} (Bot) decided not to buy ${space.name}.`, "slate");
                    }
                }
                return;
            }

            // 2. Owned Property Rent
            if ((space.type === 'property' || space.type === 'railroad' || space.type === 'utility') && pState.owner !== null && pState.owner !== player.id) {
                const owner = players[pState.owner];
                const rent = calculateRent(space, pState);
                logMessage(`${player.name} landed on ${space.name} owned by ${owner.name}. Rent: $${rent}`, "amber");
                payRent(player, owner, rent);
                return;
            }

            // 3. Special Spaces
            if (space.type === 'gotojail') {
                logMessage(`${player.name} landed on Go To Jail!`, "red");
                sendToJail(player);
            } else if (space.type === 'tax') {
                logMessage(`${player.name} paid ${space.name} of $${space.val}.`, "amber");
                payMoney(player, space.val);
            } else if (space.type === 'chance') {
                const card = CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
                logMessage(`[CHANCE] ${player.name}: "${card.text}"`, "amber");
                card.action(player);
            } else if (space.type === 'chest') {
                const card = COMMUNITY_CARDS[Math.floor(Math.random() * COMMUNITY_CARDS.length)];
                logMessage(`[COMMUNITY CHEST] ${player.name}: "${card.text}"`, "blue");
                card.action(player);
            }
        }

        function calculateRent(space, pState) {
            if (space.type === 'property') {
                if (pState.houses > 0) {
                    return space.rent[pState.houses];
                }
                // Check if owner has full set
                const setProperties = SPACES_DATA.filter(s => s.group === space.group);
                const hasFullSet = setProperties.every(s => propertyState[s.id].owner === pState.owner);
                return hasFullSet ? space.rent[0] * 2 : space.rent[0];
            } else if (space.type === 'railroad') {
                const ownedRR = SPACES_DATA.filter(s => s.type === 'railroad' && propertyState[s.id].owner === pState.owner).length;
                return 25 * Math.pow(2, ownedRR - 1);
            } else if (space.type === 'utility') {
                const ownedUtil = SPACES_DATA.filter(s => s.type === 'utility' && propertyState[s.id].owner === pState.owner).length;
                const rollSum = diceValues[0] + diceValues[1];
                return ownedUtil === 2 ? rollSum * 10 : rollSum * 4;
            }
            return 0;
        }

        function buyProperty(player, space) {
            if (player.money >= space.price) {
                player.money -= space.price;
                propertyState[space.id].owner = player.id;
                logMessage(`${player.name} bought ${space.name} for $${space.price}!`, "emerald");
                updateUI();
            } else {
                if (!player.isBot) showModal("Insufficient Funds", "You do not have enough money to buy this property.");
            }
        }

        function buildHouse(player, space) {
            const pState = propertyState[space.id];
            if (space.type !== 'property') return;

            // Check full color set ownership
            const setProperties = SPACES_DATA.filter(s => s.group === space.group);
            const hasSet = setProperties.every(s => propertyState[s.id].owner === player.id);

            if (!hasSet) {
                if (!player.isBot) showModal("Cannot Build", "You must own all properties in this color group before building!");
                return;
            }

            if (pState.houses >= 5) {
                if (!player.isBot) showModal("Max Built", "This property already has a Hotel!");
                return;
            }

            if (player.money >= space.houseCost) {
                player.money -= space.houseCost;
                pState.houses++;
                logMessage(`${player.name} built a ${pState.houses === 5 ? 'Hotel' : 'House'} on ${space.name}!`, "indigo");
                renderHouses();
                updateUI();
            } else {
                if (!player.isBot) showModal("Insufficient Funds", `You need $${space.houseCost} to build a house here.`);
            }
        }

        function payRent(debtor, creditor, amount) {
            if (debtor.money >= amount) {
                debtor.money -= amount;
                creditor.money += amount;
            } else {
                // Bankruptcy condition
                creditor.money += debtor.money;
                debtor.money = 0;
                handleBankruptcy(debtor);
            }
            updateUI();
        }

        function payMoney(player, amount) {
            if (player.money >= amount) {
                player.money -= amount;
            } else {
                player.money = 0;
                handleBankruptcy(player);
            }
            updateUI();
        }

        function addMoney(player, amount) {
            player.money += amount;
            updateUI();
        }

        function collectFromAll(player, amount) {
            players.forEach(p => {
                if (p.id !== player.id && !p.bankrupt) {
                    payRent(p, player, amount);
                }
            });
        }

        function payBail(player) {
            if (player.inJail && player.money >= 50) {
                player.money -= 50;
                player.inJail = false;
                player.jailTurns = 0;
                logMessage(`${player.name} paid $50 bail and is out of Jail!`, "emerald");
                updateUI();
            }
        }

        function sendToJail(player) {
            player.position = 10;
            player.inJail = true;
            player.jailTurns = 0;
            renderTokens();
            updateUI();
        }

        function handleBankruptcy(player) {
            player.bankrupt = true;
            logMessage(`☠️ ${player.name} went BANKRUPT and is eliminated!`, "red");

            // Release properties
            Object.keys(propertyState).forEach(id => {
                if (propertyState[id].owner === player.id) {
                    propertyState[id].owner = null;
                    propertyState[id].houses = 0;
                }
            });

            renderTokens();
            renderHouses();

            // Check game win condition
            const activePlayers = players.filter(p => !p.bankrupt);
            if (activePlayers.length === 1) {
                gameOver = true;
                showModal("🏆 GAME OVER!", `Winner is ${activePlayers[0].name} with $${activePlayers[0].money}!`);
                logMessage(`🏆 GAME OVER! ${activePlayers[0].name} wins!`, "emerald");
            }
        }

        function endTurn() {
            if (gameOver) { updateUI(); return; }
            if (!hasRolled && !players[currentPlayerIdx].inJail) return;

            // If player rolled doubles, they get another turn (unless in jail)
            const p = players[currentPlayerIdx];
            if (hasRolled && diceValues[0] === diceValues[1] && doublesCount > 0 && !p.inJail && !p.bankrupt) {
                logMessage(`${p.name} gets another turn for rolling doubles!`, "emerald");
                hasRolled = false;
                updateUI();
                checkBotTurn();
                return;
            }

            // Next player index
            hasRolled = false;
            doublesCount = 0;

            do {
                currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
            } while (players[currentPlayerIdx].bankrupt);

            updateUI();
            checkBotTurn();
        }

        function checkBotTurn() {
            const p = players[currentPlayerIdx];
            const id = gameId;
            if (p.isBot && !p.bankrupt && !gameOver) {
                setTimeout(() => {
                    if (id !== gameId || gameOver) return;
                    if (p.inJail && p.money >= 50) {
                        payBail(p);
                    }
                    rollDice();

                    // Automatic house building AI logic
                    setTimeout(() => {
                        if (id !== gameId || gameOver) return;
                        const ownedSetProperties = SPACES_DATA.filter(s => s.type === 'property' && propertyState[s.id].owner === p.id);
                        ownedSetProperties.forEach(s => {
                            if (p.money > 300) buildHouse(p, s);
                        });

                        setTimeout(() => { if (id === gameId) endTurn(); }, 1000);
                    }, 1000);
                }, 800);
            }
        }

        // --- UI & RENDERERS ---
        function updateUI() {
            const cp = players[currentPlayerIdx];

            // Turn Indicator
            const turnInd = document.getElementById('turn-indicator');
            turnInd.innerHTML = `<span class="w-2.5 h-2.5 rounded-full token-${cp.id} animate-pulse"></span> ${cp.name}`;

            // Buttons State
            const isBot = cp.isBot || gameOver;   // (game over: every button stays off until New Game)
            document.getElementById('roll-btn').disabled = hasRolled || isBot;
            document.getElementById('end-turn-btn').disabled = !hasRolled || isBot;

            // Check if standing on buyable space
            const currentSpace = SPACES_DATA[cp.position];
            const pState = propertyState[currentSpace.id];
            const canBuy = hasRolled && (currentSpace.type === 'property' || currentSpace.type === 'railroad' || currentSpace.type === 'utility') && pState.owner === null && cp.money >= currentSpace.price;
            document.getElementById('buy-btn').disabled = !canBuy || isBot;

            // Build House Button State
            const canBuild = (currentSpace.type === 'property') && pState.owner === cp.id;
            document.getElementById('build-btn').disabled = !canBuild || isBot;

            // Jail Pay Button State
            document.getElementById('pay-jail-btn').disabled = !cp.inJail || cp.money < 50 || isBot;

            renderPlayersList();
            renderHouses();
        }

        function renderPlayersList() {
            const list = document.getElementById('players-list');
            list.innerHTML = '';

            players.forEach((p) => {
                const isCurrent = p.id === currentPlayerIdx;
                const card = document.createElement('div');
                card.className = `p-3 rounded-xl border transition ${isCurrent ? 'bg-slate-800 border-emerald-500 shadow-md' : 'bg-slate-900/80 border-slate-800'} ${p.bankrupt ? 'opacity-40 line-through' : ''}`;

                card.innerHTML = `
                    <div class="flex justify-between items-center mb-1">
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full token-${p.id}"></span>
                            <span class="font-bold text-xs ${isCurrent ? 'text-emerald-400' : 'text-slate-200'}">${p.name} ${p.isBot ? '<span class="text-[9px] text-slate-500 font-normal">(Bot)</span>' : ''}</span>
                        </div>
                        <span class="font-extrabold text-sm text-emerald-400 font-mono">$${p.money}</span>
                    </div>
                    <div class="flex justify-between text-[10px] text-slate-400">
                        <span>Space: ${SPACES_DATA[p.position].name}</span>
                        <span>${p.inJail ? '<span class="text-amber-400 font-semibold">In Jail</span>' : ''}</span>
                    </div>
                `;
                list.appendChild(card);
            });
        }

        function renderDice(d1, d2) {
            const dice1 = document.getElementById('dice1');
            const dice2 = document.getElementById('dice2');
            dice1.innerHTML = getDiceDots(d1);
            dice2.innerHTML = getDiceDots(d2);
        }

        function getDiceDots(value) {
            const dotPositions = {
                1: [4],
                2: [0, 8],
                3: [0, 4, 8],
                4: [0, 2, 6, 8],
                5: [0, 2, 4, 6, 8],
                6: [0, 2, 3, 5, 6, 8]
            };
            let html = '';
            for (let i = 0; i < 9; i++) {
                if (dotPositions[value].includes(i)) {
                    html += `<div class="dot"></div>`;
                } else {
                    html += `<div></div>`;
                }
            }
            return html;
        }

        function inspectSpace(id) {
            const space = SPACES_DATA[id];
            const pState = propertyState[id];
            const details = document.getElementById('space-details');
            
            details.classList.remove('hidden');
            document.getElementById('details-title').innerText = space.name;
            document.getElementById('details-price').innerText = space.price ? `$${space.price}` : '';
            
            const colorBar = document.getElementById('details-color');
            colorBar.style.backgroundColor = COLOR_MAP[space.group] || 'transparent';

            const ownerText = pState.owner !== null ? `Owned by ${players[pState.owner].name}` : 'Unowned';
            document.getElementById('details-owner').innerText = ownerText;

            const rentInfo = document.getElementById('details-rent-info');
            if (space.type === 'property') {
                rentInfo.classList.remove('hidden');
                document.getElementById('rent-base').innerText = `$${space.rent[0]}`;
                document.getElementById('rent-set').innerText = `$${space.rent[0] * 2}`;
            } else {
                rentInfo.classList.add('hidden');
            }
        }

        function logMessage(msg, color = "slate") {
            const log = document.getElementById('game-log');
            const entry = document.createElement('div');
            const colors = {
                emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
                blue: "text-blue-400 border-blue-500/20 bg-blue-500/5",
                amber: "text-amber-400 border-amber-500/20 bg-amber-500/5",
                red: "text-red-400 border-red-500/20 bg-red-500/5",
                indigo: "text-indigo-400 border-indigo-500/20 bg-indigo-500/5",
                slate: "text-slate-300 border-slate-800 bg-slate-900/40"
            };
            entry.className = `p-1.5 rounded border text-[11px] leading-tight ${colors[color] || colors.slate}`;
            entry.innerText = msg;
            log.prepend(entry);
        }

        function showModal(title, msg) {
            document.getElementById('modal-title').innerText = title;
            document.getElementById('modal-message').innerText = msg;
            document.getElementById('action-modal').classList.remove('hidden');
        }

        // --- EVENT LISTENERS ---
        function setupEventListeners() {
            document.getElementById('roll-btn').onclick = rollDice;
            document.getElementById('end-turn-btn').onclick = endTurn;

            document.getElementById('buy-btn').onclick = () => {
                const p = players[currentPlayerIdx];
                buyProperty(p, SPACES_DATA[p.position]);
            };

            document.getElementById('build-btn').onclick = () => {
                const p = players[currentPlayerIdx];
                buildHouse(p, SPACES_DATA[p.position]);
            };

            document.getElementById('pay-jail-btn').onclick = () => {
                payBail(players[currentPlayerIdx]);
            };

            document.getElementById('modal-primary-btn').onclick = () => {
                document.getElementById('action-modal').classList.add('hidden');
            };

            document.getElementById('new-game-btn').onclick = () => {
                document.getElementById('setup-modal').classList.remove('hidden');
            };

            document.getElementById('rules-btn').onclick = () => {
                document.getElementById('rules-modal').classList.remove('hidden');
            };

            document.getElementById('close-rules-btn').onclick = () => {
                document.getElementById('rules-modal').classList.add('hidden');
            };

            document.getElementById('clear-log-btn').onclick = () => {
                document.getElementById('game-log').innerHTML = '';
            };

            // Player count setup selector
            document.querySelectorAll('#player-count-selector .count-btn').forEach(btn => {
                btn.onclick = (e) => {
                    document.querySelectorAll('#player-count-selector .count-btn').forEach(b => {
                        b.classList.remove('bg-emerald-600', 'text-white', 'border-emerald-500');
                        b.classList.add('bg-slate-800', 'text-slate-200', 'border-slate-700');
                    });
                    e.target.classList.remove('bg-slate-800', 'text-slate-200', 'border-slate-700');
                    e.target.classList.add('bg-emerald-600', 'text-white', 'border-emerald-500');
                    selectedCount = parseInt(e.target.dataset.count);
                    renderSetupPlayerInputs();
                };
            });

            document.getElementById('start-game-btn').onclick = startNewGame;
        }

        // Initialize engine on window load
        window.onload = () => {
            initEngine();
            renderDice(1, 1);
        };
