const tables = {
    users: `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE,
            password VARCHAR(255),
            image VARCHAR,
            social_media_accounts jsonb DEFAULT '[]'::jsonb,
            bio TEXT,
            email_verified BOOLEAN DEFAULT FALSE,
            verification_token VARCHAR(255),
            verification_token_expires TIMESTAMP WITH TIME ZONE,
            auth_provider VARCHAR(20) DEFAULT 'email',
            auth_provider_id VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX idx_verification_token ON users(verification_token);
        CREATE INDEX idx_auth_provider ON users(auth_provider, auth_provider_id);
    `,
    venues: `
        CREATE TABLE IF NOT EXISTS venues (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            address TEXT,
            latitude NUMERIC(10,7),
            longitude NUMERIC(10,7),
            phone VARCHAR(20),
            url TEXT,
            additional_info TEXT,
            utc_offset INTEGER DEFAULT '-420'::integer NOT NULL,
            CONSTRAINT chk_location CHECK (((address IS NOT NULL) OR ((latitude IS NOT NULL) AND (longitude IS NOT NULL))))
        );
    `,
    events: `
        CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            venue_id INTEGER REFERENCES venues(id) ON DELETE SET NULL,
            additional_info TEXT,
            name VARCHAR(255),
            start_time TIMESTAMP WITH TIME ZONE NOT NULL,
            end_time TIMESTAMP WITH TIME ZONE NOT NULL,
            slot_duration INTERVAL NOT NULL,
            setup_duration INTERVAL,
            image VARCHAR(255),
            host_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            types TEXT[] DEFAULT '{}'::text[],
            active BOOLEAN DEFAULT true NOT NULL,
            is_signup_open BOOLEAN DEFAULT true,
            deleted BOOLEAN DEFAULT false NOT NULL
        );
    `,
    lineup_slots: `
        CREATE TABLE IF NOT EXISTS lineup_slots (
            id SERIAL PRIMARY KEY,
            event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            slot_number INTEGER NOT NULL,
            slot_name VARCHAR(255),
            non_user_identifier VARCHAR(255),
            ip_address VARCHAR(45)
        );
        CREATE INDEX IF NOT EXISTS idx_lineup_slots_event_user ON lineup_slots(event_id, user_id);
    `,
    notification_preferences: `
        CREATE TABLE IF NOT EXISTS notification_preferences (
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            notify_event_updates BOOLEAN DEFAULT true,
            notify_signup_notifications BOOLEAN DEFAULT true,
            notify_other BOOLEAN DEFAULT true,
            PRIMARY KEY (user_id)
        );
    `,
    notifications: `
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
            lineup_slot_id INTEGER REFERENCES lineup_slots(id) ON DELETE SET NULL,
            type VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT false,
            read_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    `,
    links: `
        CREATE TABLE IF NOT EXISTS links (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            url TEXT NOT NULL,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
        );
    `
};

module.exports = tables;