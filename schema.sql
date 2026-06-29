CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  board_size INTEGER NOT NULL DEFAULT 3,
  cell_texts TEXT NOT NULL DEFAULT '{}',
  marked_cells TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
