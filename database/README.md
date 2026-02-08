# 📚 데이터베이스 함수 관리 가이드

## 🎯 핵심 파일

### 1. **core_functions.sql** ⭐ (가장 중요)
**모든 핵심 RPC 함수를 통합 관리하는 마스터 파일**

#### 포함된 함수:
- **데이터 정합성**: `fix_rental_data_consistency()`, `cleanup_expired_dibs()`
- **사용자 대여**: `dibs_any_copy()`, `rent_any_copy()`
- **관리자**: `admin_rent_copy()`, `admin_return_copy()`, `safe_delete_game()`
- **키오스크**: `kiosk_rental()`, `kiosk_return()`, `register_match_result()`, `earn_points()`
- **유틸리티**: `increment_view_count()`, `get_trending_games()`

#### 사용법:
```sql
-- Supabase SQL Editor에서 전체 실행
-- 모든 함수가 한 번에 생성/업데이트됨
```

---

### 2. **fix_data_consistency.sql** 🔧
**데이터 정합성 문제 해결 전용 파일**

#### 주요 기능:
- 만료된 찜 정리
- 고아 RESERVED/RENTED 상태 복구
- 중복 활성 대여 제거
- 상태 불일치 자동 수정

#### 실행 방법:
```sql
SELECT fix_rental_data_consistency();
```

#### 결과 예시:
```json
{
  "success": true,
  "details": {
    "expired_dibs_closed": 5,
    "orphan_reserved_fixed": 3,
    "orphan_rented_fixed": 2,
    "duplicate_rentals_closed": 1,
    "status_mismatches_fixed": 4
  }
}
```

---

## 🔄 주기적 관리가 필요한 함수

### 1. `fix_rental_data_consistency()` - **매 10분마다 실행 권장**

**자동 실행 설정 (pg_cron):**
```sql
-- 1. pg_cron 확장 활성화 (한 번만)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. 스케줄 등록
SELECT cron.schedule(
    'fix-rental-consistency',
    '*/10 * * * *',  -- 매 10분
    'SELECT fix_rental_data_consistency();'
);

-- 3. 스케줄 확인
SELECT * FROM cron.job;

-- 4. 스케줄 삭제 (필요시)
SELECT cron.unschedule('fix-rental-consistency');
```

**또는 GitHub Actions 사용:**
```yaml
# .github/workflows/cleanup-data.yml
name: Cleanup Data
on:
  schedule:
    - cron: '*/10 * * * *'  # 매 10분
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Fix Data Consistency
        run: |
          curl -X POST \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}" \
            -H "Content-Type: application/json" \
            "https://your-project.supabase.co/rest/v1/rpc/fix_rental_data_consistency"
```

---

## 📋 파일별 역할 정리

| 파일 | 역할 | 실행 빈도 |
|------|------|----------|
| **core_functions.sql** | 모든 핵심 함수 통합 관리 | 함수 업데이트 시 |
| **fix_data_consistency.sql** | 데이터 정합성 정리 | 매 10분 (자동) |
| **cleanup_dibs.sql** | 만료된 찜 정리 (레거시) | 사용 안 함 (core_functions에 통합) |
| **update_rpc_dibs.sql** | 찜/대여 함수 (레거시) | 사용 안 함 (core_functions에 통합) |
| **harden_core_logic.sql** | 보안 강화 함수 (레거시) | 사용 안 함 (core_functions에 통합) |

---

## 🚀 초기 설정 가이드

### 1단계: 핵심 함수 설치
```sql
-- Supabase SQL Editor에서 실행
-- core_functions.sql 파일 전체 복사 & 실행
```

### 2단계: 자동 정리 설정
```sql
-- pg_cron 활성화 및 스케줄 등록
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'fix-rental-consistency',
    '*/10 * * * *',
    'SELECT fix_rental_data_consistency();'
);
```

### 3단계: 설치 확인
```sql
-- 모든 함수가 정상 생성되었는지 확인
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'fix_rental_data_consistency',
    'dibs_any_copy',
    'rent_any_copy',
    'admin_rent_copy',
    'admin_return_copy',
    'kiosk_rental',
    'kiosk_return'
  )
ORDER BY routine_name;
```

---

## 🔍 문제 해결

### 문제: 찜/대여/반납이 정상 작동하지 않음
**해결:**
```sql
-- 즉시 데이터 정리 실행
SELECT fix_rental_data_consistency();
```

### 문제: 고아 데이터 발견 (rentals와 game_copies 상태 불일치)
**해결:**
```sql
-- 정합성 정리 함수가 자동으로 해결
SELECT fix_rental_data_consistency();
```

### 문제: 만료된 찜이 계속 남아있음
**해결:**
```sql
-- pg_cron 스케줄 확인
SELECT * FROM cron.job;

-- 없으면 다시 등록
SELECT cron.schedule(
    'fix-rental-consistency',
    '*/10 * * * *',
    'SELECT fix_rental_data_consistency();'
);
```

---

## 📊 모니터링

### 데이터 정합성 상태 확인
```sql
-- 활성 찜 개수
SELECT COUNT(*) as active_dibs
FROM rentals
WHERE type = 'DIBS' AND returned_at IS NULL;

-- 활성 대여 개수
SELECT COUNT(*) as active_rentals
FROM rentals
WHERE type = 'RENT' AND returned_at IS NULL;

-- 상태별 재고 현황
SELECT status, COUNT(*) as count
FROM game_copies
GROUP BY status;

-- 고아 데이터 확인 (있으면 안 됨)
SELECT gc.copy_id, gc.status
FROM game_copies gc
WHERE gc.status = 'RESERVED'
  AND NOT EXISTS (
    SELECT 1 FROM rentals r
    WHERE r.copy_id = gc.copy_id
      AND r.type = 'DIBS'
      AND r.returned_at IS NULL
  );
```

---

## ⚠️ 주의사항

1. **core_functions.sql 수정 시**: 전체 파일을 다시 실행하여 모든 함수 업데이트
2. **pg_cron 사용 시**: Supabase 프로젝트 설정에서 pg_cron 확장이 활성화되어 있어야 함
3. **RLS 정책**: 모든 함수는 `SECURITY DEFINER`로 설정되어 RLS를 우회함
4. **백업**: 중요한 함수 수정 전에는 반드시 현재 함수 정의를 백업

---

## 📞 지원

문제 발생 시:
1. `SELECT fix_rental_data_consistency();` 실행
2. 결과 확인 후 어떤 데이터가 정리되었는지 체크
3. 여전히 문제가 있다면 로그 확인: `SELECT * FROM logs ORDER BY created_at DESC LIMIT 50;`
