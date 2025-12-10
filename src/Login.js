import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// 배포한 구글 앱스 스크립트 URL (따옴표 안에 넣어주세요)
const API_URL = "여기에_GAS_웹앱_URL_입력"; 

function Login() {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "loginUser", id, pw }), // action 이름 확인: loginUser
      });
      const data = await response.json();

      if (data.success) {
        // [핵심] 로컬 스토리지에 유저 정보 저장
        localStorage.setItem("user", JSON.stringify(data.user));
        alert(`${data.user.nickname}님 환영합니다!`);
        navigate("/"); // 메인으로 이동
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert("로그인 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px", textAlign: "center" }}>
      <h2>로그인</h2>
      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input 
          type="text" placeholder="ID" value={id} onChange={(e) => setId(e.target.value)} 
          style={{ padding: "10px", fontSize: "16px" }}
        />
        <input 
          type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} 
          style={{ padding: "10px", fontSize: "16px" }}
        />
        <button type="submit" style={{ padding: "10px", background: "#3498db", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px" }}>
          로그인
        </button>
      </form>
      <div style={{ marginTop: "20px" }}>
        아직 회원이 아니신가요? <Link to="/signup">회원가입</Link>
      </div>
      <div style={{ marginTop: "10px" }}>
        <Link to="/">메인으로 돌아가기</Link>
      </div>
    </div>
  );
}

export default Login;