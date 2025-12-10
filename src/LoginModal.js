// src/LoginModal.js
import { useState, useEffect } from 'react';
import { loginUser } from './api';

function LoginModal({ isOpen, onClose, onConfirm, gameName }) {
  // 입력값 상태
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState(""); // 연락처 (1주차 필수)
  const [password, setPassword] = useState("");
  
  // 모드 상태
  const [isRemember, setIsRemember] = useState(false); // '기억하기' 체크 여부
  const [hasSavedUser, setHasSavedUser] = useState(false); // 재방문자 여부

  // 모달이 열릴 때 로컬스토리지 확인
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('dullg_user');
      if (saved) {
        const user = JSON.parse(saved);
        setName(user.name);
        setStudentId(user.studentId);
        setHasSavedUser(true); // "재방문자 모드" ON
      } else {
        setHasSavedUser(false);
        // 초기화
        setName("");
        setStudentId("");
        setPhone("");
        setPassword("");
        setIsRemember(false);
      }
    }
  }, [isOpen]);

  // 대여 버튼 클릭 핸들러
  const handleSubmit = async () => {
    // 1. 유효성 검사 (Phase 1: 이름, 학번, 전화번호 필수)
    if (!name || !studentId) return alert("이름과 학번을 입력해주세요.");
    
    // 재방문자가 아니면 전화번호도 필수
    if (!hasSavedUser && !phone) return alert("연락처를 입력해주세요.");

    // 2. '기억하기'를 체크했거나, 이미 저장된 유저라면 -> 로그인 검증 시도
    if (isRemember || hasSavedUser) {
      if (!password || password.length < 4) return alert("비밀번호 4자리를 입력해주세요.");

      // 서버에 로그인 요청 (Phase 2,3 대비)
      // 지금은 1주차(Phase 1)라 서버에 명단이 없을 수도 있음.
      // 따라서 에러가 나도 '일단 대여'는 시켜주되, 로컬에 저장은 해야 함.
      try {
        const res = await loginUser(name, studentId, password);
        
        if (res.status === "success") {
          // 정회원 인증 성공 -> 로컬 갱신
          saveToLocal();
        } else {
          // 실패했더라도 1주차(오픈 기간)라면 통과시켜줘야 함?
          // 논의했던 대로 "1주차는 그냥 저장만 하고 패스" 로직
          if (!hasSavedUser) { // 처음 저장하는 경우
             // 서버엔 없지만 로컬엔 저장 (가입 유도 성공)
             saveToLocal();
          } else {
             // 재방문자인데 비번 틀림 -> 이건 막아야 함 (또는 다시 입력 유도)
             // 하지만 Phase 1에선 비번 검증할 DB가 비어있을 수 있으므로
             // "비밀번호가 틀렸거나 등록되지 않았습니다" 띄우고
             // 일단 대여는 진행시킬지 결정해야 함. 
             // 여기서는 '간편 입력'을 위해 로컬에 저장된 비번과 비교하는 꼼수를 쓸 수도 있음.
          }
        }
      } catch (e) {
        console.error("로그인 서버 통신 오류", e);
      }
    }

    // 3. 최종 대여 처리 (부모 컴포넌트로 데이터 전달)
    onConfirm({ name, studentId, phone });
    onClose();
  };

  const saveToLocal = () => {
    const userInfo = { name, studentId, phone };
    localStorage.setItem('dullg_user', JSON.stringify(userInfo));
  };

  // '다른 계정으로 대여' 버튼
  const handleReset = () => {
    localStorage.removeItem('dullg_user');
    setHasSavedUser(false);
    setName("");
    setStudentId("");
    setPhone("");
    setPassword("");
    setIsRemember(false);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>🎲 대여하기</h3>
        <p style={{color:"#666", fontSize:"0.9em"}}>
          <b>{gameName}</b>을(를) 빌립니다.<br/>
          분실/파손 시 책임이 발생할 수 있습니다.
        </p>

        {hasSavedUser ? (
          // [모드 A] 재방문자 (간편 로그인)
          <div style={{textAlign:"left", background:"#f9f9f9", padding:"15px", borderRadius:"8px"}}>
            <p style={{margin:"0 0 10px 0"}}>👋 안녕하세요, <b>{name}</b>님!</p>
            <label style={styles.label}>비밀번호 (4자리)</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="설정한 비밀번호 입력"
              style={styles.input}
              maxLength={4}
            />
            <button onClick={handleReset} style={styles.resetBtn}>다른 사람인가요?</button>
          </div>
        ) : (
          // [모드 B] 신규 방문자 (정보 입력)
          <div style={{display:"flex", flexDirection:"column", gap:"10px"}}>
            <input 
              placeholder="이름 (예: 홍길동)" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              style={styles.input}
            />
            <input 
              placeholder="학번 (예: 20240001)" 
              value={studentId} 
              onChange={(e) => setStudentId(e.target.value)} 
              style={styles.input}
              type="number"
            />
            <input 
              placeholder="연락처 (010-0000-0000)" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              style={styles.input}
            />
            
            {/* ✨ 가입 유도 체크박스 */}
            <label style={styles.checkboxContainer}>
              <input 
                type="checkbox" 
                checked={isRemember} 
                onChange={(e) => setIsRemember(e.target.checked)} 
              />
              <span style={{fontSize:"0.9em", color: isRemember ? "#3498db" : "#555"}}>
                다음부터 이름/학번 입력 없이 바로 빌리기
              </span>
            </label>

            {/* 체크 시 비밀번호 입력창 등장 */}
            {isRemember && (
              <div style={{animation: "fadeIn 0.3s"}}>
                <input 
                  type="password"
                  placeholder="사용할 비밀번호 4자리 설정"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{...styles.input, borderColor: "#3498db", background: "#ebf5fb"}}
                  maxLength={4}
                />
              </div>
            )}
          </div>
        )}

        <div style={{marginTop:"20px", display:"flex", gap:"10px"}}>
          <button onClick={onClose} style={styles.cancelBtn}>취소</button>
          <button onClick={handleSubmit} style={styles.confirmBtn}>대여확정</button>
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