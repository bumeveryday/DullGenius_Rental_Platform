
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. 현재 세션 확인
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchProfileAndRoles(session.user.id);
            else setLoading(false);
        });

        // 2. 인증 상태 변경 감지 (로그인/로그아웃)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchProfileAndRoles(session.user.id);
            else {
                setProfile(null);
                setRoles([]);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfileAndRoles = async (userId) => {
        try {
            // 프로필 가져오기
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) throw profileError;
            setProfile(profileData);

            // 역할 가져오기
            const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .select(`
          role_key,
          roles (
            display_name,
            permissions
          )
        `)
                .eq('user_id', userId);

            if (roleError) throw roleError;

            // 보기 편하게 가공: ['admin', 'executive']
            const roleKeys = roleData.map(r => r.role_key);
            setRoles(roleKeys);

        } catch (error) {
            console.error('Error fetching user data:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const signup = async (email, password, additionalData) => {
        // 1. Auth 회원가입
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

        // 2. Trigger가 자동으로 Profile을 생성해줄 것임.
        return data;
    };

    const logout = () => supabase.auth.signOut();

    // 특정 역할이 있는지 확인하는 헬퍼 함수
    const hasRole = (roleKey) => roles.includes(roleKey);

    const value = {
        user,
        profile,
        roles,
        login,
        signup,
        logout,
        hasRole,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
