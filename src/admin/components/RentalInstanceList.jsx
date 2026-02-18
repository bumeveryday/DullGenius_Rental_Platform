import React from 'react';

/**
 * RentalInstanceList Component
 * 
 * 특정 게임에 속한 개별 대여/찜 기록(인스턴스)들을 리스트 형태로 보여줍니다.
 * 각 항목은 개별 반납 또는 수령 버튼을 포함합니다.
 * 
 * @param {Object} props
 * @param {Object} props.game - 게임 객체 (rentals 배열 포함)
 * @param {Function} props.onReturn - 개별 반납 핸들러 (game, rentalId) => void
 * @param {Function} props.onReceive - 개별 수령 핸들러 (game, rentalId) => void
 */
const RentalInstanceList = ({ game, onReturn, onReceive }) => {
    const [selectedId, setSelectedId] = React.useState("");

    if (!game.rentals || game.rentals.length <= 1) return null;

    // 초기 선택값 설정 (첫 번째 렌탈 건)
    React.useEffect(() => {
        if (game.rentals.length > 0 && !selectedId) {
            setSelectedId(game.rentals[0].rental_id);
        }
    }, [game.rentals, selectedId]);

    const selectedRental = game.rentals.find(r => r.rental_id === selectedId) || game.rentals[0];
    const isDibs = selectedRental?.type === 'DIBS';

    // 남은 일수 계산
    const targetDate = new Date(selectedRental?.due_date || selectedRental?.borrowed_at);
    const diffDays = ~~((targetDate - new Date()) / (1000 * 60 * 60 * 24));

    return (
        <div style={{
            marginTop: "10px",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "8px",
            padding: "10px",
            border: "1px solid var(--admin-primary)",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
        }}>
            <div style={{ fontSize: "0.8em", color: "var(--admin-primary)", fontWeight: "bold" }}>
                👥 다중 대여 관리 ({game.rentals.length}건)
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    style={{
                        flex: 1,
                        background: "var(--admin-bg)",
                        color: "var(--admin-text-main)",
                        border: "1px solid var(--admin-border)",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        fontSize: "0.9em"
                    }}
                >
                    {game.rentals.map(r => {
                        const name = r.renter_name || r.profiles?.name || "알 수 없음";
                        const type = r.type === 'DIBS' ? "[찜]" : "[대여]";
                        return (
                            <option key={r.rental_id} value={r.rental_id}>
                                {type} {name}
                            </option>
                        );
                    })}
                </select>

                {isDibs ? (
                    <button
                        onClick={() => onReceive(game, selectedId)}
                        style={btnStyle("#f39c12")}
                    >
                        수령 확인
                    </button>
                ) : (
                    <button
                        onClick={() => onReturn(game, selectedId)}
                        style={btnStyle("#27ae60")}
                    >
                        반납 확인
                    </button>
                )}
            </div>

            <div style={{ fontSize: "0.75em", color: "var(--admin-text-sub)", display: "flex", justifyContent: "space-between" }}>
                <span>상태: {isDibs ? "예약 대기 중" : "이용 중"}</span>
                <span>{diffDays >= 0 ? `${diffDays}일 남음` : `${Math.abs(diffDays)}일 연체`}</span>
            </div>
        </div>
    );
};

// 내부 버튼 스타일
const btnStyle = (bg) => ({
    padding: "2px 8px",
    background: bg,
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "0.8rem",
    cursor: "pointer"
});

export default RentalInstanceList;
