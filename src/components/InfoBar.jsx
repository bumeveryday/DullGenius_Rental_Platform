// src/components/InfoBar.jsx
import React, { useState } from 'react';
import { CLUB_INFO, LINKS, CONTACTS } from '../infoData';
import InfoModal from './InfoModal';

function InfoBar({ games }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTab, setModalTab] = useState('intro');

    const openModal = (tab) => {
        setModalTab(tab);
        setIsModalOpen(true);
    };

    return (
        <>
            <div className="infobar-container">
                {/* 상단: 핵심 액션 (크고 예쁜 버튼) */}
                <div className="infobar-actions">
                    <button onClick={() => openModal('request')} className="infobar-action-btn primary">
                        <span className="action-icon">🎲</span> 게임 신청
                    </button>
                    <button onClick={() => openModal('report')} className="infobar-action-btn secondary">
                        <span className="action-icon">🚨</span> 파손/문의
                    </button>
                </div>

                {/* 하단: 정보 링크 (텍스트) */}
                <div className="infobar-links">
                    <button onClick={() => openModal('guide')} className="infobar-link-text">
                        이용 안내
                    </button>
                    <span className="link-divider">|</span>
                    <button onClick={() => openModal('intro')} className="infobar-link-text">
                        동아리 소개
                    </button>
                    <span className="link-divider">|</span>
                    <button onClick={() => openModal('terms')} className="infobar-link-text">
                        이용 약관
                    </button>
                </div>

                {/* 최하단: 카피라이트 */}
                <div className="infobar-copyright">
                    <span className="copyright-text">Handong Global Univ. {CLUB_INFO.name}</span>
                </div>
            </div>

            <InfoModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialTab={modalTab}
                games={games}
            />
        </>
    );
}



export default InfoBar;
