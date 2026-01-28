import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchGames, sendMiss, fetchReviews, addReview, increaseViewCount, dibsGame } from '../api';
import { TEXTS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext'; // [NEW] 전역 Toast

function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { showToast } = useToast(); // [NEW] 전역 toast 함수

  const [game, setGame] = useState(location.state?.game || null);
  const [reviews, setReviews] = useState([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(true);
  const [loading, setLoading] = useState(!game);
  const [newReview, setNewReview] = useState({ rating: "5", comment: "" });
  const [cooldown, setCooldown] = useState(0);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (id) increaseViewCount(id);
    const loadData = async () => {
      // 1. 캐시/API로 게임 정보 찾기
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

      // 2. 리뷰 로딩
      setIsReviewsLoading(true);
      const reviewsData = await fetchReviews();
      if (Array.isArray(reviewsData)) {
        const filteredReviews = reviewsData.filter(r => String(r.game_id) === String(id));
        filteredReviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setReviews(filteredReviews);
      }
      setIsReviewsLoading(false);
      setLoading(false);
    };
    loadData();
  }, [id]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // 대여 처리 함수
  // [FIX] User Flow: 사용자는 '찜하기'만 가능 (대여는 관리자/키오스크)
  const handleRent = async () => {
    if (!user) {
      if (window.confirm("로그인이 필요합니다. 로그인 페이지로 이동할까요?")) {
        navigate("/login");
      }
      return;
    }

    if (!window.confirm(`'${game.name}'을(를) 찜하시겠습니까 ?\n30분 내로 동아리방에서 수령해야 합니다.`)) return;

    try {
      const result = await dibsGame(game.id, user.id); // [Changed] rentGame -> dibsGame

      if (result.success) {
        showToast("⚡ 찜 완료! 30분 내에 수령해주세요.", {
          showButton: true,
          buttonText: "마이페이지로 가기",
          onButtonClick: () => navigate('/mypage')
        });
        setGame({ ...game, status: "찜" }); // [UI 업데이트]
      } else {
        showToast(result.message || "찜하기 실패", { type: "error" });
      }
    } catch (e) {
      showToast("오류 발생: " + (e.message || "알 수 없는 오류"), { type: "error" });
    }
  };

  const handleMiss = async () => {
    if (window.confirm(TEXTS.ALERT_MISS_CONFIRM)) {
      await sendMiss(game.id);
      showToast(TEXTS.ALERT_MISS_SUCCESS);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) return showToast("로그인이 필요합니다.", { type: "warning" });
    if (!newReview.comment) return showToast("내용을 입력해주세요.", { type: "warning" });
    if (cooldown > 0) return showToast(`조금만 기다려주세요(${cooldown}초)`, { type: "info" });

    setIsReviewSubmitting(true);
    try {
      await addReview({
        ...newReview,
        game_id: game.id,
        user_name: profile?.name || user.email?.split('@')[0] || "익명", // [CHANGE] 실명 우선 사용
      });

      showToast(TEXTS.ALERT_REVIEW_SUCCESS);
      setNewReview({ rating: "5", comment: "" });
      setCooldown(10);

      // 리뷰 목록 리로드 (간단히)
      const reviewsData = await fetchReviews();
      if (Array.isArray(reviewsData)) {
        const filteredReviews = reviewsData.filter(r => String(r.game_id) === String(id));
        filteredReviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setReviews(filteredReviews);
      }

    } catch (e) {
      showToast("리뷰 등록 실패: " + e.message, { type: "error" });
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  if (loading && !game) return <div style={{ padding: "20px", textAlign: "center" }}>로딩 중...</div>;
  if (!game) return <div style={{ padding: "20px", textAlign: "center" }}>게임을 찾을 수 없습니다.</div>;

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <button onClick={() => navigate("/")} style={{ marginBottom: "20px", cursor: "pointer", border: "none", background: "none", fontSize: "1.2em" }}>← 뒤로가기</button>

      {/* 게임 정보 카드 */}
      <div style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "20px", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", background: "white" }}>
        {game.image && <img src={game.image} alt={game.name} style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "10px", objectFit: "contain" }} />}
        <h2 style={{ marginTop: "15px" }}>{game.name}</h2>
        <p style={{ color: "#666" }}>{game.category} | {game.genre}</p>

        <div style={{ display: "flex", justifyContent: "space-around", margin: "20px 0", background: "#f9f9f9", padding: "15px", borderRadius: "10px" }}>
          <div>
            <div style={{ fontSize: "0.8em", color: "#888" }}>난이도</div>
            <div style={{ fontSize: "1.2em", color: "#e67e22", fontWeight: "bold" }}>{game.difficulty || "-"} <span style={{ fontSize: "0.8em" }}>/ 5.0</span></div>
          </div>
          <div>
            <div style={{ fontSize: "0.8em", color: "#888" }}>상태</div>
            <div style={{ fontSize: "1.2em", fontWeight: "bold", color: game.status === "대여가능" ? "#2ecc71" : "#e74c3c" }}>
              {game.status}
            </div>
          </div>
        </div>

        <div style={{ marginTop: "20px" }}>
          {game.status === "대여가능" ? (
            <button onClick={handleRent} style={{ width: "100%", padding: "15px", background: "#F39C12", color: "white", border: "none", borderRadius: "8px", fontSize: "1.1em", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 6px rgba(243, 156, 18, 0.3)" }}>
              ⚡ 찜하기 (30분)
            </button>
          ) : (
            <button onClick={handleMiss} style={{ width: "100%", padding: "15px", background: "#95a5a6", color: "white", border: "none", borderRadius: "8px", fontSize: "1.1em", fontWeight: "bold", cursor: "pointer" }}>
              😢 아쉬워요 (입고 요청)
            </button>
          )}
        </div>
      </div>

      {/* 리뷰 섹션 */}
      <div className="review-form-box" style={{ marginTop: "30px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
        <h3>리뷰 남기기</h3>
        {!user ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#888" }}>
            <p style={{ marginBottom: "10px" }}>로그인 후 리뷰를 남길 수 있습니다.</p>
            <button onClick={() => navigate("/login")} style={{ padding: "8px 16px", borderRadius: "5px", border: "1px solid #ddd", background: "white", cursor: "pointer" }}>로그인하기</button>
          </div>
        ) : (
          <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "10px" }}>
            <div className="review-row top-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", alignItems: "center" }}>
              <div style={{ fontWeight: "bold", color: "#555" }}>
                작성자: <span style={{ color: "#2c3e50" }}>{profile?.name || "익명"}</span>
              </div>
              <select className="review-input" value={newReview.rating} onChange={e => setNewReview({ ...newReview, rating: e.target.value })} style={{ padding: "5px", borderRadius: "5px", border: "1px solid #ddd" }}>
                <option value="5">⭐⭐⭐⭐⭐ (5점)</option>
                <option value="4">⭐⭐⭐⭐ (4점)</option>
                <option value="3">⭐⭐⭐ (3점)</option>
                <option value="2">⭐⭐ (2점)</option>
                <option value="1">⭐ (1점)</option>
              </select>
            </div>
            <div className="review-row bottom-row" style={{ display: "flex", gap: "10px" }}>
              <input
                className="review-input"
                placeholder="후기를 남겨주세요"
                value={newReview.comment}
                onChange={e => setNewReview({ ...newReview, comment: e.target.value })}
                style={{ flex: 1, padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}
              />
              <button
                onClick={handleSubmitReview}
                disabled={isReviewSubmitting || cooldown > 0}
                className="review-submit-btn"
                style={{
                  background: cooldown > 0 ? "#bdc3c7" : "#3498db",
                  color: "white",
                  border: "none",
                  padding: "0 20px",
                  borderRadius: "5px",
                  cursor: cooldown > 0 ? "not-allowed" : "pointer",
                  fontWeight: "bold"
                }}
              >
                {cooldown > 0 ? `${cooldown} s` : "등록"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 리뷰 목록 */}
      <div style={{ marginTop: "30px" }}>
        <h4 style={{ marginBottom: "15px", borderBottom: "2px solid #333", paddingBottom: "10px" }}>
          📝 리뷰 ({reviews.length})
        </h4>
        {isReviewsLoading ? <div>리뷰 불러오는 중...</div> : (
          (reviews || []).map(r => (
            <div key={r.review_id || Math.random()} style={{ borderBottom: "1px solid #eee", padding: "15px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                <strong>{r.author_name || r.user_name || "익명"}</strong>
                <span style={{ color: "#f1c40f" }}>{"⭐".repeat(r.rating)}</span>
              </div>
              <div style={{ color: "#333" }}>{r.content}</div>
              <div style={{ fontSize: "0.8em", color: "#999", marginTop: "5px" }}>
                {new Date(r.created_at).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
        {reviews.length === 0 && !isReviewsLoading && <div style={{ color: "#999", textAlign: "center", padding: "20px" }}>아직 리뷰가 없습니다. 첫 리뷰를 남겨주세요!</div>}
      </div>
    </div>
  );
}
export default GameDetail;
