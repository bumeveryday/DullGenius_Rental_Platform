import React, { useState, useEffect } from 'react';
import { fetchMyRentals } from '../api';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // [NEW] Context 사용
import { useToast } from '../contexts/ToastContext'; // [NEW]

const MyPage = () => {
  const { user, profile, loading: authLoading } = useAuth(); // [NEW]
  const navigate = useNavigate();
  const { showToast } = useToast(); // [NEW]

  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile 정보 사용 (Smart Fallback)
  const userName = profile?.name || "로딩 중...";
  const studentId = profile?.student_id || user?.email?.split('@')[0] || "-";
  const userPhone = profile?.phone || "-";
  const activityPoint = profile?.activity_point ?? 0;

  useEffect(() => {
    // 비로그인 시 리다이렉트
    if (!authLoading && !user) {
      showToast("로그인이 필요합니다.", { type: "warning" });
      navigate("/login");
    }
  }, [user, authLoading, navigate, showToast]);

  useEffect(() => {
    const loadRentals = async () => {
      // 로그인이 안 되어 있거나 user 객체가 없으면 중단
      if (!user) return;

      setLoading(true);
      try {
        // [FIX] user.id (UUID)를 사용
        const result = await fetchMyRentals(user.id);

        if (result.status === "success") {
          setRentals(result.data);
        } else {
          console.error("❌ [MyPage] Error message:", result.message);
        }
      } catch (e) {
        console.error("❌ [MyPage] Fetch failed:", e);
      }
      setLoading(false);
    };

    if (user) {
      loadRentals();
    }
  }, [user]);

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
          <InfoItem label="활동 포인트" value={`${activityPoint.toLocaleString()} P`} />
        </div>
        <div style={styles.infoNote}>
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
    </div>
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

// 스타일 객체
const styles = {
  container: { maxWidth: "600px", margin: "0 auto", padding: "20px" },
  backLink: { textDecoration: "none", color: "#666", fontSize: "0.9em", fontWeight: "bold" },
  pageTitle: { fontSize: "1.8em", marginBottom: "25px", color: "#2c3e50" },

  card: { background: "white", padding: "25px", borderRadius: "15px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", border: "1px solid #eee" },
  sectionTitle: { margin: "0 0 20px 0", fontSize: "1.2em", color: "#34495e", borderBottom: "2px solid #f1f2f6", paddingBottom: "10px" },

  infoGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px" },
  infoNote: { marginTop: "20px", fontSize: "0.8em", color: "#bdc3c7", textAlign: "right" },

  emptyState: { textAlign: "center", padding: "30px 0", color: "#95a5a6" },
  goRentBtn: { padding: "10px 20px", background: "#3498db", color: "white", border: "none", borderRadius: "20px", marginTop: "15px", cursor: "pointer", fontWeight: "bold" },

  rentalList: { display: "flex", flexDirection: "column", gap: "15px" },
  rentalItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", background: "#f8f9fa", borderRadius: "10px", border: "1px solid #eee" },
  rentalInfo: { display: "flex", flexDirection: "column", gap: "5px" },
  gameName: { fontWeight: "bold", fontSize: "1.1em", color: "#2c3e50" },
  rentalDate: { fontSize: "0.85em", color: "#7f8c8d" },

  rentalStatus: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px" },
  dDayBadge: { padding: "5px 10px", borderRadius: "15px", color: "white", fontSize: "0.85em", fontWeight: "bold" },
  dueDateText: { fontSize: "0.8em", color: "#e74c3c", fontWeight: "bold" }
};

export default MyPage;