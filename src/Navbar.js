// components/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ user }) => {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="logo">
        <Link to="/">BoardGame Rent 🎲</Link>
      </div>
      
      <div className="menu-items">
        {/* 로그인 여부에 따라 다르게 표시 */}
        {user ? (
          <>
            <span className="welcome-msg">{user.name}님 환영합니다!</span>
            
            {/* ✅ 마이페이지 버튼 추가 */}
            <Link to="/mypage" className="nav-btn mypage-btn">
              마이페이지
            </Link>
            
            {/* 로그아웃 버튼 (예시) */}
            <button onClick={() => {/* 로그아웃 로직 */}}>로그아웃</button>
          </>
        ) : (
          <Link to="/login" className="nav-btn">로그인</Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;