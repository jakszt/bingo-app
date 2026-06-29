const DEFAULT_STATE = {
  boardSize: 3,
  cellTexts: {},
  markedCells: [],
};

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
  return match ? decodeURIComponent(match[1]) : null;
}

function normalizeState(payload) {
  const boardSize = payload.boardSize === 4 ? 4 : 3;
  const cellTexts =
    payload.cellTexts && typeof payload.cellTexts === "object" ? payload.cellTexts : {};
  const markedCells = Array.isArray(payload.markedCells) ? payload.markedCells : [];

  return {
    boardSize,
    cellTexts,
    markedCells,
  };
}

async function getBoard(db, boardId) {
  const row = await db
    .prepare(
      "SELECT board_size, cell_texts, marked_cells FROM boards WHERE id = ?"
    )
    .bind(boardId)
    .first();

  if (!row) {
    return null;
  }

  return {
    boardSize: row.board_size === 4 ? 4 : 3,
    cellTexts: JSON.parse(row.cell_texts || "{}"),
    markedCells: JSON.parse(row.marked_cells || "[]"),
  };
}

async function saveBoard(db, boardId, state) {
  const normalized = normalizeState(state);

  await db
    .prepare(
      `INSERT INTO boards (id, board_size, cell_texts, marked_cells, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         board_size = excluded.board_size,
         cell_texts = excluded.cell_texts,
         marked_cells = excluded.marked_cells,
         updated_at = datetime('now')`
    )
    .bind(
      boardId,
      normalized.boardSize,
      JSON.stringify(normalized.cellTexts),
      JSON.stringify(normalized.markedCells)
    )
    .run();

  return normalized;
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const boardId = parseBoardId(url.pathname);

  if (!boardId) {
    return jsonResponse({ error: "Nie znaleziono planszy." }, 404);
  }

  if (request.method === "GET") {
    const board = await getBoard(env.DB, boardId);
    return jsonResponse(board || DEFAULT_STATE);
  }

  if (request.method === "PUT") {
    let payload;

    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Nieprawidłowy format danych." }, 400);
    }

    const saved = await saveBoard(env.DB, boardId, payload);
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
