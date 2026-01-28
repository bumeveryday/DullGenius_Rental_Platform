// src/Signup.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext'; // [NEW]

function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { showToast } = useToast(); // [NEW]

  const [formData, setFormData] = useState({
    // email 제거 (학번으로 자동 생성)
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
      return showToast("모든 정보를 입력해주세요.", { type: "warning" });
    }

    if (studentId.length !== 8) {
      return showToast("학번은 정확히 8자리여야 합니다.", { type: "warning" });
    }

    setLoading(true);
    try {
      // [Magic] 학번 -> 이메일 자동 변환
      const email = `${studentId}@handong.ac.kr`;

      await signup(email, password, {
        name,
        student_id: studentId,
        phone
      });

      showToast("가입 성공! 이제 학번으로 로그인하세요.", { type: "success" });
      navigate("/");
    } catch (error) {
      console.error("Signup Error:", error);
      showToast(`가입 실패: ${error.message}`, { type: "error" });
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
        {/* 이메일 입력 칸 제거 */}
        <input name="name" placeholder="이름" value={formData.name} onChange={handleChange} style={styles.input} required />
        <input name="studentId" type="number" placeholder="학번 (8자리)" value={formData.studentId} onChange={handleChange} style={styles.input} maxLength={8} onInput={(e) => {
          if (e.target.value.length > 8) e.target.value = e.target.value.slice(0, 8);
        }} required />
        <input name="password" type="password" placeholder="비밀번호" value={formData.password} onChange={handleChange} style={styles.input} required />
        <input name="phone" placeholder="전화번호" value={formData.phone} onChange={handleChange} style={styles.input} required />

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
