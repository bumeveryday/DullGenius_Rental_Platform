// src/mypage.js
import React, { useState, useEffect } from 'react';
import { fetchMyRentals } from './api';
import { Link } from 'react-router-dom';

const MyPage = ({ user }) => {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  // user props에서 정보 추출 (안전하게 옵셔널 체이닝 사용)
  const studentId = user?.student_id;
  const userName = user?.name;
  const userPhone = user?.phone;

  useEffect(() => {
    const loadRentals = async () => {
      if (!studentId) return;
      console.log("🔍 [MyPage] Searching rentals for:", { studentId, userName });
      setLoading(true);
      try {
        const result = await fetchMyRentals(studentId, userName);
        console.log("📨 [MyPage] API Response:", result);

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
    loadRentals();
  }, [studentId]);

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
        </div>
        <div style={styles.infoNote}>
          * 정보 수정이 필요한 경우 덜지니어스 임원진에게 문의해주세요.
        </div>
      </section>

      {/* 2. 대여 현황 섹션 */}
      <section style={{ ...styles.card, marginTop: "20px" }}>
        <h3 style={styles.sectionTitle}>🎲 빌려둔 보드게임</h3>

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
              const dDayStr = getDDayString(item.dueDate);
              const isOverdue = dDayStr.includes("연체");
              const isToday = dDayStr === "오늘 반납";

              // 상태에 따른 뱃지 색상
              let badgeColor = "#2ecc71"; // 초록 (여유)
              if (isToday) badgeColor = "#f39c12"; // 주황 (당일)
              if (isOverdue) badgeColor = "#e74c3c"; // 빨강 (연체)

              return (
                <div key={item.rentalId} style={styles.rentalItem}>
                  <div style={styles.rentalInfo}>
                    <div style={styles.gameName}>{item.gameName}</div>
                    <div style={styles.rentalDate}>대여일: {formatDate(item.borrowedAt)}</div>
                  </div>
                  <div style={styles.rentalStatus}>
                    <div style={{ ...styles.dDayBadge, backgroundColor: badgeColor }}>
                      {dDayStr}
                    </div>
                    <div style={styles.dueDateText}>
                      ~ {formatDate(item.dueDate)} 까지
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
const getDDayString = (dueDateString) => {
  if (!dueDateString) return "-";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateString);
  due.setHours(0, 0, 0, 0);
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `연체 ${Math.abs(diffDays)}일`;
  if (diffDays === 0) return "오늘 반납";
  return `D-${diffDays}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}`;
};

// 스타일 객체
const styles = {
  container: { maxWidth: "600px", margin: "0 auto", padding: "20px" },
  backLink: { textDecoration: "none", color: "#666", fontSize: "0.9em", fontWeight: "bold" },
  pageTitle: { fontSize: "1.8em", marginBottom: "25px", color: "#2c3e50" },

  card: { background: "white", padding: "25px", borderRadius: "15px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", border: "1px solid #eee" },
  sectionTitle: { margin: "0 0 20px 0", fontSize: "1.2em", color: "#34495e", borderBottom: "2px solid #f1f2f6", paddingBottom: "10px" },

  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px" },
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