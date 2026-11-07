ALTER TABLE messages ADD COLUMN voice_sec integer;
ALTER TABLE messages ADD COLUMN reply_to_message_id uuid REFERENCES messages(id) ON DELETE SET NULL;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_kind;
ALTER TABLE messages ADD CONSTRAINT messages_kind CHECK (kind IN ('text', 'voice', 'photo', 'system'));
ALTER TABLE messages ADD COLUMN photos text[];

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_voice_sec;
ALTER TABLE messages ADD CONSTRAINT messages_voice_sec CHECK (voice_sec IS NULL OR (voice_sec >= 0 AND voice_sec <= 120));
