# UX 개선 테스트 가이드

이번 작업으로 바뀐 항목을 직접 눈/키보드로 확인할 수 있는 체크리스트입니다.
순서대로 따라가면 12개 변경점을 모두 검증할 수 있어요.

> 실행: `npm run dev` → 표시되는 로컬 주소(보통 `http://localhost:5173`) 접속

---

## 1. Toast 색상 토큰화 (App.css / ToastContext)

**무엇이 바뀜:** 토스트 알림 색상이 CSS 변수(`--color-*`)로 추출되어 디자인 토큰화.
이후 브랜드 컬러 변경 시 한 곳만 수정하면 됨.

**테스트:**
1. 로그인 시도 시 잘못된 비밀번호 입력 → **빨간색 ❌ 에러 토스트**
2. 회원가입 폼에서 필수 항목 비우고 제출 → **주황색 ⚠️ 경고 토스트**
3. 정상 로그인 → **녹색 ✅ 성공 토스트**

**확인 포인트:** 색상이 이전과 동일해 보이면 OK (토큰화는 시각적 변화 없음).
DevTools → Elements → `:root` 확인 시 `--color-primary-alpha` 등 변수 존재.

---

## 2. ModalButton 컴포넌트 도입 (ConfirmModal/InfoModal/LoginModal)

**무엇이 바뀜:** 모달 버튼이 공용 `ModalButton`으로 통일. hover/active 효과를 CSS로 처리해 성능 개선(불필요한 리렌더 제거).

**테스트:**
1. 게임 상세 페이지에서 **대여 신청** 클릭 → LoginModal 노출
2. 모달 하단 **✓ 대여 신청** 버튼에 마우스 hover → 살짝 어두워짐 + 위로 살짝 떠오름
3. 클릭 누르고 있는 동안 → 살짝 눌리는 느낌
4. **✕ 취소** 버튼도 동일하게 hover/active 반응 확인

**확인 포인트:** hover/active 시 React DevTools Profiler를 켜두면 리렌더가 발생하지 않아야 함.

---

## 3. 모달 접근성: ARIA + 포커스 트랩 (ConfirmModal/InfoModal/LoginModal)

