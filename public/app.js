const BOARD_ID_KEY = "bingo-board-id";

const boardEl = document.getElementById("board");
const markBarEl = document.getElementById("mark-bar");
const markBtnEl = document.getElementById("mark-btn");
const sizeButtons = document.querySelectorAll(".size-toggle__btn");
const statusEl = document.getElementById("sync-status");

let boardId = null;
let boardSize = 3;
let selectedCell = null;
let cellTexts = {};
let markedCells = new Set();
let saveTimer = null;
let isReady = false;

function cellKey(row, col) {
  return `${row}-${col}`;
}

function setStatus(message, isError = false) {
  if (!statusEl) {
    return;
  }

  statusEl.textContent = message;
  statusEl.classList.toggle("sync-status--error", isError);
}

function getOrCreateBoardId() {
  let id = localStorage.getItem(BOARD_ID_KEY);

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(BOARD_ID_KEY, id);
  }

  return id;
}

function applyState(state) {
  boardSize = state.boardSize === 4 ? 4 : 3;
  cellTexts = state.cellTexts && typeof state.cellTexts === "object" ? state.cellTexts : {};
  markedCells = new Set(Array.isArray(state.markedCells) ? state.markedCells : []);
}

function getStatePayload() {
  return {
    boardSize,
    cellTexts,
    markedCells: [...markedCells],
  };
}

async function loadState() {
  boardId = getOrCreateBoardId();
  setStatus("Ładowanie…");

  try {
    const response = await fetch(`/api/board/${boardId}`);

    if (!response.ok) {
      throw new Error("Nie udało się wczytać planszy.");
    }

    applyState(await response.json());
    isReady = true;
    setStatus("Zapisane w chmurze");
  } catch (error) {
    isReady = false;
    setStatus(error.message || "Błąd połączenia z bazą", true);
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

    if (!response.ok) {
      throw new Error("Nie udało się zapisać planszy.");
    }

    applyState(await response.json());
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

sizeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setBoardSize(Number(btn.dataset.size));
  });
});

markBtnEl.addEventListener("click", markSelectedCell);

document.addEventListener("click", (event) => {
  if (
    !event.target.closest(".cell") &&
    !event.target.closest("#mark-btn")
  ) {
    clearSelection();
  }
});

async function init() {
  await loadState();
  syncSizeButtons();
  renderBoard();
}

init();
