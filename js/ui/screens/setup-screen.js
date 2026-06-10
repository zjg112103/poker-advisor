/**
 * Setup Screen - initial game configuration UI.
 * Lets the user choose deck mode, player count, and seat position.
 */
import './setup-screen.css';

/**
 * Position labels displayed to the user for each player-count range.
 * Order matches clockwise seating; the user picks *their* seat.
 */
const POSITION_SETS = {
  '2': ['sb', 'bb'],
  '3': ['btn', 'sb', 'bb'],
  '4': ['btn', 'sb', 'bb', 'utg'],
  '5': ['utg', 'mp', 'co', 'btn', 'sb', 'bb'],
  '6': ['utg', 'mp', 'co', 'btn', 'sb', 'bb'],
  '7': ['utg', 'utg1', 'mp', 'mp1', 'co', 'btn', 'sb', 'bb'],
  '8': ['utg', 'utg1', 'mp', 'mp1', 'co', 'btn', 'sb', 'bb'],
  '9': ['utg', 'utg1', 'mp', 'mp1', 'co', 'btn', 'sb', 'bb'],
};

const POSITION_LABELS = {
  utg: 'UTG',
  utg1: 'UTG+1',
  mp: 'MP',
  mp1: 'MP+1',
  co: 'CO',
  btn: 'BTN',
  sb: 'SB',
  bb: 'BB',
};

/**
 * Create the setup screen element.
 * @param {(config: { isShortDeck: boolean, numPlayers: number, position: string }) => void} onComplete
 * @returns {HTMLDivElement}
 */
export function createSetupScreen(onComplete) {
  // -- state ---------------------------------------------------------------
  let isShortDeck = false;
  let numPlayers = 6;
  let position = null;

  // -- root element --------------------------------------------------------
  const screen = document.createElement('div');
  screen.className = 'screen setup-screen';

  // -- title ---------------------------------------------------------------
  const title = document.createElement('h1');
  title.className = 'app-title';
  title.textContent = 'Poker Advisor';
  screen.appendChild(title);

  // -- mode toggle ---------------------------------------------------------
  const modeSection = buildSection('牌组模式');
  const modeGroup = document.createElement('div');
  modeGroup.className = 'toggle-group';

  const stdBtn = makeToggle('标准 52张', true, (btn) => {
    isShortDeck = false;
    setActive(modeGroup, btn);
  });
  const shortBtn = makeToggle('短牌 36张', false, (btn) => {
    isShortDeck = true;
    setActive(modeGroup, btn);
  });

  modeGroup.appendChild(stdBtn);
  modeGroup.appendChild(shortBtn);
  modeSection.appendChild(modeGroup);
  screen.appendChild(modeSection);

  // -- player count --------------------------------------------------------
  const countSection = buildSection('玩家人数');
  const countGroup = document.createElement('div');
  countGroup.className = 'player-count-group';

  const countBtns = [];
  for (let n = 2; n <= 9; n++) {
    const btn = document.createElement('button');
    btn.className = 'count-btn' + (n === 6 ? ' active' : '');
    btn.textContent = n;
    btn.addEventListener('click', () => {
      numPlayers = n;
      setActive(countGroup, btn);
      renderPositions();
    });
    countGroup.appendChild(btn);
    countBtns.push(btn);
  }
  countSection.appendChild(countGroup);
  screen.appendChild(countSection);

  // -- position selector ---------------------------------------------------
  const posSection = buildSection('你的位置');
  const posGroup = document.createElement('div');
  posGroup.className = 'position-group';
  posSection.appendChild(posGroup);
  screen.appendChild(posSection);

  // -- start button --------------------------------------------------------
  const startBtn = document.createElement('button');
  startBtn.className = 'primary-btn';
  startBtn.textContent = '开始';
  startBtn.disabled = true;
  startBtn.addEventListener('click', () => {
    if (position !== null) {
      onComplete({ isShortDeck, numPlayers, position });
    }
  });
  screen.appendChild(startBtn);

  // -- helpers -------------------------------------------------------------

  function renderPositions() {
    posGroup.innerHTML = '';
    position = null;
    startBtn.disabled = true;

    const positions = POSITION_SETS[String(numPlayers)] || POSITION_SETS['6'];
    positions.forEach((pos) => {
      const btn = document.createElement('button');
      btn.className = 'pos-btn';
      btn.textContent = POSITION_LABELS[pos] || pos.toUpperCase();
      btn.addEventListener('click', () => {
        position = pos;
        setActive(posGroup, btn);
        startBtn.disabled = false;
      });
      posGroup.appendChild(btn);
    });
  }

  // initial render
  renderPositions();

  return screen;
}

// -- utility helpers --------------------------------------------------------

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
