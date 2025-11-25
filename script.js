const gridSize = 8;

document.addEventListener('DOMContentLoaded', () => {
    // 禁止遊戲區域觸控滾動
    document.querySelector('.game-container').addEventListener('touchmove', function(e) {
        e.preventDefault();
    }, { passive: false });

    const gameBoard = document.querySelector('.game-board');
    const nextBlockPreview = document.querySelector('.next-block-preview');
    const leftMoves = document.querySelector('.left-moves');
    
    let boardState = [];
    let nextBlock = null;
    let isGameOver = false;
    let level = 1;
    let movesPerLevel = 15;
    let movesLeft = movesPerLevel;
    let isProcessing = false;
    let score = 0;
    let currentComboMultiplier = 1;
    let maxComboRecord = 0;
    let gameMode = 'normal'; // 'normal' 或 'fast'

    // === 主畫面模式選擇 ===
    function setupMainMenu() {
        const normalModeBtn = document.getElementById('normalMode');
        const fastModeBtn = document.getElementById('fastMode');
        
        normalModeBtn.addEventListener('click', () => {
            gameMode = 'normal';
            startGame();
        });
        
        fastModeBtn.addEventListener('click', () => {
            gameMode = 'fast';
            startGame();
        });
    }

    function startGame() {
        // 隱藏主畫面，顯示遊戲畫面
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'flex';
        
        // 根據模式設定初始步數
        if (gameMode === 'normal') {
            movesPerLevel = 15;
        } else if (gameMode === 'fast') {
            movesPerLevel = 12;
        }
        movesLeft = movesPerLevel;
        
        // 初始化遊戲
        init();
    }

    function returnToMainMenu() {
        // 隱藏遊戲畫面，顯示主畫面
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'flex';
        
        // 重置遊戲狀態
        restartGame();
    }

    // === 浮動教學提示框 ===
    function showTutorialTip(text, arrowCol = null) {
        const tip = document.querySelector('.tutorial-tip');
        tip.textContent = text;
        tip.style.display = 'block';
        // 移除舊箭頭
        const oldArrow = document.querySelector('.tutorial-arrow');
        if (oldArrow) oldArrow.remove();
        // 顯示箭頭
        if (arrowCol !== null) {
            const gameBoard = document.querySelector('.game-board');
            const cell = document.querySelector(`.cell[data-row='7'][data-col='${arrowCol}']`);
            if (cell) {
                const arrow = document.createElement('div');
                arrow.className = 'tutorial-arrow';
                arrow.innerHTML = '⬇️';
                const cellRect = cell.getBoundingClientRect();
                const boardRect = gameBoard.getBoundingClientRect();
                arrow.style.left = (cellRect.left - boardRect.left + cellRect.width/2 - 18) + 'px';
                arrow.style.top = (cellRect.top - boardRect.top - 38) + 'px';
                gameBoard.appendChild(arrow);
            }
        }
    }
    function hideTutorialTip() {
        const tip = document.querySelector('.tutorial-tip');
        tip.style.display = 'none';
        const oldArrow = document.querySelector('.tutorial-arrow');
        if (oldArrow) oldArrow.remove();
    }

    // === 新手教學步驟 ===
    let isTutorialMode = false;
    let tutorialStep = 0;
    const interactiveTutorialSteps = [
        {
            action: () => {
                showTutorialTip('歡迎來到數字方塊遊戲！');
                setTimeout(() => nextTutorialStep(), 1200);
            }
        },
        {
            action: () => {
                createBoard();
                initializeBoardState();
                setupEventListeners();
                boardState[7][2] = { type: 'hidden', isBomb: false };
                boardState[7][3] = { type: 'number', number: 2 };
                nextBlock = { type: 'number', number: 3 };
                renderBoard();
                updatePreview();
                showTutorialTip('這是一款益智消除遊戲，現在帶你實際體驗一次消除！');
                setTimeout(() => nextTutorialStep(), 1800);
            }
        },
        {
            action: () => {
                isTutorialMode = true;
                showTutorialTip('請點擊第5欄（灰色方塊右邊），將數字3放下去。', 4);
            }
        },
        {
            action: () => {
                isTutorialMode = false;
                showTutorialTip('因為這一行有3個方塊，剛好等於你剛剛放下的3，所以這三個會一起消除！\n\n消除規則：橫向或縱向連續的方塊數量等於其中任一方塊的數字時，這些方塊會被消除。');
                setTimeout(() => nextTutorialStep(), 2200);
            }
        },
        {
            action: () => {
                hideTutorialTip();
                localStorage.setItem('tutorialSeen', '1');
                restartGame();
            }
        }
    ];
    function nextTutorialStep() {
        tutorialStep++;
        if (tutorialStep < interactiveTutorialSteps.length) {
            interactiveTutorialSteps[tutorialStep].action();
        }
    }
    function showInteractiveTutorial() {
        tutorialStep = 0;
        interactiveTutorialSteps[0].action();
    }
    function tutorialBoardClick(col) {
        if (isTutorialMode && tutorialStep === 2 && col === 4) {
            dropBlock(col);
            setTimeout(() => {
                nextTutorialStep();
            }, 800);
        }
    }

    function generateBottomBlock() {
        const rand = Math.random();
        if (rand < 0.10) { // 10% chance of a revealed bomb
            return { type: 'bomb', isBomb: true, bombState: 'idle' };
        } else if (rand < 0.25) { // 15% chance of a locked block
            return { type: 'locked', isBomb: false };
        } else { // 75% chance of a normal locked block
            return { type: 'locked', isBomb: false };
        }
    }

    function getCellElement(row, col) {
        return document.querySelector(`.cell[data-row='${row}'][data-col='${col}']`);
    }

    function initializeBoardState() {
        console.log('init board', gridSize);
        boardState = [];
        for (let row = 0; row < gridSize; row++) {
            boardState[row] = [];
            for (let col = 0; col < gridSize; col++) {
                boardState[row][col] = null;
            }
        }
    }

    function renderBoard() {
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const cell = getCellElement(r, c);
                const block = boardState[r][c];

                // 強制移除所有動畫相關的 class
                cell.classList.remove('clearing-color');
                cell.classList.remove('bomb-triggered');
                cell.classList.remove('bomb-exploded');

                cell.textContent = '';
                cell.removeAttribute('data-number');
                cell.removeAttribute('data-type');
                cell.style.backgroundImage = '';
                cell.style.visibility = ''; // 重置 visibility

                // 如果格子是 null，確保清除所有 inline styles
                if (!block) {
                    cell.style.opacity = '';
                    cell.style.transform = '';
                }

                if (block) {
                    cell.dataset.type = block.type;
                    
                    if (block.type === 'number' || block.type === 'half-locked') {
                        cell.textContent = block.number;
                        cell.dataset.number = block.number;
                    }
                    if (block.type === 'bomb') {
                        if (block.bombState === 'triggered') {
                            cell.classList.add('bomb-triggered');
                        } else if (block.bombState === 'exploded') {
                            cell.classList.add('bomb-exploded');
                        }
                    }
                }
            }
        }
    }

    function createBoard() {
        const gameBoard = document.querySelector('.game-board');
        gameBoard.innerHTML = '<div class="line-container"></div>';
        for (let i = 0; i < gridSize * gridSize; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = Math.floor(i / gridSize);
            cell.dataset.col = i % gridSize;
            gameBoard.appendChild(cell);
        }
        // 確保 tutorial-tip 存在
        if (!gameBoard.querySelector('.tutorial-tip')) {
            const tip = document.createElement('div');
            tip.className = 'tutorial-tip';
            tip.style.display = 'none';
            gameBoard.appendChild(tip);
        }
    }

    function generateNewBlock() {
        // 讓 next 也會出現所有種類的方塊（與先前本地可行版本一致）
        const rand = Math.random();
        if (rand < 0.10) { // 10%: bomb
            nextBlock = { type: 'bomb', isBomb: true, bombState: 'idle' };
        } else if (rand < 0.20) { // 10%: locked
            nextBlock = { type: 'locked', isBomb: false };
        } else { // 80%: number
        nextBlock = { type: 'number', number: Math.floor(Math.random() * 8) + 1 };
        }
        console.log('Generated new block:', nextBlock);
        updatePreview();
    }

    function updatePreview() {
        if (nextBlock) {
            // 使用與棋盤相同的 data-* 樣式，不使用 emoji
            nextBlockPreview.removeAttribute('data-type');
            nextBlockPreview.removeAttribute('data-number');
            nextBlockPreview.textContent = '';
            if (nextBlock.type === 'number') {
            nextBlockPreview.textContent = nextBlock.number;
            nextBlockPreview.dataset.number = nextBlock.number;
                nextBlockPreview.dataset.type = 'number';
            } else if (nextBlock.type === 'locked') {
                nextBlockPreview.dataset.type = 'locked';
            } else if (nextBlock.type === 'bomb') {
                nextBlockPreview.dataset.type = 'bomb';
            }
            nextBlockPreview.style.visibility = 'visible';
        } else {
            nextBlockPreview.textContent = '';
            nextBlockPreview.removeAttribute('data-number');
            nextBlockPreview.removeAttribute('data-type');
            nextBlockPreview.style.visibility = 'hidden';
        }
    }

    function updateLeftMovesUI() {
        leftMoves.innerHTML = '';
        for (let i = 0; i < movesPerLevel; i++) {
            const dot = document.createElement('div');
            dot.classList.add('timer-dot');
            if (i >= movesLeft) {
                dot.classList.add('inactive');
            }
            leftMoves.appendChild(dot);
        }
    }

    async function dropBlock(col) {
        if (isGameOver || !nextBlock || isProcessing) return;

        isProcessing = true;
        clearHighlights();
        const blockToDrop = { ...nextBlock };
        nextBlock = null;
        updatePreview();

        // combo歸零（邏輯與UI）
        currentComboMultiplier = 0;
        updateComboUI(0);

        // Simplified check: if the column is full for this type of block
        if(boardState[0][col] !== null) {
            console.log(`Column ${col} is full!`);
            // Restore state since the drop failed
            nextBlock = blockToDrop;
            updatePreview();
            isProcessing = false;
            return;
        }

        let landingRow;
        for (let row = gridSize - 1; row >= 0; row--) {
            if (boardState[row][col] === null) {
                landingRow = row;
                break;
            }
        }

        boardState[landingRow][col] = blockToDrop;

        // 先渲染，讓方塊顯示在初始位置
        renderBoard();
        
        // 然後獲取該格子的 DOM 元素，添加 .fall class
        const cell = getCellElement(landingRow, col);
        cell.classList.add('fall');
        
        // 關鍵：等待動畫完成（400ms，與 CSS 動畫時間一致）
        await new Promise(resolve => setTimeout(resolve, 400));

        // 動畫結束後，移除 .fall class
        cell.classList.remove('fall'); 

        // Phase 1: 落地緩衝時間（150ms）
        await new Promise(resolve => setTimeout(resolve, TIME_LANDING)); 

        // 只在所有 combo/消除/爆炸完全結束後才 movesLeft--
        await handleMatches();

        // === movesLeft-- 與加新行的判斷移到這裡 ===
        movesLeft--;
        updateLeftMovesUI();

        if (movesLeft === 0) {
            await advanceLevel();
            await handleMatches(); // Check for matches caused by the new row
        }

        generateNewBlock();
        updatePreview();
        updateLevelUI();

        if (checkGameOver()) {
            isGameOver = true;
            setTimeout(() => showGameOver(), 300);
        }

        isProcessing = false;
        saveGameState();
    }
    
    async function handleMatches() {
        let combo = currentComboMultiplier || 0;
        let maxCombo = combo;
        while (true) {
            let numberMatches = findBlocksToClear();
            const hasTriggeredBomb = hasAnyTriggeredBomb();
            if (numberMatches.size === 0 && !hasTriggeredBomb) {
                break;
            }
            combo++;
            if (combo > maxCombo) maxCombo = combo;
            updateComboUI(combo);
            if (numberMatches.size > 0) {
                await processBlockClearance(numberMatches, combo);
            }
            await processBombExplosions(combo);
        }
        updateComboAfterMatch(maxCombo);
        saveGameState();
    }

    function hasAnyTriggeredBomb() {
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const block = boardState[r][c];
                if (block && block.type === 'bomb' && block.bombState === 'triggered') {
                    return true;
                }
            }
        }
        return false;
    }

    // === 時序常數（嚴格管理遊戲節拍） ===
    const TIME_LANDING = 150;        // 落地緩衝
    const TIME_LASER_SHOW = 300;     // 雷射瞄準停留時間
    const TIME_ANIMATION = 400;      // 消除/爆炸動畫時間
    const TIME_GRAVITY_DELAY = 100;  // 消除後到掉落前的留白

    async function processBlockClearance(numberMatches, combo) {
        // 步驟 1: 計算分數
                numberMatches.forEach(blockString => {
                    const { row, col } = JSON.parse(blockString);
                    const block = boardState[row][col];
            if (block) {
                const baseScore = calculateBaseScore(block);
                const scoreResult = addScore(baseScore, combo);
                showScoreFloat(row, col, scoreResult.finalScore, false, block.type, combo, scoreResult.comment);
            }
        });
        
        // 步驟 2: 播放消除動畫（使用 setTimeout 確保不卡死）
                await animateClearance(numberMatches);
        
        // 步驟 3: 清除數據
        clearBlocksFromState(numberMatches);
        
        // 步驟 4: 【新增】在重繪前，手動將 DOM 隱藏，防止任何 CSS 狀態回彈可見
        numberMatches.forEach(blockString => {
            const { row, col } = JSON.parse(blockString);
            const cell = getCellElement(row, col);
            if (cell) {
                cell.style.visibility = 'hidden';
            }
        });
        
        // 步驟 5: 執行邏輯更新 (觸發炸彈、解鎖等)
        triggerBombsForClearedNumbers(numberMatches);
        await flashUnlocked(numberMatches, combo);
        
        // 步驟 6: 重繪 (renderBoard 會自動重置 visibility，但此時內容已空，所以是安全的)
        renderBoard();
        updateScoreUI();
        
        // 步驟 7: 短暫延遲
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 步驟 8: 執行重力
        applyGravity();
        renderBoard();
        updateScoreUI();
    }

    async function processBombExplosions(combo) {
        let anyBombExploded = false;
        const triggeredBombs = [];
        
        // 先收集所有觸發的炸彈位置
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const block = boardState[r][c];
                if (block && block.type === 'bomb' && block.bombState === 'triggered') {
                    triggeredBombs.push({row: r, col: c});
                    block.bombState = 'exploded';
                    anyBombExploded = true;
                }
            }
        }
        
        if (anyBombExploded) {
            // 在觸發位置立即爆炸，不等待重力
            renderBoard();
            
            // 計算炸彈爆炸範圍
            const bombHitMap = Array.from({length: gridSize}, () => Array(gridSize).fill(0));
            const explodedBombs = [];
            
            // 使用觸發位置進行爆炸計算
            triggeredBombs.forEach(({row, col}) => {
                explodedBombs.push({row, col});
                     const area = getBombArea(row, col);
                        area.forEach(pos => {
                    bombHitMap[pos.row][pos.col]++;
                        });
                    });
            // 計算炸彈爆炸分數
            explodedBombs.forEach(({row, col}) => {
                const baseScore = calculateBaseScore({type: 'bomb'});
                const scoreResult = addScore(baseScore, combo);
                showScoreFloat(row, col, scoreResult.finalScore, false, 'bomb', combo, scoreResult.comment);
            });
            // 處理爆炸後的方塊狀態
            const newMatches = new Set(); // 收集新產生的可消除方塊
            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    let hit = bombHitMap[r][c];
                    let block = boardState[r][c];
                    while (hit > 0 && block) {
                        if (block.type === 'locked') {
                            // 鎖住格子 → 半鎖格子
                            block.type = 'half-locked';
                            if (typeof block.number !== 'number') {
                                block.number = Math.floor(Math.random() * 8) + 1;
                            }
                        } else if (block.type === 'half-locked') {
                            // 半鎖格子 → 數字格子
                            block.type = 'number';
                            if (typeof block.number !== 'number') {
                                block.number = Math.floor(Math.random() * 8) + 1;
                            }
                            // 檢查是否立即符合消除條件
                            const blockString = JSON.stringify({row: r, col: c});
                            if (isBlockEligibleForClearance(r, c)) {
                                newMatches.add(blockString);
                            }
                        } else if (block.type === 'bomb' && block.bombState === 'idle') {
                            block.bombState = 'triggered';
                        }
                        hit--;
                        block = boardState[r][c];
                    }
                }
            }
            
            // 如果有新產生的可消除方塊，先處理它們
            if (newMatches.size > 0) {
                await processBlockClearance(newMatches, combo);
                await new Promise(resolve => setTimeout(resolve, 550)); // 與普通消除相同的延遲
            } else {
                await new Promise(resolve => setTimeout(resolve, 550));
            }
            // 清除爆炸的炸彈
            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    const block = boardState[r][c];
                    if (block && block.type === 'bomb' && block.bombState === 'exploded') {
                        boardState[r][c] = null;
                    }
                }
            }
                applyGravity();
                renderBoard();
            await new Promise(resolve => setTimeout(resolve, 100));
            }
        return anyBombExploded;
        }

    function updateComboAfterMatch(maxCombo) {
        currentComboMultiplier = maxCombo > 0 ? maxCombo : 1;
        if (maxCombo > maxComboRecord) maxComboRecord = maxCombo;
        updateComboUI(currentComboMultiplier);
    }
    
    function findBlocksToClear() {
        const blocksToClear = new Set();
        // 橫向檢查
        for (let r = 0; r < gridSize; r++) {
            let c = 0;
            while (c < gridSize) {
                if (boardState[r][c]) {
                    let start = c;
                    while (c + 1 < gridSize && boardState[r][c + 1]) c++;
                    let end = c;
                    let length = end - start + 1;
                    let segment = [];
                    for (let cc = start; cc <= end; cc++) {
                        const block = boardState[r][cc];
                        segment.push(block ? (block.type + ':' + block.number) : '.');
                        if (block && block.type === 'number' && block.number === length) {
                            blocksToClear.add(JSON.stringify({ row: r, col: cc }));
                            console.log(`[findBlocksToClear] 橫向加入消除: row=${r}, col=${cc}, type=${block.type}, number=${block.number}, 區段長度=${length}`);
                        }
                    }
                    console.log(`row ${r} segment [${start}-${end}] len=${length}:`, segment.join(','));
                    c = end + 1;
                } else {
                    c++;
                }
            }
        }
        // 縱向檢查
        for (let c = 0; c < gridSize; c++) {
            let r = 0;
            while (r < gridSize) {
                if (boardState[r][c]) {
                    let start = r;
                    while (r + 1 < gridSize && boardState[r + 1][c]) r++;
                    let end = r;
                    let length = end - start + 1;
                    let segment = [];
                    for (let rr = start; rr <= end; rr++) {
                        const block = boardState[rr][c];
                        segment.push(block ? (block.type + ':' + block.number) : '.');
                        if (block && block.type === 'number' && block.number === length) {
                            blocksToClear.add(JSON.stringify({ row: rr, col: c }));
                            console.log(`[findBlocksToClear] 縱向加入消除: row=${rr}, col=${c}, type=${block.type}, number=${block.number}, 區段長度=${length}`);
                        }
                    }
                    console.log(`col ${c} segment [${start}-${end}] len=${length}:`, segment.join(','));
                    r = end + 1;
                } else {
                    r++;
                }
            }
        }
        console.log('[findBlocksToClear] blocksToClear:', Array.from(blocksToClear));
        return blocksToClear;
    }

    // 檢查單一方塊是否符合消除條件
    function isBlockEligibleForClearance(row, col) {
        const block = boardState[row][col];
        if (!block || block.type !== 'number') return false;
        
        // 檢查橫向
        let hStart = col, hEnd = col;
        while (hStart > 0 && boardState[row][hStart - 1]) hStart--;
        while (hEnd < gridSize - 1 && boardState[row][hEnd + 1]) hEnd++;
        let hLength = hEnd - hStart + 1;
        if (block.number === hLength) return true;
        
        // 檢查縱向
        let vStart = row, vEnd = row;
        while (vStart > 0 && boardState[vStart - 1][col]) vStart--;
        while (vEnd < gridSize - 1 && boardState[vEnd + 1][col]) vEnd++;
        let vLength = vEnd - vStart + 1;
        if (block.number === vLength) return true;
        
        return false;
    }

    function findAndDetonateBombs(clearedNumberedBlocks) {
        const bombsToDetonate = new Set(); // 要爆炸的炸彈
        const triggerMap = new Map(); // 只記錄數字方塊觸發炸彈
        if (clearedNumberedBlocks.size === 0) return bombsToDetonate;

        // 只記錄數字方塊觸發炸彈，來源必須型態為 number，且來源座標不能等於目標座標
        clearedNumberedBlocks.forEach(blockString => {
            const {row, col} = JSON.parse(blockString);
            if (!boardState[row][col] || boardState[row][col].type !== 'number') return;
            // 檢查同一行的炸彈（向左和向右）
            for (let c = col - 1; c >= 0; c--) {
                const block = boardState[row][c];
                if (!block) break;
                if (block.type === 'bomb' && (col !== c)) {
                    const bombStr = JSON.stringify({row: row, col: c});
                    bombsToDetonate.add(bombStr);
                    triggerMap.set(bombStr, {row: row, col: col});
                    break;
                }
            }
            for (let c = col + 1; c < gridSize; c++) {
                const block = boardState[row][c];
                if (!block) break;
                if (block.type === 'bomb' && (col !== c)) {
                    const bombStr = JSON.stringify({row: row, col: c});
                    bombsToDetonate.add(bombStr);
                    triggerMap.set(bombStr, {row: row, col: col});
                    break;
                }
            }
            // 檢查同一列的炸彈（向上和向下）
            for (let r = row - 1; r >= 0; r--) {
                const block = boardState[r][col];
                if (!block) break;
                if (block.type === 'bomb' && (row !== r)) {
                    const bombStr = JSON.stringify({row: r, col: col});
                    bombsToDetonate.add(bombStr);
                    triggerMap.set(bombStr, {row: row, col: col});
                    break;
                }
            }
            for (let r = row + 1; r < gridSize; r++) {
                const block = boardState[r][col];
                if (!block) break;
                if (block.type === 'bomb' && (row !== r)) {
                    const bombStr = JSON.stringify({row: r, col: col});
                    bombsToDetonate.add(bombStr);
                    triggerMap.set(bombStr, {row: row, col: col});
                    break;
                }
            }
        });

        // 連鎖反應：只加入新炸彈，不記錄 triggerMap
        let newBombsFound = true;
        while (newBombsFound) {
            newBombsFound = false;
            const currentBombs = new Set(bombsToDetonate);
            currentBombs.forEach(bombString => {
                const {row: bombRow, col: bombCol} = JSON.parse(bombString);
                for (let r = bombRow - 1; r <= bombRow + 1; r++) {
                    for (let c = bombCol - 1; c <= bombCol + 1; c++) {
                        if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
                const block = boardState[r][c];
                            if (block && block.type === 'bomb' && (bombRow !== r || bombCol !== c)) {
                                const newBombString = JSON.stringify({row: r, col: c});
                                if (!bombsToDetonate.has(newBombString)) {
                                    bombsToDetonate.add(newBombString);
                                    // 不記錄 triggerMap，這樣動畫只會從數字方塊射到第一波炸彈
                                    newBombsFound = true;
                                }
                            }
                        }
                    }
                }
            });
        }
        bombsToDetonate.triggerMap = triggerMap;
        return bombsToDetonate;
    }

    function getBombArea(row, col) {
        const area = [];
        for (let r = row - 1; r <= row + 1; r++) {
            for (let c = col - 1; c <= col + 1; c++) {
                if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
                    area.push({ row: r, col: c });
                }
            }
        }
        return area;
    }

    async function flashUnlocked(blocksToUnlock, combo) {
        const unlockedBlocks = [];
        
        blocksToUnlock.forEach((blockString) => {
            const { row, col } = JSON.parse(blockString);
            
            // 移除對自身方塊的檢查，直接進行鄰居檢查
            // 我們信任傳入 blocksToUnlock 的座標都是有效的消除點
            
            // 直接檢查四周鄰居
            const deltas = [
                { r: -1, c: 0 },
                { r: 1, c: 0 },
                { r: 0, c: -1 },
                { r: 0, c: 1 }
            ];
            
            deltas.forEach(delta => {
                const nRow = row + delta.r;
                const nCol = col + delta.c;
                
                if (nRow >= 0 && nRow < gridSize && nCol >= 0 && nCol < gridSize) {
                    const neighbor = boardState[nRow][nCol];
                    
                    // 鄰居必須存在 (不能是 null)
                    if (neighbor) {
                        if (neighbor.type === 'locked') {
                            // 鎖住格子 → 半鎖格子（有機率直接變成炸彈）
                            const rand = Math.random();
                            if (rand < 0.05) { // 5% 機率直接變成炸彈
                                neighbor.type = 'bomb';
                                neighbor.isBomb = true;
                                neighbor.bombState = 'idle';
                                neighbor.number = undefined;
                            } else {
                                neighbor.type = 'half-locked';
                                if (typeof neighbor.number !== 'number') {
                                    neighbor.number = Math.floor(Math.random() * 8) + 1;
                                }
                            }
                            unlockedBlocks.push({row: nRow, col: nCol, type: 'locked'});
                        } else if (neighbor.type === 'half-locked') {
                            // 半鎖格子 → 數字格子
                            neighbor.type = 'number';
                            if (typeof neighbor.number !== 'number') {
                                neighbor.number = Math.floor(Math.random() * 8) + 1;
                            }
                            unlockedBlocks.push({row: nRow, col: nCol, type: 'half-locked'});
                        }
                    }
                }
            });
        });
        
        // 計算解鎖分數
        unlockedBlocks.forEach(({row, col, type, number}) => {
            const block = {type, number};
            const baseScore = calculateBaseScore(block);
            const scoreResult = addScore(baseScore, combo);
            showScoreFloat(row, col, scoreResult.finalScore, false, type, combo, scoreResult.comment);
        });
        
        renderBoard();
        updateScoreUI();
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    function clearBlocksFromState(blocksToClear) {
         blocksToClear.forEach((blockString) => {
            const { row, col } = JSON.parse(blockString);
            const block = boardState[row][col];
            if (block && block.type === 'number') {
                console.log(`[clearBlocksFromState] 消除: row=${row}, col=${col}, type=${block.type}, number=${block.number}`);
            boardState[row][col] = null;
            } else {
                console.log(`[clearBlocksFromState] 未消除格子: row=${row}, col=${col}, type=${block ? block.type : 'null'}, number=${block ? block.number : 'null'}`);
            }
            console.log('[clearBlocksFromState] boardState after clear:', JSON.parse(JSON.stringify(boardState)));
        });
    }

    async function advanceLevel() {
        if (checkGameOver(true)) {
            isGameOver = true;
            setTimeout(() => showGameOver(), 100);
            return;
        }

        for (let r = 0; r < gridSize - 1; r++) {
            boardState[r] = boardState[r + 1];
        }

        boardState[gridSize - 1] = [];
        for (let c = 0; c < gridSize; c++) {
            const newBlock = generateBottomBlock();
            boardState[gridSize - 1][c] = newBlock;
            if (newBlock.isBomb) {
                console.log(`A ${newBlock.type === 'bomb' ? 'REVEALED' : 'hidden'} bomb was created at row ${gridSize - 1}, col ${c}`);
            }
        }

        level++;
        // 根據遊戲模式設定步數遞減公式
        if (gameMode === 'normal') {
            movesPerLevel = Math.max(8, 15 - (level - 1));
        } else if (gameMode === 'fast') {
            movesPerLevel = Math.max(6, 12 - (level - 1));
        }
        movesLeft = movesPerLevel;
        
        renderBoard();
        updateLeftMovesUI();
        await new Promise(resolve => setTimeout(resolve, 300));
        saveGameState();
    }

    function checkGameOver(isAddingRow = false) {
        if (isAddingRow) {
            for (let c = 0; c < gridSize; c++) {
                if (boardState[0][c] !== null) {
                    return true;
                }
            }
        }
        return false;
    }

    function applyGravity() {
        for (let c = 0; c < gridSize; c++) {
            let writeRow = gridSize - 1;
            for (let r = gridSize - 1; r >= 0; r--) {
                if (boardState[r][c]) {
                    if (r !== writeRow) {
                        boardState[writeRow][c] = boardState[r][c];
                        boardState[r][c] = null;
                    }
                    writeRow--;
                }
            }
        }
    }

    async function animateClearance(blocks) {
        // 1. 添加動畫 class
        blocks.forEach(blockString => {
            const { row, col } = JSON.parse(blockString);
            const cell = getCellElement(row, col);
            if (cell) {
                cell.classList.add('clearing-color');
            }
        });

        // 2. 強制等待 400ms (與 CSS 一致)
        await new Promise(resolve => setTimeout(resolve, 400));
    }

    function setupEventListeners() {
        const gameBoard = document.querySelector('.game-board');
        // 先移除舊的事件監聽器（避免重複註冊）
        gameBoard.replaceWith(gameBoard.cloneNode(true));
        const newGameBoard = document.querySelector('.game-board');
        newGameBoard.addEventListener('click', (event) => {
            const clickedCell = event.target.closest('.cell');
            if (!clickedCell) return;
            const col = parseInt(clickedCell.dataset.col, 10);
            if (isTutorialMode && typeof tutorialBoardClick === 'function') {
                tutorialBoardClick(col);
            } else if (typeof dropBlock === 'function') {
                dropBlock(col);
            }
        });
        // 新增 hover 效果
        newGameBoard.addEventListener('mouseover', (event) => {
            const hoveredCell = event.target.closest('.cell');
            if (!hoveredCell) return;
            const col = parseInt(hoveredCell.dataset.col, 10);
            highlightColumn(col);
            showDropPreview(col);
        });
        newGameBoard.addEventListener('mouseleave', (event) => {
            clearHighlights();
            clearDropPreview();
        });
        newGameBoard.addEventListener('mousemove', (event) => {
            const hoveredCell = event.target.closest('.cell');
            if (!hoveredCell) return;
            const col = parseInt(hoveredCell.dataset.col, 10);
            highlightColumn(col);
            showDropPreview(col);
        });
    }

    function highlightColumn(col) {
        clearHighlights(); // 先清除所有高亮
        for (let r = 0; r < gridSize; r++) {
            getCellElement(r, col).classList.add('column-highlight');
        }
    }

    function clearHighlights() {
        const highlighted = document.querySelectorAll('.column-highlight');
        highlighted.forEach(cell => cell.classList.remove('column-highlight'));
    }

    function showDropPreview(col) {
        clearDropPreview();
        // 找到該直列最底部空格
        let landingRow = null;
        for (let row = gridSize - 1; row >= 0; row--) {
            if (boardState[row][col] === null) {
                landingRow = row;
                break;
            }
        }
        if (landingRow !== null) {
            getCellElement(landingRow, col).classList.add('drop-preview');
        }
    }

    function clearDropPreview() {
        const previews = document.querySelectorAll('.drop-preview');
        previews.forEach(cell => cell.classList.remove('drop-preview'));
    }

    function init() {
        if (loadGameState()) {
            // 載入狀態後，需要重新建立棋盤和設定事件
            createBoard();
            setupEventListeners();
            renderBoard();
            updatePreview();
            updateLeftMovesUI();
            updateScoreUI();
            updateLevelUI();
            updateComboUI(currentComboMultiplier);
            setupRestartButton();
            setupGamePageRestartButton();
            return;
        }
        createBoard();
        initializeBoardState();
        setupEventListeners();
        generateNewBlock();
        renderBoard();
        updateLeftMovesUI();
        updateScoreUI();
        updateLevelUI();
        updateComboUI(0);
        setupRestartButton();
        setupGamePageRestartButton();
        console.log('Game initialized and ready!');
        saveGameState();
    }

    function updateScoreUI() {
        const scoreDisplay = document.querySelector('.score-display');
        if (scoreDisplay) {
            scoreDisplay.textContent = score;
        }
    }

    function updateLevelUI() {
        const levelDisplay = document.querySelector('.level-display');
        if (levelDisplay) {
            levelDisplay.textContent = `Lv.${level}`;
        }
    }

    function updateComboUI(combo) {
        const comboDisplay = document.querySelector('.combo-display');
        if (comboDisplay) {
            comboDisplay.innerHTML = `<span style="font-size:1.2em;vertical-align:middle;">⛓️</span> x${combo}`;
        }
    }

    function showScoreFloat(row, col, gain, isBomb = false, type = 'number', combo = 1, comment = '') {
        const gameBoard = document.querySelector('.game-board');
        const lineContainer = document.querySelector('.line-container');
        if (!gameBoard || !lineContainer) return;
        const cell = getCellElement(row, col);
        if (!cell) return;
        const float = document.createElement('div');
        float.className = 'score-float';
        float.textContent = (isBomb ? '💣' : '') + `+${gain}`;

        // 根據評語決定顏色與字樣
        if (comment) {
            float.textContent = comment + '\n' + float.textContent;
            
            // 根據評語設定CSS類別
            if (comment === 'nice!') {
            float.classList.add('combo-amazing');
            } else if (comment === 'amazing!') {
                float.classList.add('combo-amazing');
            } else if (comment === 'fantastic!') {
            float.classList.add('combo-fantastic');
            } else if (comment === 'incredible!') {
            float.classList.add('combo-incredible');
            } else if (comment === 'unbelievable!') {
            float.classList.add('combo-unbelievable');
            }
        }

        // 灰底
        float.style.background = 'rgba(40,40,40,0.85)';
        float.style.borderRadius = '8px';
        float.style.padding = '2px 10px';
        float.style.boxShadow = '0 2px 8px #0008';
        float.style.border = '1.5px solid #fff2';
        float.style.fontWeight = 'bold';
        float.style.letterSpacing = '1px';
        float.style.userSelect = 'none';
        // 計算 cell 在 game-board 內的絕對位置
        const boardRect = gameBoard.getBoundingClientRect();
        const cellRect = cell.getBoundingClientRect();
        float.style.position = 'absolute';
        float.style.left = (cellRect.left - boardRect.left + cellRect.width / 2) + 'px';
        float.style.top = (cellRect.top - boardRect.top + cellRect.height / 2) + 'px';
        float.style.transform = 'translate(-50%, -120%)';
        lineContainer.appendChild(float);
        setTimeout(() => {
            float.classList.add('show');
        }, 10);
        setTimeout(() => {
            float.remove();
        }, 900);
    }

    function showGameOver() {
        console.log('showGameOver');
        const modal = document.querySelector('.game-over-modal');
        const scoreDiv = document.querySelector('.final-score');
        const levelDiv = document.querySelector('.final-level');
        const historyScoreDiv = document.querySelector('.history-score');
        const historyLevelDiv = document.querySelector('.history-level');
        if (modal && scoreDiv && levelDiv && historyScoreDiv && historyLevelDiv) {
            const modeText = gameMode === 'normal' ? '普通模式' : '快速模式';
            scoreDiv.textContent = `${modeText} - 分數：${score}`;
            levelDiv.textContent = `關卡：${level}`;
            setHistoryRecord(score, level);
            const history = getHistoryRecord();
            historyScoreDiv.textContent = `${modeText}最高分：${history.score}`;
            historyLevelDiv.textContent = `${modeText}最高關卡：${history.level}`;
            modal.style.display = 'flex';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            setupRestartButton(); // Set up the restart button when modal is shown
            disableGamePageRestartButton(); // Disable game page restart button
        }
    }

    function hideGameOver() {
        const modal = document.querySelector('.game-over-modal');
        if (modal) modal.style.display = 'none';
        enableGamePageRestartButton(); // 遊戲結束時啟用主畫面 restart-btn
    }

    function setupRestartButton() {
        // 綁定結算畫面內的 restart-btn
        const modal = document.querySelector('.game-over-modal');
        if (modal) {
            const modalBtn = modal.querySelector('.restart-btn');
            if (modalBtn) {
                modalBtn.onclick = () => {
                hideGameOver();
                    returnToMainMenu();
                };
            }
        }
        
        // 綁定主畫面的 restart-btn
        const mainRestartBtn = document.querySelector('.level-row .restart-btn');
        if (mainRestartBtn) {
            mainRestartBtn.onclick = () => {
                returnToMainMenu();
            };
        }
    }

    function setupGamePageRestartButton() {
        // 綁定主畫面的 restart-btn
        const gamePageBtn = document.querySelector('.level-row .restart-btn');
        if (gamePageBtn) {
            gamePageBtn.onclick = () => {
                restartGame();
            };
        }
    }

    function disableGamePageRestartButton() {
        const gamePageBtn = document.querySelector('.level-row .restart-btn');
        if (gamePageBtn) {
            gamePageBtn.disabled = true;
            gamePageBtn.style.opacity = '0.5';
            gamePageBtn.style.cursor = 'not-allowed';
        }
    }

    function enableGamePageRestartButton() {
        const gamePageBtn = document.querySelector('.level-row .restart-btn');
        if (gamePageBtn) {
            gamePageBtn.disabled = false;
            gamePageBtn.style.opacity = '1';
            gamePageBtn.style.cursor = 'pointer';
        }
    }

    function restartGame() {
        // 重設所有狀態
        score = 0;
        level = 1;
        // 依據目前模式設定初始步數（避免兩模式都變 15 步）
        movesPerLevel = (gameMode === 'fast') ? 12 : 15;
        movesLeft = movesPerLevel;
        isGameOver = false;
        maxComboRecord = 0;
        boardState = [];
        nextBlock = null;
        currentComboMultiplier = 1;
        document.querySelector('.game-board').innerHTML = '<div class="line-container"></div>';
        createBoard();
        initializeBoardState();
        setupEventListeners();
        generateNewBlock();
        renderBoard();
        updateLeftMovesUI();
        updateScoreUI();
        updateLevelUI();
        updateComboUI(0);
        saveGameState();
        enableGamePageRestartButton(); // 遊戲結束時啟用主畫面 restart-btn
    }

    function saveGameState() {
        const state = {
            boardState,
            nextBlock,
            isGameOver,
            level,
            movesPerLevel,
            movesLeft,
            score,
            currentComboMultiplier,
            maxComboRecord,
            gameMode
        };
        localStorage.setItem(`numberGameSave_${gameMode}`, JSON.stringify(state));
    }

    function loadGameState() {
        const data = localStorage.getItem(`numberGameSave_${gameMode}`);
        if (!data) return false;
        try {
            const state = JSON.parse(data);
            // 檢查必要欄位
            if (!state || !Array.isArray(state.boardState) || !state.boardState.length) {
                localStorage.removeItem(`numberGameSave_${gameMode}`);
                return false;
            }
            boardState = state.boardState;
            nextBlock = state.nextBlock;
            isGameOver = state.isGameOver;
            level = state.level;
            movesPerLevel = state.movesPerLevel;
            movesLeft = state.movesLeft;
            score = state.score;
            currentComboMultiplier = state.currentComboMultiplier;
            maxComboRecord = state.maxComboRecord;
            // 確保遊戲模式一致
            if (state.gameMode && state.gameMode !== gameMode) {
                return false;
            }
            return true;
        } catch (e) {
            localStorage.removeItem(`numberGameSave_${gameMode}`);
            return false;
        }
    }

    function clearStorage() { 
        localStorage.removeItem(`numberGameSave_${gameMode}`); 
        localStorage.removeItem(`numberGameHistory_${gameMode}`);
    }

    function triggerBombsForClearedNumbers(blocksToClear) {
        blocksToClear.forEach((blockString) => {
            const { row, col } = JSON.parse(blockString);
            // 橫向
            let hStart = col, hEnd = col;
            while (hStart > 0 && boardState[row][hStart - 1]) hStart--;
            while (hEnd < gridSize - 1 && boardState[row][hEnd + 1]) hEnd++;
            for (let cc = hStart; cc <= hEnd; cc++) {
                const b = boardState[row][cc];
                if (b && b.type === 'bomb' && b.bombState === 'idle') {
                    b.bombState = 'triggered';
                }
            }
            // 縱向
            let vStart = row, vEnd = row;
            while (vStart > 0 && boardState[vStart - 1][col]) vStart--;
            while (vEnd < gridSize - 1 && boardState[vEnd + 1][col]) vEnd++;
            for (let rr = vStart; rr <= vEnd; rr++) {
                const b = boardState[rr][col];
                if (b && b.type === 'bomb' && b.bombState === 'idle') {
                    b.bombState = 'triggered';
                }
            }
        });
    }

    // === 計分系統常數 ===
    const SCORE_CONSTANTS = {
        // 基礎分數
        NUMBER_BLOCK_BASE: 20,  // 數字格子基礎分數
        LOCKED_BLOCK: 200,      // 鎖住格子分數
        HALF_LOCKED_BLOCK: 80,  // 半鎖格子分數
        BOMB_BLOCK: 100,        // 炸彈格子分數
        
        // 評語門檻
        NICE_THRESHOLD: 500,
        AMAZING_THRESHOLD: 1000,
        FANTASTIC_THRESHOLD: 3000,
        INCREDIBLE_THRESHOLD: 6000,
        UNBELIEVABLE_THRESHOLD: 10000
    };

    // === 計分系統函數 ===
    function calculateBaseScore(block) {
        if (!block) return 0;
        
        switch (block.type) {
            case 'number':
                return block.number * SCORE_CONSTANTS.NUMBER_BLOCK_BASE;
            case 'locked':
                return SCORE_CONSTANTS.LOCKED_BLOCK;
            case 'half-locked':
                return SCORE_CONSTANTS.HALF_LOCKED_BLOCK;
            case 'bomb':
                return SCORE_CONSTANTS.BOMB_BLOCK;
            default:
                return 0;
        }
    }

    function calculateComboMultiplier(combo) {
        if (combo <= 1) return 1;
        return combo * combo; // combo²
    }

    function getScoreComment(score) {
        if (score < SCORE_CONSTANTS.NICE_THRESHOLD) {
            return '';
        } else if (score < SCORE_CONSTANTS.AMAZING_THRESHOLD) {
            return 'nice!';
        } else if (score < SCORE_CONSTANTS.FANTASTIC_THRESHOLD) {
            return 'amazing!';
        } else if (score < SCORE_CONSTANTS.INCREDIBLE_THRESHOLD) {
            return 'fantastic!';
        } else if (score < SCORE_CONSTANTS.UNBELIEVABLE_THRESHOLD) {
            return 'incredible!';
        } else {
            return 'unbelievable!';
        }
    }

    function addScore(baseScore, combo = 1) {
        const comboMultiplier = calculateComboMultiplier(combo);
        const finalScore = baseScore * comboMultiplier;
        score += finalScore;
        
        console.log(`[計分] 基礎分數: ${baseScore}, Combo: ${combo}, 倍數: ${comboMultiplier}, 最終分數: ${finalScore}, 總分: ${score}`);
        
        return {
            baseScore,
            comboMultiplier,
            finalScore,
            comment: getScoreComment(finalScore)
        };
    }

    // 最高分與最高關卡紀錄（分模式記錄）
    function getHistoryRecord() {
        const data = localStorage.getItem(`numberGameHistory_${gameMode}`);
        if (!data) return { score: 0, level: 1 };
        try {
            return JSON.parse(data);
        } catch {
            return { score: 0, level: 1 };
        }
    }
    function setHistoryRecord(score, level) {
        const old = getHistoryRecord();
        if (score > old.score || (score === old.score && level > old.level)) {
            localStorage.setItem(`numberGameHistory_${gameMode}`, JSON.stringify({ score, level }));
        }
    }

    // === 自動更新檢查 ===
    function checkForUpdates() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(registration => {
                if (registration) {
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // 有新版本可用，提示用戶更新
                                showUpdateNotification();
                            }
                        });
                    });
                }
            });
        }
    }

    function showUpdateNotification() {
        // 創建更新提示
        const updateDiv = document.createElement('div');
        updateDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #F9A03F;
            color: #23272f;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
            user-select: none;
        `;
        updateDiv.textContent = '有新版本可用！點擊更新';
        updateDiv.onclick = () => {
            // 重新載入頁面以使用新版本
            window.location.reload();
        };
        document.body.appendChild(updateDiv);
        
        // 3秒後自動消失
        setTimeout(() => {
            if (updateDiv.parentNode) {
                updateDiv.parentNode.removeChild(updateDiv);
            }
        }, 3000);
    }

    // === 主初始化 ===
    setupMainMenu();
    checkForUpdates();
}); 