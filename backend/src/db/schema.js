const tables = {
    users: `
        CREATE TABLE IF NOT EXISTS users (
                                             id SERIAL PRIMARY KEY,
                                             name VARCHAR(255) NOT NULL,
                                             email VARCHAR(255) UNIQUE,
                                             password VARCHAR(255),
                                             image VARCHAR,
                                             social_media_accounts JSONB DEFAULT '[]'::jsonb
        );
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
                                              timezone VARCHAR(50) DEFAULT 'America/Los_Angeles',
                                              CONSTRAINT chk_location CHECK (
                                                      address IS NOT NULL OR (latitude IS NOT NULL AND longitude IS NOT NULL)
                                                  )
        );
    `,
    events: `
        CREATE TABLE IF NOT EXISTS events (
                                              id SERIAL PRIMARY KEY,
                                              venue_id INTEGER REFERENCES venues(id) ON DELETE CASCADE,
                                              additional_info TEXT,
                                              name VARCHAR(255),
                                              start_time TIMESTAMP WITH TIME ZONE NOT NULL,
                                              end_time TIMESTAMP WITH TIME ZONE NOT NULL,
                                              slot_duration INTERVAL NOT NULL,
                                              setup_duration INTERVAL,
                                              image VARCHAR(255),
                                              host_id INTEGER,
                                              types TEXT[] DEFAULT '{}'::text[],
                                              active BOOLEAN DEFAULT true NOT NULL,
                                              is_signup_open BOOLEAN DEFAULT true
        );
    `,
    lineup_slots: `
        CREATE TABLE IF NOT EXISTS lineup_slots (
                                                    id SERIAL PRIMARY KEY,
                                                    event_id INTEGER NOT NULL REFERENCES events(id),
                                                    user_id INTEGER REFERENCES users(id),
                                                    slot_number INTEGER NOT NULL,
                                                    slot_name VARCHAR(255),
                                                    non_user_identifier VARCHAR(255),
                                                    ip_address VARCHAR(45)
        );
        CREATE INDEX IF NOT EXISTS idx_lineup_slots_event_user ON lineup_slots(event_id, user_id);
    `,
    notification_preferences: `
        CREATE TABLE IF NOT EXISTS notification_preferences (
                                                                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                                                                notify_event_updates BOOLEAN DEFAULT true,
                                                                notify_signup_notifications BOOLEAN DEFAULT true,
                                                                notify_other BOOLEAN DEFAULT true
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