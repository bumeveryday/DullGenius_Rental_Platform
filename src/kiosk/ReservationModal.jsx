// src/kiosk/ReservationModal.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { kioskPickup } from '../api';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import './Kiosk.css';

function ReservationModal({ onClose }) {
    const { showToast } = useToast();
    const [userReservations, setUserReservations] = useState([]); // { user: {...}, reservations: [...] }
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [expandedUserId, setExpandedUserId] = useState(null); // Accordion state
    const [selectedRentalIds, setSelectedRentalIds] = useState(new Set()); // Set of rental_ids

    // Confirm 모달 상태
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: null,
        type: "info"
    });

    const showConfirmModal = (title, message, onConfirm, type = "info") => {
        setConfirmModal({ isOpen: true, title, message, onConfirm, type });
    };

    const closeConfirmModal = () => {
        setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: null, type: "info" });
    };

    // Load active reservations (DIBS) grouped by user
    useEffect(() => {
        const loadReservations = async () => {
            const { data, error } = await supabase
                .from('rentals')
                .select(`
                    rental_id,
                    game_id,
                    borrowed_at,
                    type,
                    profiles:user_id (id, name, student_id),
                    game:games (id, name, image)
                `)
                .eq('type', 'DIBS') // 예약(찜)만 조회
                .is('returned_at', null); // 아직 수령/취소 안된 것

            if (error) {
                console.error(error);
                showToast("예약 목록을 불러오지 못했습니다.", { type: "error" });
                setLoading(false);
                return;
            }

            // Group by user
            const valid = data.filter(r => r.game && r.profiles);
            const grouped = {};

            valid.forEach(rental => {
                const userId = rental.profiles.id;
                if (!grouped[userId]) {
                    grouped[userId] = {
                        user: rental.profiles,
                        reservations: []
                    };
                }
                grouped[userId].reservations.push(rental);
            });

            setUserReservations(Object.values(grouped));
            setLoading(false);
        };
        loadReservations();
    }, [showToast]);

    const toggleUser = (userId) => {
        setExpandedUserId(expandedUserId === userId ? null : userId);
        setSelectedRentalIds(new Set()); // 유저 전환 시 선택 초기화
    };

    const toggleReservation = (rentalId) => {
        const newSelected = new Set(selectedRentalIds);
        if (newSelected.has(rentalId)) {
            newSelected.delete(rentalId);
        } else {
            newSelected.add(rentalId);
        }
        setSelectedRentalIds(newSelected);
    };

    const handleBulkPickup = async () => {
        if (selectedRentalIds.size === 0) {
            showToast("수령할 게임을 선택해주세요.", { type: "warning" });
            return;
        }

        showConfirmModal(
            "예약 수령 확인",
            `선택한 ${selectedRentalIds.size}개의 게임을 수령하시겠습니까?`,
            async () => {
                setProcessing(true);
                let successCount = 0;
                let failCount = 0;
                const failedItems = [];

                // Process each selected reservation
                for (const rentalId of selectedRentalIds) {
                    // Find info for toast
                    let targetName = "게임";
                    for (const group of userReservations) {
                        const found = group.reservations.find(r => r.rental_id === rentalId);
                        if (found) {
                            targetName = found.game.name;
                            break;
                        }
                    }

                    try {
                        const result = await kioskPickup(rentalId);
                        if (result.success) {
                            successCount++;
                        } else {
                            failCount++;
                            failedItems.push({ name: targetName, reason: result.message });
                        }
                    } catch (e) {
                        console.error(e);
                        failCount++;
                        failedItems.push({ name: targetName, reason: "네트워크 오류" });
                    }
                }

                setProcessing(false);

                if (successCount > 0) {
                    showToast(`✅ ${successCount}개 수령 완료! 즐거운 시간 되세요.`, { type: "success" });

                    // Remove processed items from UI
                    const remainingUsers = userReservations
                        .map(ug => ({
                            ...ug,
                            reservations: ug.reservations.filter(r => !selectedRentalIds.has(r.rental_id))
                        }))
                        .filter(ug => ug.reservations.length > 0);

                    setUserReservations(remainingUsers);
                    setSelectedRentalIds(new Set());

                    if (remainingUsers.length === 0) {
                        onClose();
                    }
                }

                if (failCount > 0) {
                    const failedNames = failedItems.map(item => `${item.name} (${item.reason})`).join(', ');
                    showToast(`❌ ${failCount}개 수령 실패: ${failedNames}`, { type: "error", duration: 8000 });
                }
            },
            "info"
        );
    };

    return (
        <div className="kiosk-modal-overlay" style={{ zIndex: 20000 }} onClick={onClose}>
            <div className="kiosk-modal" style={{ width: "90%", height: "90%", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                    <h2>📥 예약 수령</h2>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "white", fontSize: "1.5rem", cursor: "pointer" }}>✖</button>
                </div>

                <div style={{ color: "#aaa", marginBottom: "10px" }}>
                    이름을 클릭하여 예약한 게임을 확인하고 수령하세요.
                </div>
                <div style={{ color: "#888", fontSize: "0.85rem", marginBottom: "15px", fontStyle: "italic" }}>
                    💡 예약 후 30분 이내에 수령해야 합니다. (시간 초과 시 자동 취소될 수 있음)
                </div>

                <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", minHeight: 0, WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehavior: "contain" }}>
                    {loading ? (
                        <div className="skeleton-container">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="skeleton-item" />
                            ))}
                        </div>
                    ) : userReservations.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📭</div>
                            <div className="empty-state-title">수령 대기 중인 예약이 없습니다</div>
                            <div className="empty-state-subtitle">웹에서 먼저 원하는 게임을 '찜' 해주세요!</div>
                        </div>
                    ) : (
                        userReservations.map(ug => (
                            <div key={ug.user.id} style={{ background: "#1a1a1a", borderRadius: "10px", position: "relative" }}>
                                {/* User Header */}
                                <button
                                    onClick={() => toggleUser(ug.user.id)}
                                    style={{
                                        width: "100%",
                                        padding: "20px",
                                        position: "sticky",
                                        top: 0,
                                        zIndex: 10,
                                        background: expandedUserId === ug.user.id ? "#2a2a2a" : "#1a1a1a",
                                        border: "none",
                                        borderRadius: expandedUserId === ug.user.id ? "10px 10px 0 0" : "10px",
                                        color: "white",
                                        fontSize: "1.2rem",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        transition: "background 0.2s, border-radius 0.2s"
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                                        <span>👤 {ug.user.name}</span>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                                            <span style={{ fontSize: "0.9rem", color: "#888" }}>
                                                {ug.user.student_id ? `${ug.user.student_id.slice(0, 4)}****` : "비회원"}
                                            </span>
                                            <span style={{ fontSize: "0.8rem", color: "#666" }}>
                                                {ug.reservations.length}건 예약중
                                            </span>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: "1.5rem" }}>{expandedUserId === ug.user.id ? "▼" : "▶"}</span>
                                </button>

                                {/* Reservation List */}
                                {expandedUserId === ug.user.id && (
                                    <div className="no-scrollbar" style={{ padding: "10px 20px 20px 20px", display: "flex", flexDirection: "column", gap: "10px", paddingBottom: "10px" }}>
                                        {ug.reservations.map(rental => (
                                            <label
                                                key={rental.rental_id}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "15px",
                                                    padding: "15px",
                                                    background: selectedRentalIds.has(rental.rental_id) ? "#2d2d40" : "#222",
                                                    borderRadius: "8px",
                                                    cursor: "pointer",
                                                    transition: "background 0.2s",
                                                    border: selectedRentalIds.has(rental.rental_id) ? "2px solid #5865F2" : "1px solid #333"
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRentalIds.has(rental.rental_id)}
                                                    onChange={() => toggleReservation(rental.rental_id)}
                                                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: "1.1rem", fontWeight: "bold" }}>
                                                        {rental.game.name}
                                                    </div>
                                                    <div style={{ fontSize: "0.8rem", color: "#888", marginTop: "5px" }}>
                                                        예약 시간: {new Date(rental.borrowed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
                    <button
                        className="kiosk-btn"
                        style={{ background: "#333", fontSize: "1rem", padding: "15px", flex: 1 }}
                        onClick={onClose}
                    >
                        닫기
                    </button>
                    <button
                        className="kiosk-btn"
                        style={{ background: selectedRentalIds.size > 0 ? "#5865F2" : "#444", fontSize: "1rem", padding: "15px", flex: 2 }}
                        onClick={handleBulkPickup}
                        disabled={processing || selectedRentalIds.size === 0}
                    >
                        {processing ? "처리 중..." : `선택한 ${selectedRentalIds.size}개 수령하기`}
                    </button>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
            />
        </div>
    );
}

export default ReservationModal;
