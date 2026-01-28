// src/admin/PointsTab.js
// 포인트 시스템 설명 및 투표 기능

import { useState } from 'react';
import { useToast } from '../contexts/ToastContext'; // [NEW]

function PointsTab() {
    const [selectedView, setSelectedView] = useState('info'); // 'info' or 'vote'

    return (
        <div style={styles.container}>
            {/* 서브 탭 */}
            <div style={styles.subTabContainer}>
                <button
                    onClick={() => setSelectedView('info')}
                    style={{
                        ...styles.subTab,
                        background: selectedView === 'info' ? '#3498db' : '#ecf0f1',
                        color: selectedView === 'info' ? 'white' : '#34495e'
                    }}
                >
                    💰 포인트 제도 안내
                </button>
                <button
                    onClick={() => setSelectedView('vote')}
                    style={{
                        ...styles.subTab,
                        background: selectedView === 'vote' ? '#3498db' : '#ecf0f1',
                        color: selectedView === 'vote' ? 'white' : '#34495e'
                    }}
                >
                    🗳️ 신규 게임 투표
                </button>
            </div>

            {/* 컨텐츠 영역 */}
            {selectedView === 'info' && <PointsInfoView />}
            {selectedView === 'vote' && <VoteView />}
        </div>
    );
}

// ===== 포인트 제도 안내 뷰 =====
function PointsInfoView() {
    return (
        <div style={styles.contentBox}>
            <h2 style={styles.sectionTitle}>💰 포인트 제도란?</h2>
            <div style={styles.infoCard}>
                <p style={styles.description}>
                    덜지니어스 포인트는 동아리 활동에 참여하면서 자연스럽게 쌓을 수 있는 보상 시스템입니다.
                    <br />
                    무료 대여 환경에서 <strong>적극적인 활동</strong>과 <strong>동아리 기여</strong>를 장려하기 위해 만들어졌습니다.
                </p>
            </div>

            <h3 style={styles.subTitle}>⭐ 포인트 적립 방법</h3>
            <div style={styles.grid}>
                <EarnCard
                    icon="📦"
                    title="대여 완료"
                    points="+100P"
                    description="게임을 대여하고 반납을 완료하면"
                />
                <EarnCard
                    icon="⏰"
                    title="정시 반납"
                    points="+50P"
                    description="기한 내 반납 시 보너스"
                />
                <EarnCard
                    icon="🔥"
                    title="주 2회 대여"
                    points="+100P"
                    description="일주일에 2번 이상 대여 시"
                />
                <EarnCard
                    icon="🚀"
                    title="월 5회 대여"
                    points="+500P"
                    description="한 달에 5번 이상 대여 시"
                />
                <EarnCard
                    icon="✍️"
                    title="리뷰 작성"
                    points="+100P"
                    description="게임 평점/리뷰 작성"
                />
            </div>

            <h3 style={styles.subTitle}>🎁 포인트 사용처</h3>
            <div style={styles.grid}>
                <UseCard
                    icon="🗳️"
                    title="신규 게임 투표"
                    points="100~1,000P"
                    description="원하는 게임 구매에 투표하세요"
                    highlight
                />
                <UseCard
                    icon="🏛️"
                    title="동아리 회비 사용 투표"
                    points="100~1,000P"
                    description="책상, 주사위 세트, 책장 등 구매 투표"
                    highlight
                />
                <UseCard
                    icon="🏆"
                    title="대회 참가비"
                    points="500~2,000P"
                    description="티츄 리그 등 대회 참가"
                />
            </div>

            <div style={styles.comingSoonBox}>
                <h3>🚧 준비 중인 기능</h3>
                <ul style={styles.comingSoonList}>
                    <li>📊 개인 포인트 잔액 조회</li>
                    <li>📈 포인트 히스토리 (적립/사용 내역)</li>
                    <li>🏅 포인트 랭킹 시스템</li>
                    <li>🎮 티츄 리그 팀 생성 및 교류전</li>
                </ul>
            </div>
        </div>
    );
}

