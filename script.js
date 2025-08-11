const CORRECT_ANSWER = "ADAPT";

const PAR_INDEX = 1;

const LETTER_HINT_ORDER = [5, 2, 3, 4, 1];

//hint colors
const HINT_SETS = {
  indicator: [1, 6],
  fodder: [2, 3, 5],
  definition: [7] 
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


function createBoxes() {
  answerGrid.innerHTML = "";
  for (let i = 0; i < CORRECT_ANSWER.length; i++) {
    const box = document.createElement("div");
    box.className = "letter-box";
    box.setAttribute("data-index", i);
    box.addEventListener("click", () => {
      if (gameOver) return;
      focusBox(i);
    });
    answerGrid.appendChild(box);
  }
  focusBox(0);
  updateCheckButtonState();
}

function focusBox(index) {
  focusedIndex = index;
  [...answerGrid.children].forEach(b => b.classList.remove("focused"));
  if (answerGrid.children[index]) {
    answerGrid.children[index].classList.add("focused");
  }
}

function putLetter(letter) {
  if (gameOver || focusedIndex === null) return;

  const box = answerGrid.children[focusedIndex];
  if (box?.dataset.locked === "hint") {
    for (let i = focusedIndex + 1; i < CORRECT_ANSWER.length; i++) {
      if (answerGrid.children[i].dataset.locked !== "hint") {
        focusBox(i);
        answerGrid.children[i].textContent = letter;
        if (i < CORRECT_ANSWER.length - 1) focusBox(i + 1);
        updateCheckButtonState();
        return;
      }
    }
    return;
  }

  box.textContent = letter;
  if (focusedIndex < CORRECT_ANSWER.length - 1) focusBox(focusedIndex + 1);
  updateCheckButtonState();
}

function deleteLetter() {
  if (gameOver || focusedIndex === null) return;

  const current = answerGrid.children[focusedIndex];
  const isLocked = current?.dataset.locked === "hint";

  if (current.textContent) {
    if (!isLocked) {
      current.textContent = "";
    return;
    }
  }

  for (let i = focusedIndex - 1; i >= 0; i--) {
    const left = answerGrid.children[i];
    focusBox(i);
    if (left.textContent) {
      if (left.dataset.locked !== "hint") {
        left.textContent = "";
      }
      return;
    }
  }
  focusBox(0);
}


function getGuess() {
  const raw = [...answerGrid.children].map(b => (b.textContent || "").trim()).join("");
  return raw.toUpperCase()
}

function allFilled() {
  for (let i = 0; i < CORRECT_ANSWER.length; i++) {
    if (!(answerGrid.children[i].textContent || "").trim()) return false;
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

  const guess = getGuess();
  const target = CORRECT_ANSWER.toUpperCase();

  if (guess === target) {
    showWin();
  } else {
    answerGrid.classList.add("shake");
    setTimeout(() => answerGrid.classList.remove("shake"), 500);
  }
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
  [...answerGrid.children].forEach(b => { b.classList.remove("focused"); b.classList.add("won"); });
  gameOver = true;
}

function checkAnswer() {
  const guess = getGuess();
  if (guess === CORRECT_ANSWER) showWin();
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
  const n = CORRECT_ANSWER.length;

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
  const letter = CORRECT_ANSWER[zero];
  const box = answerGrid.children[zero];

  box.textContent = letter;
  box.dataset.locked = "hint";
  shownByHint.add(zero);

  box.classList.add("hint-reveal");
  setTimeout(() => box.classList.remove("hint-reveal"), 8000000000000);

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
