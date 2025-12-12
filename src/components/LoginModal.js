import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TEXTS } from '../constants';

function LoginModal({ isOpen, onClose, onConfirm, gameName, currentUser, sessionUser, setSessionUser }) {
  // 입력값 상태
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState(""); // 연락처 (1주차 필수)

  // 모달이 열릴 때 로컬스토리지 확인
  useEffect(() => {
    if (isOpen) {
      if (currentUser) {
        // ✅ Case 1: 이미 로그인된 상태 (부모에게서 정보 받음)
        setName(currentUser.name);
        setStudentId(currentUser.studentId || currentUser.student_id || "");
        setPhone(currentUser.phone || "");
      } else {
        // ✅ Case 2: 비로그인 상태
        const saved = localStorage.getItem('user');
        if (saved) {
          const user = JSON.parse(saved);
          setName(user.name);
          setStudentId(user.studentId);
        } else {
          setName("");
          setStudentId("");
          setPhone("");
        }
      }
    }
  }, [isOpen, currentUser]);

  // 대여 버튼 클릭 핸들러
  const handleSubmit = () => {
    // 1. 필수 정보 입력 확인
    if (!name || !studentId || !phone) return alert("정보를 모두 입력해주세요.");

    // 2. 임시 유저(Guest)라면 세션에 저장
    if (!currentUser) {
      setSessionUser({ name, studentId, phone });
    }

    // ✅ 비밀번호 결정 로직
    const passwordToSend = currentUser ? currentUser.password : "";

    // 3. 대여 확정
    onConfirm({
      name,
      studentId,
      phone,
      password: passwordToSend
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>{TEXTS.USER_MODAL_TITLE}</h3>
        <p style={{ color: "#666", fontSize: "0.9em", marginBottom: "20px" }}
          dangerouslySetInnerHTML={{ __html: TEXTS.USER_MODAL_DESC.replace("{gameName}", gameName) }}
        />

        {currentUser ? (
          <div style={{ background: "#f0f9ff", padding: "20px", borderRadius: "10px", marginBottom: "20px" }}>
            <div style={{ fontSize: "1.2em", fontWeight: "bold", color: "#2c3e50" }}>{currentUser.name} 님</div>
            <div style={{ color: "#7f8c8d", fontSize: "0.9em", marginTop: "5px" }}>{currentUser.studentId}</div>
            <div style={{ color: "#7f8c8d", fontSize: "0.9em" }}>{currentUser.phone}</div>

            <p style={{ color: "#3498db", fontSize: "0.85em", marginTop: "15px" }}
              dangerouslySetInnerHTML={{ __html: TEXTS.USER_MODAL_LOGGED_IN_DESC }}
            />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

            {sessionUser && (
              <div style={{ fontSize: "0.8em", color: "#27ae60", textAlign: "left", marginLeft: "5px", marginBottom: "-5px" }}>
                {TEXTS.USER_MODAL_GUEST_INFO_LOADED}
              </div>
            )}

            <input placeholder="이름 (예: 홍길동)" value={name} onChange={(e) => setName(e.target.value)} style={styles.input} />
            <input
              placeholder="학번 (예: 22400001)"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              style={styles.input}
              type="number"
              maxLength={8}
              onInput={(e) => {
                if (e.target.value.length > 8) e.target.value = e.target.value.slice(0, 8);
              }}
            />
            <input placeholder="연락처 (010-0000-0000)" value={phone} onChange={(e) => setPhone(e.target.value)} style={styles.input} />

            <div style={{ fontSize: "0.85em", color: "#888", marginTop: "10px", lineHeight: "1.4", background: "#f9f9f9", padding: "10px", borderRadius: "8px" }}>
              <span dangerouslySetInnerHTML={{ __html: TEXTS.USER_MODAL_GUEST_SIGNUP_PROMO }} />
              <Link to="/signup" style={{ color: "#3498db", fontWeight: "bold" }}>회원가입</Link>
            </div>
          </div>
        )}

        <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
          <button onClick={onClose} style={styles.cancelBtn}>{TEXTS.BTN_CANCEL}</button>
          <button onClick={handleSubmit} style={styles.confirmBtn}>
            {currentUser ? TEXTS.BTN_RENT_NOW : TEXTS.BTN_RENT_AFTER_INFO}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modal: { background: "white", padding: "25px", borderRadius: "15px", width: "90%", maxWidth: "350px", textAlign: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" },
  input: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box", fontSize: "1rem" },
  label: { display: "block", textAlign: "left", fontSize: "0.85em", color: "#666", marginBottom: "5px" },
  checkboxContainer: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "5px 0" },
  resetBtn: { background: "none", border: "none", color: "#999", textDecoration: "underline", fontSize: "0.8em", marginTop: "10px", cursor: "pointer" },
  cancelBtn: { flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", background: "white", cursor: "pointer" },
  confirmBtn: { flex: 2, padding: "12px", borderRadius: "8px", border: "none", background: "#333", color: "white", fontWeight: "bold", cursor: "pointer" }
};

export default LoginModal;