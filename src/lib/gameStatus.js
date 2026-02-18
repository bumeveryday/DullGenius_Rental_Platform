/**
 * [CORE LOGIC] Game Status Calculation
 * 
 * 이 함수는 게임의 재고, 대여 기록, 예약(찜) 정보를 바탕으로
 * 최종 상태(status)와 대여 정보(renter, dueDate 등)를 결정합니다.
 * 
 * ⚠️ WARNING: 핵심 비즈니스 로직입니다. (Encapsulated)
 * 함부로 수정하지 마세요. (Do not modify without review)
 */
export const calculateGameStatus = (game, gameRentals) => {
    // 1. 실시간 재고 (DB available_count 신뢰)
    const realAvailableCount = game.available_count ?? 0;



    // 2. 초기값
    let status = '대여가능';
    let renter = null;
    let renterId = null;
    let dueDate = null;

    // 3. 상태 결정 정책 (UX 개선: 재고가 있으면 무조건 '대여가능' 우선)
    // [FIX] 만료된 찜(30분 초과)은 활성 상태에서 제외하여 '유령 예약' 방지
    const now = new Date();
    const activeDibs = gameRentals.filter(r => {
        if (r.type !== 'DIBS') return false;
        if (!r.due_date) return true;
        return new Date(r.due_date) > now;
    });
    const activeRents = gameRentals.filter(r => r.type === 'RENT');

    // [Step A] 정보 추출 (상태와 무관하게 대여자 정보를 모두 수집)
    // 모든 예약자 + 대여자 이름을 합침 (중복 제거 필요 시 추가 가능)
    const allRenterNames = [
        ...activeDibs.map(r => r.renter_name || r.profiles?.name),
        ...activeRents.map(r => r.renter_name || r.profiles?.name)
    ].filter(Boolean);

    renter = allRenterNames.join(', ');

    // 대표 대여자 ID (상세보기용, 찜 우선)
    const representative = activeDibs[0] || activeRents[0];
    renterId = representative?.user_id;

    // 반납 예정일 추출 (가장 빠른 날짜)
    const allDueDates = [...activeDibs, ...activeRents]
        .filter(r => r.due_date)
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    if (allDueDates.length > 0) {
        dueDate = allDueDates[0].due_date;
    }

    // [Step B] 최종 상태(Status) 결정
    let adminStatus = '대여가능';

    // 1. 이용자(User)용 상태: 재고 우선
    if (realAvailableCount > 0) {
        status = '대여가능';
    } else if (activeDibs.length > 0) {
        status = '예약됨';
    } else {
        status = '대여중';
    }

    // 2. 관리자(Admin)용 상태: 조치(예약/대여) 우선
    if (activeDibs.length > 0) {
        adminStatus = '예약됨';
    } else if (activeRents.length > 0) {
        adminStatus = '대여중';
    } else if (realAvailableCount === 0) {
        adminStatus = '대여중'; // 재고 0이면 사실상 대여중(품절)
    } else {
        adminStatus = '대여가능';
    }

    return {
        status,
        adminStatus, // [NEW] 관리자 전용 상태
        available_count: realAvailableCount,
        renter,
        renterId,
        dueDate,
        rentals: [...activeDibs, ...activeRents] // [FIX] 유효한 찜/대여만 반환
    };
};
