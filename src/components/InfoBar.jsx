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
            <div style={styles.container}>
                {/* 좌측: 핵심 정보 */}
                <div style={styles.leftSection}>
                    <div style={styles.title}>{CLUB_INFO.name}</div>
                    <div style={styles.infoRow}>
                        <span>🕒 {CLUB_INFO.officeHour}</span>
                        <span style={styles.divider}>|</span>
                        <span>📍 {CLUB_INFO.location}</span>
                    </div>
                </div>

                {/* 우측: 버튼 그룹 */}
                <div style={styles.rightSection}>
                    <button onClick={() => openModal('guide')} style={styles.textBtn}>
                        이용 안내
                    </button>
                    <button onClick={() => openModal('intro')} style={styles.textBtn}>
                        동아리 소개
                    </button>
                    <button onClick={() => openModal('terms')} style={styles.textBtn}>
                        이용 약관
                    </button>
                    <button onClick={() => openModal('request')} style={styles.iconBtn}>
                        🎲 게임 신청
                    </button>
                    <button onClick={() => openModal('report')} style={styles.iconBtn}>
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

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '20px 25px',
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '15px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        border: '1px solid #eee'
    },
    leftSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
    },
    title: {
        fontWeight: 'bold',
        fontSize: '1.1rem',
        color: '#333'
    },
    infoRow: {
        display: 'flex',
        alignItems: 'center',
        color: '#666',
        fontSize: '0.95rem'
    },
    divider: {
        margin: '0 10px',
        color: '#ddd'
    },
    rightSection: {
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
    },
    textBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.9rem',
        color: '#555',
        padding: '5px 10px',
        borderRadius: '5px',
        transition: 'background 0.2s',
        fontWeight: '500'
    },
    iconBtn: {
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '20px',
        padding: '5px 12px',
        fontSize: '0.9rem',
        textDecoration: 'none',
        color: '#444',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'transform 0.1s'
    }
};

export default InfoBar;
