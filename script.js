const gridSize = 8;

document.addEventListener('DOMContentLoaded', () => {
    // 禁止遊戲區域觸控滾動
    document.querySelector('.game-container').addEventListener('touchmove', function(e) {
        e.preventDefault();
    }, { passive: false });

    const gameBoard = document.querySelector('.game-board');
    const nextBlockPreview = document.querySelector('.next-block-preview');
    const levelTimer = document.querySelector('.level-timer');
    
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
                boardState[7][2] = { type: 'grey', isBomb: false };
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

    function createBottomBlock() {
        const rand = Math.random();
        if (rand < 0.05) { // 5% chance of a revealed bomb
            return { type: 'bomb', isBomb: true };
        } else if (rand < 0.20) { // 15% chance of a hidden bomb
            return { type: 'grey', isBomb: true };
        } else { // 80% chance of a normal grey block
            return { type: 'grey', isBomb: false };
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
                cell.style.backgroundImage = '';

                if (block) {
                    const displayType = (block.type === 'grey' && block.isBomb) ? 'grey' : block.type;
                    cell.dataset.type = displayType;
                    
                    if (block.type === 'number' || block.type === 'striped') {
                        cell.textContent = block.number;
                        cell.dataset.number = block.number;
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

    function updateTimerUI() {
        levelTimer.innerHTML = '';
        for (let i = 0; i < movesPerLevel; i++) {
            const dot = document.createElement('div');
            dot.classList.add('timer-dot');
            if (i >= movesLeft) {
                dot.classList.add('inactive');
            }
            levelTimer.appendChild(dot);
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

        await handleMatches();

        movesLeft--;
        updateTimerUI();

        if (movesLeft === 0) {
            await addNewRow();
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
        console.log("--- Starting Match Handling ---");
        let chainReaction = true;
        let chainCount = 0;
        let maxCombo = 0;
        while (chainReaction) {
            chainReaction = false;
            chainCount++;
            if (chainCount > maxCombo) maxCombo = chainCount;
            // 即時更新 combo UI
            updateComboUI(chainCount);
            const numberMatches = findBlocksToClear();
            if (numberMatches.size > 0) {
                chainReaction = true;
                // 本輪 combo 倍數
                let comboMultiplier = chainCount;
                // 計分：普通消除
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
                let bombsToDetonate = findAndDetonateBombs(numberMatches);
                const allBombsInChain = new Set();
                while (bombsToDetonate.size > 0) {
                    bombsToDetonate.forEach(bombString => {
                        const { row, col } = JSON.parse(bombString);
                        const area = getBombArea(row, col);
                        area.forEach(pos => {
                            const b = boardState[pos.row][pos.col];
                            if (b && b.type === 'number') {
                                let base = b.number * 40;
                                let finalScore = base * comboMultiplier;
                                score += finalScore;
                                showScoreFloat(pos.row, pos.col, finalScore, false, 'number', comboMultiplier);
                            } else if (b && b.type === 'striped') {
                                let newNum = Math.floor(Math.random() * 8) + 1;
                                let base = newNum * 40;
                                let finalScore = base * comboMultiplier;
                                score += finalScore;
                                showScoreFloat(pos.row, pos.col, finalScore, false, 'striped', comboMultiplier);
                            } else if (b && b.type === 'grey') {
                                let newNum = Math.floor(Math.random() * 8) + 1;
                                let base = newNum * 40;
                                let finalScore = base * comboMultiplier;
                                score += finalScore;
                                showScoreFloat(pos.row, pos.col, finalScore, false, 'grey', comboMultiplier);
                            }
                        });
                    });
                    await animateLaserToBombs(numberMatches, bombsToDetonate);
                    const currentDetonationWave = new Set(bombsToDetonate);
                    bombsToDetonate.clear();
                    currentDetonationWave.forEach(bombStr => allBombsInChain.add(bombStr));
                    const newlyTriggeredNeighbors = findNeighbors(currentDetonationWave);
                    newlyTriggeredNeighbors.forEach(neighborStr => {
                        const {row, col} = JSON.parse(neighborStr);
                        const block = boardState[row][col];
                        if (block && block.type === 'bomb' && !allBombsInChain.has(neighborStr)) {
                            bombsToDetonate.add(neighborStr);
                        }
                    });
                }
                const allClearedPositions = new Set([...numberMatches, ...allBombsInChain]);
                const neighborsToUnlock = findNeighbors(allClearedPositions);
                allBombsInChain.forEach(bombStr => {
                     const { row, col } = JSON.parse(bombStr);
                     const area = getBombArea(row, col);
                     area.forEach(pos => neighborsToUnlock.add(JSON.stringify(pos)));
                });
                clearBlocksFromState(allClearedPositions);
                await flashUnlocked(neighborsToUnlock);
                applyGravity();
                renderBoard();
                updateScoreUI();
                await new Promise(resolve => setTimeout(resolve, 400));
            }
        }
        currentComboMultiplier = maxCombo > 0 ? maxCombo : 1;
        if (maxCombo > maxComboRecord) maxComboRecord = maxCombo;
        updateComboUI(currentComboMultiplier);
        console.log("--- Finished Match Handling ---");
        saveGameState();
    }
    
    function findNeighbors(clearedBlocks) {
        const neighbors = new Set();
        clearedBlocks.forEach((blockString) => {
            const { row, col } = JSON.parse(blockString);
            const deltas = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }];
            deltas.forEach(delta => {
                const nRow = row + delta.r;
                const nCol = col + delta.c;
                if (nRow >= 0 && nRow < gridSize && nCol >= 0 && nCol < gridSize && boardState[nRow][nCol]) {
                    const neighborPos = { row: nRow, col: nCol };
                    neighbors.add(JSON.stringify(neighborPos));
                }
            });
        });
        return neighbors;
    }

    function findAndDetonateBombs(clearedNumberedBlocks) {
        const bombsToDetonate = new Set(); // Use a set of strings to avoid duplicates
        if (clearedNumberedBlocks.size === 0) return bombsToDetonate;

        const clearedRows = new Set();
        const clearedCols = new Set();
        clearedNumberedBlocks.forEach(str => {
            const {row, col} = JSON.parse(str);
            clearedRows.add(row);
            clearedCols.add(col);
        });

        for(let r=0; r < gridSize; r++){
            for(let c=0; c < gridSize; c++){
                const block = boardState[r][c];
                if(block && block.type === 'bomb' && (clearedRows.has(r) || clearedCols.has(c))){
                    bombsToDetonate.add(JSON.stringify({row: r, col: c}));
                }
            }
        }
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
        const cellsToFlash = [];
        blocksToUnlock.forEach((blockString) => {
            const { row, col } = JSON.parse(blockString);
            const block = boardState[row][col];
            if (!block) return;
            
            let wasStriped = block.type === 'striped';

            if (block.isBomb && block.type === 'grey') {
                block.type = 'bomb'; // A hidden bomb is revealed
            } else if (block.type === 'grey') {
                block.type = 'striped';
                block.number = Math.floor(Math.random() * 8) + 1;
            } else if (block.type === 'striped') {
                block.type = 'number';
            }
            
            if (wasStriped && block.type === 'number') {
                cellsToFlash.push(getCellElement(row, col));
            }
        });

        renderBoard(); // Update board to show cleared blocks & new striped/number blocks
        cellsToFlash.forEach(cell => cell.classList.add('unlocked-flash'));
        
        await new Promise(resolve => setTimeout(resolve, 400)); 
        
        cellsToFlash.forEach(cell => cell.classList.remove('unlocked-flash'));
    }

    function clearBlocksFromState(blocksToClear) {
         blocksToClear.forEach((blockString) => {
            const { row, col } = JSON.parse(blockString);
            boardState[row][col] = null;
        });
    }

    async function addNewRow() {
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
            const newBlock = createBottomBlock();
            boardState[gridSize - 1][c] = newBlock;
            if (newBlock.isBomb) {
                console.log(`A ${newBlock.type === 'bomb' ? 'REVEALED' : 'hidden'} bomb was created at row ${gridSize - 1}, col ${c}`);
            }
        }

        level++;
        movesPerLevel = Math.max(8, 15 - (level - 1) * 2);
        movesLeft = movesPerLevel;
        
        renderBoard();
        updateTimerUI();
        await new Promise(resolve => setTimeout(resolve, 300));
        saveGameState();
    }

    function findBlocksToClear() {
        const blocksToClear = new Set();
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const block = boardState[r][c];
                if (block && block.type === 'number') {
                    const blockNumber = block.number;
                    // Horizontal check
                    let hGroup = [];
                    let startCol = c;
                    while(startCol > 0 && boardState[r][startCol - 1]) startCol--;
                    let tempCol = startCol;
                    while(tempCol < gridSize && boardState[r][tempCol]) {
                        hGroup.push(boardState[r][tempCol]);
                        tempCol++;
                    }
                    if (blockNumber === hGroup.length) blocksToClear.add(JSON.stringify({ row: r, col: c }));

                    // Vertical check
                    let vGroup = [];
                    let startRow = r;
                    while(startRow > 0 && boardState[startRow - 1][c]) startRow--;
                    let tempRow = startRow;
                    while(tempRow < gridSize && boardState[tempRow][c]) {
                        vGroup.push(boardState[tempRow][c]);
                        tempRow++;
                    }
                    if (blockNumber === vGroup.length) blocksToClear.add(JSON.stringify({ row: r, col: c }));
                }
            }
        }
        return blocksToClear;
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
    }

    async function animateLaserToBombs(clearedBlocks, bombs) {
        const lineContainer = document.querySelector('.line-container');
        const gameBoard = document.querySelector('.game-board');
        if (!lineContainer || !gameBoard) return;
        const boardRect = gameBoard.getBoundingClientRect();
        const promises = [];
        // 1. 射線動畫：從數字方格射向炸彈
        clearedBlocks.forEach(blockString => {
            const { row, col } = JSON.parse(blockString);
            const cell = getCellElement(row, col);
            if (!cell) return;
            const cellRect = cell.getBoundingClientRect();
            bombs.forEach(bombString => {
                const { row: bombRow, col: bombCol } = JSON.parse(bombString);
                // 只畫同一行/列的射線
                if ((row === bombRow || col === bombCol) && !(row === bombRow && col === bombCol)) {
                    const bombCell = getCellElement(bombRow, bombCol);
                    if (!bombCell) return;
                    const bombRect = bombCell.getBoundingClientRect();
                    // 畫射線
                    const line = document.createElement('div');
                    line.className = 'laser-line bomb-laser';
                    const x1 = cellRect.left - boardRect.left + cellRect.width / 2;
                    const y1 = cellRect.top - boardRect.top + cellRect.height / 2;
                    const x2 = bombRect.left - boardRect.left + bombRect.width / 2;
                    const y2 = bombRect.top - boardRect.top + bombRect.height / 2;
                    const dx = x2 - x1;
                    const dy = y2 - y1;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                    line.style.position = 'absolute';
                    line.style.left = x1 + 'px';
                    line.style.top = y1 + 'px';
                    line.style.width = length + 'px';
                    line.style.height = '3px';
                    line.style.background = 'linear-gradient(90deg, #F9A03F 60%, #fff 100%)';
                    line.style.transform = `rotate(${angle}deg)`;
                    line.style.transformOrigin = '0 50%';
                    line.style.opacity = '0.95';
                    line.style.borderRadius = '2px';
                    line.style.pointerEvents = 'none';
                    line.style.zIndex = '1001';
                    line.style.animation = 'laser-appear 0.22s linear forwards';
                    lineContainer.appendChild(line);
                    setTimeout(() => line.remove(), 220);
                }
            });
        });
        // 2. 爆炸 emoji + 放射線動畫
        bombs.forEach(bombString => {
            const { row, col } = JSON.parse(bombString);
            const bombCell = getCellElement(row, col);
            if (!bombCell) return;
            const bombRect = bombCell.getBoundingClientRect();
            // 爆炸 emoji
            const explosion = document.createElement('div');
            explosion.className = 'bomb-explosion';
            explosion.style.position = 'absolute';
            explosion.style.left = (bombRect.left - boardRect.left + bombRect.width / 2) + 'px';
            explosion.style.top = (bombRect.top - boardRect.top + bombRect.height / 2) + 'px';
            explosion.style.transform = 'translate(-50%, -50%)';
            explosion.textContent = '💥';
            explosion.style.fontSize = '24px';
            explosion.style.zIndex = '1002';
            explosion.style.pointerEvents = 'none';
            lineContainer.appendChild(explosion);
            setTimeout(() => explosion.remove(), 320);
            // 放射線動畫
            for (let i = 0; i < 8; i++) {
                const angle = (i * 45) * Math.PI / 180;
                const length = 32;
                const ray = document.createElement('div');
                ray.className = 'bomb-ray';
                ray.style.position = 'absolute';
                ray.style.left = (bombRect.left - boardRect.left + bombRect.width / 2) + 'px';
                ray.style.top = (bombRect.top - boardRect.top + bombRect.height / 2) + 'px';
                ray.style.width = length + 'px';
                ray.style.height = '3px';
                ray.style.background = 'linear-gradient(90deg, #fff 0%, #F9A03F 100%)';
                ray.style.transform = `rotate(${i * 45}deg)`;
                ray.style.transformOrigin = '0 50%';
                ray.style.opacity = '0.85';
                ray.style.borderRadius = '2px';
                ray.style.pointerEvents = 'none';
                ray.style.zIndex = '1001';
                ray.style.animation = 'bomb-ray-appear 0.32s linear forwards';
                lineContainer.appendChild(ray);
                setTimeout(() => ray.remove(), 320);
            }
            promises.push(new Promise(resolve => {
                setTimeout(() => {
                    resolve();
                }, 320);
            }));
        });
        await Promise.all(promises);
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
            renderBoard();
            updatePreview();
            updateTimerUI();
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
        updateTimerUI();
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
        updateTimerUI();
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
            if (!state || !state.boardState) return false;
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
        } catch (e) { return false; }
    }

    function clearStorage() { localStorage.removeItem('numberGameSave'); }

    // === 主初始化 ===
    init();
    const testBtn = document.getElementById('test-btn');
    if (testBtn) {
        testBtn.onclick = () => {
            localStorage.removeItem('tutorialSeen');
            showInteractiveTutorial();
        };
    }
}); 