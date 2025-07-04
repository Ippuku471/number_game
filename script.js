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
        if (rand < 0.05) { // 5% chance of a revealed bomb
            return { type: 'bomb', isBomb: true, bombState: 'idle' };
        } else if (rand < 0.20) { // 15% chance of a hidden bomb
            return { type: 'hidden', isBomb: true };
        } else { // 80% chance of a normal hidden block
            return { type: 'hidden', isBomb: false };
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

                cell.textContent = '';
                cell.removeAttribute('data-number');
                cell.removeAttribute('data-type');
                cell.classList.remove('bomb-triggered');
                cell.classList.remove('bomb-exploded');
                cell.style.backgroundImage = '';

                if (block) {
                    const displayType = (block.type === 'hidden' && block.isBomb) ? 'hidden' : block.type;
                    cell.dataset.type = displayType;
                    
                    if (block.type === 'number' || block.type === 'striped') {
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
        nextBlock = { type: 'number', number: Math.floor(Math.random() * 8) + 1 };
        console.log('Generated new block:', nextBlock);
        updatePreview();
    }

    function updatePreview() {
        if (nextBlock) {
            nextBlockPreview.textContent = nextBlock.number;
            nextBlockPreview.dataset.number = nextBlock.number;
            nextBlockPreview.style.visibility = 'visible';
        } else {
            nextBlockPreview.textContent = '';
            nextBlockPreview.removeAttribute('data-number');
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

        // 清空 combo 顯示
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

        const cell = getCellElement(landingRow, col);
        cell.classList.add('fall');
        cell.addEventListener('animationend', () => cell.classList.remove('fall'), { once: true });
        
        renderBoard();
        // Wait for fall animation to be roughly complete
        await new Promise(resolve => setTimeout(resolve, 500)); 

        // Add a slight pause after landing before checking for matches
        await new Promise(resolve => setTimeout(resolve, 100)); 

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
        let chainCount = 0;
        let maxCombo = 0;
        while (true) {
            chainCount++;
            if (chainCount > maxCombo) maxCombo = chainCount;
            updateComboUI(chainCount);
            let numberMatches = findBlocksToClear();
            if (numberMatches.size === 0) {
                break;
            }
            if (numberMatches.size > 0) {
                let comboMultiplier = chainCount;
                numberMatches.forEach(blockString => {
                    const { row, col } = JSON.parse(blockString);
                    const block = boardState[row][col];
                    if (block && block.type === 'number') {
                        let base = block.number * 40;
                        let finalScore = base * comboMultiplier;
                        score += finalScore;
                        showScoreFloat(row, col, finalScore, false, 'number', comboMultiplier);
                    }
                });
                await animateClearance(numberMatches);
                triggerBombsForClearedNumbers(numberMatches); // 先觸發炸彈
                await flashUnlocked(numberMatches); // 再解鎖
                clearBlocksFromState(numberMatches); // 最後消除
                applyGravity();
                renderBoard();
                updateScoreUI();
                await new Promise(resolve => setTimeout(resolve, 350));
            }
            // 2. 爆炸所有 triggered 的炸彈
            let anyBombExploded = false;
            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    const block = boardState[r][c];
                    if (block && block.type === 'bomb' && block.bombState === 'triggered') {
                        block.bombState = 'exploded';
                        anyBombExploded = true;
                    }
                }
            }
            renderBoard();
            if (anyBombExploded) {
                // 處理爆炸範圍
                const bombHitMap = Array.from({length: gridSize}, () => Array(gridSize).fill(0));
                for (let r = 0; r < gridSize; r++) {
                    for (let c = 0; c < gridSize; c++) {
                        const block = boardState[r][c];
                        if (block && block.type === 'bomb' && block.bombState === 'exploded') {
                            const area = getBombArea(r, c);
                            area.forEach(pos => {
                                bombHitMap[pos.row][pos.col]++;
                            });
                        }
                    }
                }
                for (let r = 0; r < gridSize; r++) {
                    for (let c = 0; c < gridSize; c++) {
                        let hit = bombHitMap[r][c];
                        let block = boardState[r][c];
                        while (hit > 0 && block) {
                            if (block.type === 'hidden') {
                                if (block.isBomb) {
                                    block.type = 'bomb';
                                    block.bombState = 'idle';
                                } else {
                                    block.type = 'striped';
                                    if (typeof block.number !== 'number') {
                                        block.number = Math.floor(Math.random() * 8) + 1;
                                    }
                                }
                            } else if (block.type === 'striped') {
                                block.type = 'number';
                                if (typeof block.number !== 'number') {
                                    block.number = Math.floor(Math.random() * 8) + 1;
                                }
                            } else if (block.type === 'bomb' && block.bombState === 'idle') {
                                block.bombState = 'triggered';
                            }
                            hit--;
                            block = boardState[r][c];
                        }
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 300));
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
        }
        currentComboMultiplier = maxCombo > 0 ? maxCombo : 1;
        if (maxCombo > maxComboRecord) maxComboRecord = maxCombo;
        updateComboUI(currentComboMultiplier);
        saveGameState();
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

    async function flashUnlocked(blocksToUnlock) {
        blocksToUnlock.forEach((blockString) => {
            const { row, col } = JSON.parse(blockString);
            const block = boardState[row][col];
            if (!block) return;
            if (block.type === 'number') {
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
                        if (neighbor && neighbor.type === 'hidden') {
                            if (neighbor.isBomb) {
                                neighbor.type = 'bomb';
                                neighbor.bombState = 'idle';
                            } else {
                                neighbor.type = 'striped';
                                if (typeof neighbor.number !== 'number') {
                                    neighbor.number = Math.floor(Math.random() * 8) + 1;
                                }
                            }
                        } else if (neighbor && neighbor.type === 'striped') {
                            neighbor.type = 'number';
                            if (typeof neighbor.number !== 'number') {
                                neighbor.number = Math.floor(Math.random() * 8) + 1;
                            }
                        }
                    }
                });
            }
        });
        renderBoard();
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
                // debug log
                if (block) {
                    console.log(`[clearBlocksFromState] 未消除格子: row=${row}, col=${col}, type=${block.type}, number=${block.number}`);
                } else {
                    console.log(`[clearBlocksFromState] 未消除格子: row=${row}, col=${col}, block=null`);
                }
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
        movesPerLevel = Math.max(8, 15 - (level - 1) * 2);
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
        const promises = [];
        blocks.forEach(blockString => {
            const { row, col } = JSON.parse(blockString);
            const cell = getCellElement(row, col);
            const block = boardState[row][col];

            if (cell && block) {
                cell.textContent = ''; // 動畫一開始就清空數字
                const animationClass = (block.type === 'number') ? 'clearing-color' : 'clearing-special';
                cell.classList.add(animationClass);
                promises.push(new Promise(resolve => {
                    cell.addEventListener('animationend', () => {
                        cell.classList.remove(animationClass);
                        resolve();
                    }, { once: true });
                }));
            }
        });
        await Promise.all(promises);
        await new Promise(resolve => setTimeout(resolve, 300)); // 統一延遲 300ms
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

    function showScoreFloat(row, col, gain, isBomb = false, type = 'number', combo = 1) {
        const gameBoard = document.querySelector('.game-board');
        const lineContainer = document.querySelector('.line-container');
        if (!gameBoard || !lineContainer) return;
        const cell = getCellElement(row, col);
        if (!cell) return;
        const float = document.createElement('div');
        float.className = 'score-float';
        float.textContent = (isBomb ? '💣' : '') + `+${gain}`;

        // 根據 combo 數決定顏色與字樣
        if (combo >= 2 && combo <= 3) {
            float.classList.add('combo-amazing');
            float.textContent = 'amazing!\n' + float.textContent;
        } else if (combo >= 4 && combo <= 5) {
            float.classList.add('combo-fantastic');
            float.textContent = 'fantastic!\n' + float.textContent;
        } else if (combo >= 6 && combo <= 7) {
            float.classList.add('combo-incredible');
            float.textContent = 'incredible!\n' + float.textContent;
        } else if (combo >= 8) {
            float.classList.add('combo-unbelievable');
            float.textContent = 'unbelievable!\n' + float.textContent;
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
        const modal = document.querySelector('.game-over-modal');
        const scoreDiv = document.querySelector('.final-score');
        const comboDiv = document.querySelector('.final-combo');
        if (modal && scoreDiv && comboDiv) {
            scoreDiv.textContent = `分數：${score}`;
            comboDiv.textContent = `最大Combo：${maxComboRecord}`;
            modal.style.display = 'flex';
        }
    }

    function hideGameOver() {
        const modal = document.querySelector('.game-over-modal');
        if (modal) modal.style.display = 'none';
    }

    function setupRestartButton() {
        const btn = document.querySelector('.restart-btn');
        if (btn) {
            btn.onclick = () => {
                hideGameOver();
                restartGame();
            };
        }
    }

    function restartGame() {
        // 重設所有狀態
        score = 0;
        level = 1;
        movesPerLevel = 15;
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
            maxComboRecord
        };
        localStorage.setItem('numberGameSave', JSON.stringify(state));
    }

    function loadGameState() {
        const data = localStorage.getItem('numberGameSave');
        if (!data) return false;
        try {
            const state = JSON.parse(data);
            // 檢查必要欄位
            if (!state || !Array.isArray(state.boardState) || !state.boardState.length) {
                localStorage.removeItem('numberGameSave');
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
            return true;
        } catch (e) {
            localStorage.removeItem('numberGameSave');
            return false;
        }
    }

    function clearStorage() { localStorage.removeItem('numberGameSave'); }

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

    // === 主初始化 ===
    init();
}); 