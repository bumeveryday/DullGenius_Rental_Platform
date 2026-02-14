
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from './ToastContext';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);



export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    // useRef를 사용하여 마운트 상태 추적 (비동기 콜백에서의 상태 업데이트 방지)
    const isMounted = useRef(true);
    const lastUserId = useRef(null); // [NEW] 이전 유저 ID 추적 (리프레시 방지)

    useEffect(() => {
        isMounted.current = true;

        const fetchProfileAndRoles = async (userId) => {
            try {
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*, is_semester_fixed') // * includes joined_semester if it exists in schema
                    .eq('id', userId)
                    .single();

                if (profileError) throw profileError;
                if (isMounted.current) setProfile(profileData);

                const { data: roleData, error: roleError } = await supabase
                    .from('user_roles')
                    .select(`
                      role_key,
                      roles (display_name, permissions)
                    `)
                    .eq('user_id', userId);

                if (roleError) throw roleError;

                const roleKeys = roleData.map(r => r.role_key);
                if (isMounted.current) setRoles(roleKeys);

            } catch (error) {
                console.error('Error fetching user data:', error.message);
                showToast("사용자 정보를 불러오는데 실패했습니다.", { type: "error" });
            } finally {
                if (isMounted.current) setLoading(false);
            }
        };

        const initSession = async () => {
            try {
                // 1. 현재 세션 확인
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (isMounted.current) {
                    setUser(session?.user ?? null);
                    if (session?.user) {
                        await fetchProfileAndRoles(session.user.id);
                    } else {
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error("Session check failed:", err);
                if (isMounted.current) {
                    // 세션 체크 실패해도 앱은 로드되어야 함 (로그아웃 상태로 간주)
                    setUser(null);
                    setLoading(false);
                }
            }
        };

        initSession();

        // 2. 인증 상태 변경 감지
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!isMounted.current) return;

            // [FIX] ID가 바뀌었을 때만 로딩(Flash) 처리
            const currentId = session?.user?.id;
            const prevId = lastUserId.current;

            setUser(session?.user ?? null);
            lastUserId.current = currentId; // Update ref

            if (session?.user) {
                // 로그인한 유저가 바뀌었을 때만 로딩 스피너 표시
                if (currentId !== prevId) {
                    setLoading(true);
                }
                fetchProfileAndRoles(session.user.id);
            } else {
                setProfile(null);
                setRoles([]);
                setLoading(false);
            }
        });

        return () => {
            isMounted.current = false;
            subscription.unsubscribe();
        };
    }, [showToast]);

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const signup = async (email, password, additionalData) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    student_id: additionalData.student_id,
                    name: additionalData.name,
                    phone: additionalData.phone
                }
            }
        });
        if (error) throw error;
        return data;
    };

    const logout = () => supabase.auth.signOut();
    const hasRole = (roleKey) => roles.includes(roleKey);

    // 비밀번호 변경 (사용자 본인)
    const changePassword = async (newPassword) => {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
    };

    // [NEW] 프로필 수동 갱신 (마이페이지 등에서 사용)
    const refreshProfile = async () => {
        if (user) await fetchProfileAndRoles(user.id);
    };

    const value = {
        user,
        profile,
        roles,
        login,
        signup,
        logout,
        hasRole,
        changePassword,
        loading,
        refreshProfile // [NEW]
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    flexDirection: 'column',
                    gap: '20px'
                }}>
                    <div className="spinner"></div>
                    <p>로그인 정보를 확인하고 있어요...</p>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};
