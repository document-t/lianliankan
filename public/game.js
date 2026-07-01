// 游戏基础配置
const CONFIG = {
  rows: 8,
  cols: 10,
  iconTypes: 8,
  cellSize: 50,
  gap: 4,
  padding: 10
};
// 水果图案
const ICONS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🥝', '🍑'];

// 游戏状态
let gameState = {
  board: [],
  selected: null,
  score: 0,
  remain: 0,
  startTime: null,
  timer: null,
  isPlaying: false,
  hints: 3,
  shuffles: 3,
  useHint: 0,
  useShuffle: 0
};

// DOM元素
const boardEl = document.getElementById('board');
const canvas = document.getElementById('lineCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const remainEl = document.getElementById('remain');
const startBtn = document.getElementById('startBtn');
const hintBtn = document.getElementById('hintBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const rankBtn = document.getElementById('rankBtn');
const gameOverModal = document.getElementById('gameOverModal');
const rankModal = document.getElementById('rankModal');

init();
function init() {
  setBoardStyle();
  setCanvasSize();
  bindEvents();
}

// 棋盘网格样式
function setBoardStyle() {
  boardEl.style.gridTemplateColumns = `repeat(${CONFIG.cols}, ${CONFIG.cellSize}px)`;
  boardEl.style.gridTemplateRows = `repeat(${CONFIG.rows}, ${CONFIG.cellSize}px)`;
}
// 画布尺寸
function setCanvasSize() {
  const w = CONFIG.cols * CONFIG.cellSize + (CONFIG.cols - 1) * CONFIG.gap;
  const h = CONFIG.rows * CONFIG.cellSize + (CONFIG.rows - 1) * CONFIG.gap;
  canvas.width = w;
  canvas.height = h;
}
// 绑定按钮事件
function bindEvents() {
  startBtn.addEventListener('click', startGame);
  hintBtn.addEventListener('click', useHint);
  shuffleBtn.addEventListener('click', useShuffle);
  rankBtn.addEventListener('click', showRankings);
  document.getElementById('submitScoreBtn').addEventListener('click', submitScore);
  document.getElementById('restartBtn').addEventListener('click', () => {
    gameOverModal.classList.add('hidden');
    startGame();
  });
  document.getElementById('closeRankBtn').addEventListener('click', () => {
    rankModal.classList.add('hidden');
  });
}

// 开始游戏
function startGame() {
  generateBoard();
  renderBoard();
  gameState.score = 0;
  gameState.selected = null;
  gameState.isPlaying = true;
  gameState.hints = 3;
  gameState.shuffles = 3;
  gameState.useHint = 0;
  gameState.useShuffle = 0;
  gameState.remain = CONFIG.rows * CONFIG.cols;
  updateUI();
  startTimer();
  clearCanvas();
}

// 生成合法棋盘
function generateBoard() {
  const total = CONFIG.rows * CONFIG.cols;
  const pairCount = total / 2;
  let tiles = [];
  for (let i = 0; i < pairCount; i++) {
    const t = i % CONFIG.iconTypes;
    tiles.push(t, t);
  }
  // 打乱
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  gameState.board = [];
  let idx = 0;
  for (let r = 0; r < CONFIG.rows; r++) {
    const row = [];
    for (let c = 0; c < CONFIG.cols; c++) row.push(tiles[idx++]);
    gameState.board.push(row);
  }
  if (!hasValidSolution()) generateBoard();
}

// 渲染棋盘
function renderBoard() {
  boardEl.innerHTML = '';
  for (let r = 0; r < CONFIG.rows; r++) {
    for (let c = 0; c < CONFIG.cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      const val = gameState.board[r][c];
      if (val === -1) cell.classList.add('empty');
      else {
        cell.textContent = ICONS[val];
        cell.onclick = () => onCellClick(r, c);
      }
      boardEl.appendChild(cell);
    }
  }
}

// 点击格子逻辑
function onCellClick(r, c) {
  if (!gameState.isPlaying || gameState.board[r][c] === -1) return;
  document.querySelectorAll('.hint').forEach(el => el.classList.remove('hint'));
  if (!gameState.selected) {
    gameState.selected = { r, c };
    setHighlight(r, c, true);
  } else {
    const { r: r1, c: c1 } = gameState.selected;
    if (r1 === r && c1 === c) {
      setHighlight(r, c, false);
      gameState.selected = null;
      return;
    }
    if (gameState.board[r1][c1] === gameState.board[r][c]) {
      const path = findPath(r1, c1, r, c);
      if (path) {
        drawLine(path);
        setTimeout(() => {
          eliminate(r1, c1, r, c);
          clearCanvas();
          checkGameStatus();
        }, 300);
      }
    }
    setHighlight(r1, c1, false);
    gameState.selected = null;
  }
}
function setHighlight(r, c, flag) {
  const index = r * CONFIG.cols + c;
  boardEl.children[index].classList.toggle('selected', flag);
}

// 核心路径算法
function findPath(r1, c1, r2, c2) {
  if (lineDirect(r1, c1, r2, c2)) return [{ r: r1, c: c1 }, { r: r2, c: c2 }];
  // 1拐点L型
  const p1 = { r: r1, c: c2 };
  if (isEmpty(p1.r, p1.c) && lineDirect(r1, c1, p1.r, p1.c) && lineDirect(p1.r, p1.c, r2, c2))
    return [{ r: r1, c: c1 }, p1, { r: r2, c: c2 }];
  const p2 = { r: r2, c: c1 };
  if (isEmpty(p2.r, p2.c) && lineDirect(r1, c1, p2.r, p2.c) && lineDirect(p2.r, p2.c, r2, c2))
    return [{ r: r1, c: c1 }, p2, { r: r2, c: c2 }];
  // 2拐点横向
  for (let c = -1; c <= CONFIG.cols; c++) {
    if (c === c1 || c === c2) continue;
    const a = { r: r1, c }, b = { r: r2, c };
    if ((isOut(a.r, a.c) || isEmpty(a.r, a.c)) && (isOut(b.r, b.c) || isEmpty(b.r, b.c))
      && lineDirect(r1, c1, a.r, a.c) && lineDirect(a.r, a.c, b.r, b.c) && lineDirect(b.r, b.c, r2, c2))
      return [{ r: r1, c: c1 }, a, b, { r: r2, c: c2 }];
  }
  // 2拐点纵向
  for (let r = -1; r <= CONFIG.rows; r++) {
    if (r === r1 || r === r2) continue;
    const a = { r, c: c1 }, b = { r, c: c2 };
    if ((isOut(a.r, a.c) || isEmpty(a.r, a.c)) && (isOut(b.r, b.c) || isEmpty(b.r, b.c))
      && lineDirect(r1, c1, a.r, a.c) && lineDirect(a.r, a.c, b.r, b.c) && lineDirect(b.r, b.c, r2, c2))
      return [{ r: r1, c: c1 }, a, b, { r: r2, c: c2 }];
  }
  return null;
}
// 直线连通判断
function lineDirect(r1, c1, r2, c2) {
  if (r1 !== r2 && c1 !== c2) return false;
  if (r1 === r2) {
    const min = Math.min(c1, c2), max = Math.max(c1, c2);
    for (let c = min + 1; c < max; c++) if (!isEmpty(r1, c)) return false;
  } else {
    const min = Math.min(r1, r2), max = Math.max(r1, r2);
    for (let r = min + 1; r < max; r++) if (!isEmpty(r, c1)) return false;
  }
  return true;
}
function isEmpty(r, c) {
  if (isOut(r, c)) return true;
  return gameState.board[r][c] === -1;
}
function isOut(r, c) {
  return r < 0 || r >= CONFIG.rows || c < 0 || c >= CONFIG.cols;
}

// 消除方块
function eliminate(r1, c1, r2, c2) {
  gameState.board[r1][c1] = -1;
  gameState.board[r2][c2] = -1;
  gameState.score += 10;
  gameState.remain -= 2;
  const i1 = r1 * CONFIG.cols + c1;
  const i2 = r2 * CONFIG.cols + c2;
  boardEl.children[i1].classList.add('empty');
  boardEl.children[i1].textContent = '';
  boardEl.children[i2].classList.add('empty');
  boardEl.children[i2].textContent = '';
  updateUI();
}

// 绘制连线
function drawLine(path) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#667eea';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  path.forEach((p, i) => {
    const x = p.c * (CONFIG.cellSize + CONFIG.gap) + CONFIG.cellSize / 2;
    const y = p.r * (CONFIG.cellSize + CONFIG.gap) + CONFIG.cellSize / 2;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}
function clearCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); }

