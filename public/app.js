const BOARD_ID_KEY = "bingo-board-id";

const landingViewEl = document.getElementById("landing-view");
const boardViewEl = document.getElementById("board-view");
const boardEl = document.getElementById("board");
const markBarEl = document.getElementById("mark-bar");
const markBtnEl = document.getElementById("mark-btn");
const sizeButtons = document.querySelectorAll(".size-toggle__btn");
const statusEl = document.getElementById("sync-status");
const bingoNameDisplayEl = document.getElementById("bingo-name-display");
const bingoCodeDisplayEl = document.getElementById("bingo-code-display");
const landingErrorEl = document.getElementById("landing-error");

const btnNewBingoEl = document.getElementById("btn-new-bingo");
const btnHaveCodeEl = document.getElementById("btn-have-code");
const btnOpenOtherEl = document.getElementById("btn-open-other");
const btnBackFromNewEl = document.getElementById("btn-back-from-new");
const btnBackFromJoinEl = document.getElementById("btn-back-from-join");

const formNewBingoEl = document.getElementById("form-new-bingo");
const formJoinBingoEl = document.getElementById("form-join-bingo");
const inputBingoNameEl = document.getElementById("input-bingo-name");
const inputBingoCodeEl = document.getElementById("input-bingo-code");

let boardId = null;
let bingoName = "";
let boardSize = 3;
let selectedCell = null;
let cellTexts = {};
let markedCells = new Set();
let saveTimer = null;
let isReady = false;

