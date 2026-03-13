# 덜지니어스 보드게임 대여 시스템 — Claude 작업 가이드

## 스택
React + Vite + Supabase / 배포: Netlify (`netlify.toml`)

---

## 소스 구조 (핵심 파일)

| 경로 | 역할 |
|------|------|
| `src/api.jsx` | Supabase 호출 전담 API 레이어 |
| `src/api_members.jsx` | 회원·오피스아워 관련 API |
| `src/lib/supabaseClient.jsx` | Supabase 클라이언트 — **항상 named import**: `import { supabase } from '../lib/supabaseClient.jsx'` |
| `src/constants.jsx` | 상수·STATUS enum 헬퍼 |
| `src/lib/gameStatus.js` | 게임 상태 계산 로직 |
| `src/lib/hangul.jsx` | 한글 초성 검색 유틸 |
| `src/lib/searchUtils.jsx` | 검색 유틸 |
| `src/hooks/useGameFilter.jsx` | 게임 필터링 훅 |
| `src/hooks/useKioskData.jsx` | 키오스크 데이터 훅 |
| `src/contexts/AuthContext.jsx` | 인증 Context — `useAuth()` → `{ user, profile, roles, hasRole, login, logout, loading }` |
| `src/contexts/GameDataContext.jsx` | 게임 데이터 Context — `useGameData()` → `{ games, trending, loading }` |
| `src/contexts/ToastContext.jsx` | 알림 Context — `useToast()` → `showToast(msg, { type })` |
| `src/Admin.jsx` | 관리자 페이지 컨테이너 (탭 라우팅) |
| `src/admin/` | 관리자 탭 컴포넌트들 |
| `src/kiosk/KioskPage.jsx` | 키오스크 메인 (Supabase kiosk 계정 자동 로그인) |
| `src/pages/` | 일반 사용자 페이지 |
| `src/components/` | 공용 컴포넌트 |

## 라우트 구조 (`src/App.jsx`)

```
/                   → Home
/categories         → CategorySelect
/search             → GameSearch
/game/:id           → GameDetail
/mypage             → MyPage
/login, /signup, /reset-password
/admin-secret       → Admin (ProtectedRoute: admin, executive)
/org-rental         → OrgRental
/kiosk              → KioskPage (kiosk 계정 자동 로그인)
```

---

## DB 작업 규칙

**SQL·RPC·스키마·RLS 작업 전 반드시 읽을 파일:**

| 파일 | 내용 |
|------|------|
| `database/_LIVE/functions.sql` | 현재 배포된 모든 RPC 함수 |
| `database/_LIVE/schema.sql` | 모든 테이블 + 컬럼 정의 |
| `database/_LIVE/rls.sql` | 모든 RLS 정책 |
| `database/_LIVE/types.sql` | 커스텀 Enum 타입 |

**MCP 도구 사용:**
- DDL (CREATE/ALTER/함수 생성): `mcp__supabase__apply_migration`
- 조회·DML: `mcp__supabase__execute_sql`
- **SQL 적용 후 반드시**: `npm run pull-schema` → `_LIVE` 동기화

**권한 함수:**
- `is_admin()` → admin, executive만 허용 (kiosk 제외)
- `is_kiosk_or_admin()` → admin, executive, kiosk 허용 (키오스크 RPC 전용)

---

## 코드 패턴 규칙

**Supabase RPC 호출:**
```js
supabase.rpc('function_name', { params })
```

**fire-and-forget 로그:** `await` 없이, `.catch` 없이 호출

**Admin 다크 테마** (흰 배경·검은 글씨 절대 금지):
```js
var(--admin-bg)          // 페이지 배경
var(--admin-card-bg)     // 카드 배경
var(--admin-text-main)   // 주 텍스트
var(--admin-text-sub)    // 보조 텍스트
var(--admin-border)      // 테두리
```

**AuthContext 특이사항:**
- `kiosk` role 유저는 `profiles` 레코드 없어도 자동 로그아웃 안 됨 (AuthContext 내 분기 처리)
- `hasRole('kiosk')` 로 키오스크 여부 확인

---

## 이용자 특성
- 일반 사용자: 주로 모바일
- 관리자/운영진: 주로 PC
- 키오스크: `kiosk@handong.ac.kr` 계정으로 자동 로그인 (env: `VITE_KIOSK_EMAIL`, `VITE_KIOSK_PASSWORD`)
