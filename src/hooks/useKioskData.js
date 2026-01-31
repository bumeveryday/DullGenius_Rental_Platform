// src/hooks/useKioskData.js
import { useState, useEffect } from 'react';
import { fetchGames, fetchUsers } from '../api';

const useKioskData = () => {
    const [games, setGames] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. LocalStorage (Instant Load)
                const localGames = localStorage.getItem('kiosk_games');
                const localUsers = localStorage.getItem('kiosk_users');

                if (localGames && localUsers) {
                    setGames(JSON.parse(localGames));
                    setUsers(JSON.parse(localUsers));
                    setLoading(false);
                }

                // 2. Background Sync (Fetch Latest)
                const [gamesData, usersData] = await Promise.all([fetchGames(), fetchUsers()]);
                const validGames = gamesData.filter(g => !g.error);
                const validUsers = usersData || [];

                setGames(validGames);
                setUsers(validUsers);

                localStorage.setItem('kiosk_games', JSON.stringify(validGames));
                localStorage.setItem('kiosk_users', JSON.stringify(validUsers));
            } catch (e) {
                console.error("Kiosk Data Sync Failed:", e);
                setError(e);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    return { games, users, loading, error };
};

export default useKioskData;
