// src/Signup.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signupUser } from '../api';

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    password: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, studentId, password, phone } = formData;

    if (!name || !studentId || !password || !phone) {
      return alert("모든 정보를 입력해주세요.");
    }

    if (studentId.length !== 8) {
      return alert("학번은 정확히 8자리여야 합니다.");
    }

    setLoading(true);
    try {
      const res = await signupUser(formData);

      if (res.success) {
        alert("회원가입 성공! 로그인해주세요.");
        navigate("/login"); // 로그인 페이지로 이동
      } else {
        alert(`가입 실패: ${res.message}`);
      }
    } catch (error) {
      console.error("Signup Error:", error);
      alert("서버 통신 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ marginBottom: "20px" }}>
        <Link to="/" style={{ textDecoration: "none", color: "#666", fontSize: "0.9em", fontWeight: "bold" }}>← 메인으로 돌아가기</Link>
      </div>
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>📝 회원가입</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input name="name" placeholder="이름" value={formData.name} onChange={handleChange} style={styles.input} />
        <input name="studentId" type="number" placeholder="학번" value={formData.studentId} onChange={handleChange} style={styles.input} maxLength={8} onInput={(e) => {
          if (e.target.value.length > 8) e.target.value = e.target.value.slice(0, 8);
        }} />
        <input name="password" type="password" placeholder="비밀번호" value={formData.password} onChange={handleChange} style={styles.input} />
        <input name="phone" placeholder="전화번호" value={formData.phone} onChange={handleChange} style={styles.input} />

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "가입 처리 중..." : "가입하기"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: { maxWidth: "400px", margin: "100px auto", padding: "30px", border: "1px solid #ddd", borderRadius: "10px", backgroundColor: "#fff" },
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  input: { padding: "12px", border: "1px solid #ddd", borderRadius: "5px", fontSize: "1em" },
  button: { padding: "12px", backgroundColor: "#3498db", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", fontSize: "1em" }
};

export default Signup;