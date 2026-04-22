-- INTELINK-011: Chat history tables (sessions + messages + shared access)
-- Discovered 2026-04-22: route.ts saved chat history to non-existent tables.
-- saveHistory failed silently (try/catch swallow) — UI history sidebar always empty.
-- Applied via Supabase MCP migration `intelink_chat_history_tables` on 2026-04-22.

CREATE TABLE IF NOT EXISTS intelink_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mode TEXT NOT NULL CHECK (mode IN ('single', 'central')),
    investigation_id UUID REFERENCES intelink_investigations(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'Nova conversa',
    message_count INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    member_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intelink_chat_sessions_member ON intelink_chat_sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_intelink_chat_sessions_investigation ON intelink_chat_sessions(investigation_id);
CREATE INDEX IF NOT EXISTS idx_intelink_chat_sessions_updated ON intelink_chat_sessions(updated_at DESC);

CREATE OR REPLACE FUNCTION intelink_chat_sessions_touch()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_intelink_chat_sessions_touch ON intelink_chat_sessions;
CREATE TRIGGER trg_intelink_chat_sessions_touch
    BEFORE UPDATE ON intelink_chat_sessions
    FOR EACH ROW EXECUTE FUNCTION intelink_chat_sessions_touch();

CREATE TABLE IF NOT EXISTS intelink_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES intelink_chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tokens INTEGER,
    context_size INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intelink_chat_messages_session ON intelink_chat_messages(session_id, created_at);

CREATE TABLE IF NOT EXISTS intelink_chat_shared_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES intelink_chat_sessions(id) ON DELETE CASCADE,
    shared_with_member_id UUID NOT NULL,
    can_interact BOOLEAN NOT NULL DEFAULT false,
    shared_by_member_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, shared_with_member_id)
);

CREATE INDEX IF NOT EXISTS idx_intelink_chat_shared_member ON intelink_chat_shared_access(shared_with_member_id);

ALTER TABLE intelink_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelink_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelink_chat_shared_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_chat_sessions" ON intelink_chat_sessions
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_chat_messages" ON intelink_chat_messages
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_chat_shared" ON intelink_chat_shared_access
    FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE intelink_chat_sessions IS 'Chat conversations between investigators and Intelink AI. Created by route.ts saveHistory branch.';
COMMENT ON TABLE intelink_chat_messages IS 'Individual messages within a chat session. Append-only.';
COMMENT ON TABLE intelink_chat_shared_access IS 'Cross-member sharing of chat sessions. can_interact=true allows the recipient to continue the conversation.';