**무엇이 바뀜:**
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` 추가
- 키보드 Tab이 모달 안에서만 순환
- ESC 키로 닫기
- 모달이 열릴 때 자동 포커스 (LoginModal 게스트 모드는 첫 input, 그 외는 첫 버튼)

**테스트 (LoginModal):**
1. 메인 페이지 → 게임 상세 → **대여 신청** 클릭
2. 모달 열리면 마우스 만지지 말고 키보드만 사용
3. 처음 포커스가 **이름 입력칸**에 떨어져 있는지 확인
4. **Tab 키 반복** → 모달 안의 input/버튼 사이만 순환해야 함 (배경 페이지로 빠지지 않음)
5. **Shift+Tab** → 역순 순환
6. **ESC 키** → 모달 닫힘

**테스트 (ConfirmModal):**
1. 마이페이지 → 찜 목록의 **❌ 찜 취소** 클릭 (확인 모달)
2. 첫 포커스가 **취소 버튼**에 가있는지 확인
3. Tab/Shift+Tab으로 두 버튼 사이만 이동
4. ESC로 닫기

**확인 포인트:** 스크린리더(NVDA, VoiceOver) 사용 시 "대화상자" 알림 + 제목 읽어줌.

---

## 4. 키보드 포커스 표시 복원 (Admin.css)

**무엇이 바뀜:** Admin 페이지에서 `outline: none`이 삭제되고 `:focus-visible` 기반의 보라색 외곽선이 추가됨.
마우스 클릭에는 표시되지 않고 **키보드 Tab 이동 시에만** 표시되어 접근성 + UX 양립.

**테스트:**
1. `/admin-secret` 접속 → 관리자 로그인
2. 마우스로 탭 버튼 클릭 → 외곽선 표시 **안 됨** (이전과 동일)
3. **Tab 키**로 탭 버튼들 사이 이동 → 보라색 외곽선이 현재 포커스 위치에 표시됨
4. input/select/textarea도 Tab으로 진입 시 외곽선 표시 확인

---

## 5. 찜 취소 중복 클릭 방지 (MyPage)

**무엇이 바뀜:** 찜 취소 버튼이 처리 중일 때 비활성화 + 텍스트가 "처리 중..."으로 변경.

**테스트:**
1. 마이페이지 → 찜 목록에 항목이 있어야 함 (없으면 메인에서 ❤️ 클릭으로 추가)
2. **❌ 찜 취소** 클릭 → **브라우저 확인창**에서 **확인** (현재 `window.confirm` 사용 — 추후 ConfirmModal로 교체 예정)
3. 처리되는 순간 버튼이 회색으로 변하고 **"처리 중..."** 표시
4. 짧은 시간이라 보기 어려우면 DevTools → Network → throttle을 Slow 3G로 설정 후 재시도

**확인 포인트:** 처리 중 두 번 클릭해도 한 번만 처리됨 (Network 탭에서 요청 1회만).

---

## 6. 관리자 RentalRequests 라벨 개선

**무엇이 바뀜:** 외부 대여 자동 매칭 결과 라벨이 명확해짐.
- `매칭 실패` → **`매칭 실패 (수동 선택 필요)`**
- `파싱 실패` → **`날짜 해석 실패 (직접 입력 필요)`**
- hover 시 툴팁(title 속성) 표시

**테스트:**
1. `/admin-secret` → **외부 대여 요청** 탭
2. 자동 매칭에 실패한 항목이 있으면 라벨 확인
3. 라벨 위에 마우스를 잠시 올려보면 툴팁 표시됨

**확인 포인트:** 외부 대여 자동화가 들어와있는 상태에서만 노출됨 (HOLD 상태의 대여).

---

## 7. 회원가입 전화번호 +82 자동 정규화 (Signup)

**무엇이 바뀜:** 회원가입 시 전화번호에 `+82 10-1234-5678` 같은 국가코드 형식을 넣어도 자동으로 `01012345678`로 변환.

**테스트:**
1. `/signup` 접속
2. 전화번호 칸에 `+821012345678` 입력 → 입력값이 즉시 **`01012345678`** 로 변경됨
3. 또는 `82 10 1234 5678` 입력 → 동일하게 `01012345678`
4. 그냥 `01012345678` 입력 → 그대로 `01012345678`

**확인 포인트:** 숫자가 아닌 문자(공백·하이픈·`+`)는 자동 제거됨.

---

## 8. 소형 화면 1열 그리드 (Home.css)

**무엇이 바뀜:** 화면 너비 ≤ 380px일 때 메인 화면의 **카테고리/검색** 카드 2열 → 1열로 전환되어 버튼이 충분히 커짐.

**테스트:**
1. 메인 페이지 접속
2. DevTools 열기 → **Toggle device toolbar** (Ctrl+Shift+M / Cmd+Shift+M)
3. 디바이스를 **iPhone SE (375px)** 또는 **Galaxy Fold (280px)** 로 설정
4. **카테고리** / **검색** 카드가 위아래로 한 줄씩 배치되는지 확인
5. 너비를 **iPhone 12 (390px)** 이상으로 늘리면 다시 2열로 복귀

---

## 9. Toast 객체 재생성 제거 (ToastContext 성능)

**무엇이 바뀜:** `TOAST_TYPE_COLORS` 객체가 컴포넌트 바깥으로 이동 — 매 렌더마다 재생성되던 객체가 한 번만 생성됨.

**테스트 (선택, 개발자용):**
1. DevTools → React DevTools → Profiler 탭
2. Record 시작 → 토스트 여러 개 띄움 → Record 중지
3. `Toast` 컴포넌트의 렌더 시간이 이전 대비 약간 줄어들면 성공

**확인 포인트:** 시각적 차이는 없음. 순수 perf 개선.

---

## 변경된 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `src/App.css` | 디자인 토큰(`--color-*`) 추가 |
| `src/contexts/ToastContext.jsx` | 상수 객체 외부 이동 + 토큰 사용 |
| `src/components/ModalButton.jsx` (신규) | 모달 공용 버튼 |
| `src/components/ModalButton.css` (신규) | 버튼 hover/active 스타일 |
| `src/hooks/useFocusTrap.jsx` (신규) | 포커스 트랩 훅 |
| `src/components/ConfirmModal.jsx` | a11y + ModalButton 적용 |
| `src/components/InfoModal.jsx` | a11y + 포커스 트랩 |
| `src/components/LoginModal.jsx` | a11y + 포커스 트랩 + ModalButton + label 추가 |
| `src/Admin.css` | `:focus-visible` 키보드 외곽선 |
| `src/components/MyPage.jsx` | `cancelingIds` Set으로 더블클릭 방지 |
| `src/admin/RentalRequestsTab.jsx` | 라벨 명확화 + title 속성 |
| `src/components/Signup.jsx` | `+82` 전화번호 정규화 |
| `src/pages/Home.css` | 380px 미디어 쿼리(2→1열) |

---

## 보류된 항목 (HOLD)

다음은 정책 결정이 필요해서 이번에는 적용하지 않음:

- **C-1**: API 에러 처리 패턴 통일 — 범위가 넓고 회귀 위험 큼 → 별도 PR
- **학번 8자리 외 학생** 지원 정책
- **Supabase 비밀번호 정책** (최소 길이/복잡도) 결정
- **line-height** 전역 정책 — 폰트 변경과 함께 다룰 예정
