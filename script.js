const CORRECT_ANSWER = "director";
const ANSWER_LETTERS = CORRECT_ANSWER.replace(/[^A-Za-z]/g, "");
let letterBoxes = [2, 7, 6, 5, 3, 8, 4, 1];
let startTime = Date.now();
let nextClueInterval = null;

const PAR_INDEX = 1;

const LETTER_HINT_ORDER = [2, 7, 6, 5, 3, 8, 4, 1];

//hint colors
const HINT_SETS = {
  indicator: [3, 9, 10,],
  fodder: [2, 5, 6, 7, 8],
  definition: [1] 
};

const answerGrid = document.getElementById("answer-grid");
const keyboardGrid = document.getElementById("keyboard");
const checkBtn = document.querySelector(".check-btn");
const parSection = document.querySelector(".par-section");
const parDots = document.querySelectorAll(".par-dots .dot");
const buttonRow = document.querySelector(".button-row");
const supportBox = document.getElementById("support-box");
const appEl = document.querySelector(".app");

const hintsBtn = document.querySelector(".hints-btn");
const hintsSheet = document.getElementById("hints-sheet");
const closeHintsBtn = document.getElementById("close-hints");

const sheetMenu = document.querySelector(".sheet-menu");
const sheetIndicators = document.getElementById("hint-indicators");
const sheetFodder = document.getElementById("hint-fodder");
const sheetDefinition = document.getElementById("hint-definition");

const clueEl = document.getElementById("clue");

let focusedIndex = 0;
let gameOver = false;
let shownByHint = new Set();

let wordSpans = [];


createBoxes();
wireKeyboard();
wirePhysicalKeyboard();
applyParIndex();
prepareClueTokenization();
wireHintsSheet();
startNextClueTimer();

function createBoxes() {
  answerGrid.innerHTML = "";
  shownByHint = new Set();
  letterBoxes = [];

  const words = CORRECT_ANSWER.trim().split(/\s+/);

  words.forEach((word) => {
    const wordDiv = document.createElement("div");
    wordDiv.className = "word";

    const letters = word.split("");
    letters.forEach((ch) => {
      if (!/[A-Za-z]/.test(ch)) return;

      const box = document.createElement("div");
      box.className = "letter-box";
      box.setAttribute("data-index", letterBoxes.length);
      box.addEventListener("click", () => {
        if (gameOver) return;
        focusBox(letterBoxes.indexOf(box));
      });
      wordDiv.appendChild(box);
      letterBoxes.push(box);
    });

    answerGrid.appendChild(wordDiv);
  });

  focusBox(0);
  updateCheckButtonState();
}



function focusBox(index) {
  focusedIndex = Math.max(0, Math.min(index, letterBoxes.length - 1));
  letterBoxes.forEach(b => b.classList.remove("focused"));
  if (letterBoxes[focusedIndex]) {
    letterBoxes[focusedIndex].classList.add("focused");
  }
}


function putLetter(letter) {
  if (gameOver || focusedIndex === null) return;

  const box = letterBoxes[focusedIndex];
  if (box?.dataset.locked === "hint") {
    for (let i = focusedIndex + 1; i < letterBoxes.length; i++) {
      if (letterBoxes[i].dataset.locked !== "hint") {
        focusBox(i);
        letterBoxes[i].textContent = letter;
        if (i < letterBoxes.length - 1) focusBox(i + 1);
        updateCheckButtonState();
        return;
      }
    }
    return;
  }

  box.textContent = letter;
  if (focusedIndex < letterBoxes.length - 1) focusBox(focusedIndex + 1);
  updateCheckButtonState();
}


function deleteLetter() {
  if (gameOver || focusedIndex === null) return;

  const current = letterBoxes[focusedIndex];
  const isLocked = current?.dataset.locked === "hint";

  if (current.textContent && !isLocked) {
    current.textContent = "";
    updateCheckButtonState();
    return;
  }

  for (let i = focusedIndex - 1; i >= 0; i--) {
    const left = letterBoxes[i];
    focusBox(i);
    if (left.textContent) {
      if (left.dataset.locked !== "hint") left.textContent = "";
      break;
    }
  }
  updateCheckButtonState();
}



