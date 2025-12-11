import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchGames, rentGame, sendMiss, fetchReviews, addReview, deleteReview, increaseViewCount } from './api';
import { TEXTS } from './constants';
import LoginModal from './LoginModal';

function GameDetail({ user, sessionUser, setSessionUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = user;

  const [game, setGame] = useState(location.state?.game || null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(!game); 
  const [newReview, setNewReview] = useState({ user_name: "", password: "", rating: "5", comment: "" });

  // 모달 상태
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false); // 로그인모달
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false); // 리뷰 버튼용

  const [toast, setToast] = useState(null);

  
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // ✅ [추가] 페이지 진입 시 스크롤을 맨 위로 강제 이동 (0.1초 딜레이 없이 즉시)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

// ✅ [신규] LoginModal에서 '대여확정'을 눌렀을 때 실행되는 함수
  const handleRentConfirm = async (userInfo) => {
    const { name, phone, studentId, password } = userInfo; 
    
    // 서버로 보낼 대여자 정보 포맷팅 (예: 홍길동(010-1234-5678))
    // 학번도 같이 기록하고 싶다면: `${name}/${studentId}(${phone})` 등으로 변경 가능
    const renterInfo = `${name}(${phone})`; 

    try {
      // [수정] rentGame 함수에 학번, 비번, 이름, 전화번호를 모두 따로 넘깁니다.
      // 인원수는 일단 0으로 둠 (나중에 모달에서 입력받게 되면 변경).
      await rentGame(game.id, studentId, password, name, phone, 0); 
      
      showToast("✅ 예약 완료! 30분 내에 수령해주세요.");
      setGame({ ...game, status: "찜" });
      setIsLoginModalOpen(false); // 모달 닫기
    } catch (e) {
      alert("대여 실패: " + (e.message || "오류가 발생했습니다."));
    }
  };

  // (나머지 핸들러들은 기존과 동일, 생략 없이 사용)
  const handleMiss = async () => {
    if (window.confirm("이 게임을 하고 싶으셨나요? 운영진에게 수요를 알릴까요?")) {
      await sendMiss(game.id);
      showToast("📩 전달되었습니다! 다음 구매 때 참고할게요.");
    }
  };
// ⭐ 리뷰 작성 핸들러
  const handleSubmitReview = async () => {
    if (!newReview.user_name || !newReview.password || !newReview.comment) return alert("모두 입력해주세요.");
    
    try {
      await addReview({ ...newReview, game_id: game.id });
      showToast("✨ 리뷰가 등록되었습니다!");
      setNewReview({ user_name: "", password: "", rating: "5", comment: "" });
      
      // 목록 새로고침
      const reviewsData = await fetchReviews();
      if (Array.isArray(reviewsData)) {
        const filteredReviews = reviewsData.filter(r => String(r.game_id) === String(id));
        setReviews(filteredReviews.reverse());
      }
    } catch (e) {
      alert("리뷰 등록 중 오류가 발생했습니다.");
    } finally {
      setIsReviewSubmitting(false); // 로딩 끝
    }
  };

  // ⭐ 리뷰 삭제 핸들러
  const handleDeleteReview = async (reviewId) => {
    const pw = prompt("리뷰 작성 시 입력한 비밀번호를 입력하세요.");
    if (!pw) return;
    
    try {
      const res = await deleteReview(reviewId, pw);
      if (res.status === "success") {
        showToast("🗑️ 리뷰가 삭제되었습니다.");
        const reviewsData = await fetchReviews();
        if (Array.isArray(reviewsData)) {
          const filteredReviews = reviewsData.filter(r => String(r.game_id) === String(id));
          setReviews(filteredReviews.reverse());
        }
      } else {
        alert("실패: " + (res.message || "비밀번호가 틀렸거나 오류가 발생했습니다."));
      }
    } catch (e) {
      alert("삭제 중 통신 오류가 발생했습니다.");
    }
  };


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
            // ✅ [변경] 버튼 클릭 시 setIsLoginModalOpen(true)
            <button onClick={() => setIsLoginModalOpen(true)} style={{ width: "100%", padding: "15px", background: "#2ecc71", color: "white", border: "none", borderRadius: "8px", fontSize: "1.1em", fontWeight:"bold", cursor: "pointer", boxShadow: "0 4px 6px rgba(46, 204, 113, 0.3)" }}>
              📅 방문 수령 예약 (30분)
            </button>
          ) : (
            <button onClick={handleMiss} style={{ width: "100%", padding: "15px", background: "#95a5a6", color: "white", border: "none", borderRadius: "8px", fontSize: "1.1em", fontWeight:"bold", cursor: "pointer" }}>
              😢 아쉬워요 (입고 요청)
            </button>
          )}
        </div>
      </div>

      {/* 리뷰 섹션 */}
      {/* 입력 폼 */}
        <div className="review-form-box">
          <h3>리뷰 남기기</h3>
          {/* 상단: 닉네임, 비번, 별점 */}
          <div className="review-row top-row">
            <input 
              className="review-input"
              placeholder="닉네임" 
              value={newReview.user_name} 
              onChange={e=>setNewReview({...newReview, user_name: e.target.value})} 
            />
            <input 
              type="password" 
              className="review-input"
              placeholder="비밀번호 (삭제용)" 
              value={newReview.password} 
              onChange={e=>setNewReview({...newReview, password: e.target.value})} 
            />
            <select 
              className="review-input" 
              value={newReview.rating} 
              onChange={e=>setNewReview({...newReview, rating: e.target.value})}
            >
              <option value="5">⭐⭐⭐⭐⭐ (5점)</option>
              <option value="4">⭐⭐⭐⭐ (4점)</option>
              <option value="3">⭐⭐⭐ (3점)</option>
              <option value="2">⭐⭐ (2점)</option>
              <option value="1">⭐ (1점)</option>
            </select>
          </div>

          {/* 하단: 코멘트, 등록버튼 */}
          <div className="review-row bottom-row">
            <input 
              className="review-input"
              placeholder="솔직한 후기를 남겨주세요 (최대 50자)" 
              value={newReview.comment} 
              onChange={e=>setNewReview({...newReview, comment: e.target.value})} 
            />
            <button 
              onClick={handleSubmitReview} 
              disabled={isReviewSubmitting} 
              className="review-submit-btn"
            >
              {isReviewSubmitting ? "..." : "등록"}
            </button>
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
      

{/* ✅ [변경] 기존의 긴 모달 코드를 LoginModal 컴포넌트로 교체 */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)}
        onConfirm={handleRentConfirm}
        gameName={game.name}
        currentUser={currentUser}    // 로그인 유저 (영구)
        sessionUser={sessionUser}    // ✅ 임시 유저 (휘발성) 전달
        setSessionUser={setSessionUser} // ✅ 상태 저장 함수 전달
      />

      {toast && (
        <div className="toast-notification">
          {toast}
        </div>
      )}
    </div>
  );
}
export default GameDetail;