// src/kiosk/CharacterPicker.js
import React, { useState, useEffect } from 'react';
import './CharacterPicker.css';

// 한글 초성
const CHOSEONG = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

// 영문/숫자 카테고리 (특수 키워드)
const CATEGORIES = [
    { label: '영문', value: '[ALPHA]' },
    { label: '숫자', value: '[NUMERIC]' }
];

function CharacterPicker({ value, onChange }) {
    const [isExpanded, setIsExpanded] = useState(true); // 키보드 펼침/접힘 상태

    // 검색어가 2글자 이상이면 키보드 자동 숨김
    useEffect(() => {
        if (value.length >= 2) {
            setIsExpanded(false);
        }
    }, [value]);

    const handleCharClick = (char) => {
        onChange(value + char);
    };

    const handleCategoryClick = (categoryValue) => {
        // 카테고리 키워드로 검색어 설정
        onChange(categoryValue);
    };

    const handleBackspace = () => {
        onChange(value.slice(0, -1));
    };

    const handleClear = () => {
        onChange('');
    };

    return (
        <div className="character-picker">
            {/* Toggle Button */}
            <button
                className="char-toggle-btn"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? '⌨️ 키보드 숨기기 ▲' : '⌨️ 키보드 열기 ▼'}
            </button>

            {/* Keyboard Content */}
            {isExpanded && (
                <>
                    {/* All Buttons in One View */}
                    <div className="char-grid unified">
                        {/* 초성 버튼 */}
                        {CHOSEONG.map(char => (
                            <button
                                key={char}
                                className="char-btn"
                                onClick={() => handleCharClick(char)}
                            >
                                {char}
                            </button>
                        ))}

                        {/* 카테고리 버튼 */}
                        {CATEGORIES.map(category => (
                            <button
                                key={category.value}
                                className="char-btn category-btn"
                                onClick={() => handleCategoryClick(category.value)}
                            >
                                {category.label}
                            </button>
                        ))}
                    </div>

                    {/* Control Buttons */}
                    <div className="char-controls">
                        <button className="char-control-btn" onClick={handleBackspace}>
                            ⌫ 지우기
                        </button>
                        <button className="char-control-btn clear" onClick={handleClear}>
                            전체 삭제
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default CharacterPicker;

