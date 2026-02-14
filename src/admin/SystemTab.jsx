// src/admin/SystemTab.jsx
// 시스템 설정 탭 - 회비 관리, 학기 초기화 등

import { useState, useEffect } from 'react';
import { fetchUsers, fetchConfig } from '../api';
import { resetSemesterPayments, togglePaymentCheck } from '../api_members';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

function SystemTab() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalMembers: 0,
        paidMembers: 0,
        unpaidMembers: 0,
        totalMembers: 0,
        paidMembers: 0,
        unpaidMembers: 0
    });
    const [paymentCheckEnabled, setPaymentCheckEnabled] = useState(true);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        type: 'info'
    });

    const showConfirmModal = (title, message, onConfirm, type = 'info') => {
        setConfirmModal({ isOpen: true, title, message, onConfirm, type });
    };

    const closeConfirmModal = () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null, type: 'info' });
    };

    // 데이터 로드
    const loadData = async () => {
        setLoading(true);
        try {
            const [members, config] = await Promise.all([fetchUsers(), fetchConfig()]);

            // 통계 계산
            const totalMembers = members.length;
            const paidMembers = members.filter(m => m.is_paid).length;
            const unpaidMembers = totalMembers - paidMembers;



            setStats({
                totalMembers,
                paidMembers,
                totalMembers,
                paidMembers,
                unpaidMembers
            });

            // 회비 검사 활성화 여부 확인
            const paymentCheckConfig = config.find(c => c.key === 'payment_check_enabled');
            setPaymentCheckEnabled(paymentCheckConfig?.value === 'true');

        } catch (e) {
            showToast('데이터 로딩 실패: ' + e.message, { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // 회비 검사 토글
    const handleTogglePaymentCheck = async () => {
        const newState = !paymentCheckEnabled;
        const action = newState ? '활성화' : '비활성화';

        showConfirmModal(
            `회비 검사 ${action}`,
            `회비 검사를 ${action}하시겠습니까?\n\n${newState
                ? '⚠️ 활성화하면 회비를 내지 않은 회원은 게임을 대여할 수 없습니다.'
                : '⚠️ 비활성화하면 모든 회원이 회비 납부 없이 게임을 대여할 수 있습니다. (무료 대여 기간, 축제 등)'}`,
            async () => {
                try {
                    await togglePaymentCheck(newState);
                    setPaymentCheckEnabled(newState);
                    showToast(`✅ 회비 검사가 ${action}되었습니다.`, { type: 'success' });
                } catch (e) {
                    showToast('설정 변경 실패: ' + e.message, { type: 'error' });
                }
            },
            'warning'
        );
    };

    // 학기 초기화
    const handleResetSemester = async () => {
        showConfirmModal(
            '학기 종료 - 회비 일괄 초기화',
            `⚠️ 모든 일반 회원의 회비 납부 상태를 "미납"으로 초기화합니다.\n\n` +
            `• 초기화 대상: 약 ${stats.totalMembers - stats.exemptMembers}명\n` +
            `• 제외 대상: 관리자, OB, 면제 역할 보유자\n\n` +
            `이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?`,
            async () => {
                try {
                    const result = await resetSemesterPayments();
                    showToast(`✅ ${result.reset_count}명의 회비 상태가 초기화되었습니다.`, { type: 'success' });
                    loadData(); // 통계 새로고침
                } catch (e) {
                    showToast('초기화 실패: ' + e.message, { type: 'error' });
                }
            },
            'danger'
        );
    };

    return (
        <div>
            <h3>⚙️ 시스템 설정</h3>
            <p style={{ color: 'var(--admin-text-sub)', marginBottom: '30px', fontSize: '0.9em' }}>
                회비 관리, 학기 초기화 등 시스템 전반의 설정을 관리합니다.
            </p>

            {/* 통계 대시보드 */}
            <div style={styles.statsContainer}>
                <div style={styles.statCard}>
                    <div style={styles.statIcon}>👥</div>
                    <div style={styles.statValue}>{stats.totalMembers}</div>
                    <div style={styles.statLabel}>전체 회원</div>
                </div>
                <div style={{ ...styles.statCard, borderColor: '#27ae60' }}>
                    <div style={styles.statIcon}>✅</div>
                    <div style={styles.statValue}>{stats.paidMembers}</div>
                    <div style={styles.statLabel}>회비 납부</div>
                </div>
                <div style={{ ...styles.statCard, borderColor: '#e74c3c' }}>
                    <div style={styles.statIcon}>❌</div>
                    <div style={styles.statValue}>{stats.unpaidMembers}</div>
                    <div style={styles.statLabel}>회비 미납</div>
                </div>

            </div>

            {/* 회비 검사 토글 */}
            <div className="admin-card" style={{ marginTop: '30px' }}>
                <h4 style={{ marginBottom: '15px' }}>💳 회비 검사 설정</h4>
                <p style={{ color: 'var(--admin-text-sub)', fontSize: '0.9em', marginBottom: '20px' }}>
                    회비 검사를 비활성화하면 모든 회원이 회비 납부 없이 게임을 대여할 수 있습니다.<br />
                    (무료 대여 기간, 축제, 체험 행사 등에 활용)
                </p>

                <div style={styles.toggleContainer}>
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1em', marginBottom: '5px' }}>
                            현재 상태: {paymentCheckEnabled ? '🟢 활성화' : '🔴 비활성화'}
                        </div>
                        <div style={{ color: 'var(--admin-text-sub)', fontSize: '0.85em' }}>
                            {paymentCheckEnabled
                                ? '회비를 내지 않은 회원은 게임을 대여할 수 없습니다.'
                                : '모든 회원이 회비 납부 없이 게임을 대여할 수 있습니다.'}
                        </div>
                    </div>
                    <button
                        onClick={handleTogglePaymentCheck}
                        style={{
                            ...styles.toggleBtn,
                            background: paymentCheckEnabled ? '#e74c3c' : '#27ae60'
                        }}
                    >
                        {paymentCheckEnabled ? '비활성화' : '활성화'}
                    </button>
                </div>
            </div>

            {/* 학기 초기화 */}
            <div className="admin-card" style={{ marginTop: '20px' }}>
                <h4 style={{ marginBottom: '15px' }}>🔄 학기 종료 관리</h4>
                <p style={{ color: 'var(--admin-text-sub)', fontSize: '0.9em', marginBottom: '20px' }}>
                    학기가 끝나면 모든 일반 회원의 회비 납부 상태를 "미납"으로 초기화합니다.<br />
                    관리자, OB, 면제 역할을 가진 회원은 초기화 대상에서 제외됩니다.
                </p>

                <button
                    onClick={handleResetSemester}
                    style={styles.resetBtn}
                >
                    🔄 학기 종료 - 회비 일괄 초기화
                </button>
            </div>

            {/* 안내 메시지 */}
            <div style={styles.infoBox}>
                <p><strong>💡 사용 안내:</strong></p>
                <ul style={{ margin: '10px 0', paddingLeft: '20px', lineHeight: '1.6' }}>
                    <li>회비 검사 토글은 즉시 적용되며, 모든 대여 시스템에 영향을 미칩니다.</li>
                    <li>학기 초기화는 되돌릴 수 없으므로 신중하게 실행하세요.</li>
                    <li>영구 면제 역할은 회원 관리 탭에서 개별적으로 부여할 수 있습니다.</li>
                </ul>
            </div>

            {/* Confirm 모달 */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
            />
        </div>
    );
}

const styles = {
    statsContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
    },
    statCard: {
        background: 'var(--admin-card-bg)',
        border: '2px solid var(--admin-border)',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center'
    },
    statIcon: {
        fontSize: '2em',
        marginBottom: '10px'
    },
    statValue: {
        fontSize: '2.5em',
        fontWeight: 'bold',
        color: 'var(--admin-primary)',
        marginBottom: '5px'
    },
    statLabel: {
        fontSize: '0.9em',
        color: 'var(--admin-text-sub)'
    },
    toggleContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px',
        background: 'rgba(187, 134, 252, 0.05)',
        borderRadius: '8px',
        border: '1px solid var(--admin-border)'
    },
    toggleBtn: {
        padding: '12px 24px',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 'bold',
        fontSize: '1em',
        cursor: 'pointer',
        minWidth: '120px'
    },
    resetBtn: {
        width: '100%',
        padding: '15px',
        background: '#e74c3c',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 'bold',
        fontSize: '1.1em',
        cursor: 'pointer'
    },
    infoBox: {
        marginTop: '30px',
        padding: '20px',
        background: 'rgba(187, 134, 252, 0.1)',
        border: '1px solid var(--admin-primary)',
        borderRadius: '8px',
        color: 'var(--admin-text-main)',
        fontSize: '0.9em'
    }
};

export default SystemTab;