// 游戏状态检测【核心：无解自动洗牌，不扣分】
function checkGameStatus() {
  if (gameState.remain === 0) {
    endGame(true);
    return;
  }
  if (!hasValidSolution()) {
    if (gameState.shuffles > 0) {
      alert('当前无可消除水果，自动洗牌！本次不扣分');
      useShuffle();
    } else {
      endGame(false);
    }
  }
}

// 检测棋盘是否存在可消除配对
function hasValidSolution() {
  for (let r1 = 0; r1 < CONFIG.rows; r1++) {
    for (let c1 = 0; c1 < CONFIG.cols; c1++) {
      if (gameState.board[r1][c1] === -1) continue;
      for (let r2 = 0; r2 < CONFIG.rows; r2++) {
        for (let c2 = 0; c2 < CONFIG.cols; c2++) {
          if (r1 === r2 && c1 === c2) continue;
          if (gameState.board[r2][c2] === -1) continue;
          if (gameState.board[r1][c1] === gameState.board[r2][c2] && findPath(r1, c1, r2, c2))
            return true;
        }
      }
    }
  }
  return false;
}

// 提示功能（扣5分）
function useHint() {
  if (!gameState.isPlaying || gameState.hints <= 0) return;
  const pair = findHintPair();
  if (!pair) return;
  gameState.hints--;
  gameState.useHint++;
  gameState.score = Math.max(0, gameState.score - 5);
  pair.forEach(p => {
    const idx = p.r * CONFIG.cols + p.c;
    boardEl.children[idx].classList.add('hint');
  });
  setTimeout(() => {
    pair.forEach(p => {
      const idx = p.r * CONFIG.cols + p.c;
      boardEl.children[idx].classList.remove('hint');
    });
  }, 2000);
  updateUI();
}
function findHintPair() {
  for (let r1 = 0; r1 < CONFIG.rows; r1++) {
    for (let c1 = 0; c1 < CONFIG.cols; c1++) {
      if (gameState.board[r1][c1] === -1) continue;
      for (let r2 = 0; r2 < CONFIG.rows; r2++) {
        for (let c2 = 0; c2 < CONFIG.cols; c2++) {
          if (r1 === r2 && c1 === c2) continue;
          if (gameState.board[r2][c2] === -1) continue;
          if (gameState.board[r1][c1] === gameState.board[r2][c2] && findPath(r1, c1, r2, c2))
            return [{ r: r1, c: c1 }, { r: r2, c: c2 }];
        }
      }
    }
  }
  return null;
}

