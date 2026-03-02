import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hptvqangstiaatdtusrg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwdHZxYW5nc3RpYWF0ZHR1c3JnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI2NzI0MiwiZXhwIjoyMDg0ODQzMjQyfQ.ywM7GC2Q7gO3sc2P-nZwDk-cF0pqkR2miv8tAtpJ4YI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testFix4() {
    console.log("=== 테스트 시작: admin_return_game DIBS 방어 검증 ===");

    // 1. 임의의 사용자와 게임 조회
    const { data: users } = await supabase.from('users').select('id, name').limit(1);
    const userId = users[0].id;

    const { data: games } = await supabase.from('board_games').select('id, title, status').eq('status', 'AVAILABLE').limit(1);
    if (!games || games.length === 0) {
        console.log("사용 가능한 게임이 없어 테스트를 진행할 수 없습니다.");
        return;
    }
    const game = games[0];
    console.log(`선택된 게임: ${game.title} (ID: ${game.id})`);

    try {
        // 2. 해당 게임을 DIBS 상태로 만들기 로직 (직접 DB 제어)
        console.log(">> 게임을 DIBS(찜) 상태로 변경합니다.");
        const { data: rentData, error: rentError } = await supabase.from('rentals').insert({
            game_id: game.id,
            user_id: userId,
            type: 'DIBS',
            status: 'RENTED',
            renter_name: 'TEST_USER'
        }).select();
        if (rentError) throw rentError;
        const rentalId = rentData[0].id;

        await supabase.from('board_games').update({ status: 'DIBS' }).eq('id', game.id);

        console.log(`>> DIBS 렌탈 레코드 생성됨 (ID: ${rentalId})`);

        // 3. admin_return_game 함수 호출 (에러가 나거나 실패해야 정상)
        console.log(">> admin_return_game RPC 호출 시도...");
        const { data: rpcData, error: rpcError } = await supabase.rpc('admin_return_game', {
            p_game_id: game.id,
            p_condition: 'GOOD',
            p_details: '테스트 반납',
            p_admin_id: userId
        });

        console.log("RPC 결과:", rpcData);
        if (rpcError) console.error("RPC 에러:", rpcError);

        // 4. 결과 검증 (여전히 DIBS 상태여야 함)
        const { data: checkGame } = await supabase.from('board_games').select('status').eq('id', game.id).single();
        const { data: checkRental } = await supabase.from('rentals').select('status').eq('id', rentalId).single();

        console.log(`\n=== 검증 결과 ===`);
        console.log(`게임 상태: ${checkGame.status} (기대값: DIBS)`);
        console.log(`렌탈 상태: ${checkRental.status} (기대값: RENTED)`);

        if (checkGame.status === 'DIBS' && rpcData?.success === false) {
            console.log("✅ 성공: admin_return_game 이 DIBS 레코드를 반납하지 못하도록 잘 방어되었습니다.");
        } else if (checkGame.status === 'DIBS') {
            console.log("✅ 성공: 게임의 상태가 AVAILABLE 로 변경되지 않았습니다.");
        }
        else {
            console.log("❌ 실패: DIBS 상태인 게임이 반납 처리되었습니다!");
        }

        // 5. 롤백 (정리)
        console.log("\n>> 테스트 데이터를 정리합니다.");
        await supabase.from('rentals').delete().eq('id', rentalId);
        await supabase.from('board_games').update({ status: 'AVAILABLE' }).eq('id', game.id);
        console.log(">> 정리 완료");

    } catch (err) {
        console.error("테스트 중 오류 발생:", err);
    }
}

testFix4();
