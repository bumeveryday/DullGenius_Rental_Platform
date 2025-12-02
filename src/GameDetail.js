import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchGames, rentGame, sendMiss, fetchReviews,increaseViewCount } from './api';

function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [game, setGame] = useState(location.state?.game || null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(!game); 
  const [newReview, setNewReview] = useState({ user_name: "", password: "", rating: "5", comment: "" });

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reserveForm, setReserveForm] = useState({ name: "", phone: "", count: "", agreed: false });

  // (기존 useEffect 로직 유지...)

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (id) increaseViewCount(id);
    const loadData = async () => {
      /* ... 데이터 로딩 로직 (기존과 동일) ... */
      if (!game) {
        setLoading(true);
        const cachedGames = localStorage.getItem('games_cache');
        if (cachedGames) {
          const games = JSON.parse(cachedGames);
          const found = games.find(g => String(g.id) === String(id));
          if (found) setGame(found);
        }
        if (!game) { 
            const gamesData = await fetchGames();
            const foundGame = gamesData.find(g => String(g.id) === String(id));
            setGame(foundGame);
        }
      }
      const reviewsData = await fetchReviews();
      if (Array.isArray(reviewsData)) {
        const filteredReviews = reviewsData.filter(r => String(r.game_id) === String(id));
        setReviews(filteredReviews.reverse());
      }
      setLoading(false);
    };
    loadData();
  }, [id]);

  // 전화번호 하이픈 자동완성
  const handlePhoneChange = (e) => {
    const regex = /^[0-9\b -]{0,13}$/;
    if (regex.test(e.target.value)) {
      let val = e.target.value.replace(/[^0-9]/g, '');
      if (val.length > 3 && val.length <= 7) {
        val = val.slice(0,3) + "-" + val.slice(3);
      } else if (val.length > 7) {
        val = val.slice(0,3) + "-" + val.slice(3,7) + "-" + val.slice(7,11);
      }
      setReserveForm({ ...reserveForm, phone: val });
    }
  };

  const submitReservation = async () => {
    const { name, phone, count, agreed } = reserveForm;
    if (!name || !phone) return alert("이름과 전화번호를 입력해주세요.");
    if (!agreed) return alert("책임 동의에 체크해주세요.");

    const renterInfo = `${name}(${phone})`;

    // ⭐ 멘트 수정: '찜' 대신 '예약' 사용
    if (window.confirm("게임을 예약하시겠습니까? 30분 내 미수령 시 자동 취소됩니다.")) {
      await rentGame(game.id, renterInfo, count);
      alert("✅ 예약 성공! 30분 내에 동아리방으로 와주세요.");
      setGame({ ...game, status: "찜" });
      setIsModalOpen(false);
    }
  };

  // (나머지 핸들러들은 기존과 동일, 생략 없이 사용)
  const handleMiss = async () => {
    if (window.confirm("이 게임을 하고 싶으셨나요? 운영진에게 수요를 알릴까요?")) {
      await sendMiss(game.id);
      alert("전달되었습니다! 다음 구매 때 참고할게요.");
    }
  };
  const handleSubmitReview = async () => { /* 기존 코드 */ };
  const handleDeleteReview = async (reviewId) => { /* 기존 코드 */ };

  if (loading && !game) return <div style={{padding:"20px", textAlign:"center"}}>로딩 중...</div>;
  if (!game) return <div style={{padding:"20px", textAlign:"center"}}>게임을 찾을 수 없습니다.</div>;

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <button onClick={() => navigate("/")} style={{ marginBottom: "20px", cursor: "pointer", border:"none", background:"none", fontSize:"1.2em" }}>← 뒤로가기</button>
      
      {/* 게임 정보 카드 */}
      <div style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "20px", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", background:"white" }}>
        {game.image && <img src={game.image} alt={game.name} style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "10px", objectFit: "contain" }} />}
        <h2 style={{marginTop: "15px"}}>{game.name}</h2>
        <p style={{ color: "#666" }}>{game.category} | {game.genre}</p>
        
        <div style={{ display: "flex", justifyContent: "space-around", margin: "20px 0", background: "#f9f9f9", padding: "15px", borderRadius: "10px" }}>
          <div>
            <div style={{fontSize: "0.8em", color:"#888"}}>난이도</div>
            <div style={{ fontSize: "1.2em", color: "#e67e22", fontWeight:"bold" }}>{game.difficulty || "-"} <span style={{fontSize:"0.8em"}}>/ 5.0</span></div>
          </div>
          <div>
            <div style={{fontSize: "0.8em", color:"#888"}}>상태</div>
            <div style={{ fontSize: "1.2em", fontWeight: "bold", color: game.status === "대여가능" ? "#2ecc71" : "#e74c3c" }}>
              {game.status}
            </div>
          </div>
        </div>

        <div style={{ marginTop: "20px" }}>
          {game.status === "대여가능" ? (
            // ⭐ 버튼 텍스트 변경: '찜' -> '방문 수령 예약'
            <button onClick={() => setIsModalOpen(true)} style={{ width: "100%", padding: "15px", background: "#2ecc71", color: "white", border: "none", borderRadius: "8px", fontSize: "1.1em", fontWeight:"bold", cursor: "pointer", boxShadow: "0 4px 6px rgba(46, 204, 113, 0.3)" }}>
              📅 방문 수령 예약 (30분)
            </button>
          ) : (
            <button onClick={handleMiss} style={{ width: "100%", padding: "15px", background: "#95a5a6", color: "white", border: "none", borderRadius: "8px", fontSize: "1.1em", fontWeight:"bold", cursor: "pointer" }}>
              😢 아쉬워요 (입고 요청)
            </button>
          )}
        </div>
      </div>

      {/* 리뷰 섹션 (생략, 기존과 동일) */}
      <div style={{ marginTop: "40px" }}>
         {/* ... 기존 리뷰 코드 ... */}
         <h3>📝 부원 리뷰 ({reviews.length})</h3>
         {/* (위쪽 리뷰 렌더링 코드 그대로 사용하세요) */}
         <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "10px", marginBottom: "20px" }}>
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <input placeholder="닉네임" value={newReview.user_name} onChange={e=>setNewReview({...newReview, user_name: e.target.value})} style={{flex: 1, padding:"8px", border:"1px solid #ddd", borderRadius:"4px"}} />
              <input type="password" placeholder="비밀번호" value={newReview.password} onChange={e=>setNewReview({...newReview, password: e.target.value})} style={{flex: 1, padding:"8px", border:"1px solid #ddd", borderRadius:"4px"}} />
              <select value={newReview.rating} onChange={e=>setNewReview({...newReview, rating: e.target.value})} style={{padding:"8px", border:"1px solid #ddd", borderRadius:"4px"}}>
                <option value="5">⭐⭐⭐⭐⭐</option><option value="4">⭐⭐⭐⭐</option><option value="3">⭐⭐⭐</option><option value="2">⭐⭐</option><option value="1">⭐</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <input placeholder="솔직한 후기를 남겨주세요" value={newReview.comment} onChange={e=>setNewReview({...newReview, comment: e.target.value})} style={{flex: 1, padding:"8px", border:"1px solid #ddd", borderRadius:"4px"}} />
              <button onClick={handleSubmitReview} style={{background:"#333", color:"white", border:"none", padding:"8px 15px", borderRadius:"4px", cursor:"pointer"}}>등록</button>
            </div>
         </div>
         {reviews.length === 0 ? <p style={{color:"#999", textAlign:"center"}}>아직 리뷰가 없습니다.</p> : (
            <div>
              {reviews.map(r => (
                <div key={r.review_id} style={{ borderBottom: "1px solid #eee", padding: "15px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom:"5px" }}>
                    <strong>{r.user_name} <span style={{color: "#f1c40f", fontSize:"0.9em"}}>{"★".repeat(r.rating)}</span></strong>
                    <span style={{ fontSize: "0.8em", color: "#aaa" }}>{r.created_at}</span>
                  </div>
                  <p style={{ margin: "0", color:"#444" }}>{r.comment}</p>
                  <div style={{textAlign:"right"}}><button onClick={() => handleDeleteReview(r.review_id)} style={{ fontSize: "0.8em", background: "none", border: "none", color: "#e74c3c", cursor: "pointer", textDecoration:"underline" }}>삭제</button></div>
                </div>
              ))}
            </div>
         )}
      </div>

      {/* ⭐ [모달창] 직관적인 안내 문구 추가 ⭐ */}
      {isModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ background: "white", padding: "25px", borderRadius: "15px", width: "90%", maxWidth: "400px", boxShadow: "0 5px 20px rgba(0,0,0,0.2)" }}>
            
            {/* 1. 타이틀 변경 */}
            <h3 style={{ marginTop: 0, textAlign: "center", fontSize: "1.4em" }}>📅 대여 예약하기</h3>
            
            {/* 2. 프로세스 안내 (핵심!) */}
            <div style={{ background: "#f0f9ff", padding: "15px", borderRadius: "10px", marginBottom: "20px", fontSize: "0.9em", color: "#333", lineHeight: "1.5" }}>
              <strong>💡 이용 방법 안내</strong>
              <ul style={{ margin: "5px 0 0 20px", padding: 0 }}>
                <li>예약 후 <strong>30분 이내</strong>에 방문해주세요.</li>
                <li>시간 내 미수령 시 <strong>자동 취소</strong>됩니다.</li>
                <li>동아리방에서 운영진 확인 후 수령하세요.</li>
              </ul>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>닉네임 (또는 이름)</label>
              <input 
                value={reserveForm.name} 
                onChange={e => setReserveForm({...reserveForm, name: e.target.value})}
                placeholder="예: 24학번 김철수"
                style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "1em" }} 
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>전화번호</label>
              <input 
                value={reserveForm.phone} 
                onChange={handlePhoneChange}
                placeholder="010-0000-0000"
                style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "1em" }} 
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>플레이 인원 (선택)</label>
              <input 
                type="number"
                value={reserveForm.count} 
                onChange={e => setReserveForm({...reserveForm, count: e.target.value})}
                placeholder="숫자만 입력"
                style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "1em" }} 
              />
            </div>

            <div style={{ marginBottom: "25px", padding: "12px", background: "#fff5f5", borderRadius: "8px", fontSize: "0.85em", color: "#e74c3c", border: "1px solid #ffcccc" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={reserveForm.agreed}
                  onChange={e => setReserveForm({...reserveForm, agreed: e.target.checked})}
                  style={{ marginTop: "3px", transform: "scale(1.2)" }}
                />
                <span><strong>(필수)</strong> 대여 중 발생한 파손 및 분실 시, 동일 제품 변상 또는 그에 상응하는 금액을 지불할 것을 동의합니다.</span>
              </label>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: "15px", background: "#f1f2f6", color: "#333", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "1em" }}>취소</button>
              <button 
                onClick={submitReservation} 
                disabled={!reserveForm.agreed} 
                style={{ flex: 1, padding: "15px", background: reserveForm.agreed ? "#3498db" : "#95a5a6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "1em", boxShadow: reserveForm.agreed ? "0 4px 6px rgba(52, 152, 219, 0.3)" : "none" }}
              >
                예약 완료
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default GameDetail;