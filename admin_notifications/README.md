# 관리자 알림 시스템 설정 가이드

이 폴더(`admin_notifications`)는 관리자를 위한 통합 알림 시스템을 포함하고 있습니다.
모든 알림은 **Discord Webhook**을 통해 관리자의 개인 디스코드 채널로 전송됩니다.

## 1. Discord Webhook URL 발급
1. 본인의 디스코드 서버(또는 개인 서버 생성)에 접속합니다.
2. 알림을 받을 **채널 설정(톱니바퀴) > 연동(Integrations) > 웹후크(Webhooks)** 로 이동합니다.
3. **새 웹후크**를 만들고 URL을 복사합니다.

## 2. 환경 변수 설정 (.env)
프로젝트 루트의 `.env` 파일에 아래 내용을 추가하세요.
```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL_HERE
DISCORD_BOT_NAME=덜지니어스 연체 관리자
DISCORD_AVATAR_URL=https://cdn-icons-png.flaticon.com/512/3523/3523063.png
```

- `DISCORD_BOT_NAME`: 알림을 보낼 때 표시될 봇의 이름입니다.
- `DISCORD_AVATAR_URL`: 봇 프로필 사진 URL입니다. (이미지 주소 복사하여 사용)

---

## 3. 기능 1: 매일 아침 연체 브리핑 (Daily Briefing)
매일 아침 연체자가 있는지 확인하고 알려줍니다.

### 수동 실행 테스트
```bash
node admin_notifications/daily_briefing.js
```
*주의: `node-fetch` 모듈이 필요할 수 있습니다. (`npm install node-fetch`)*

### 자동 실행 (GitHub Actions)
`.github/workflows/daily_briefing.yml` 파일에 의해 매일 한국 시간 오전 9시에 자동 실행됩니다.
(Github Repository의 Settings > Secrets에 `DISCORD_WEBHOOK_URL` 등을 등록해야 합니다)

---

## 4. 기능 2: 실시간 알림 (Supabase Edge Function)
신규 가입, 대여 발생 시 즉시 알림을 보냅니다.

### 배포 방법
1. Supabase CLI가 설치되어 있어야 합니다.
2. `supabase functions deploy discord-notify` 명령어를 실행합니다.
3. Supabase Dashboard > Settings > Edge Functions 또는 Secrets 메뉴에서 `DISCORD_WEBHOOK_URL`을 설정합니다.

### 데이터베이스 웹훅 연결 (필수)
Supabase Dashboard에서 Database Webhook을 설정해야 Edge Function이 호출됩니다.
1. **Database > Webhooks** 메뉴로 이동.
2. **Create a new webhook** 클릭.
3. **Name**: `notify-discord`
4. **Conditions**:
   - Table: `profiles`, Events: `INSERT`
   - Table: `rentals`, Events: `INSERT`
   - Table: `logs`, Events: `INSERT` (Filter: action_type = 'MISS')
   *팁: 한 번에 여러 테이블 설정이 안 되면 각각 만드세요.*
5. **Type**: `HTTP Request` (Supabase Edge Function)
   - Method: `POST`
   - URL: 배포된 Edge Function URL 선택 (예: `discord-notify`)
   - HTTP Headers: `Content-Type: application/json`
6. **Confirm** 저장.

이제 DB에 데이터가 쌓일 때마다 디스코드로 알림이 옵니다! 🎉
