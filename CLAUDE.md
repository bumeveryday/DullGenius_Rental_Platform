# 덜지니어스 보드게임 대여 시스템 — Claude 작업 가이드

## DB / SQL 작업 시 필수

**SQL·RPC·스키마·RLS 관련 작업을 시작하기 전에 반드시 아래 파일들을 읽어라:**

| 파일 | 내용 |
|------|------|
| `database/_LIVE/functions.sql` | 현재 배포된 모든 RPC 함수 (바디 포함) |
| `database/_LIVE/schema.sql`    | 모든 테이블 + 컬럼 정의 |
| `database/_LIVE/rls.sql`       | 모든 RLS 정책 |
| `database/_LIVE/types.sql`     | 커스텀 Enum 타입 |

> **SQL을 Supabase에 적용한 후에는 반드시 `npm run pull-schema` 를 실행해서 _LIVE 를 최신 상태로 유지하라.**

---

## 프로젝트 개요

보드게임 대여 서비스 (React + Vite + Supabase)

- **프론트엔드**: `src/` — React, react-router-dom
- **API 레이어**: `src/api.jsx` — Supabase 호출 전담
- **상수/설정**: `src/constants.jsx`
- **DB 마이그레이션 히스토리**: `database/` (레거시 포함, _LIVE가 최신)
- **유틸 스크립트**: `scripts/`
- **배포**: Netlify (`netlify.toml`)
