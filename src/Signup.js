import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = "여기에_GAS_웹앱_URL_입력"; 

function Signup() {
  const [formData, setFormData] = useState({ id: "", pw: "", nickname: "" });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "signup", ...formData }),
      });
      const data = await response.json();

      if (data.success) {
        alert("가입 성공! 로그인해주세요.");
        navigate("/login");
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Signup Error:", error);
      alert("오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px", textAlign: "center" }}>
      <h2>회원가입</h2>
      <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input 
          name="id" type="text" placeholder="ID (아이디)" onChange={handleChange} required 
          style={{ padding: "10px" }}
        />
        <input 
          name="pw" type="password" placeholder="Password (비밀번호)" onChange={handleChange} required 
          style={{ padding: "10px" }}
        />
        <input 
          name="nickname" type="text" placeholder="Nickname (닉네임)" onChange={handleChange} required 
          style={{ padding: "10px" }}
        />
        <button type="submit" style={{ padding: "10px", background: "#2ecc71", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px" }}>
          가입하기
        </button>
      </form>
      <div style={{ marginTop: "15px" }}>
        <Link to="/">취소하고 메인으로</Link>
      </div>
    </div>
  );
}

export default Signup;