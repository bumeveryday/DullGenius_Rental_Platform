import React, { useState, useEffect } from 'react';
import { fetchMyRentals, fetchUserPoints, fetchPointHistory, withdrawAccount } from '../api';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // [NEW] Context 사용
import { useToast } from '../contexts/ToastContext'; // [NEW]

const MyPage = () => {
  const { user, profile, loading: authLoading, refreshProfile, logout } = useAuth(); // [NEW]
  const navigate = useNavigate();
  const { showToast } = useToast(); // [NEW]

  const [rentals, setRentals] = useState([]);
  const [pointHistory, setPointHistory] = useState([]); // [NEW] 포인트 내역
  const [currentPoints, setCurrentPoints] = useState(0); // [NEW] 현재 포인트
  const [loading, setLoading] = useState(true);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoId, setVideoId] = useState(null);

  // [NEW] 유튜브 ID 추출
  const getYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const openVideo = (url) => {
    const vid = getYoutubeId(url);
    if (vid) {
      setVideoId(vid);
      setVideoModalOpen(true);
    } else {
      window.open(url, '_blank');
    }
  };

  // Profile 정보 사용 (Smart Fallback)
  const userName = profile?.name || "로딩 중...";
  const studentId = profile?.student_id || user?.email?.split('@')[0] || "-";
  const userPhone = profile?.phone || "-";


  useEffect(() => {
    // 비로그인 시 리다이렉트
    if (!authLoading && !user) {
      showToast("로그인이 필요합니다.", { type: "warning" });
      navigate("/login");
    }
  }, [user, authLoading, navigate, showToast]);

  useEffect(() => {
    const loadData = async () => {
      // 로그인이 안 되어 있거나 user 객체가 없으면 중단
      if (!user) return;

      setLoading(true);
      try {
        // [FIX] user.id (UUID)를 사용
        const [rentalsResult, points, history] = await Promise.all([
          fetchMyRentals(user.id),
          fetchUserPoints(user.id),
          fetchPointHistory(user.id)
        ]);

        if (rentalsResult.status === "success") {
          setRentals(rentalsResult.data);
        } else {
          console.error("❌ [MyPage] Rental fetch error:", rentalsResult.message);
        }

        setCurrentPoints(points);
        setPointHistory(history || []);

      } catch (e) {
        console.error("❌ [MyPage] Fetch failed:", e);
      }
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user]);

  // [NEW] 회원 탈퇴 처리
  const handleWithdraw = async () => {
    if (!user) return;

    const confirm1 = window.confirm("정말로 탈퇴하시겠습니까?\n계정은 비활성화되지만, 동아리 운영을 위해 대여 기록과 기본 정보는 보존됩니다.");
    if (!confirm1) return;

    const confirm2 = window.confirm("마지막 확인입니다.\n재가입하더라도 이전 대여 기록이나 포인트는 연동되지 않습니다.\n그래도 진행하시겠습니까?");
    if (!confirm2) return;

    try {
      const result = await withdrawAccount(user.id);
      if (result.success) {
        showToast("그동안 이용해 주셔서 감사합니다. 회원 탈퇴가 완료되었습니다.", { type: "success" });
        await logout(); // 로그아웃 처리
        navigate("/");  // 홈으로 이동
      } else {
        showToast(result.message || "탈퇴 처리 중 오류가 발생했습니다.", { type: "error" });
      }
    } catch (e) {
      console.error("Withdrawal error:", e);
      showToast("서버 오류로 탈퇴를 처리할 수 없습니다.", { type: "error" });
    }
  };

  // 로딩 중일 때
  if (authLoading) return <div style={{ padding: "50px", textAlign: "center" }}>인증 정보 확인 중...</div>;

  return (
    <div style={styles.container}>
      {/* 상단 네비게이션 */}
      <div style={{ marginBottom: "20px" }}>
        <Link to="/" style={styles.backLink}>← 메인으로 돌아가기</Link>
      </div>

      <h2 style={styles.pageTitle}>마이페이지</h2>

      {/* 1. 정보 일람 섹션 */}
      <section style={styles.card}>
        <h3 style={styles.sectionTitle}>👤 내 정보</h3>
        <div style={styles.infoGrid}>
          <InfoItem label="이름" value={userName} />
          <InfoItem label="학번" value={studentId} />
          <InfoItem label="연락처" value={userPhone} />

          {/* [NEW] 가입 학기 표시 및 수정 */}
          <SemesterItem
            semester={profile?.joined_semester}
            isFixed={profile?.is_semester_fixed}
            onUpdate={refreshProfile} // Context 갱신 함수 전달
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <span style={{ fontSize: "0.85em", color: "#888" }}>보유 포인트</span>
            <span style={{ fontSize: "1.5em", fontWeight: "bold", color: "#3498db" }}>{currentPoints.toLocaleString()} P</span>
          </div>
        </div>
        <div style={styles.infoNote}>
          * 가입 학기는 최초 1회만 수정 가능합니다.
          <br />
          * 정보 수정이 필요한 경우 덜지니어스 임원진에게 문의해주세요.
        </div>
      </section>


      {/* 2. 대여 현황 섹션 */}
      <section style={{ ...styles.card, marginTop: "20px" }}>
        <h3 style={styles.sectionTitle}>🎲 빌려둔 보드게임 (현재 대여중)</h3>

        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>로딩 중...</div>
        ) : rentals.length === 0 ? (
          <div style={styles.emptyState}>
            <p>현재 대여 중인 게임이 없습니다.</p>
            <Link to="/">
              <button style={styles.goRentBtn}>게임 구경하러 가기</button>
            </Link>
          </div>
        ) : (
          <div style={styles.rentalList}>
            {rentals.map((item) => {
              // 1. D-Day / 시간 계산 logic
              const dDayStr = getDDayString(item.dueDate, item.type);

              // 2. 뱃지 색상 및 텍스트 결정
              let badgeColor = "#2ecc71"; // 기본 초록
              let typeLabel = "대여중";

              if (item.type === 'DIBS') {
                typeLabel = "⚡ 찜 (수령대기)";
                badgeColor = "#F39C12"; // 찜은 항상 주황
                if (dDayStr.includes("만료")) badgeColor = "#e74c3c"; // 시간 초과시 빨강
              } else {
                // RENT
                if (dDayStr === "오늘 반납") badgeColor = "#f39c12";
                if (dDayStr.includes("연체")) badgeColor = "#e74c3c";
              }

              return (
                <div key={item.rentalId} style={styles.rentalItem}>
                  <div style={styles.rentalInfo}>
                    <div style={styles.gameName}>
                      {item.gameName}
                      {item.type === 'DIBS' && <span style={{ fontSize: '0.8em', color: '#F39C12', marginLeft: '5px' }}>⚡</span>}
                    </div>
                    <div style={styles.rentalDate}>{item.type === 'DIBS' ? '찜한 시각' : '대여일'}: {formatDate(item.borrowedAt)}</div>

                    {/* [NEW] 스마트 뱃지 (작게) */}
                    <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
                      {item.videoUrl && (
                        <button
                          onClick={() => openVideo(item.videoUrl)}
                          style={{ padding: "4px 8px", borderRadius: "12px", border: "1px solid #e74c3c", background: "white", color: "#e74c3c", cursor: "pointer", fontSize: "0.75em", fontWeight: "bold" }}
                        >
                          📺 가이드
                        </button>
                      )}
                      {item.manualUrl && (
                        <button
                          onClick={() => window.open(item.manualUrl, '_blank')}
                          style={{ padding: "4px 8px", borderRadius: "12px", border: "1px solid #3498db", background: "white", color: "#3498db", cursor: "pointer", fontSize: "0.75em", fontWeight: "bold" }}
                        >
                          📖 룰북
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={styles.rentalStatus}>
                    <div style={{ ...styles.dDayBadge, backgroundColor: badgeColor }}>
                      {typeLabel}
                    </div>
                    <div style={styles.dueDateText}>
                      {dDayStr}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. 포인트 내역 섹션 [NEW] */}
      <section style={{ ...styles.card, marginTop: "20px" }}>
        <h3 style={styles.sectionTitle}>💰 포인트 적립 내역</h3>

        {pointHistory.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>아직 포인트 내역이 없습니다. 동아리 활동을 해보세요!</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {pointHistory.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", borderBottom: "1px solid #f1f2f6" }}>
                <div>
                  <div style={{ fontWeight: "bold", color: "#2c3e50" }}>{item.reason}</div>
                  <div style={{ fontSize: "0.8em", color: "#95a5a6" }}>{formatDate(item.created_at)}</div>
                </div>
                <div style={{ fontWeight: "bold", color: item.amount > 0 ? "#2ecc71" : "#e74c3c" }}>
                  {item.amount > 0 ? "+" : ""}{item.amount} P
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. 회원 탈퇴 섹션 [NEW] */}
      <div style={styles.withdrawalSection}>
        <button
          onClick={handleWithdraw}
          style={styles.withdrawalBtn}
        >
          회원 탈퇴하기
        </button>
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
    </div >
  );
};

// 작은 정보 아이템 컴포넌트
const InfoItem = ({ label, value }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
    <span style={{ fontSize: "0.85em", color: "#888" }}>{label}</span>
    <span style={{ fontSize: "1.1em", fontWeight: "bold", color: "#333" }}>{value || "-"}</span>
  </div>
);

// 날짜 계산 헬퍼 함수들
// 날짜 계산 헬퍼 함수들
const getDDayString = (dueDateString, type = 'RENT') => {
  if (!dueDateString) return "-";
  const now = new Date();
  const due = new Date(dueDateString);
  const diffTime = due - now;

  // [DIBS] 분 단위 카운트다운
  if (type === 'DIBS') {
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    if (diffMinutes < 0) return "시간 만료 (자동취소)";
    return `${diffMinutes}분 남음`;
  }

  // [RENT] 일 단위 D-Day
  // 날짜 차이 계산 (시간 무시, 날짜만 비교)
  const todayZero = new Date(now); todayZero.setHours(0, 0, 0, 0);
  const dueZero = new Date(due); dueZero.setHours(0, 0, 0, 0);

  // (대여 기한은 '내일 23:59:59' 이므로, 날짜 차이만 보면 됨)
  const dayDiffTime = dueZero - todayZero;
  const diffDays = Math.ceil(dayDiffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `연체 ${Math.abs(diffDays)}일`;
  if (diffDays === 0) return "오늘 반납";
  return `반납까지 D-${diffDays}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  // 오늘 날짜면 시간만 표시? 아니면 그냥 날짜+시간
  // 심플하게: "1. 28. (18:30)" 포맷
  const Month = date.getMonth() + 1;
  const Day = date.getDate();
  const Hour = String(date.getHours()).padStart(2, '0');
  const Min = String(date.getMinutes()).padStart(2, '0');
  return `${Month}. ${Day}. (${Hour}:${Min})`;
};

import { updateMySemester } from '../api';
import { DEFAULT_SEMESTER } from '../constants'; // [NEW]

// [NEW] 학기 수정 컴포넌트
const SemesterItem = ({ semester, isFixed, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [tempSemester, setTempSemester] = useState(semester || DEFAULT_SEMESTER);
  const { showToast } = useToast();

  useEffect(() => {
    if (semester) setTempSemester(semester);
  }, [semester]);

  const handleSave = async () => {
    try {
      if (!window.confirm(`${tempSemester}학기로 확정하시겠습니까?\n저장 후에는 수정할 수 없습니다.`)) return;

      await updateMySemester(tempSemester);
      showToast("가입 학기가 저장되었습니다.", { type: "success" });
      setEditing(false);
      await onUpdate(); // 부모 갱신 요청 (refreshProfile)
    } catch (e) {
      showToast(e.message, { type: "error" });
    }
  };

  if (!isFixed && !editing) {
    // 아직 확정 안됨 -> 수정 버튼 노출
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <span style={{ fontSize: "0.85em", color: "#888" }}>가입 학기 (미확정)</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: "1.1em", fontWeight: "bold", color: "#e67e22" }}>{semester || "-"}</span>
          <button onClick={() => setEditing(true)} style={{ ...styles.miniBtn, background: '#f39c12' }}>수정/확정</button>
        </div>
      </div>
    );
  }

  if (editing) {
    // 수정 모드
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <span style={{ fontSize: "0.85em", color: "#888" }}>가입 학기 입력</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <input
            type="text"
            value={tempSemester}
            onChange={(e) => setTempSemester(e.target.value)}
            placeholder="예: 2025-1"
            style={{ padding: '5px', width: '80px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <button onClick={handleSave} style={{ ...styles.miniBtn, background: '#2ecc71' }}>저장</button>
          <button onClick={() => setEditing(false)} style={{ ...styles.miniBtn, background: '#95a5a6' }}>취소</button>
        </div>
      </div>
    );
  }

  // 확정됨
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <span style={{ fontSize: "0.85em", color: "#888" }}>가입 학기</span>
      <span style={{ fontSize: "1.1em", fontWeight: "bold", color: "#333" }}>{semester}</span>
    </div>
  );
};

// 스타일 객체
const styles = {
  container: { maxWidth: "600px", margin: "0 auto", padding: "20px" },
  backLink: { textDecoration: "none", color: "#666", fontSize: "0.9em", fontWeight: "bold" },
  pageTitle: { fontSize: "1.8em", marginBottom: "25px", color: "#2c3e50" },

  card: { background: "white", padding: "25px", borderRadius: "15px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", border: "1px solid #eee" },
  sectionTitle: { margin: "0 0 20px 0", fontSize: "1.2em", color: "#34495e", borderBottom: "2px solid #f1f2f6", paddingBottom: "10px" },

  infoGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px" },
  infoNote: { marginTop: "20px", fontSize: "0.8em", color: "#bdc3c7", textAlign: "right" },

  miniBtn: { padding: "4px 8px", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.8em", fontWeight: "bold" },

  emptyState: { textAlign: "center", padding: "30px 0", color: "#95a5a6" },
  goRentBtn: { padding: "10px 20px", background: "#3498db", color: "white", border: "none", borderRadius: "20px", marginTop: "15px", cursor: "pointer", fontWeight: "bold" },

  rentalList: { display: "flex", flexDirection: "column", gap: "15px" },
  rentalItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", background: "#f8f9fa", borderRadius: "10px", border: "1px solid #eee" },
  rentalInfo: { display: "flex", flexDirection: "column", gap: "5px" },
  gameName: { fontWeight: "bold", fontSize: "1.1em", color: "#2c3e50" },
  rentalDate: { fontSize: "0.85em", color: "#7f8c8d" },

  rentalStatus: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px" },
  dDayBadge: { padding: "5px 10px", borderRadius: "15px", color: "white", fontSize: "0.85em", fontWeight: "bold" },
  dueDateText: { fontSize: "0.8em", color: "#e74c3c", fontWeight: "bold" },

  // [NEW] 회원 탈퇴 섹션 스타일
  withdrawalSection: { marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #eee", textAlign: "center" },
  withdrawalBtn: { background: "none", border: "none", color: "#95a5a6", fontSize: "0.85em", textDecoration: "underline", cursor: "pointer", padding: "10px" }
};

export default MyPage;