// ===== 투표 뷰 =====
function VoteView() {
    const { showToast } = useToast(); // [NEW]
    const [proposalName, setProposalName] = useState('');
    const [proposalLink, setProposalLink] = useState('');

    // 임시 데이터 (추후 DB 연동)
    const [proposals, setProposals] = useState([
        { id: 1, name: '듄: 임페리움', link: 'https://boardgamegeek.com/boardgame/316554/dune-imperium', votes: 2500, voters: 5 },
        { id: 2, name: '윙스팬', link: 'https://boardgamegeek.com/boardgame/266192/wingspan', votes: 1800, voters: 3 },
        { id: 3, name: '테라포밍 마스', link: 'https://boardgamegeek.com/boardgame/167791/terraforming-mars', votes: 1200, voters: 2 },
    ]);

    const handleAddProposal = () => {
        if (!proposalName.trim()) {
            showToast('게임 이름을 입력해주세요.', { type: "warning" });
            return;
        }

        const newProposal = {
            id: Date.now(),
            name: proposalName,
            link: proposalLink,
            votes: 0,
            voters: 0
        };

        setProposals([...proposals, newProposal]);
        setProposalName('');
        setProposalLink('');
        showToast('✅ 게임이 제안되었습니다!', { type: "success" });
    };

    return (
        <div style={styles.contentBox}>
            <h2 style={styles.sectionTitle}>🗳️ 신규 게임 투표</h2>

            <div style={styles.infoCard}>
                <p style={styles.description}>
                    포인트를 사용해 원하는 게임에 투표하세요!
                    <br />
                    투표 수가 높은 게임을 우선적으로 구매합니다.
                </p>
            </div>

            {/* 게임 제안 폼 */}
            <div style={styles.proposalForm}>
                <h3 style={styles.subTitle}>➕ 새 게임 제안하기</h3>
                <div style={styles.formRow}>
                    <input
                        type="text"
                        placeholder="게임 이름"
                        value={proposalName}
                        onChange={(e) => setProposalName(e.target.value)}
                        style={styles.input}
                    />
                    <input
                        type="text"
                        placeholder="BGG 링크 (선택)"
                        value={proposalLink}
                        onChange={(e) => setProposalLink(e.target.value)}
                        style={styles.input}
                    />
                    <button onClick={handleAddProposal} style={styles.addBtn}>
                        제안하기
                    </button>
                </div>
            </div>

            {/* 투표 목록 */}
            <div style={styles.voteList}>
                <h3 style={styles.subTitle}>📊 현재 투표 현황</h3>

                {proposals.length === 0 ? (
                    <div style={styles.emptyState}>
                        아직 제안된 게임이 없습니다. 첫 번째로 제안해보세요!
                    </div>
                ) : (
                    <div style={styles.proposalGrid}>
                        {proposals
                            .sort((a, b) => b.votes - a.votes)
                            .map((proposal, index) => (
                                <ProposalCard
                                    key={proposal.id}
                                    proposal={proposal}
                                    rank={index + 1}
                                />
                            ))}
                    </div>
                )}
            </div>

            <div style={styles.warningBox}>
                <strong>⚠️ 주의사항</strong>
                <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                    <li>투표에 사용한 포인트는 반환되지 않습니다.</li>
                    <li>같은 게임에 여러 번 투표할 수 있습니다.</li>
                    <li>투표 마감은 분기별로 진행됩니다.</li>
                </ul>
            </div>
        </div>
    );
}

// ===== 서브 컴포넌트 =====

const EarnCard = ({ icon, title, points, description }) => (
    <div style={styles.earnCard}>
        <div style={styles.earnIcon}>{icon}</div>
        <div style={styles.earnTitle}>{title}</div>
        <div style={styles.earnPoints}>{points}</div>
        <div style={styles.earnDesc}>{description}</div>
    </div>
);

const UseCard = ({ icon, title, points, description, highlight }) => (
    <div style={{
        ...styles.useCard,
        borderColor: highlight ? '#3498db' : '#ecf0f1',
        background: highlight ? '#ebf5fb' : 'white'
    }}>
        <div style={styles.useIcon}>{icon}</div>
        <div style={styles.useTitle}>{title}</div>
        <div style={styles.usePoints}>{points}</div>
        <div style={styles.useDesc}>{description}</div>
    </div>
);

const ProposalCard = ({ proposal, rank }) => {
    const { showToast } = useToast(); // [NEW]
    const [voteAmount, setVoteAmount] = useState('');

    const handleVote = () => {
        const amount = parseInt(voteAmount);
        if (!amount || amount < 100) {
            showToast('최소 100P부터 투표 가능합니다.', { type: "warning" });
            return;
        }
        showToast(`🗳️ ${proposal.name}에 ${amount}P 투표했습니다!\n(실제 구현 시 DB 연동 필요)`, { type: "success" });
        setVoteAmount('');
    };

    const getMedalEmoji = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `${rank}위`;
    };

    return (
        <div style={styles.proposalCard}>
            <div style={styles.proposalHeader}>
                <span style={styles.proposalRank}>{getMedalEmoji(rank)}</span>
                <span style={styles.proposalName}>{proposal.name}</span>
            </div>

            {proposal.link && (
                <a
                    href={proposal.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.proposalLink}
                >
                    📎 BGG 보기
                </a>
            )}

            <div style={styles.proposalStats}>
                <div>
                    <strong style={{ fontSize: '1.5em', color: '#3498db' }}>
                        {proposal.votes.toLocaleString()}P
                    </strong>
                    <div style={{ fontSize: '0.8em', color: '#7f8c8d' }}>
                        {proposal.voters}명 투표
                    </div>
                </div>
            </div>

            <div style={styles.voteInput}>
                <input
                    type="number"
                    placeholder="투표 포인트"
                    value={voteAmount}
                    onChange={(e) => setVoteAmount(e.target.value)}
                    style={styles.voteField}
                    min="100"
                    step="100"
                />
                <button onClick={handleVote} style={styles.voteBtn}>
                    투표하기
                </button>
            </div>
        </div>
    );
};