function cellKey(row, col) {
  return `${row}-${col}`;
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function setLandingError(message) {
  if (!message) {
    landingErrorEl.textContent = "";
    landingErrorEl.classList.add("entry-error--hidden");
    return;
  }

  landingErrorEl.textContent = message;
  landingErrorEl.classList.remove("entry-error--hidden");
}

function setStatus(message, isError = false) {
  if (!statusEl) {
    return;
  }

  statusEl.textContent = message;
  statusEl.classList.toggle("sync-status--error", isError);
}

function showLanding() {
  landingViewEl.classList.remove("landing--hidden");
  boardViewEl.classList.add("board-view--hidden");
  markBarEl.classList.add("mark-bar--hidden");
  clearSelection();
  resetEntryForms();
}

function showBoardView() {
  landingViewEl.classList.add("landing--hidden");
  boardViewEl.classList.remove("board-view--hidden");
  bingoNameDisplayEl.textContent = bingoName;
  bingoCodeDisplayEl.textContent = boardId;
}

function resetEntryForms() {
  formNewBingoEl.classList.add("entry-form--hidden");
  formJoinBingoEl.classList.add("entry-form--hidden");
  btnNewBingoEl.classList.remove("entry-nav__btn--hidden");
  btnHaveCodeEl.classList.remove("entry-nav__btn--hidden");
  inputBingoNameEl.value = "";
  inputBingoCodeEl.value = "";
  setLandingError("");
}

function showNewBingoForm() {
  setLandingError("");
  btnNewBingoEl.classList.add("entry-nav__btn--hidden");
  btnHaveCodeEl.classList.add("entry-nav__btn--hidden");
  formJoinBingoEl.classList.add("entry-form--hidden");
  formNewBingoEl.classList.remove("entry-form--hidden");
  inputBingoNameEl.focus();
}

function showJoinBingoForm() {
  setLandingError("");
  btnNewBingoEl.classList.add("entry-nav__btn--hidden");
  btnHaveCodeEl.classList.add("entry-nav__btn--hidden");
  formNewBingoEl.classList.add("entry-form--hidden");
  formJoinBingoEl.classList.remove("entry-form--hidden");
  inputBingoCodeEl.focus();
}

function applyState(state) {
  bingoName = state.name || "";
  boardSize = state.boardSize === 4 ? 4 : 3;
  cellTexts = state.cellTexts && typeof state.cellTexts === "object" ? state.cellTexts : {};
  markedCells = new Set(Array.isArray(state.markedCells) ? state.markedCells : []);
}

function getStatePayload() {
  return {
    name: bingoName,
    boardSize,
    cellTexts,
    markedCells: [...markedCells],
  };
}

function rememberBoard(id) {
  localStorage.setItem(BOARD_ID_KEY, id);
}

function forgetBoard() {
  localStorage.removeItem(BOARD_ID_KEY);
}

async function fetchBoard(id) {
  const response = await fetch(`/api/board/${id}`);

  if (response.status === 404) {
    throw new Error("Nie znaleziono bingo o podanym kodzie.");
  }

  if (!response.ok) {
    throw new Error("Nie udało się wczytać bingo.");
  }

  return response.json();
}

async function openBoard(id, state) {
  boardId = id;
  applyState(state);
  rememberBoard(id);
  isReady = true;
  showBoardView();
  syncSizeButtons();
  renderBoard();
  setStatus("Zapisane w chmurze");
}

async function createNewBingo(name) {
  setLandingError("");

  const response = await fetch("/api/board", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Nie udało się utworzyć bingo.");
  }

  await openBoard(data.id, data);
}

async function joinBingo(code) {
  setLandingError("");
  const normalizedCode = normalizeCode(code);

  if (normalizedCode.length < 4) {
    throw new Error("Podaj poprawny kod bingo.");
  }

  const data = await fetchBoard(normalizedCode);
  await openBoard(normalizedCode, data);
}

async function resumeSavedBoard() {
  const savedId = localStorage.getItem(BOARD_ID_KEY);

  if (!savedId) {
    showLanding();
    return;
  }

  try {
    const data = await fetchBoard(savedId);
    await openBoard(savedId, data);
  } catch {
    forgetBoard();
    showLanding();
  }
}

async function persistState() {
  if (!isReady || !boardId) {
    return;
  }

  setStatus("Zapisywanie…");

  try {
    const response = await fetch(`/api/board/${boardId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(getStatePayload()),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Nie udało się zapisać planszy.");
    }

    applyState(data);
    setStatus("Zapisane w chmurze");
  } catch (error) {
    setStatus(error.message || "Błąd zapisu", true);
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persistState();
  }, 350);
}

function saveCellText(row, col, value) {
  cellTexts[cellKey(row, col)] = value;
  scheduleSave();
}

function getCellText(row, col) {
  return cellTexts[cellKey(row, col)] || "";
}

function isCellMarked(row, col) {
  return markedCells.has(cellKey(row, col));
}

function clearSelection() {
  if (selectedCell) {
    selectedCell.classList.remove("cell--selected");
    selectedCell = null;
  }
  markBarEl.classList.add("mark-bar--hidden");
}

function showMarkBar() {
  markBarEl.classList.remove("mark-bar--hidden");
}

function createCell(row, col) {
  const cell = document.createElement("div");
  const marked = isCellMarked(row, col);

  cell.className = marked ? "cell cell--marked" : "cell";
  cell.setAttribute("role", "gridcell");
  cell.dataset.row = String(row);
  cell.dataset.col = String(col);

  const input = document.createElement("textarea");
  input.className = "cell__input";
  input.setAttribute("aria-label", `Komórka ${row + 1}, ${col + 1}`);
  input.rows = 1;
  input.value = getCellText(row, col);
  input.placeholder = "Tekst…";

  input.addEventListener("input", () => {
    saveCellText(row, col, input.value);
  });

  input.addEventListener("click", (event) => {
    event.stopPropagation();
    selectCell(cell);
  });

  input.addEventListener("focus", () => {
    if (!cell.classList.contains("cell--marked")) {
      selectCell(cell);
    }
  });

  cell.addEventListener("click", () => {
    if (cell.classList.contains("cell--marked")) {
      return;
    }
    selectCell(cell);
    input.focus();
  });

  cell.appendChild(input);
  return cell;
}

function selectCell(cell) {
  if (cell.classList.contains("cell--marked")) {
    clearSelection();
    return;
  }

  if (selectedCell === cell) {
    return;
  }

  clearSelection();
  selectedCell = cell;
  cell.classList.add("cell--selected");
  showMarkBar();
}

function markSelectedCell() {
  if (!selectedCell || selectedCell.classList.contains("cell--marked")) {
    return;
  }

  const row = Number(selectedCell.dataset.row);
  const col = Number(selectedCell.dataset.col);
  const input = selectedCell.querySelector(".cell__input");

  saveCellText(row, col, input.value);
  markedCells.add(cellKey(row, col));
  scheduleSave();

  selectedCell.classList.add("cell--marked");
  selectedCell.classList.remove("cell--selected");
  selectedCell = null;
  markBarEl.classList.add("mark-bar--hidden");
}

function renderBoard() {
  clearSelection();
  boardEl.className = `board board--${boardSize}`;
  boardEl.innerHTML = "";

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      boardEl.appendChild(createCell(row, col));
    }
  }
}

function setBoardSize(size) {
  if (boardSize === size) {
    return;
  }

  boardSize = size;
  scheduleSave();

  sizeButtons.forEach((btn) => {
    const isActive = Number(btn.dataset.size) === size;
    btn.classList.toggle("size-toggle__btn--active", isActive);
    btn.setAttribute("aria-checked", String(isActive));
  });

  renderBoard();
}

function syncSizeButtons() {
  sizeButtons.forEach((btn) => {
    const isActive = Number(btn.dataset.size) === boardSize;
    btn.classList.toggle("size-toggle__btn--active", isActive);
    btn.setAttribute("aria-checked", String(isActive));
  });
}

function leaveCurrentBoard() {
  clearTimeout(saveTimer);
  boardId = null;
  bingoName = "";
  isReady = false;
  forgetBoard();
  showLanding();
}

btnNewBingoEl.addEventListener("click", showNewBingoForm);
btnHaveCodeEl.addEventListener("click", showJoinBingoForm);
btnBackFromNewEl.addEventListener("click", resetEntryForms);
btnBackFromJoinEl.addEventListener("click", resetEntryForms);
btnOpenOtherEl.addEventListener("click", leaveCurrentBoard);

formNewBingoEl.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await createNewBingo(inputBingoNameEl.value.trim());
  } catch (error) {
    setLandingError(error.message || "Nie udało się utworzyć bingo.");
  }
});

formJoinBingoEl.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await joinBingo(inputBingoCodeEl.value);
  } catch (error) {
    setLandingError(error.message || "Nie udało się dołączyć do bingo.");
  }
});

inputBingoCodeEl.addEventListener("input", () => {
  inputBingoCodeEl.value = normalizeCode(inputBingoCodeEl.value);
});

sizeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setBoardSize(Number(btn.dataset.size));
  });
});

markBtnEl.addEventListener("click", markSelectedCell);

document.addEventListener("click", (event) => {
  if (
    boardViewEl.classList.contains("board-view--hidden") ||
    (!event.target.closest(".cell") && !event.target.closest("#mark-btn"))
  ) {
    clearSelection();
  }
});

resumeSavedBoard();
