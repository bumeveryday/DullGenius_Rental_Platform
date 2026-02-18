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
    if (!game.rentals || game.rentals.length === 0) return null;

    return (
        <div style={{
            marginTop: "10px",
            background: "rgba(0,0,0,0.2)",
            borderRadius: "8px",
            padding: "8px",
            border: "1px solid var(--admin-border)"
        }}>
            {game.rentals.map((rental, idx) => {
                const renterName = rental.renter_name || rental.profiles?.name || "알 수 없음";
                const isDibs = rental.type === 'DIBS';

                // 남은 일수 계산
                const targetDate = new Date(rental.due_date || rental.borrowed_at);
                const diffDays = ~~((targetDate - new Date()) / (1000 * 60 * 60 * 24));

                return (
                    <div
                        key={rental.rental_id}
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "5px 0",
                            borderBottom: idx === game.rentals.length - 1 ? "none" : "1px solid rgba(255,255,255,0.05)",
                            fontSize: "0.9em"
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ color: isDibs ? "#f1c40f" : "#2ecc71" }}>
                                {isDibs ? "⚡" : "👤"}
                            </span>
                            <span style={{ fontWeight: "bold", color: "var(--admin-text-main)" }}>
                                {renterName}
                            </span>
                            <span style={{ fontSize: "0.8em", color: "var(--admin-text-sub)" }}>
                                ({isDibs ? "찜" : "대여 중"})
                            </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "0.8em", color: "var(--admin-text-sub)" }}>
                                {diffDays >= 0 ? `${diffDays}일 남음` : `${Math.abs(diffDays)}일 연체`}
                            </span>

                            {!isDibs ? (
                                <button
                                    onClick={() => onReturn(game, rental.rental_id)}
                                    style={btnStyle("#27ae60")}
                                >
                                    반납
                                </button>
                            ) : (
                                <button
                                    onClick={() => onReceive(game, rental.rental_id)}
                                    style={btnStyle("#f39c12")}
                                >
                                    수령
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
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
