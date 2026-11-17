-- Tags belong to the owner, independently of the places using them.
CREATE TABLE tags (
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  normalized_name TEXT NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (owner_id, normalized_name)
);

INSERT OR IGNORE INTO tags (owner_id, normalized_name, name)
SELECT places.owner_id, lower_utf8(trim(json_each.value)), trim(json_each.value)
FROM places, json_each(places.tags)
WHERE json_each.type = 'text' AND trim(json_each.value) <> ''
ORDER BY places.created_at, places.rowid;
