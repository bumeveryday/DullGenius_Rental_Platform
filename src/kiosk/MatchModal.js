// src/kiosk/MatchModal.js
import React, { useState, useEffect, useMemo } from 'react';
import { fetchGames, fetchUsers, registerMatch } from '../api';
import { useToast } from '../contexts/ToastContext';
import './Kiosk.css';

function MatchModal({ onClose }) {
    const { showToast } = useToast();
    const [step, setStep] = useState(1); // 1:Game -> 2:Players -> 3:Winner -> 4:Done

    // Data List
    const [games, setGames] = useState([]);
    const [users, setUsers] = useState([]);

    // Search/Filter
    const [gameSearchTerm, setGameSearchTerm] = useState('');
    const [userSearchTerm, setUserSearchTerm] = useState('');

    // Selections
    const [selectedGame, setSelectedGame] = useState(null);
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [selectedWinner, setSelectedWinner] = useState(null);

    // Loading
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // [Strategy: LocalStorage + Background Sync]
    useEffect(() => {
        const loadData = async () => {
            // 1. Try Loading from LocalStorage first (Instant)
            const localGames = localStorage.getItem('kiosk_games');
            const localUsers = localStorage.getItem('kiosk_users');
            const lastSync = localStorage.getItem('kiosk_last_sync');

            if (localGames && localUsers) {
                setGames(JSON.parse(localGames));
                setUsers(JSON.parse(localUsers));
                // Show content immediately if local data exists
                setLoading(false);
            }

            // 2. Background Sync (Fetch latest from server)
            try {
                // If synced recently (< 5 min), skip fetch to save bandwidth?
                // For now, always sync to be safe.
                const [gamesData, usersData] = await Promise.all([fetchGames(), fetchUsers()]);

                const validGames = gamesData.filter(g => !g.error);
                const validUsers = usersData || [];

                // Compare and update if changed (Deep comparison is expensive, just overwrite for now)
                setGames(validGames);
                setUsers(validUsers);

                // Save to LocalStorage
                localStorage.setItem('kiosk_games', JSON.stringify(validGames));
                localStorage.setItem('kiosk_users', JSON.stringify(validUsers));
                localStorage.setItem('kiosk_last_sync', new Date().toISOString());

            } catch (e) {
                console.error("Background sync failed:", e);
                // If local data missing and sync failed, show error
                if (!localGames) {
                    showToast("데이터 로딩 실패 (인터넷 확인 필요)", { type: "error" });
                }
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // [Optimization] Memoized Filters
    const filteredGames = useMemo(() => {
        if (!gameSearchTerm) return games;
        return games.filter(game =>
            game.name.toLowerCase().includes(gameSearchTerm.toLowerCase())
        );
    }, [games, gameSearchTerm]);

    const filteredUsers = useMemo(() => {
        if (!userSearchTerm) return users;
        const term = userSearchTerm.toLowerCase();
        return users.filter(user =>
            user.name.toLowerCase().includes(term) ||
            user.student_id?.includes(term)
        );
    }, [users, userSearchTerm]);

    // Handlers
    const handleGameSelect = (game) => {
        setSelectedGame(game);
        setStep(2);
    };

    const togglePlayer = (user) => {
        if (selectedPlayers.find(u => u.id === user.id)) {
            setSelectedPlayers(selectedPlayers.filter(u => u.id !== user.id));
        } else {
            setSelectedPlayers([...selectedPlayers, user]);
        }
    };

    const handleRegister = async () => {
        if (!selectedGame || selectedPlayers.length < 1) return;

        setProcessing(true);
        try {
            const playerIds = selectedPlayers.map(u => u.id);
            const winnerId = selectedWinner ? selectedWinner.id : null;

            const result = await registerMatch(selectedGame.id, playerIds, winnerId);

            if (result.success) {
                showToast(`🎉 매치 등록 완료! 승자: ${selectedWinner?.name || '없음'}`, { type: "success" });
                onClose();
            } else {
                showToast(`❌ 실패: ${result.message}`, { type: "error" });
            }
        } catch (e) {
            console.error(e);
            showToast("매치 등록 중 오류가 발생했습니다.", { type: "error" });
        } finally {
            setProcessing(false);
        }
    };

    // Render Steps
    const renderStepContent = () => {
        if (loading) return <div style={{ textAlign: "center", padding: "50px" }}>데이터 불러오는 중...</div>;

        switch (step) {
            case 1: // Game Selection
                return (
                    <>
                        <input
                            type="text"
                            className="kiosk-search-input"
                            placeholder="🔍 게임 이름 검색..."
                            value={gameSearchTerm}
                            onChange={(e) => setGameSearchTerm(e.target.value)}
                            autoFocus
                        />

                        <div className="grid-3-col" style={{ maxHeight: "55vh" }}>
                            {filteredGames.length === 0 ? (
                                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "50px", color: "#888" }}>
                                    검색 결과가 없습니다.
                                </div>
                            ) : (
                                filteredGames.map(game => (
                                    <button key={game.id} className="kiosk-list-btn" onClick={() => handleGameSelect(game)}>
                                        {game.image ? <img src={game.image} className="list-img" alt="" /> : "🎲"}
                                        <div className="list-label">{game.name}</div>
                                    </button>
                                ))
                            )}
                        </div>
                    </>
                );
            case 2: // Player Selection
                return (
                    <>
                        <div style={{ marginBottom: "10px", color: "#ccc" }}>함께 한 멤버를 모두 골라주세요. ({selectedPlayers.length}명 선택됨)</div>

                        <input
                            type="text"
                            className="kiosk-search-input"
                            placeholder="🔍 이름 또는 학번 검색..."
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            style={{ padding: "12px 15px", fontSize: "1rem" }}
                        />

                        <div className="grid-3-col" style={{ maxHeight: "45vh" }}>
                            {filteredUsers.length === 0 ? (
                                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "30px", color: "#888" }}>
                                    검색 결과가 없습니다.
                                </div>
                            ) : (
                                filteredUsers.map(user => {
                                    const isSelected = selectedPlayers.find(u => u.id === user.id);
                                    return (
                                        <button
                                            key={user.id}
                                            className={`kiosk-list-btn ${isSelected ? 'active' : ''}`}
                                            onClick={() => togglePlayer(user)}
                                            style={{ border: isSelected ? "2px solid #58cc02" : "1px solid #333" }}
                                        >
                                            <div className="list-label">{user.name}</div>
                                            <div style={{ fontSize: "0.8rem", color: "#888" }}>{user.student_id ? user.student_id.slice(-4) : ""}</div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                        <div className="step-controls">
                            <button className="kiosk-btn-sub" onClick={() => setStep(1)}>이전</button>
                            <button className="kiosk-btn"
                                style={{ flex: 1, fontSize: "1rem", borderRadius: "10px" }}
                                onClick={() => selectedPlayers.length > 0 && setStep(3)}
                                disabled={selectedPlayers.length === 0}
                            >
                                다음 ({selectedPlayers.length}명)
                            </button>
                        </div>
                    </>
                );
            case 3: // Winner Selection
                return (
                    <>
                        <div style={{ marginBottom: "10px", color: "#ccc" }}>이번 판의 승자는 누구인가요? (+200P)</div>
                        <div className="grid-3-col" style={{ maxHeight: "50vh", gridTemplateColumns: "1fr 1fr" }}>
                            <button
                                className={`kiosk-list-btn ${selectedWinner === null ? 'active' : ''}`}
                                onClick={() => setSelectedWinner(null)}
                                style={{ border: selectedWinner === null ? "2px solid #aaa" : "1px solid #333" }}
                            >
                                🤝 무승부 / 협력
                            </button>
                            {selectedPlayers.map(user => {
                                const isSelected = selectedWinner?.id === user.id;
                                return (
                                    <button
                                        key={user.id}
                                        className={`kiosk-list-btn ${isSelected ? 'active' : ''}`}
                                        onClick={() => setSelectedWinner(user)}
                                        style={{ border: isSelected ? "2px solid gold" : "1px solid #333" }}
                                    >
                                        <div className="list-label">{user.name}</div>
                                        {isSelected && "👑"}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="step-controls">
                            <button className="kiosk-btn-sub" onClick={() => setStep(2)}>이전</button>
                            <button className="kiosk-btn"
                                style={{ flex: 1, fontSize: "1rem", borderRadius: "10px" }}
                                onClick={handleRegister}
                                disabled={processing}
                            >
                                {processing ? "등록 중..." : "매치 등록 완료 🏁"}
                            </button>
                        </div>
                    </>
                );
            default: return null;
        }
    };

    return (
        <div className="kiosk-modal-overlay">
            <div className="kiosk-modal" style={{ height: "90%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                    <h2 style={{ margin: 0 }}>
                        {step === 1 && "1. 게임 선택"}
                        {step === 2 && "2. 플레이어 선택"}
                        {step === 3 && "3. 승자 선택"}
                    </h2>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "white", fontSize: "1.5rem", cursor: "pointer" }}>✖</button>
                </div>
                {renderStepContent()}
            </div>
        </div>
    );
}

export default MatchModal;
