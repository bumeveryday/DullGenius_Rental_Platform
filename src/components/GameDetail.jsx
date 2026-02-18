import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchGames, sendMiss, fetchReviews, addReview, increaseViewCount, dibsGame, cancelDibsGame, fetchMyRentals, sendLog } from '../api';
import { TEXTS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext'; // [NEW] 전역 Toast
import ConfirmModal from './ConfirmModal'; // [NEW] 커스텀 확인 모달
import { getOptimizedImageUrl } from '../utils/imageOptimizer'; // [NEW] 이미지 최적화

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
  const [videoModalOpen, setVideoModalOpen] = useState(false); // [NEW] 영상 모달 상태
  const [videoId, setVideoId] = useState(null); // [NEW] 유튜브 ID

  // [NEW] Confirm 모달 상태
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (id) increaseViewCount(id);
    const loadData = async () => {
      let targetGame = game;

      // 1. 캐시/API로 게임 정보 찾기
      if (!targetGame) {
        setLoading(true);
        const cachedGames = localStorage.getItem('games_cache');
        if (cachedGames) {
          const games = JSON.parse(cachedGames);
          const found = games.find(g => String(g.id) === String(id));
          if (found) {
            targetGame = found;
            setGame(found);
          }
        }

        if (!targetGame) {
          const gamesData = await fetchGames();
          const found = gamesData.find(g => String(g.id) === String(id));
          if (found) {
            targetGame = found;
            setGame(found);
          }
        }
      }

      setIsReviewsLoading(true);
      // [FIX] 중복 제거 및 필터링은 API 내부에서 처리됨
      const reviewsData = await fetchReviews(id);
      setReviews(reviewsData || []);

      setIsReviewsLoading(false);
      setLoading(false);

      // [NEW] 품절 상품 조회 로그 기록 (구조화)
      if (targetGame && targetGame.status !== "대여가능") {
        sendLog(id, 'OUT_OF_STOCK_VIEW', { current_status: targetGame.status });
      }
    };
    loadData();
  }, [id]);

  // [NEW] 찜 상태 확인 (새로고침 시 유지)
  useEffect(() => {
    const checkDibsStatus = async () => {
      if (user && game) {
        const { data: myRentals } = await fetchMyRentals(user.id);
        if (myRentals) {
          const myRental = myRentals.find(r => String(r.gameId) === String(game.id) && !r.returnedAt);
          if (myRental) {
            setGame(prev => ({
              ...prev,
              status: myRental.type === 'DIBS' ? "예약됨" : "이용중",
              renterId: user.id // [FIX] 자신의 찜임을 명시
            }));
          }
        }
      }
    };
    checkDibsStatus();
  }, [user, game?.id]); // game이 로드된 후 실행

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // [NEW] 유튜브 URL에서 ID 추출
  const getYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const openVideo = (url) => {
    // [NEW] 리소스 클릭 로그 (구조화)
    sendLog(game.id, 'RESOURCE_CLICK', {
      type: 'YouTube Video',
      url: url
    });

    const vid = getYoutubeId(url);
    if (vid) {
      setVideoId(vid);
      setVideoModalOpen(true);
    } else {
      window.open(url, '_blank'); // 유튜브 아니면 새창
    }
  };

  // 대여 처리 함수
  // [FIX] User Flow: 사용자는 '찜하기'만 가능 (대여는 관리자/키오스크)
  const handleRent = async () => {
    if (!user) {
      showConfirmModal("로그인 필요", "로그인이 필요합니다. 로그인 페이지로 이동할까요?", () => {
        navigate("/login");
      }, "info");
      return;
    }

    showConfirmModal(
      "찜하기 확인",
      `'${game.name}'을(를) 찜하시겠습니까?\n30분 내로 동아리방에서 수령해야 합니다.`,
      async () => {
        try {
          const result = await dibsGame(game.id, user.id); // [Changed] rentGame -> dibsGame

          if (result.success) {
            showToast("찜 완료! 30분 내에 수령해주세요.", {
              showButton: true,
              buttonText: "마이페이지로 가기",
              onButtonClick: () => navigate('/mypage')
            });
            // [UI 업데이트] 즉시 '예약됨/취소' 상태로 전환
            setGame(prev => ({
              ...prev,
              status: "예약됨",
              renterId: user.id,
              available_count: (prev.available_count || 1) - 1
            }));
          } else {
            showToast(result.message || "찜하기 실패", { type: "error" });
          }
        } catch (e) {
          showToast("오류 발생: " + (e.message || "알 수 없는 오류"), { type: "error" });
        }
      },
      "primary" // [NOTE] ConfirmModal에서 primary 타입 지원 확인 필요 (없으면 info로 처리됨)
    );
  };

  const handleCancelDibs = async () => {
    showConfirmModal(
      "찜 취소",
      `'${game.name}' 찜을 취소하시겠습니까?`,
      async () => {
        try {
          const result = await cancelDibsGame(game.id, user.id);
          if (result.success) {
            showToast("찜이 취소되었습니다.");
            setGame({ ...game, status: "대여가능", available_count: (game.available_count || 0) + 1 });
          } else {
            showToast(result.message || "취소 실패", { type: "error" });
          }
        } catch (e) {
          showToast("오류 발생: " + (e.message || "알 수 없는 오류"), { type: "error" });
        }
      },
      "danger"
    );
  };

  const handleMiss = async () => {
    showConfirmModal(
      "입고 요청",
      TEXTS.ALERT_MISS_CONFIRM,
      async () => {
        await sendMiss(game.id);
        showToast(TEXTS.ALERT_MISS_SUCCESS);
      },
      "info"
    );
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

      // 리뷰 목록 리로드
      const reviewsData = await fetchReviews(id);
      setReviews(reviewsData || []);

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
      {/* 게임 정보 카드 */}
      <div style={{ border: "1px solid #ddd", borderRadius: "10px", padding: "20px", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", background: "white" }}>
        {game.image && (
          <img
            src={getOptimizedImageUrl(game.image, 600)} // 상세 페이지는 조금 더 크게
            alt={game.name}
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null; // 무한 루프 방지
              if (e.target.src !== game.image) {
                e.target.src = game.image; // 최적화 실패 시 원본 로드
              }
            }}
            style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "10px", objectFit: "contain" }}
          />
        )}
        <h2 style={{ marginTop: "15px" }}>{game.name}</h2>

        {/* [NEW] 스마트 뱃지 버튼 */}
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "10px" }}>
          {game.video_url && (
            <button
              onClick={() => openVideo(game.video_url)}
              style={{ padding: "6px 12px", borderRadius: "15px", border: "1px solid #e74c3c", background: "white", color: "#e74c3c", cursor: "pointer", fontSize: "0.9em", display: "flex", alignItems: "center", gap: "5px" }}
            >
              📺 영상 가이드
            </button>
          )}
          {game.manual_url && (
            <button
              onClick={() => {
                sendLog(game.id, 'RESOURCE_CLICK', {
                  type: 'Manual PDF',
                  url: game.manual_url
                });
                window.open(game.manual_url, '_blank');
              }}
              style={{ padding: "6px 12px", borderRadius: "15px", border: "1px solid #3498db", background: "white", color: "#3498db", cursor: "pointer", fontSize: "0.9em", display: "flex", alignItems: "center", gap: "5px" }}
            >
              📖 설명서 보기
            </button>
          )}
        </div>
        <p style={{ color: "#666" }}>{game.category} | {game.genre}</p>

        {/* [NEW] 추천 문구 */}
        {game.recommendation_text && (
          <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#f0f8ff", borderRadius: "8px", color: "#2980b9", fontSize: "0.95em", fontStyle: "italic" }}>
            💡 {game.recommendation_text}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-around", margin: "20px 0", background: "#f9f9f9", padding: "15px", borderRadius: "10px" }}>
          <div>
            <div style={{ fontSize: "0.8em", color: "#888" }}>난이도</div>
            <div style={{ fontSize: "1.2em", color: "#e67e22", fontWeight: "bold" }}>{game.difficulty || "-"} <span style={{ fontSize: "0.8em" }}>/ 5.0</span></div>
          </div>
          <div>
            <div style={{ fontSize: "0.8em", color: "#888" }}>상태</div>
            <div style={{ fontSize: "1.2em", fontWeight: "bold", color: game.status === "대여가능" ? "#2ecc71" : "#e74c3c" }}>
              {game.status}
              {game.status === "대여가능" && game.available_count > 0 && (
                <span style={{ fontSize: "0.8em", color: "#27ae60", marginLeft: "5px" }}>
                  ({game.available_count}개 남음)
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: "20px" }}>
          {game.status === "대여가능" ? (
            <button onClick={handleRent} style={{ width: "100%", padding: "15px", background: "#F39C12", color: "white", border: "none", borderRadius: "8px", fontSize: "1.1em", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 6px rgba(243, 156, 18, 0.3)" }}>
              ⚡ 찜하기 (30분)
            </button>
          ) : (game.status === "예약됨" || game.status === "찜") && user && String(game.renterId) === String(user.id) ? (
            <button onClick={handleCancelDibs} style={{ width: "100%", padding: "15px", background: "#e74c3c", color: "white", border: "none", borderRadius: "8px", fontSize: "1.1em", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 6px rgba(231, 76, 60, 0.3)" }}>
              ❌ 예약 취소
            </button>
          ) : game.status === "예약됨" || game.status === "찜" || game.status === "이용중" ? (
            <button disabled style={{ width: "100%", padding: "15px", background: "#2ecc71", color: "white", border: "none", borderRadius: "8px", fontSize: "1.1em", fontWeight: "bold", cursor: "not-allowed", opacity: 0.8 }}>
              ✅ 이미 이용 중인 게임입니다
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
              <select className="review-input" value={newReview.rating} onChange={e => setNewReview({ ...newReview, rating: e.target.value })} style={{ padding: "5px", borderRadius: "5px", border: "1px solid #ddd" }} aria-label="별점 선택">
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


      {/* [NEW] 유튜브 모달 */}
      {
        videoModalOpen && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => setVideoModalOpen(false)}>
            <div style={{ position: "relative", width: "90%", maxWidth: "800px", aspectRatio: "16/9", background: "black" }}>
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
              <button
                onClick={(e) => { e.stopPropagation(); setVideoModalOpen(false); }}
                style={{ position: "absolute", top: "-40px", right: "0", background: "none", border: "none", color: "white", fontSize: "2em", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
          </div>
        )
      }

      {/* [NEW] Confirm 모달 렌더링 */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div >
  );
}
export default GameDetail;
