// src/kiosk/CharacterPicker.js
import React, { useState } from 'react';
import './Kiosk.css';

// 한글 초성
const CHOSEONG = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

// 영문 알파벳
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// 숫자
const NUMBERS = '0123456789'.split('');

function CharacterPicker({ value, onChange }) {
    const [mode, setMode] = useState('korean'); // 'korean', 'english', 'number'

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
        else if (mode === 'english') chars = ALPHABET;
        else if (mode === 'number') chars = NUMBERS;

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
            {/* Mode Tabs */}
            <div className="char-tabs">
                <button
                    className={`char-tab ${mode === 'korean' ? 'active' : ''}`}
                    onClick={() => setMode('korean')}
                >
                    한글
                </button>
                <button
                    className={`char-tab ${mode === 'english' ? 'active' : ''}`}
                    onClick={() => setMode('english')}
                >
                    영문
                </button>
                <button
                    className={`char-tab ${mode === 'number' ? 'active' : ''}`}
                    onClick={() => setMode('number')}
                >
                    숫자
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
        </div>
    );
}

export default CharacterPicker;
