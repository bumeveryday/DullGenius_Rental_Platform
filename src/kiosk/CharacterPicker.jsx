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
    const [isExpanded, setIsExpanded] = useState(true); // Restore expanded state

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

    if (!isExpanded) {
        return (
            <button
                className="char-toggle-btn collapsed"
                onClick={() => setIsExpanded(true)}
            >
                ⌨️ 키보드 열기
            </button>
        );
    }

    return (
        <div className="character-picker">
            <div className="char-wrapper">
                {/* Left: 4x4 Grid (14 consonants + 2 categories) */}
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

                {/* Right: Vertical Controls */}
                <div className="char-controls">
                    <button className="char-control-btn" onClick={handleBackspace}>
                        ⌫
                    </button>
                    <button className="char-control-btn clear" onClick={handleClear}>
                        🗑️
                    </button>
                    <button className="char-control-btn hide" onClick={() => setIsExpanded(false)}>
                        🔽
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CharacterPicker;

