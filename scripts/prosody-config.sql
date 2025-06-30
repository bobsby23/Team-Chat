-- Prosody XMPP Server Configuration for Bobsby Chat
-- This would be implemented in Prosody's Lua configuration

-- Virtual Host Configuration
-- VirtualHost "chat.bobsby.online"
--     enabled = true
--     authentication = "internal_hashed"
--     
--     -- SSL Configuration
--     ssl = {
--         key = "/path/to/private.key";
--         certificate = "/path/to/certificate.crt";
--         protocol = "tlsv1_2+";
--         ciphers = "ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!SHA1:!AESCCM";
--     }
--     
--     -- Modules
--     modules_enabled = {
--         -- Core modules
--         "roster"; "saslauth"; "tls"; "dialback"; "disco";
--         "carbons"; "pep"; "private"; "blocklist"; "vcard4";
--         "vcard_legacy"; "version"; "uptime"; "time";
--         "ping"; "register"; "admin_adhoc";
--         
--         -- Multi-User Chat
--         "muc";
--         "muc_mam"; -- Message Archive Management for MUC
--         
--         -- Security & Privacy
--         "smacks"; -- Stream Management
--         "csi_simple"; -- Client State Indication
--         "filter_chatstates";
--         
--         -- Guest Access
--         "anonymous_auth";
--         "guest_auth";
--         
--         -- OMEMO Support
--         "pep_simple";
--         "pubsub";
--     }
--     
--     -- MUC Configuration
--     Component "conference.chat.bobsby.online" "muc"
--         modules_enabled = {
--             "muc_mam";
--             "vcard_muc";
--         }
--         muc_room_locking = false
--         muc_room_lock_timeout = 300
--         muc_tombstones = true
--         muc_room_default_public = false
--         muc_room_default_members_only = true
--         muc_room_default_moderated = false
--         muc_room_default_public_jids = false
--         muc_room_default_change_subject = false
--         muc_room_default_history_length = 20

-- Database schema for user management and room persistence
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_guest BOOLEAN DEFAULT FALSE,
    guest_expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_rooms (
    id SERIAL PRIMARY KEY,
    room_jid VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INTEGER REFERENCES users(id),
    is_public BOOLEAN DEFAULT FALSE,
    max_members INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    room_code VARCHAR(10) UNIQUE
);

CREATE TABLE IF NOT EXISTS room_members (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES chat_rooms(id),
    user_id INTEGER REFERENCES users(id),
    role VARCHAR(50) DEFAULT 'member', -- owner, admin, member, guest
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS guest_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    room_id INTEGER REFERENCES chat_rooms(id),
    created_by INTEGER REFERENCES users(id),
    expires_at TIMESTAMP NOT NULL,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_guest_expires ON users(guest_expires_at) WHERE is_guest = TRUE;
CREATE INDEX idx_chat_rooms_code ON chat_rooms(room_code);
CREATE INDEX idx_room_members_room_user ON room_members(room_id, user_id);
CREATE INDEX idx_guest_tokens_token ON guest_tokens(token);
CREATE INDEX idx_guest_tokens_expires ON guest_tokens(expires_at);
