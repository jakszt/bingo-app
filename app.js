const boardEl = document.getElementById("board");
const markBarEl = document.getElementById("mark-bar");
const markBtnEl = document.getElementById("mark-btn");
const sizeButtons = document.querySelectorAll(".size-toggle__btn");

let boardSize = 3;
let selectedCell = null;
let cellTexts = {};

function cellKey(row, col) {
  return `${row}-${col}`;
}

function saveCellText(row, col, value) {
  cellTexts[cellKey(row, col)] = value;
}

function getCellText(row, col) {
  return cellTexts[cellKey(row, col)] || "";
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
  cell.className = "cell";
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

  sizeButtons.forEach((btn) => {
    const isActive = Number(btn.dataset.size) === size;
    btn.classList.toggle("size-toggle__btn--active", isActive);
    btn.setAttribute("aria-checked", String(isActive));
  });

  renderBoard();
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

renderBoard();