function getGuess() {
  return letterBoxes.map(b => (b.textContent || "").trim()).join("").toUpperCase();
}


function allFilled() {
  for (let i = 0; i < letterBoxes.length; i++) {
    if (!(letterBoxes[i].textContent || "").trim()) return false;
  }
  return true;
}


function updateCheckButtonState() {
  if (allFilled()) checkBtn.classList.add("enabled");
  else checkBtn.classList.remove("enabled");
}

function runCheck() {
  if (gameOver) return;
  if (!allFilled()) {
    answerGrid.classList.add("shake");
    setTimeout(() => answerGrid.classList.remove("shake"), 500);
    return;
  }
  checkAnswer();
}


checkBtn.addEventListener("click", runCheck);


function showWin() {
  closeHints?.();
  document.getElementById("result-panel")?.classList.add("show");
  keyboardGrid.classList.add("hidden");
  parSection.classList.add("hidden");
  buttonRow.classList.add("hidden");
  supportBox.classList.remove("hidden");
  supportBox.setAttribute("aria-hidden", "false");
  appEl.classList.add("win");

  // Calculate elapsed time
  const elapsedMs = Date.now() - startTime;
  const seconds = Math.floor(elapsedMs / 1000) % 60;
  const minutes = Math.floor(elapsedMs / 60000);
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Update the text inside the result panel
  document.querySelector("#result-panel p").innerHTML =
    `You solved today's clue in <strong>${timeString}</strong>`;

  letterBoxes.forEach(b => { b.classList.remove("focused"); b.classList.add("won"); });
  gameOver = true;
}

function startNextClueTimer() {
  const targetEl = document.querySelector(".next-clue strong");
  if (!targetEl) return;

  function nextMidnight() {
    const now = new Date();
    const next = new Date(now);
    next.setDate(now.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  function fmt(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
  }

  let deadline = nextMidnight();
  function tick() {
    const now = new Date();
    const delta = deadline - now;
    if (delta <= 0) {
      deadline = nextMidnight();
      targetEl.textContent = "00:00:00";
      return;
    }
    targetEl.textContent = fmt(delta);
  }

  tick();
  if (nextClueInterval) clearInterval(nextClueInterval);
  nextClueInterval = setInterval(tick, 1000);
}


function checkAnswer() {
  if (gameOver) return;
  const guess = getGuess();
  const target = ANSWER_LETTERS.toUpperCase();
  if (guess === target) showWin();
  else {
    answerGrid.classList.add("shake");
    setTimeout(() => answerGrid.classList.remove("shake"), 500);
  }
}


function handleKeyInput(key) {
  if (gameOver) return;
  if (/^[a-z]$/i.test(key)) putLetter(key.toUpperCase());
  else if (key === "Backspace") deleteLetter();
  else if (key === "Enter") { if (!allFilled()) return; checkAnswer(); }
}

function wireKeyboard() {
  keyboardGrid.querySelectorAll(".key").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-key");
      if (!key) return;
      handleKeyInput(key);
    });
  });
}

function wirePhysicalKeyboard() {
  document.addEventListener("keydown", e => handleKeyInput(e.key));
}

function applyParIndex() {
  parDots.forEach((d, i) => d.classList.toggle("show-par", i === PAR_INDEX - 1));
}


function wireHintsSheet() {
  hintsBtn.addEventListener("click", openHints);
  closeHintsBtn.addEventListener("click", closeHints);

  hintsSheet.addEventListener("click", (e) => {
    const opt = e.target.closest(".hint-option");
    if (opt) {
      const type = opt.getAttribute("data-hint");
      if (type === "letter") {
        revealNextLetterByOrder();
      } else if (type === "indicators") {
        openDetail('indicator');
      } else if (type === "fodder") {
        openDetail('fodder');
      } else if (type === "definition") {
        openDetail('definition');
      }
      return;
    }

    if (e.target.matches("[data-back]")) {
      backToMenu();
    }
    if (e.target.matches("[data-close]")) {
      closeHints();
    }
  });
}

