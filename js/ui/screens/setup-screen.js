/**
 * Setup Screen - initial game configuration UI.
 * Lets the user choose deck mode, player count, and seat position.
 */
import './setup-screen.css';

const POSITION_SETS = {
  '2': ['SB', 'BB'],
  '3': ['BTN', 'SB', 'BB'],
  '4': ['BTN', 'SB', 'BB', 'UTG'],
  '5': ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'],
  '6': ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'],
  '7': ['UTG', 'UTG1', 'MP', 'MP1', 'CO', 'BTN', 'SB', 'BB'],
  '8': ['UTG', 'UTG1', 'MP', 'MP1', 'CO', 'BTN', 'SB', 'BB'],
  '9': ['UTG', 'UTG1', 'MP', 'MP1', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
};

const POSITION_INFO = {
  BTN: { label: 'BTN', desc: '庄家位', tip: '翻后最后行动，最有利' },
  SB: { label: 'SB', desc: '小盲', tip: '强制下小盲注' },
  BB: { label: 'BB', desc: '大盲', tip: '强制下大盲注' },
  UTG: { label: 'UTG', desc: '枪口位', tip: '翻前最先行动，最不利' },
  UTG1: { label: 'UTG+1', desc: '枪口+1', tip: '紧随枪口位行动' },
  MP: { label: 'MP', desc: '中间位', tip: '中间位置行动' },
  MP1: { label: 'MP+1', desc: '中间+1', tip: '中间偏后位置' },
  HJ: { label: 'HJ', desc: '劫持位', tip: '关煞位前一位' },
  CO: { label: 'CO', desc: '关煞位', tip: '庄家右边，翻后倒数第二' },
};

/**
 * Calculate seat positions around an ellipse.
 * Seats are placed clockwise: seat 0 at bottom (6 o'clock), going clockwise.
 * The dealer (BTN) is at the top, SB to the left of dealer, BB to the right.
 */
function calcSeatPositions(count) {
  const positions = [];
  const cx = 50; // percentage center x
  const cy = 50; // percentage center y
  const rx = 42; // horizontal radius %
  const ry = 36; // vertical radius %

  for (let i = 0; i < count; i++) {
    // Start from bottom (angle = PI/2), go clockwise
    // Negate because screen Y is inverted
    const angle = (Math.PI / 2) - (2 * Math.PI * i / count);
    const x = cx + rx * Math.cos(angle);
    const y = cy - ry * Math.sin(angle);
    positions.push({ x, y });
  }
  return positions;
}

/**
 * Create the setup screen element.
 * @param {(config: { isShortDeck: boolean, numPlayers: number, position: string }) => void} onComplete
 * @returns {HTMLDivElement}
 */
export function createSetupScreen(onComplete) {
  let isShortDeck = true;
  let numPlayers = 6;
  let position = null;
  let bigBlind = 5;

  const screen = document.createElement('div');
  screen.className = 'screen setup-screen';

  // -- title
  const title = document.createElement('h1');
  title.className = 'app-title';
  title.textContent = 'Poker Advisor';
  screen.appendChild(title);

  // -- mode toggle
  const modeSection = buildSection('牌组模式');
  const modeGroup = document.createElement('div');
  modeGroup.className = 'toggle-group';

  const stdBtn = makeToggle('标准 52张', false, (btn) => {
    isShortDeck = false;
    setActive(modeGroup, btn);
  });
  const shortBtn = makeToggle('短牌 36张', true, (btn) => {
    isShortDeck = true;
    setActive(modeGroup, btn);
  });

  modeGroup.appendChild(stdBtn);
  modeGroup.appendChild(shortBtn);
  modeSection.appendChild(modeGroup);
  screen.appendChild(modeSection);

  // -- player count
  const countSection = buildSection('玩家人数');
  const countGroup = document.createElement('div');
  countGroup.className = 'player-count-group';

  for (let n = 2; n <= 9; n++) {
    const btn = document.createElement('button');
    btn.className = 'count-btn' + (n === 6 ? ' active' : '');
    btn.textContent = n;
    btn.addEventListener('click', () => {
      numPlayers = n;
      setActive(countGroup, btn);
      renderTable();
    });
    countGroup.appendChild(btn);
  }
  countSection.appendChild(countGroup);
  screen.appendChild(countSection);

  // -- blind level
  const blindSection = buildSection('盲注级别');
  const blindGroup = document.createElement('div');
  blindGroup.className = 'toggle-group';

  const BLIND_LEVELS = [
    { label: '1/2', bb: 2 },
    { label: '2/5', bb: 5 },
    { label: '5/10', bb: 10 },
    { label: '10/25', bb: 25 },
    { label: '25/50', bb: 50 },
  ];

  for (const level of BLIND_LEVELS) {
    const btn = makeToggle(level.label, level.bb === bigBlind, (clickedBtn) => {
      bigBlind = level.bb;
      setActive(blindGroup, clickedBtn);
    });
    blindGroup.appendChild(btn);
  }
  blindSection.appendChild(blindGroup);
  screen.appendChild(blindSection);

  // -- position table area
  const posSection = buildSection('你的位置（点击座位选择）');
  const tableContainer = document.createElement('div');
  tableContainer.className = 'poker-table-container';
  posSection.appendChild(tableContainer);
  screen.appendChild(posSection);

  // -- position description area
  const posDesc = document.createElement('div');
  posDesc.className = 'pos-desc';
  posDesc.style.display = 'none';
  screen.appendChild(posDesc);

  // -- start button
  const startBtn = document.createElement('button');
  startBtn.className = 'primary-btn';
  startBtn.textContent = '开始';
  startBtn.disabled = true;
  startBtn.addEventListener('click', () => {
    if (position !== null) {
      onComplete({ isShortDeck, numPlayers, position, bigBlind });
    }
  });
  screen.appendChild(startBtn);

  // -- helpers

  function renderTable() {
    tableContainer.innerHTML = '';
    position = null;
    startBtn.disabled = true;
    posDesc.style.display = 'none';

    const positions = POSITION_SETS[String(numPlayers)] || POSITION_SETS['6'];
    const seatCoords = calcSeatPositions(positions.length);

    // Poker table (green oval)
    const table = document.createElement('div');
    table.className = 'poker-table';
    tableContainer.appendChild(table);

    // Seats
    const seatBtns = [];
    positions.forEach((pos, i) => {
      const info = POSITION_INFO[pos] || { label: pos, desc: pos, tip: '' };
      const coord = seatCoords[i];

      const seat = document.createElement('button');
      seat.className = 'table-seat';
      seat.style.left = coord.x + '%';
      seat.style.top = coord.y + '%';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'seat-name';
      nameSpan.textContent = info.label;
      seat.appendChild(nameSpan);

      const descSpan = document.createElement('span');
      descSpan.className = 'seat-desc';
      descSpan.textContent = info.desc;
      seat.appendChild(descSpan);

      seat.addEventListener('click', () => {
        position = pos;
        seatBtns.forEach(s => s.classList.remove('active'));
        seat.classList.add('active');
        startBtn.disabled = false;
        showPosDesc(pos);
      });

      tableContainer.appendChild(seat);
      seatBtns.push(seat);
    });
  }

  function showPosDesc(pos) {
    const info = POSITION_INFO[pos];
    if (!info) {
      posDesc.style.display = 'none';
      return;
    }
    posDesc.innerHTML = '';
    posDesc.style.display = 'flex';

    const nameEl = document.createElement('span');
    nameEl.className = 'pos-desc-name';
    nameEl.textContent = info.label + ' - ' + info.desc;
    posDesc.appendChild(nameEl);

    const tipEl = document.createElement('span');
    tipEl.className = 'pos-desc-tip';
    tipEl.textContent = info.tip;
    posDesc.appendChild(tipEl);
  }

  renderTable();
  return screen;
}

function buildSection(labelText) {
  const section = document.createElement('div');
  section.className = 'setup-section';
  const label = document.createElement('span');
  label.className = 'setup-label';
  label.textContent = labelText;
  section.appendChild(label);
  return section;
}

function makeToggle(text, active, onClick) {
  const btn = document.createElement('button');
  btn.className = 'toggle-btn' + (active ? ' active' : '');
  btn.textContent = text;
  btn.addEventListener('click', () => onClick(btn));
  return btn;
}

function setActive(group, activeBtn) {
  Array.from(group.children).forEach((child) => {
    child.classList.remove('active');
  });
  activeBtn.classList.add('active');
}
