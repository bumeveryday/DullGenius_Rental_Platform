// src/hooks/useGameFilter.js
// Custom Hook: 게임 필터링 로직 통합 (App.js, DashboardTab.js 중복 제거)

import { useMemo } from 'react';

export const useGameFilter = (games, filters) => {
    const {
        searchTerm = "",
        selectedCategory = "전체",
        difficultyFilter = "전체",
        playerFilter = "all",
        onlyAvailable = false,
        renterFilter = "" // [Admin 전용]
    } = filters;

    // 인원수 체크 헬퍼 함수
    const checkPlayerCount = (rangeStr, targetFilter) => {
        if (!rangeStr) return false;
        try {
            const parts = rangeStr.split('~');
            const min = parseInt(parts[0]);
            const max = parts.length > 1 ? parseInt(parts[1]) : min;

            if (targetFilter === "6+") return max >= 6;
            else {
                const target = parseInt(targetFilter);
                return target >= min && target <= max;
            }
        } catch (e) {
            return false;
        }
    };

    const filteredGames = useMemo(() => {
        return games.filter(game => {
            // 이름 필터 (빈 게임 제외)
            if (!game.name || game.name.trim() === "") return false;

            // TRPG는 선택한 경우에만 표시
            if (selectedCategory !== "TRPG" && game.category === "TRPG") return false;

            // 검색어 필터 (#태그 or 이름)
            if (searchTerm.startsWith("#")) {
                if (!game.tags || !game.tags.includes(searchTerm)) return false;
            } else {
                if (searchTerm && !game.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            }

            // [Admin 전용] 대여자 필터
            if (renterFilter) {
                if (!game.renter || !game.renter.includes(renterFilter)) return false;
            }

            // 카테고리 필터
            if (selectedCategory !== "전체" && game.category !== selectedCategory) return false;

            // 상태 필터 (대여 가능만)
            if (onlyAvailable && game.status !== "대여가능") return false;

            // 난이도 필터
            if (difficultyFilter !== "전체" && game.difficulty) {
                const score = parseFloat(game.difficulty);
                if (difficultyFilter === "입문" && score >= 2.0) return false;
                if (difficultyFilter === "초중급" && (score < 2.0 || score >= 3.0)) return false;
                if (difficultyFilter === "전략" && score < 3.0) return false;
            }

            // 인원수 필터
            if (playerFilter !== "all" && game.players) {
                if (!checkPlayerCount(game.players, playerFilter)) return false;
            }

            return true;
        }).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    }, [games, searchTerm, selectedCategory, onlyAvailable, difficultyFilter, playerFilter, renterFilter]);

    return filteredGames;
};
