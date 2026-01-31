// src/kiosk/RentalModal.js
import React, { useState, useEffect, useMemo } from 'react';
import { fetchGames, fetchUsers, kioskRental } from '../api'; // kioskRental RPC 필요
import { useToast } from '../contexts/ToastContext';
import './Kiosk.css';

// [Cached Data]
let cachedUsers = null;
let cachedGames = null;

function RentalModal({ onClose }) {
    const { showToast } = useToast();
    const [step, setStep] = useState(1); // 1:Game -> 2:User -> 3:Auth -> 4:Done

    // Data
    const [games, setGames] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter
    const [gameSearch, setGameSearch] = useState("");
    const [userSearch, setUserSearch] = useState("");
    const [authInput, setAuthInput] = useState(""); // Student ID Input

    // Selection
    const [selectedGame, setSelectedGame] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);

    // Initial Load (LocalStorage + Sync)
    useEffect(() => {
        const loadData = async () => {
            // 1. LocalStorage
            const localGames = localStorage.getItem('kiosk_games');
            const localUsers = localStorage.getItem('kiosk_users');

            if (localGames && localUsers) {
                setGames(JSON.parse(localGames));
                setUsers(JSON.parse(localUsers));
                setLoading(false);
            }

            // 2. Background Sync
            try {
                const [gamesData, usersData] = await Promise.all([fetchGames(), fetchUsers()]);
                const validGames = gamesData.filter(g => !g.error);
                const validUsers = usersData || [];

                setGames(validGames);
                setUsers(validUsers);

                localStorage.setItem('kiosk_games', JSON.stringify(validGames));
                localStorage.setItem('kiosk_users', JSON.stringify(validUsers));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Filter Logic
    const filteredGames = useMemo(() => {
        if (!gameSearch) return games;
        return games.filter(g => g.name.toLowerCase().includes(gameSearch.toLowerCase()));
    }, [games, gameSearch]);

    const filteredUsers = useMemo(() => {
        if (!userSearch) return users;
        return users.filter(u =>
            u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
            (u.student_id && u.student_id.includes(userSearch))
        );
    }, [users, userSearch]);

    // Auth Logic
    const handleAuth = async () => {
        if (!selectedUser || !selectedGame) return;

        // [Security Check]
        // Compare Full Student ID (or trimmed version if data is messy)
        const inputId = authInput.trim();
        const targetId = selectedUser.student_id?.trim();

        if (inputId !== targetId) {
            showToast("⛔ 학번이 일치하지 않습니다.", { type: "error" });
            setAuthInput("");
            return;
        }

        // Proceed to Rental
        const result = await kioskRental(selectedGame.id, selectedUser.id);
        if (result.success) {
            showToast(`✅ 대여 성공! (${selectedGame.name})`, { type: "success" });
            onClose();
        } else {
            showToast(`❌ 대여 실패: ${result.message}`, { type: "error" });
        }
    };

    // Render Steps
    const renderStep = () => {
        if (loading) return <div>로딩 중...</div>;

        switch (step) {
            case 1: // Game Search
                return (
                    <>
                        <input
                            type="text"
                            className="kiosk-search-input"
                            placeholder="🔍 게임 이름 검색..."
                            value={gameSearch}
                            onChange={e => setGameSearch(e.target.value)}
                            autoFocus
                        />
                        <div className="grid-3-col">
                            {filteredGames.map(game => (
                                <button key={game.id} className="kiosk-list-btn" onClick={() => {
                                    setSelectedGame(game);
                                    setStep(2);
                                }}>
                                    {game.image ? <img src={game.image} className="list-img" alt="" /> : "🎲"}
                                    <div className="list-label">{game.name}</div>
                                </button>
                            ))}
                        </div>
                    </>
                );
            case 2: // User Search
                return (
                    <>
                        <div style={{ color: "#ccc", marginBottom: "10px" }}>대여자를 선택해주세요</div>
                        <input
                            type="text"
                            className="kiosk-search-input"
                            placeholder="🔍 이름 검색..."
                            value={userSearch}
                            onChange={e => setUserSearch(e.target.value)}
                            autoFocus
                        />
                        <div className="grid-3-col">
                            {filteredUsers.map(user => (
                                <button key={user.id} className="kiosk-list-btn" onClick={() => {
                                    setSelectedUser(user);
                                    setStep(3);
                                }}>
                                    <div className="list-label">{user.name}</div>
                                    <div style={{ fontSize: "0.8rem", color: "#888" }}>{user.student_id?.slice(0, 3)}****</div>
                                </button>
                            ))}
                        </div>
                        <button className="kiosk-btn-sub" style={{ marginTop: "20px" }} onClick={() => setStep(1)}>이전</button>
                    </>
                );
            case 3: // Auth
                return (
                    <div style={{ textAlign: "center", padding: "30px" }}>
                        <h2 style={{ marginBottom: "20px" }}>🔒 본인 인증</h2>
                        <p style={{ marginBottom: "30px", fontSize: "1.2rem", color: "#ccc" }}>
                            <b>{selectedUser.name}</b>님의 학번 전체를 입력해주세요.
                        </p>
                        <input
                            type="password"
                            className="kiosk-search-input"
                            style={{ textAlign: "center", letterSpacing: "5px", fontSize: "2rem" }}
                            placeholder="학번 입력"
                            value={authInput}
                            onChange={e => setAuthInput(e.target.value)}
                            autoFocus
                            onKeyPress={e => e.key === 'Enter' && handleAuth()}
                        />
                        <div style={{ marginTop: "30px", display: "flex", gap: "10px" }}>
                            <button className="kiosk-btn-sub" onClick={() => setStep(2)}>이전</button>
                            <button className="kiosk-btn" style={{ flex: 1 }} onClick={handleAuth}>
                                대여 확정
                            </button>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="kiosk-modal-overlay">
            <div className="kiosk-modal" style={{ height: "90%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                    <h2>🎲 무인 대여</h2>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "white", fontSize: "1.5rem" }}>✖</button>
                </div>
                {renderStep()}
            </div>
        </div>
    );
}

export default RentalModal;