function openHints() {
  hintsSheet.classList.add("show");
  document.body.classList.add("hints-open");
  hintsSheet.setAttribute("aria-hidden", "false");
  setView('menu');
}

function closeHints() {
  hintsSheet.classList.remove("show");
  document.body.classList.remove("hints-open");
  hintsSheet.setAttribute("aria-hidden", "true");
}

function setView(name) {
  sheetMenu.classList.toggle("show", name === 'menu');
  sheetIndicators.classList.toggle("show", name === 'indicator');
  sheetFodder.classList.toggle("show", name === 'fodder');
  sheetDefinition.classList.toggle("show", name === 'definition');

  if (name === 'indicator' || name === 'fodder' || name === 'definition') {
    applyPreselectedHighlight(name);
  }
}


function openDetail(mode) {
  setView(mode);
}

function backToMenu() {
  setView('menu');
}

function revealNextLetterByOrder() {
  const n = ANSWER_LETTERS.length;

  const provided = LETTER_HINT_ORDER
    .map(x => parseInt(x, 10))
    .filter(x => Number.isInteger(x) && x >= 1 && x <= n);

  const seen = new Set(provided);
  const fullOrder = [...provided];
  for (let i = 1; i <= n; i++) if (!seen.has(i)) fullOrder.push(i);

  let pos = null;
  for (let i = 0; i < fullOrder.length; i++) {
    const idx1 = fullOrder[i];
    const zero = idx1 - 1;
    if (!shownByHint.has(zero)) { pos = idx1; break; }
  }

  if (!pos) {
    if (shownByHint.size === n) {
      closeHints?.();
      showWin();
    }
    return;
  }

  const zero = pos - 1;
  const letter = ANSWER_LETTERS[zero];
  const box = letterBoxes[zero];

  box.textContent = letter;
  box.dataset.locked = "hint";
  shownByHint.add(zero);

  box.classList.add("hint-hinted", "hint-reveal");
  setTimeout(() => box.classList.remove("hint-reveal"), 600);

  let nextIndex = -1;
  for (let j = zero + 1; j < n; j++) if (!shownByHint.has(j)) { nextIndex = j; break; }
  if (nextIndex === -1) for (let j = 0; j < n; j++) if (!shownByHint.has(j)) { nextIndex = j; break; }
  if (nextIndex !== -1) focusBox(nextIndex);

  updateCheckButtonState();

  if (shownByHint.size === n) {
    closeHints?.();
    showWin();
  }
}



function prepareClueTokenization() {
  const raw = clueEl.textContent.trim();
  const tokens = raw.split(/\s+/);

  clueEl.innerHTML = "";
  wordSpans = [];

  tokens.forEach((tok, i) => {
    if (i > 0) clueEl.appendChild(document.createTextNode(" "));
    const span = document.createElement("span");
    span.className = "clue-word";
    span.textContent = tok;
    span.dataset.wordIndex = String(i + 1);
    clueEl.appendChild(span);
    wordSpans.push(span);
  });

  try {
    console.table(tokens.map((t, i) => ({ wordIndex: i + 1, text: t })));
  } catch {}
}

function clearAllClueHighlights() {
  wordSpans.forEach(s => s.classList.remove("hl-indicator", "hl-fodder", "hl-definition"));
}

function applyPreselectedHighlight(mode) {
  const set = HINT_SETS[mode] || [];
  const cls =
    mode === "indicator" ? "hl-indicator" :
    mode === "fodder" ? "hl-fodder" : "hl-definition";

  set.forEach(idx => {
    const i = idx - 1;
    if (i >= 0 && i < wordSpans.length) {
      wordSpans[i].classList.add(cls);
    }
  });
}
