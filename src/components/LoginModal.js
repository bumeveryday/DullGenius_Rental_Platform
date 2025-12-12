import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TEXTS } from '../constants';
import { signupUser } from '../api'; // [New] 회원가입 API 임포트

function LoginModal({ isOpen, onClose, onConfirm, gameName, currentUser, sessionUser, setSessionUser, setUser }) {
  // 입력값 상태
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState(""); // [New] 회원가입용 비밀번호
  const [isSignup, setIsSignup] = useState(false); // [New] 회원가입 체크 여부

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
  const handleSubmit = async () => {
    // 1. 필수 정보 입력 확인
    if (!name || !studentId || !phone) return alert("정보를 모두 입력해주세요.");

    // [New] 회원가입 동시 진행 시 비밀번호 확인
    if (isSignup && !password) return alert("비밀번호를 입력해주세요.");

    // 2. 임시 유저(Guest)라면 세션에 저장
    if (!currentUser) {
      if (setSessionUser) setSessionUser({ name, studentId, phone });
    }

    // [New] 회원가입 API 호출 (체크된 경우)
    if (isSignup) {
      try {
        const res = await signupUser({ name, studentId, password, phone });
        if (!res.success) { // [Fix] API 응답 형식(res.success)에 맞게 수정
          return alert("회원가입 실패: " + res.message); // 실패 시 대여 진행 안 함
        }

        // ✅ [New] 가입/로그인 성공 시 앱 전체 상태 업데이트 (로그인 유지)
        let userToSave = res.user; // 1. 서버에서 준 정보 (Auto-Login인 경우)

        if (!userToSave) {
          // 2. 서버가 안 줬으면(신규 가입) 입력값으로 구성
          userToSave = { name, studentId, phone };
        }

        // 3. 비밀번호 포함 (로컬스토리지 저장용)
        userToSave.password = password;

        // ⭐ [Critical] App.js의 메인 user 상태(setUser)를 업데이트해야 로그인 된 것으로 처리됨
        if (setUser) setUser(userToSave);
        else if (setSessionUser) setSessionUser(userToSave); // 혹시 setUser가 없으면 배리어

        localStorage.setItem("user", JSON.stringify(userToSave)); // 영구 저장

        alert(res.message || "회원가입이 완료되었습니다!"); // [Auto-Login] 서버 메시지 사용
      } catch (e) {
        return alert("회원가입 처리 중 오류가 발생했습니다: " + e.message);
      }
    }

    // ✅ 비밀번호 결정 (회원가입 시 입력한 비번 or 기존 비번 or 빈값)
    const passwordToSend = currentUser ? currentUser.password : (isSignup ? password : "");

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

              {/* [New] 인라인 회원가입 체크박스 */}
              <label style={styles.checkboxContainer}>
                <input
                  type="checkbox"
                  checked={isSignup}
                  onChange={(e) => setIsSignup(e.target.checked)}
                />
                <span style={{ color: "#2c3e50", fontWeight: "bold" }}>비밀번호를 설정하고 회원가입하기</span>
              </label>

              {isSignup && (
                <input
                  type="password"
                  placeholder="사용할 비밀번호 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...styles.input, marginTop: "5px", fontSize: "0.9em" }}
                />
              )}

              {!isSignup && (
                <div style={{ marginTop: "5px" }}>
                  <span dangerouslySetInnerHTML={{ __html: TEXTS.USER_MODAL_GUEST_SIGNUP_PROMO }} />
                  <Link to="/signup" style={{ color: "#3498db", fontWeight: "bold" }}>회원가입 페이지로</Link>
                </div>
              )}
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