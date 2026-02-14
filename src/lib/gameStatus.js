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

    // 3. 우선순위: 예약(찜) > 대여(Rent)
    const activeDibs = gameRentals.filter(r => r.type === 'DIBS');
    const activeRents = gameRentals.filter(r => r.type === 'RENT');

    if (activeDibs.length > 0) {
        // [CASE 1] 예약됨 (찜)
        status = '예약됨';
        // 가장 최근 예약 찾기
        const latestDibs = activeDibs.sort((a, b) =>
            new Date(b.borrowed_at) - new Date(a.borrowed_at)
        )[0];

        renter = latestDibs.renter_name || latestDibs.profiles?.name;
        renterId = latestDibs.user_id;
        dueDate = latestDibs.due_date;

    } else if (activeRents.length > 0) {
        // [CASE 2] 대여 중 (Rent)
        if (realAvailableCount > 0) {
            status = '대여가능'; // 재고가 남았으므로 대여 가능
        } else {
            status = '대여 중'; // 재고 없음
        }

        // 대여자 목록 (콤마로 구분)
        const renters = activeRents.map(r => r.renter_name || r.profiles?.name).filter(Boolean);
        renter = renters.join(', ');
        renterId = activeRents[0].user_id; // 대표 1인 ID (상세정보용)

        // 반납 예정일 (가장 빠른 날짜)
        if (activeRents.some(r => r.due_date)) {
            const sortedByDueDate = activeRents
                .filter(r => r.due_date)
                .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
            if (sortedByDueDate.length > 0) {
                dueDate = sortedByDueDate[0].due_date;
            }
        }

    } else if (realAvailableCount <= 0) {
        // [CASE 3] 재고 없음 (대여 기록은 없으나 수량이 0)
        status = '대여 중';
    }

    return {
        status,
        available_count: realAvailableCount,
        renter,
        renterId,
        due_date: dueDate,
        active_rental_count: gameRentals.length,
        rentals: gameRentals
    };
};
