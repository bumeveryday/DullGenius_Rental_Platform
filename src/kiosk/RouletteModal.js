// src/kiosk/RouletteModal.js
import React, { useState, useEffect } from 'react';
import { fetchGames } from '../api';
import './Kiosk.css';

function RouletteModal({ onClose }) {
    const [games, setGames] = useState([]);
    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState(null);
    const [displayParams, setDisplayParams] = useState(null); // Animation display

    useEffect(() => {
        const load = async () => {
            const all = await fetchGames();
            // 오직 'Available' 인 것만?
            // Or filter by typical party games
            if (!all.error) {
                setGames(all.filter(g => g.status === '대여가능'));
            }
        };
        load();
    }, []);

    const spin = () => {
        if (games.length === 0) return;
        setSpinning(true);
        setResult(null);

        let count = 0;
        const maxCount = 20;
        const interval = setInterval(() => {
            const random = games[Math.floor(Math.random() * games.length)];
            setDisplayParams(random);
            count++;
            if (count > maxCount) {
                clearInterval(interval);
                setResult(random);
                setSpinning(false);
            }
        }, 100);
    };

    return (
        <div className="kiosk-modal-overlay" onClick={onClose}>
            <div className="kiosk-modal" style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                <h2 style={{ marginBottom: "30px" }}>🎰 오늘은 뭐 하지?</h2>

                <div style={{
                    width: "200px", height: "200px", background: "#333", margin: "0 auto 30px auto",
                    borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "2rem", fontWeight: "bold", padding: "20px", border: "5px solid gold"
                }}>
                    {displayParams ? displayParams.name : "?"}
                </div>

                {!spinning && !result && (
                    <button className="kiosk-btn btn-roulette" onClick={spin} style={{ width: "100%" }}>
                        추천받기 START
                    </button>
                )}

                {result && (
                    <div style={{ animation: "popIn 0.5s" }}>
                        <h3 style={{ color: "gold" }}>🎉 당첨!</h3>
                        <p>{result.category} / {result.players}</p>
                        <button className="kiosk-btn" style={{ background: "#444", marginTop: "20px" }} onClick={onClose}>
                            좋아, 이걸로 할래!
                        </button>
                        <button style={{ background: "none", border: "none", color: "#888", marginTop: "10px", textDecoration: "underline" }} onClick={spin}>
                            다시 돌리기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default RouletteModal;
