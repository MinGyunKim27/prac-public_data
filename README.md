# MOOVE

교통약자(고령자, 장애인, 임산부, 유모차 이용자)를 위한 실시간 스마트 이동 안내 서비스 모노레포입니다.

## 프로젝트 구조

```text
.
├─ backend/   # Spring Boot 3.3 백엔드
└─ frontend/  # 프론트엔드 작업 공간
```

## 기술 스택

- 백엔드: Java 17, Spring Boot 3.3, Spring Data JPA
- 데이터베이스: MySQL 8.0
- AI: Anthropic API
- 공공데이터: 교통약자이동지원, 초정밀버스, 교통안전신호등
- 지도/위치: Kakao Map API

## 백엔드 실행 방법

### 1. 준비 사항

- Java 17 설치
- MySQL 8.0 실행
- Gradle 설치

현재 저장소에는 `gradlew`/`gradlew.bat`가 없어서 로컬에 설치된 `gradle` 명령을 사용해야 합니다.

### 2. 데이터베이스 준비

MySQL에서 DB를 만든 뒤 [backend/schema.sql](/C:/Users/kmg02/MOOVE/moove-backend/backend/schema.sql) 내용을 적용합니다.

예시:

```sql
CREATE DATABASE moove CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. 환경 변수 설정

로컬에서 아래 값을 설정합니다.

- `ANTHROPIC_API_KEY`
- `PUBLIC_DATA_API_KEY`
- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`

예시:

```env
ANTHROPIC_API_KEY=your_anthropic_key
PUBLIC_DATA_API_KEY=your_public_data_key
DB_URL=jdbc:mysql://localhost:3306/moove?useSSL=false&serverTimezone=Asia/Seoul&characterEncoding=UTF-8
DB_USERNAME=moove
DB_PASSWORD=moove1234
```

### 4. 실행

```bash
cd backend
gradle bootRun
```

기본 실행 주소:

- API 서버: `http://localhost:8080`

### 5. 테스트

```bash
cd backend
gradle test
```

## 주요 백엔드 기능

- `GET /api/mobility`
  교통약자이동지원, 버스, 신호등 데이터를 통합 조회합니다.
- `GET /api/ai/recommend`
  사용자 위치와 유형 기반 AI 추천을 SSE로 스트리밍합니다.
- `POST /api/ai/chat`
  챗봇 응답을 SSE로 스트리밍합니다.
- `POST /api/chat/sessions`
  챗봇 세션을 생성합니다.

자세한 API 문서는 [docs/API_SPEC.md](/C:/Users/kmg02/MOOVE/moove-backend/docs/API_SPEC.md)를 참고하세요.

## 백엔드 설정 파일

- 메인 설정: [backend/src/main/resources/application.yml](/C:/Users/kmg02/MOOVE/moove-backend/backend/src/main/resources/application.yml)
- 테스트 설정: [backend/src/main/resources/application-test.yml](/C:/Users/kmg02/MOOVE/moove-backend/backend/src/main/resources/application-test.yml)

## 협업 메모

- 백엔드는 `backend/` 기준으로 작업합니다.
- 프론트엔드는 `frontend/` 기준으로 작업합니다.
- `.env`와 실제 키 값은 절대 커밋하지 않습니다.
- `stdgCd`는 클라이언트가 Kakao Map `coord2regioncode` 결과를 사용해 전달합니다.
