// src/kiosk/CharacterPicker.js
import React, { useState } from 'react';
import './CharacterPicker.css';

// 한글 초성
const CHOSEONG = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

// 영문/숫자 (자주 쓰이는 것만)
const ALPHANUMERIC = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', // 숫자
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', // 영문 자주 쓰임
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

function CharacterPicker({ value, onChange }) {
    const [mode, setMode] = useState('korean'); // 'korean', 'alphanumeric'
    const [isExpanded, setIsExpanded] = useState(true); // 키보드 펼침/접힘 상태

    const handleCharClick = (char) => {
        onChange(value + char);
    };

    const handleBackspace = () => {
        onChange(value.slice(0, -1));
    };

    const handleClear = () => {
        onChange('');
    };

    const renderButtons = () => {
        let chars = [];
        if (mode === 'korean') chars = CHOSEONG;
        else if (mode === 'alphanumeric') chars = ALPHANUMERIC;

        return chars.map(char => (
            <button
                key={char}
                className="char-btn"
                onClick={() => handleCharClick(char)}
            >
                {char}
            </button>
        ));
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
                    {/* Mode Tabs */}
                    <div className="char-tabs">
                        <button
                            className={`char-tab ${mode === 'korean' ? 'active' : ''}`}
                            onClick={() => setMode('korean')}
                        >
                            한글 초성
                        </button>
                        <button
                            className={`char-tab ${mode === 'alphanumeric' ? 'active' : ''}`}
                            onClick={() => setMode('alphanumeric')}
                        >
                            영문/숫자
                        </button>
                    </div>

                    {/* Character Buttons */}
                    <div className="char-grid">
                        {renderButtons()}
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
