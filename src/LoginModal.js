// src/LoginModal.js
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function LoginModal({isOpen, onClose, onConfirm, gameName, currentUser, sessionUser, setSessionUser }) {
  // 입력값 상태
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState(""); // 연락처 (1주차 필수)

  // 모달이 열릴 때 로컬스토리지 확인
useEffect(() => {
    if (isOpen) {
      if (currentUser) {
        // ✅ Case 1: 이미 로그인된 상태 (부모에게서 정보 받음)
        // 정보를 state에 세팅하고, 별도 모드 진입 없이 바로 대여 가능한 상태로 준비
        setName(currentUser.name);
        setStudentId(currentUser.studentId || currentUser.student_id || "");
        setPhone(currentUser.phone || ""); // 전화번호가 없을 수도 있음 대비
      } else {
        // ✅ Case 2: 비로그인 상태 -> 기존 로직대로 로컬스토리지 확인
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
  }, [isOpen, currentUser]); // currentUser 의존성 추가

  

  // 대여 버튼 클릭 핸들러
 const handleSubmit = () => {
    // 1. 필수 정보 입력 확인 (이름, 학번, 전화번호)
    if (!name || !studentId || !phone) return alert("정보를 모두 입력해주세요.");

    // 2. 임시 유저(Guest)라면 세션에 저장
    if (!currentUser) {
      setSessionUser({ name, studentId, phone });
    }

    // ✅ [수정] 비밀번호 결정 로직
    // 로그인된 유저면? -> 저장된 비밀번호(currentUser.password) 사용
    // 비회원/임시유저면? -> 빈 값("") 사용
    const passwordToSend = currentUser ? currentUser.password : "";

    // 3. 대여 확정 (결정된 비밀번호 전송)
    onConfirm({ 
      name, 
      studentId, 
      phone, 
      password: passwordToSend // <-- 여기가 핵심입니다!
    }); 
    
    onClose();
  };

  if (!isOpen) return null;

return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>🎲 찜하기</h3>
        <p style={{color:"#666", fontSize:"0.9em", marginBottom:"20px"}}>
          <b>{gameName}</b>의 대여 예약을 진행합니다.<br/>
          분실/파손 시 책임이 발생할 수 있습니다.
        </p>

        {/* ✅ [화면 분기] 1. 로그인 된 회원 (적어두신 내용 그대로 유지) */}
        {currentUser ? ( 
          <div style={{background: "#f0f9ff", padding: "20px", borderRadius: "10px", marginBottom: "20px"}}>
            <div style={{fontSize: "1.2em", fontWeight: "bold", color: "#2c3e50"}}>{currentUser.name} 님</div>
            <div style={{color: "#7f8c8d", fontSize: "0.9em", marginTop: "5px"}}>{currentUser.studentId}</div>
            <div style={{color: "#7f8c8d", fontSize: "0.9em"}}>{currentUser.phone}</div>
            
            <p style={{color: "#3498db", fontSize: "0.85em", marginTop: "15px"}}>
              ✨ 로그인된 계정으로 대여합니다.<br/>
              30분이 지나면 예약이 취소되니, <br/>
              늦기 전에 동아리방에서 수령해가세요!
            </p>
          </div>
        ) : (
          /* ✅ [화면 분기] 2. 비로그인 (수정됨: 비밀번호 제거, 가입 유도) */
          <div style={{display:"flex", flexDirection:"column", gap:"10px"}}>
             
             {/* 임시 정보가 있다면 표시 */}
             {sessionUser && (
               <div style={{fontSize:"0.8em", color:"#27ae60", textAlign:"left", marginLeft:"5px", marginBottom:"-5px"}}>
                 ⚡ 이전에 입력한 정보를 불러왔습니다.
               </div>
             )}

            <input placeholder="이름 (예: 홍길동)" value={name} onChange={(e) => setName(e.target.value)} style={styles.input} />
            <input 
              placeholder="학번 (예: 22400001)" 
              value={studentId} 
              onChange={(e) => setStudentId(e.target.value)} 
              style={styles.input} 
              type="number" 
              maxLength={8} 김나
              onInput={(e) => {
                if (e.target.value.length > 8) e.target.value = e.target.value.slice(0, 8);
              }}
            />
            <input placeholder="연락처 (010-0000-0000)" value={phone} onChange={(e) => setPhone(e.target.value)} style={styles.input} />
            
            {/* 비밀번호 입력란을 없애고, 가입 유도 문구로 대체 */}
            <div style={{fontSize:"0.85em", color:"#888", marginTop:"10px", lineHeight:"1.4", background:"#f9f9f9", padding:"10px", borderRadius:"8px"}}>
              여기다가 비밀번호만 더하면 회원가입 끝나요.<br/>
              매번 입력하기 귀찮다면? <Link to="/signup" style={{color:"#3498db", fontWeight:"bold"}}>회원가입</Link>
            </div>
          </div>
        )}

        <div style={{marginTop:"20px", display:"flex", gap:"10px"}}>
          <button onClick={onClose} style={styles.cancelBtn}>취소</button>
          <button onClick={handleSubmit} style={styles.confirmBtn}>
            {currentUser ? "바로 대여하기" : "정보 입력 후 대여"}
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