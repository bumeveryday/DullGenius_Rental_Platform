// src/components/InfoModal.jsx
import { useEffect, useState } from 'react';
import { CLUB_INFO, CONTACTS, LINKS, DEVELOPERS, TERMS_OF_SERVICE, USAGE_GUIDE } from '../infoData';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext'; // [NEW] Auth Context

/**
 * 정보 표시 모달
 * 탭 메뉴를 통해 다양한 정보(소개, 약관, 개발자, 파손신고, 신청)를 보여줍니다.
 */
function InfoModal({ isOpen, onClose, initialTab = 'guide' }) {
    const { user } = useAuth(); // [NEW] 로그인 정보
    const [activeTab, setActiveTab] = useState(initialTab);

    // [NEW] Form States
    const [reportSearch, setReportSearch] = useState('');
    const [reportContent, setReportContent] = useState('');
    const [requestTitle, setRequestTitle] = useState('');
    const [requestDesc, setRequestDesc] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // [MOD] 검색 로직 제거됨

    // 모달 열릴 때 초기 탭 설정 & 초기화
    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
            document.body.style.overflow = 'hidden';
            // 폼 초기화
            setReportSearch('');
            setReportContent('');
            setRequestTitle('');
            setRequestDesc('');
            setIsSubmitting(false);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, initialTab]);

    // ESC 키로 닫기
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // [NEW] 파손 신고 제출
    const handleReportSubmit = async (e) => {
        e.preventDefault();
        if (!user) return alert("로그인이 필요합니다.");
        // if (!reportGameId) return alert("게임을 선택해주세요."); // [MOD] 직접 입력으로 변경되어 ID 체크 제거
        if (!reportSearch.trim()) return alert("게임 이름을 입력해주세요.");
        if (!reportContent.trim()) return alert("파손 내용을 입력해주세요.");

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('damage_reports').insert({
                user_id: user.id,
                game_id: null, // [MOD] 직접 입력이므로 ID는 null
                game_name: reportSearch,
                content: reportContent
            });

            if (error) throw error;
            alert("파손 신고가 접수되었습니다. 빠른 시일 내에 확인하겠습니다.");
            onClose();
        } catch (error) {
            console.error("파손 신고 실패:", error);
            alert("신고 접수 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // [NEW] 게임 신청 제출
    const handleRequestSubmit = async (e) => {
        e.preventDefault();
        if (!user) return alert("로그인이 필요합니다.");
        if (!requestTitle.trim()) return alert("게임 제목을 입력해주세요.");

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('game_requests').insert({
                user_id: user.id,
                game_title: requestTitle,
                description: requestDesc
            });

            if (error) throw error;
            alert("게임 신청이 완료되었습니다! 다음 구매 때 참고할게요.");
            onClose();
        } catch (error) {
            console.error("게임 신청 실패:", error);
            alert("신청 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const renderContent = () => {
        switch (activeTab) {
            case 'intro':
                return (
                    <div style={styles.tabContent}>
                        <h3>{CLUB_INFO.name}</h3>
                        <p><strong>🕒 오피스아워:</strong> {CLUB_INFO.officeHour}</p>
                        <p><strong>📍 장소:</strong> {CLUB_INFO.location}</p>
                        <hr style={styles.divider} />
                        <h4>📞 연락처</h4>
                        <p>📧 이메일: <a href={`mailto:${CONTACTS.email}`}>{CONTACTS.email}</a></p>
                    </div>
                );
            case 'guide':
                return (
                    <div style={styles.tabContent}>
                        <div style={styles.termsBox}>
                            {USAGE_GUIDE}
                        </div>
                    </div>
                );
            case 'terms':
                return (
                    <div style={styles.tabContent}>
                        <div style={styles.termsBox}>
                            {TERMS_OF_SERVICE}
                        </div>
                    </div>
                );
            case 'report': // [NEW] 파손 신고 탭
                return (
                    <div style={styles.tabContent}>
                        <h3>🚨 파손/분실 신고</h3>
                        {!user ? (
                            <div style={styles.loginWarn}>
                                <p>로그인이 필요한 기능입니다.</p>
                                <p style={{ fontSize: '0.9em', color: '#666' }}>상단의 로그인 버튼을 이용해주세요.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleReportSubmit} style={styles.form}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>보드게임 이름</label>
                                    <input
                                        type="text"
                                        placeholder="파손된 게임 이름을 입력해주세요 (예: 스플렌더)"
                                        value={reportSearch}
                                        onChange={(e) => setReportSearch(e.target.value)}
                                        style={styles.input}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>파손/분실 내용</label>
                                    <textarea
                                        placeholder="성실한 보고에 감사드립니다. 

파손 보고 시 운영진의 심의를 통해 기존의 발견 시 벌금인 보드게임 현물 보상이 아닌,
원가의 일부를 현금으로 보상하는 것으로 대체할 수 있습니다.

파손/분실 보고가 없이 동아리 측에서 파손된 게임을 발견하는 경우, 무조건적인 현물 보상을 원칙으로 하고 있습니다."
                                        rows={5}
                                        value={reportContent}
                                        onChange={(e) => setReportContent(e.target.value)}
                                        style={styles.textarea}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
                                    {isSubmitting ? '제출 중...' : '신고하기'}
                                </button>
                            </form>
                        )}
                    </div>
                );
            case 'request': // [NEW] 게임 신청 탭
                return (
                    <div style={styles.tabContent}>
                        <h3>🎲 보드게임 신청</h3>
                        {!user ? (
                            <div style={styles.loginWarn}>
                                <p>로그인이 필요한 기능입니다.</p>
                                <p style={{ fontSize: '0.9em', color: '#666' }}>상단의 로그인 버튼을 이용해주세요.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleRequestSubmit} style={styles.form}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>희망 게임 제목</label>
                                    <input
                                        type="text"
                                        placeholder="예: 스플렌더 마블"
                                        value={requestTitle}
                                        onChange={(e) => setRequestTitle(e.target.value)}
                                        style={styles.input}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>신청 사유 (선택)</label>
                                    <textarea
                                        placeholder="이 게임이 왜 필요한가요? (예: 재고가 부족해요 / 친구들이랑 하고 싶어요)"
                                        rows={3}
                                        value={requestDesc}
                                        onChange={(e) => setRequestDesc(e.target.value)}
                                        style={styles.textarea}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
                                    {isSubmitting ? '제출 중...' : '신청하기'}
                                </button>
                            </form>
                        )}
                    </div>
                );
            case 'dev':
                return (
                    <div style={styles.tabContent}>
                        <h3>🛠️ 만든 사람들</h3>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {DEVELOPERS.map((dev, idx) => (
                                <li key={idx} style={{ marginBottom: '10px' }}>
                                    <strong>{dev.name}</strong> <span style={{ color: '#888' }}>({dev.role})</span>
                                </li>
                            ))}
                        </ul>
                        <p style={{ marginTop: '20px', fontSize: '0.9em', color: '#666' }}>
                            DullGenius Rental Platform
                        </p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={styles.modal} onClick={e => e.stopPropagation()}>
                {/* 헤더 & 탭 */}
                <div style={styles.header}>
                    <div style={styles.tabScroll} className="no-scrollbar"> {/* [MOD] 스타일 이름 변경 가능 */}
                        <div style={styles.tabContainer}>
                            <button
                                style={activeTab === 'intro' ? styles.activeTab : styles.tab}
                                onClick={() => setActiveTab('intro')}
                            >
                                소개
                            </button>
                            <button
                                style={activeTab === 'guide' ? styles.activeTab : styles.tab}
                                onClick={() => setActiveTab('guide')}
                            >
                                안내
                            </button>
                            <button
                                style={activeTab === 'terms' ? styles.activeTab : styles.tab}
                                onClick={() => setActiveTab('terms')}
                            >
                                약관
                            </button>
                            <button
                                style={activeTab === 'report' ? styles.activeTab : styles.tab}
                                onClick={() => setActiveTab('report')}
                            >
                                파손
                            </button>
                            <button
                                style={activeTab === 'request' ? styles.activeTab : styles.tab}
                                onClick={() => setActiveTab('request')}
                            >
                                신청
                            </button>
                            {/* 공간 부족시 개발자는 텍스트로 대체하거나 아래로 뺌 */}
                            <button
                                style={activeTab === 'dev' ? styles.activeTab : styles.tab}
                                onClick={() => setActiveTab('dev')}
                            >
                                개발팀
                            </button>
                        </div>
                    </div>
                    <button onClick={onClose} style={styles.closeBtn}>✕</button>
                </div>

                {/* 컨텐츠 */}
                <div style={styles.body}>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

const styles = {
    modal: {
        // [MOD] Moved to App.css (.modal-content) for responsive control
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 15px', // [MOD] 패딩 축소
        borderBottom: '1px solid #eee',
        background: '#f8f9fa'
    },
    tabScroll: {
        overflowX: 'auto',
        maxWidth: '100%',
        paddingRight: '10px'
    },
    tabContainer: {
        display: 'flex',
        gap: '5px' // [MOD] 간격 축소
    },
    tab: {
        padding: '8px 10px', // [MOD] 탭 크기 축소
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontWeight: 'bold',
        color: '#888',
        borderRadius: '5px',
        fontSize: '0.9rem',
        whiteSpace: 'nowrap', // [MOD] 줄바꿈 방지
        transition: 'all 0.2s'
    },
    activeTab: {
        padding: '8px 10px',
        border: 'none',
        background: 'white',
        cursor: 'pointer',
        fontWeight: 'bold',
        color: '#333',
        borderRadius: '5px',
        fontSize: '0.9rem',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        fontSize: '1.2em',
        cursor: 'pointer',
        color: '#999',
        marginLeft: '10px',
        flexShrink: 0
    },
    body: {
        padding: '20px',
        overflowY: 'auto',
        flex: 1
    },
    tabContent: {
        lineHeight: '1.6',
        color: '#444'
    },
    termsBox: {
        whiteSpace: 'pre-wrap',
        fontSize: '0.9em',
        background: '#f9f9f9',
        padding: '15px',
        borderRadius: '8px',
        border: '1px solid #eee',
        maxHeight: '60vh',
        overflowY: 'auto'
    },
    divider: {
        margin: '20px 0',
        border: 'none',
        borderTop: '1px solid #eee'
    },
    loginWarn: {
        padding: '30px',
        textAlign: 'center',
        background: '#fff3cd',
        color: '#856404',
        borderRadius: '8px',
        border: '1px solid #ffeeba'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        position: 'relative' // for search list
    },
    label: {
        fontWeight: 'bold',
        fontSize: '0.9rem',
        color: '#333'
    },
    input: {
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #ddd',
        fontSize: '1rem'
    },
    textarea: {
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #ddd',
        fontSize: '1rem',
        resize: 'vertical'
    },
    submitBtn: {
        padding: '12px',
        background: '#e74c3c', // 파손 신고는 빨간색 계열
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '10px'
    },
    searchList: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '5px',
        listStyle: 'none',
        padding: 0,
        margin: 0,
        zIndex: 10,
        maxHeight: '150px',
        overflowY: 'auto',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    searchItem: {
        padding: '10px',
        cursor: 'pointer',
        borderBottom: '1px solid #eee'
    }
};

export default InfoModal;
