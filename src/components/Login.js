// src/Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api';

function Login({ setUser }) { // App.js에서 setUser를 prop으로 받아야 함
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId || !password) return alert("학번과 비밀번호를 입력해주세요.");
    if (studentId.length !== 8) {
      return alert("학번은 8자리여야 합니다.");
    }


    setLoading(true);
    try {
      const res = await loginUser(studentId, password);

      if (res.success) {
        // ✅ [수정] 입력한 비밀번호(password)를 유저 정보에 포함시켜서 저장
        const userWithPassword = { ...res.user, password: password };

        // 1. 로컬 스토리지에 저장 (비밀번호 포함됨)
        localStorage.setItem("user", JSON.stringify(userWithPassword));

        // 2. App.js 상태 업데이트
        if (setUser) setUser(userWithPassword);

        alert(`${res.user.name}님 환영합니다!`);
        navigate("/");
      } else {
        alert(res.message); // "학번 또는 비밀번호 불일치" 등
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ marginBottom: "20px" }}>
        <Link to="/" style={{ textDecoration: "none", color: "#666", fontSize: "0.9em", fontWeight: "bold" }}>← 메인으로 돌아가기</Link>
      </div>
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>🔐 로그인</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="number"
          placeholder="학번"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          style={styles.input}
          maxLength={8}
          onInput={(e) => {
            if (e.target.value.length > 8) e.target.value = e.target.value.slice(0, 8);
          }}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
      <div style={{ textAlign: "center", marginTop: "20px", fontSize: "0.9em" }}>
        계정이 없으신가요? <Link to="/signup" style={{ color: "#3498db" }}>회원가입</Link>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: "400px", margin: "100px auto", padding: "30px", border: "1px solid #ddd", borderRadius: "10px", backgroundColor: "#fff" },
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  input: { padding: "12px", border: "1px solid #ddd", borderRadius: "5px", fontSize: "1em" },
  button: { padding: "12px", backgroundColor: "#333", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", fontSize: "1em" }
};

export default Login;