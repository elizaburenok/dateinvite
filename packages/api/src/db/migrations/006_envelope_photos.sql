-- Changing a photo's raster must not alter an already sent invitation.
ALTER TABLE envelope_places ADD COLUMN photos TEXT;
UPDATE envelope_places
SET photos = (SELECT p.photos FROM places p WHERE p.id = envelope_places.place_id);
