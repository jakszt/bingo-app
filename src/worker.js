const DEFAULT_STATE = {
  name: "",
  boardSize: 3,
  cellTexts: {},
  markedCells: [],
};

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const MAX_CREATE_ATTEMPTS = 8;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function parseBoardId(pathname) {
  const match = pathname.match(/^\/api\/board\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]).toUpperCase() : null;
}

function normalizeName(name) {
  return String(name || "").trim().slice(0, 80);
}

function normalizeState(payload) {
  const boardSize = payload.boardSize === 4 ? 4 : 3;
  const cellTexts =
    payload.cellTexts && typeof payload.cellTexts === "object" ? payload.cellTexts : {};
  const markedCells = Array.isArray(payload.markedCells) ? payload.markedCells : [];

  return {
    name: normalizeName(payload.name),
    boardSize,
    cellTexts,
    markedCells,
  };
}

function rowToState(row) {
  return {
    id: row.id,
    name: row.name || "",
    boardSize: row.board_size === 4 ? 4 : 3,
    cellTexts: JSON.parse(row.cell_texts || "{}"),
    markedCells: JSON.parse(row.marked_cells || "[]"),
  };
}

function generateCode() {
  let code = "";

  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }

  return code;
}

async function boardExists(db, boardId) {
  const row = await db
    .prepare("SELECT id FROM boards WHERE id = ?")
    .bind(boardId)
    .first();

  return Boolean(row);
}

async function createUniqueCode(db) {
  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
    const code = generateCode();

    if (!(await boardExists(db, code))) {
      return code;
    }
  }

  throw new Error("Nie udało się wygenerować unikalnego kodu.");
}

async function getBoard(db, boardId) {
  const row = await db
    .prepare(
      "SELECT id, name, board_size, cell_texts, marked_cells FROM boards WHERE id = ?"
    )
    .bind(boardId)
    .first();

  if (!row) {
    return null;
  }

  return rowToState(row);
}

async function saveBoard(db, boardId, state, options = {}) {
  const normalized = normalizeState(state);
  const existing = await getBoard(db, boardId);
  const name = options.preserveName && existing ? existing.name : normalized.name;

  await db
    .prepare(
      `INSERT INTO boards (id, name, board_size, cell_texts, marked_cells, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         board_size = excluded.board_size,
         cell_texts = excluded.cell_texts,
         marked_cells = excluded.marked_cells,
         updated_at = datetime('now')`
    )
    .bind(
      boardId,
      name,
      normalized.boardSize,
      JSON.stringify(normalized.cellTexts),
      JSON.stringify(normalized.markedCells)
    )
    .run();

  return {
    id: boardId,
    name,
    boardSize: normalized.boardSize,
    cellTexts: normalized.cellTexts,
    markedCells: normalized.markedCells,
  };
}

async function createBoard(db, payload) {
  const name = normalizeName(payload.name);

  if (!name) {
    return jsonResponse({ error: "Podaj nazwę bingo." }, 400);
  }

  const boardId = await createUniqueCode(db);
  const boardSize = payload.boardSize === 4 ? 4 : 3;

  await db
    .prepare(
      `INSERT INTO boards (id, name, board_size, cell_texts, marked_cells, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(boardId, name, boardSize, "{}", "[]")
    .run();

  return jsonResponse({
    id: boardId,
    name,
    boardSize,
    cellTexts: {},
    markedCells: [],
  }, 201);
}

async function handleBoardCollection(request, env) {
  if (request.method === "POST") {
    let payload;

    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Nieprawidłowy format danych." }, 400);
    }

    return createBoard(env.DB, payload);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  return jsonResponse({ error: "Metoda niedozwolona." }, 405);
}

async function handleBoardItem(request, env, boardId) {
  if (request.method === "GET") {
    const board = await getBoard(env.DB, boardId);

    if (!board) {
      return jsonResponse({ error: "Nie znaleziono bingo o podanym kodzie." }, 404);
    }

    return jsonResponse(board);
  }

  if (request.method === "PUT") {
    let payload;

    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Nieprawidłowy format danych." }, 400);
    }

    const exists = await boardExists(env.DB, boardId);

    if (!exists) {
      return jsonResponse({ error: "Nie znaleziono bingo o podanym kodzie." }, 404);
    }

    const saved = await saveBoard(env.DB, boardId, payload, { preserveName: true });
    return jsonResponse(saved);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  return jsonResponse({ error: "Metoda niedozwolona." }, 405);
}

async function handleApi(request, env) {
  const url = new URL(request.url);

  if (url.pathname === "/api/board") {
    return handleBoardCollection(request, env);
  }

  const boardId = parseBoardId(url.pathname);

  if (!boardId) {
    return jsonResponse({ error: "Nie znaleziono planszy." }, 404);
  }

  return handleBoardItem(request, env, boardId);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