// ===== 스타일 =====
const styles = {
    container: {
        padding: '20px 0',
    },
    subTabContainer: {
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        borderBottom: '2px solid #ecf0f1',
        paddingBottom: '10px',
    },
    subTab: {
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '0.95rem',
        transition: 'all 0.2s',
    },
    contentBox: {
        background: 'white',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    },
    sectionTitle: {
        fontSize: '1.8em',
        marginBottom: '20px',
        color: '#2c3e50',
        borderBottom: '3px solid #3498db',
        paddingBottom: '10px',
    },
    subTitle: {
        fontSize: '1.3em',
        marginTop: '30px',
        marginBottom: '15px',
        color: '#34495e',
    },
    infoCard: {
        background: '#f8f9fa',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '30px',
        borderLeft: '4px solid #3498db',
    },
    description: {
        fontSize: '1em',
        lineHeight: '1.6',
        color: '#555',
        margin: 0,
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '20px',
    },
    earnCard: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '12px',
        textAlign: 'center',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    },
    earnIcon: {
        fontSize: '2.5em',
        marginBottom: '10px',
    },
    earnTitle: {
        fontWeight: 'bold',
        fontSize: '1.1em',
        marginBottom: '5px',
    },
    earnPoints: {
        fontSize: '1.5em',
        fontWeight: 'bold',
        color: '#ffeaa7',
        marginBottom: '5px',
    },
    earnDesc: {
        fontSize: '0.85em',
        opacity: 0.9,
    },
    useCard: {
        background: 'white',
        border: '2px solid #ecf0f1',
        padding: '20px',
        borderRadius: '12px',
        textAlign: 'center',
        transition: 'all 0.2s',
        cursor: 'pointer',
    },
    useIcon: {
        fontSize: '2.5em',
        marginBottom: '10px',
    },
    useTitle: {
        fontWeight: 'bold',
        fontSize: '1.1em',
        marginBottom: '5px',
        color: '#2c3e50',
    },
    usePoints: {
        fontSize: '1.3em',
        fontWeight: 'bold',
        color: '#3498db',
        marginBottom: '5px',
    },
    useDesc: {
        fontSize: '0.85em',
        color: '#7f8c8d',
    },
    comingSoonBox: {
        background: '#fff3cd',
        border: '2px solid #ffc107',
        borderRadius: '10px',
        padding: '20px',
        marginTop: '30px',
    },
    comingSoonList: {
        margin: '10px 0 0 0',
        paddingLeft: '20px',
        lineHeight: '1.8',
    },
    proposalForm: {
        background: '#f8f9fa',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '30px',
    },
    formRow: {
        display: 'flex',
        gap: '10px',
        marginTop: '15px',
    },
    input: {
        flex: 1,
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        fontSize: '1em',
    },
    addBtn: {
        padding: '12px 24px',
        background: '#3498db',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
    },
    voteList: {
        marginTop: '30px',
    },
    proposalGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
        marginTop: '20px',
    },
    proposalCard: {
        background: 'white',
        border: '2px solid #ecf0f1',
        borderRadius: '12px',
        padding: '20px',
        transition: 'all 0.2s',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
    },
    proposalHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '10px',
    },
    proposalRank: {
        fontSize: '1.5em',
        fontWeight: 'bold',
    },
    proposalName: {
        fontSize: '1.2em',
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    proposalLink: {
        display: 'inline-block',
        fontSize: '0.9em',
        color: '#3498db',
        textDecoration: 'none',
        marginBottom: '15px',
    },
    proposalStats: {
        padding: '15px',
        background: '#f8f9fa',
        borderRadius: '8px',
        textAlign: 'center',
        marginBottom: '15px',
    },
    voteInput: {
        display: 'flex',
        gap: '10px',
    },
    voteField: {
        flex: 1,
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        fontSize: '1em',
    },
    voteBtn: {
        padding: '10px 20px',
        background: '#27ae60',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
    },
    emptyState: {
        padding: '40px',
        textAlign: 'center',
        color: '#95a5a6',
        background: '#f8f9fa',
        borderRadius: '10px',
    },
    warningBox: {
        background: '#ffe6e6',
        border: '2px solid #e74c3c',
        borderRadius: '10px',
        padding: '20px',
        marginTop: '30px',
        color: '#c0392b',
    },
};

export default PointsTab;
