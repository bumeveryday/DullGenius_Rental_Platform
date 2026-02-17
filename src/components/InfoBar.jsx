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
                {/* 좌측: 핵심 정보 */}
                <div className="infobar-left">
                    <div className="infobar-title">{CLUB_INFO.name}</div>
                </div>

                {/* 우측: 버튼 그룹 */}
                <div className="infobar-right">
                    <button onClick={() => openModal('guide')} className="infobar-btn-highlight">
                        📖 이용 안내
                    </button>
                    <button onClick={() => openModal('intro')} className="infobar-btn-text">
                        동아리 소개
                    </button>
                    <button onClick={() => openModal('terms')} className="infobar-btn-text">
                        이용 약관
                    </button>
                    <button onClick={() => openModal('request')} className="infobar-btn-icon">
                        🎲 게임 신청
                    </button>
                    <button onClick={() => openModal('report')} className="infobar-btn-icon">
                        🚨 파손/문의
                    </button>
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
