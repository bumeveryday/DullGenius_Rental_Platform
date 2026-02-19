import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchGames, sendMiss, fetchReviews, addReview, increaseViewCount, dibsGame, cancelDibsGame, fetchMyRentals, sendLog } from '../api';
import { TEXTS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from './ConfirmModal';
import LazyImage from './common/LazyImage'; // [NEW] Lazy Image
import { getOptimizedImageUrl } from '../utils/imageOptimizer';
import './GameDetail.css'; // [NEW] External CSS

function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [game, setGame] = useState(location.state?.game || null);
  const [reviews, setReviews] = useState([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(true);
  const [loading, setLoading] = useState(!game);
  const [newReview, setNewReview] = useState({ rating: "5", comment: "" });
  const [cooldown, setCooldown] = useState(0);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoId, setVideoId] = useState(null);

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

      if (!targetGame) {
        setLoading(true);
        const cached = localStorage.getItem('games_cache');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const gamesList = parsed.data || (Array.isArray(parsed) ? parsed : []);
            const found = gamesList.find(g => String(g.id) === String(id));
            if (found) {
              targetGame = found;
              setGame(found);
            }
          } catch (e) {
            console.warn('캐시 로드 실패:', e);
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
      const reviewsData = await fetchReviews(id);
      setReviews(reviewsData || []);

      setIsReviewsLoading(false);
      setLoading(false);

      if (targetGame && targetGame.status !== "대여가능") {
        sendLog(id, 'OUT_OF_STOCK_VIEW', { current_status: targetGame.status });
      }
    };
    loadData();
  }, [id]);

  useEffect(() => {
    const checkDibsStatus = async () => {
      if (user && game) {
        const { data: myRentals } = await fetchMyRentals(user.id);
        if (myRentals) {
          const myRental = myRentals.find(r => String(r.gameId) === String(game.id) && !r.returnedAt);
          if (myRental) {
            setGame(prev => ({
              ...prev,
              status: myRental.type === 'DIBS' ? "예약됨" : "대여중",
              renterId: user.id
            }));
          }
        }
      }
    };
    checkDibsStatus();
  }, [user, game?.id]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const getYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const openVideo = (url) => {
    sendLog(game.id, 'RESOURCE_CLICK', {
      type: 'YouTube Video',
      url: url
    });

    const vid = getYoutubeId(url);
    if (vid) {
      setVideoId(vid);
      setVideoModalOpen(true);
    } else {
      window.open(url, '_blank');
    }
  };

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
          const result = await dibsGame(game.id, user.id);

          if (result.success) {
            showToast("찜 완료! 30분 내에 수령해주세요.", {
              showButton: true,
              buttonText: "마이페이지로 가기",
              onButtonClick: () => navigate('/mypage')
            });
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
      "primary"
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
        user_name: profile?.name || user.email?.split('@')[0] || "익명",
      });

      showToast(TEXTS.ALERT_REVIEW_SUCCESS);
      setNewReview({ rating: "5", comment: "" });
      setCooldown(10);

      const reviewsData = await fetchReviews(id);
      setReviews(reviewsData || []);

    } catch (e) {
      showToast("리뷰 등록 실패: " + e.message, { type: "error" });
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  if (loading && !game) return <div className="loading-container"><div className="spinner"></div></div>;
  if (!game) return <div style={{ padding: "20px", textAlign: "center" }}>게임을 찾을 수 없습니다.</div>;

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="game-detail-container">
      <button onClick={handleBack} className="detail-back-btn">← 뒤로가기</button>

      {/* 게임 정보 카드 */}
      <div className="detail-card">
        {game.image && (
          <LazyImage
            src={getOptimizedImageUrl(game.image, 600)}
            fallbackSrc={game.image}
            alt={game.name}
            className="detail-img"
            style={{ height: '300px', backgroundColor: 'transparent', width: '100%' }}
            aspectRatio={null}
          />
        )}
        <h2 className="detail-title">{game.name}</h2>

        {/* 스마트 뱃지 버튼 */}
        <div className="detail-actions">
          {game.video_url && (
            <button
              onClick={() => openVideo(game.video_url)}
              className="action-btn video"
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
              className="action-btn manual"
            >
              📖 설명서 보기
            </button>
          )}
        </div>
        <p className="detail-category">{game.category} | {game.genre}</p>

        {/* 추천 문구 */}
        {game.recommendation_text && (
          <div className="detail-recommendation">
            💡 {game.recommendation_text}
          </div>
        )}

        <div className="detail-stats">
          <div>
            <div className="stat-label">난이도</div>
            <div className="stat-value difficulty">{game.difficulty || "-"} <span className="stat-label">/ 5.0</span></div>
          </div>
          <div>
            <div className="stat-label">상태</div>
            <div className={`stat-value ${game.status === "대여가능" ? "status-available" : "status-unavailable"}`}>
              {game.status}
              {game.status === "대여가능" && game.available_count > 0 && (
                <span className="stat-value status-available" style={{ fontSize: "0.8em", marginLeft: "5px" }}>
                  ({game.available_count}개 남음)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="main-action-area">
          {game.status === "대여가능" ? (
            <button onClick={handleRent} className="main-btn rent">
              ⚡ 찜하기 (30분)
            </button>
          ) : (game.status === "예약됨" || game.status === "찜") && user && String(game.renterId) === String(user.id) ? (
            <button onClick={handleCancelDibs} className="main-btn cancel">
              ❌ 예약 취소
            </button>
          ) : game.status === "예약됨" || game.status === "찜" || game.status === "대여중" || game.status === "이용중" ? (
            <button disabled className="main-btn using">
              ✅ 이미 이용 중인 게임입니다
            </button>
          ) : (
            <button onClick={handleMiss} className="main-btn miss">
              😢 아쉬워요 (입고 요청)
            </button>
          )}
        </div>
      </div>

      {/* 리뷰 섹션 */}
      <div className="review-section">
        <h3>리뷰 남기기</h3>
        {!user ? (
          <div className="login-plz">
            <p>로그인 후 리뷰를 남길 수 있습니다.</p>
            <button onClick={() => navigate("/login")} className="login-btn-small">로그인하기</button>
          </div>
        ) : (
          <div className="review-input-box">
            <div className="review-header-row">
              <div style={{ fontWeight: "bold", color: "#555" }}>
                작성자: <span style={{ color: "#2c3e50" }}>{profile?.name || "익명"}</span>
              </div>
              <select
                className="review-rating-select"
                value={newReview.rating}
                onChange={e => setNewReview({ ...newReview, rating: e.target.value })}
                aria-label="별점 선택"
              >
                <option value="5">⭐⭐⭐⭐⭐ (5점)</option>
                <option value="4">⭐⭐⭐⭐ (4점)</option>
                <option value="3">⭐⭐⭐ (3점)</option>
                <option value="2">⭐⭐ (2점)</option>
                <option value="1">⭐ (1점)</option>
              </select>
            </div>
            <div className="review-body-row">
              <input
                className="review-text-input"
                placeholder="후기를 남겨주세요"
                value={newReview.comment}
                onChange={e => setNewReview({ ...newReview, comment: e.target.value })}
              />
              <button
                onClick={handleSubmitReview}
                disabled={isReviewSubmitting || cooldown > 0}
                className="review-submit-btn"
                style={{
                  background: cooldown > 0 ? "#bdc3c7" : "#3498db",
                  cursor: cooldown > 0 ? "not-allowed" : "pointer"
                }}
              >
                {cooldown > 0 ? `${cooldown} s` : "등록"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 리뷰 목록 */}
      <div className="review-list">
        <h4 className="review-list-title">
          📝 리뷰 ({reviews.length})
        </h4>
        {isReviewsLoading ? <div>리뷰 불러오는 중...</div> : (
          (reviews || []).map(r => (
            <div key={r.review_id || Math.random()} className="review-item">
              <div className="review-item-header">
                <strong>{r.author_name || r.user_name || "익명"}</strong>
                <span style={{ color: "#f1c40f" }}>{"⭐".repeat(r.rating)}</span>
              </div>
              <div style={{ color: "#333" }}>{r.content}</div>
              <div className="review-date">
                {new Date(r.created_at).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
        {reviews.length === 0 && !isReviewsLoading && <div style={{ color: "#999", textAlign: "center", padding: "20px" }}>아직 리뷰가 없습니다. 첫 리뷰를 남겨주세요!</div>}
      </div>


      {/* 유튜브 모달 */}
      {
        videoModalOpen && (
          <div className="video-modal-overlay" onClick={() => setVideoModalOpen(false)}>
            <div className="video-modal-content">
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
                className="video-close-btn"
              >
                &times;
              </button>
            </div>
          </div>
        )
      }

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
