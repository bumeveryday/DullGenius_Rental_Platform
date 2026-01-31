// src/kiosk/RouletteModal.js
import React, { useState, useEffect } from 'react';
import { fetchGames } from '../api';
import './Kiosk.css';

function RouletteModal({ onClose }) {
    const [allGames, setAllGames] = useState([]);
    const [filteredGames, setFilteredGames] = useState([]);
    const [playerCount, setPlayerCount] = useState(null); // 선택된 인원수
    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState(null);
    const [displayParams, setDisplayParams] = useState(null); // Animation display

    useEffect(() => {
        const load = async () => {
            const all = await fetchGames();
            if (!all.error) {
                const available = all.filter(g => g.status === '대여가능');
                setAllGames(available);
                setFilteredGames(available); // 초기에는 모든 게임
            }
        };
        load();
    }, []);

    // 인원수 필터링
    useEffect(() => {
        if (playerCount === null) {
            setFilteredGames(allGames);
        } else {
            // players 필드 파싱 (다양한 형식 지원: "2-4인", "3~6", "5인" 등)
            const filtered = allGames.filter(game => {
                if (!game.players) return false;

                // "인" 제거 후 파싱
                const playersStr = game.players.replace(/인/g, '').trim();

                // 범위 형식: "2-4" 또는 "3~6"
                const rangeMatch = playersStr.match(/(\d+)[-~](\d+)/);
                if (rangeMatch) {
                    const min = parseInt(rangeMatch[1]);
                    const max = parseInt(rangeMatch[2]);
                    return playerCount >= min && playerCount <= max;
                }

                // 단일 인원수: "4"
                const singleMatch = playersStr.match(/^(\d+)$/);
                if (singleMatch) {
                    return parseInt(singleMatch[1]) === playerCount;
                }

                return false;
            });
            setFilteredGames(filtered);
        }
    }, [playerCount, allGames]);

    const spin = () => {
        if (filteredGames.length === 0) return;
        setSpinning(true);
        setResult(null);

        let count = 0;
        const maxCount = 20;
        const interval = setInterval(() => {
            const random = filteredGames[Math.floor(Math.random() * filteredGames.length)];
            setDisplayParams(random);
            count++;
            if (count > maxCount) {
                clearInterval(interval);
                setResult(random);
                setSpinning(false);
            }
        }, 100);
    };

    const playerOptions = [2, 3, 4, 5, 6];

    return (
        <div className="kiosk-modal-overlay" onClick={onClose}>
            <div className="kiosk-modal" style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                <h2 style={{ marginBottom: "20px" }}>🎰 오늘은 뭐 하지?</h2>

                {/* 인원수 선택 */}
                <div style={{ marginBottom: "20px" }}>
                    <p style={{ fontSize: "1.1rem", marginBottom: "10px", color: "#ccc" }}>게임 인원수를 선택하세요</p>
                    <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                        <button
                            onClick={() => setPlayerCount(null)}
                            style={{
                                padding: "10px 20px",
                                background: playerCount === null ? "#667eea" : "#444",
                                border: "none",
                                borderRadius: "10px",
                                color: "white",
                                fontSize: "1rem",
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            전체
                        </button>
                        {playerOptions.map(num => (
                            <button
                                key={num}
                                onClick={() => setPlayerCount(num)}
                                style={{
                                    padding: "10px 20px",
                                    background: playerCount === num ? "#667eea" : "#444",
                                    border: "none",
                                    borderRadius: "10px",
                                    color: "white",
                                    fontSize: "1rem",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                {num}인
                            </button>
                        ))}
                    </div>
                </div>

                {/* 게임 표시 박스 - 가로로 확장 */}
                <div style={{
                    width: "100%",
                    maxWidth: "400px",
                    height: "150px",
                    background: "#333",
                    margin: "0 auto 20px auto",
                    borderRadius: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2rem",
                    fontWeight: "bold",
                    padding: "20px",
                    border: "5px solid gold",
                    wordBreak: "keep-all", // 한글 단어가 끊기지 않도록
                    lineHeight: "1.3"
                }}>
                    {displayParams ? displayParams.name : "?"}
                </div>

                {/* 필터링된 게임 수 표시 */}
                <p style={{ fontSize: "0.9rem", color: "#888", marginBottom: "15px" }}>
                    {filteredGames.length}개의 게임
                </p>

                {!spinning && !result && (
                    <button
                        className="kiosk-btn btn-roulette"
                        onClick={spin}
                        style={{ width: "100%", height: "60px" }}
                        disabled={filteredGames.length === 0}
                    >
                        {filteredGames.length === 0 ? "해당 인원수의 게임이 없습니다" : "추천받기 START"}
                    </button>
                )}

                {result && (
                    <div style={{ animation: "popIn 0.5s" }}>
                        <h3 style={{ color: "gold" }}>🎉 당첨!</h3>
                        <p style={{ wordBreak: "keep-all" }}>{result.category} / {result.players}</p>
                        <button className="kiosk-btn" style={{ background: "#444", marginTop: "20px", height: "60px" }} onClick={onClose}>
                            좋아, 이걸로 할래!
                        </button>
                        <button style={{ background: "none", border: "none", color: "#888", marginTop: "10px", textDecoration: "underline", cursor: "pointer" }} onClick={spin}>
                            다시 돌리기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default RouletteModal;