// 重排函数（手动/自动共用，**不扣分**）
function useShuffle() {
  if (!gameState.isPlaying || gameState.shuffles <= 0) return;
  gameState.shuffles--;
  gameState.useShuffle++;
  // 收集剩余方块
  let tiles = [], posList = [];
  for (let r = 0; r < CONFIG.rows; r++) {
    for (let c = 0; c < CONFIG.cols; c++) {
      if (gameState.board[r][c] !== -1) {
        tiles.push(gameState.board[r][c]);
        posList.push({ r, c });
      }
    }
  }
  // 打乱
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  // 重写棋盘
  posList.forEach((pos, i) => gameState.board[pos.r][pos.c] = tiles[i]);
  if (!hasValidSolution()) useShuffle();
  renderBoard();
  gameState.selected = null;
  updateUI();
}

// 计时器
function startTimer() {
  if (gameState.timer) clearInterval(gameState.timer);
  gameState.startTime = Date.now();
  gameState.timer = setInterval(() => {
    const s = Math.floor((Date.now() - gameState.startTime) / 1000);
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    timerEl.textContent = `${m}:${sec}`;
  }, 1000);
}

// 游戏结束
function endGame(isWin) {
  gameState.isPlaying = false;
  clearInterval(gameState.timer);
  const totalSec = Math.floor((Date.now() - gameState.startTime) / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  document.getElementById('modalTitle').innerText = isWin ? '🎉 恭喜通关！' : '游戏结束';
  document.getElementById('finalScore').innerText = gameState.score;
  document.getElementById('finalTime').innerText = `${m}:${s}`;
  gameOverModal.classList.remove('hidden');
}

// 提交分数接口
async function submitScore() {
  const nick = document.getElementById('nicknameInput').value.trim();
  if (!nick) return alert('请输入昵称');
  const timeSec = Math.floor((Date.now() - gameState.startTime) / 1000);
  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: nick,
        score: gameState.score,
        time_used: timeSec,
        use_hint: gameState.useHint,
        use_shuffle: gameState.useShuffle
      })
    });
    const data = await res.json();
    if (data.code === 200) {
      alert('分数提交成功！');
      gameOverModal.classList.add('hidden');
    } else alert(data.msg);
  } catch (err) {
    alert('服务器连接失败，请重启后端');
  }
}

// 加载排行榜
async function showRankings() {
  try {
    const res = await fetch('/api/rankings');
    const list = await res.json();
    const rankWrap = document.getElementById('rankList');
    rankWrap.innerHTML = '';
    if (list.length === 0) {
      rankWrap.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">暂无记录</p>';
      return;
    }
    list.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'rank-item';
      const m = Math.floor(item.time_used / 60).toString().padStart(2, '0');
      const s = String(item.time_used % 60).padStart(2, '0');
      div.innerHTML = `
        <span class="rank-num">${idx + 1}</span>
        <span class="name">${item.nickname}</span>
        <span class="score-info">${item.score}分 / ${m}:${s}</span>
      `;
      rankWrap.appendChild(div);
    });
    rankModal.classList.remove('hidden');
  } catch (err) {
    alert('获取榜单失败，请检查后端服务');
  }
}

// 更新顶部信息栏
function updateUI() {
  scoreEl.innerText = gameState.score;
  remainEl.innerText = gameState.remain;
  hintBtn.innerText = `提示(${gameState.hints})`;
  shuffleBtn.innerText = `重排(${gameState.shuffles})`;
}