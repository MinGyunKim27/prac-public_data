package com.moove.repository;

import com.moove.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // 최근 N개 메시지 조회 (Claude 5턴 컨텍스트용)
    List<ChatMessage> findTop10BySessionSessionIdOrderByCreatedAtAsc(Long sessionId);
}
