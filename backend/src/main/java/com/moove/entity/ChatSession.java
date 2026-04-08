package com.moove.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_sessions", indexes = {
        @Index(name = "idx_device_id", columnList = "device_id")
})
@Getter
@NoArgsConstructor
public class ChatSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_id")
    private Long sessionId;

    @Column(name = "device_id", nullable = false, length = 64)
    private String deviceId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_active_at", nullable = false)
    private LocalDateTime lastActiveAt;

    public static ChatSession of(String deviceId) {
        ChatSession s = new ChatSession();
        s.deviceId = deviceId;
        s.createdAt = LocalDateTime.now();
        s.lastActiveAt = LocalDateTime.now();
        return s;
    }

    public void updateLastActive() {
        this.lastActiveAt = LocalDateTime.now();
    }
}
