-- MOOVE DB 스키마
-- 개발 가이드 8장 기준

CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id    BIGINT       AUTO_INCREMENT PRIMARY KEY,
    device_id     VARCHAR(64)  NOT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_active_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_device_id (device_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    message_id  BIGINT       AUTO_INCREMENT PRIMARY KEY,
    session_id  BIGINT       NOT NULL,
    role        ENUM('user','assistant') NOT NULL,
    content     TEXT         NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    INDEX idx_session_created (session_id, created_at)
);

CREATE TABLE IF NOT EXISTS api_cache (
    cache_id      BIGINT        AUTO_INCREMENT PRIMARY KEY,
    cache_key     VARCHAR(128)  NOT NULL UNIQUE,
    data_type     ENUM('TAXI','BUS','SIGNAL') NOT NULL,
    response_data JSON          NOT NULL,
    region_code   VARCHAR(10)   NOT NULL,
    cached_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at    DATETIME      NOT NULL,
    INDEX idx_cache_key (cache_key),
    INDEX idx_expires_at (expires_at)
);
