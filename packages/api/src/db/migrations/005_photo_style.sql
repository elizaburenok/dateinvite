CREATE TABLE photo_styles (
  owner_id TEXT PRIMARY KEY REFERENCES users(id),
  settings TEXT NOT NULL
);
