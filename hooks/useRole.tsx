'use client';

import React, { useState, useEffect } from 'react';

export type SystemRole = 'super_admin' | 'admin' | 'contributor' | 'public';

export interface UserPermissions {
    role: SystemRole;
    isLoading: boolean;
    error: string | null;
    isSuperAdmin: boolean;
    canManageSystem: boolean;
    canManagePermissions: boolean;
    canManageUnits: boolean;
    canManageMembers: boolean;
    canViewMembers: boolean; // Ver membros da própria equipe (todos têm)
    canEditInvestigations: boolean;
    canViewInvestigations: boolean;
    canAccessConfig: boolean;
    canContribute: boolean; // Can suggest edits, give feedback
    isAuthenticated: boolean;
}

const ROLE_PERMISSIONS: Record<SystemRole, Omit<UserPermissions, 'role' | 'isLoading' | 'error'>> = {
    super_admin: {
        isSuperAdmin: true,
        canManageSystem: true,
        canManagePermissions: true,
        canManageUnits: true,
        canManageMembers: true,
        canViewMembers: true,
        canEditInvestigations: true,
        canViewInvestigations: true,
        canAccessConfig: true,
        canContribute: true,
        isAuthenticated: true,
    },
    admin: {
        isSuperAdmin: false,
        canManageSystem: false,
        canManagePermissions: false,
        canManageUnits: true,
        canManageMembers: true,
        canViewMembers: true,
        canEditInvestigations: true,
        canViewInvestigations: true,
        canAccessConfig: true,
        canContribute: true,
        isAuthenticated: true,
    },
    contributor: {
        isSuperAdmin: false,
        canManageSystem: false,
        canManagePermissions: false,
        canManageUnits: false,
        canManageMembers: false,
        canViewMembers: true,
        canEditInvestigations: false,
        canViewInvestigations: true,
        canAccessConfig: false,
        canContribute: true,
        isAuthenticated: true,
    },
    public: {
        isSuperAdmin: false,
        canManageSystem: false,
        canManagePermissions: false,
        canManageUnits: false,
        canManageMembers: false,
        canViewMembers: true,
        canEditInvestigations: false,
        canViewInvestigations: true,
        canAccessConfig: false,
        canContribute: false,
        isAuthenticated: false,
    },
};

export const ROLE_LABELS: Record<SystemRole, { label: string; description: string; color: string }> = {
    super_admin: { 
        label: 'Super Admin', 
        description: 'Full system access',
        color: 'red'
    },
    admin: { 
        label: 'Admin', 
        description: 'Manages investigations and members',
        color: 'orange'
    },
    contributor: { 
        label: 'Contributor', 
        description: 'Can suggest edits and give feedback',
        color: 'blue'
    },
    public: { 
        label: 'Public', 
        description: 'Open access - read only',
        color: 'slate'
    },
};

export function useRole(): UserPermissions {
    const [role, setRole] = useState<SystemRole>('public');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRole = async () => {
            try {
                // Check for GitHub OAuth session via Supabase
                const { getSupabaseClient } = await import('@/lib/supabase-client');
                const supabase = getSupabaseClient();
                
                if (!supabase) {
                    console.log('[useRole] Supabase not configured, defaulting to public');
                    setRole('public');
                    setIsLoading(false);
                    return;
                }

                const { data: { session } } = await supabase.auth.getSession();
                
                if (!session) {
                    // Also check legacy tokens for backward compatibility
                    const memberId = localStorage.getItem('intelink_member_id');
                    const accessToken = localStorage.getItem('intelink_access_token');
                    
                    if (memberId || accessToken) {
                        const authValue = accessToken || memberId;
                        const res = await fetch('/api/v2/auth/me', {
                            headers: { 'Authorization': `Bearer ${authValue}` },
                            credentials: 'include',
                        });
                        if (res.ok) {
                            const data = await res.json();
                            const systemRole = data.member?.systemRole || data.system_role || 'contributor';
                            setRole(systemRole as SystemRole);
                            setIsLoading(false);
                            return;
                        }
                    }
                    
                    console.log('[useRole] No session, defaulting to public (full read access)');
                    setRole('public');
                    setIsLoading(false);
                    return;
                }

                // GitHub OAuth session exists — user is a contributor
                console.log('[useRole] GitHub session found for:', session.user.email);
                
                // Check if user has admin role in our system
                const { data: member } = await supabase
                    .from('intelink_members')
                    .select('system_role')
                    .eq('github_id', session.user.user_metadata?.user_name || session.user.id)
                    .single();
                
                if (member?.system_role === 'super_admin') {
                    setRole('super_admin');
                } else if (member?.system_role === 'admin') {
                    setRole('admin');
                } else {
                    setRole('contributor');
                }
            } catch (e) {
                console.error('[useRole] Error:', e);
                setError('Error checking permissions');
                setRole('public');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRole();
    }, []);

    const permissions = ROLE_PERMISSIONS[role];

    return {
        role,
        isLoading,
        error,
        ...permissions,
    };
}

// Component for access denied screen
export function AccessDenied({ message }: { message?: string }) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-center">
                <div className="text-6xl mb-4">🔒</div>
                <h1 className="text-xl font-bold text-white mb-2">Acesso Restrito</h1>
                <p className="text-slate-400">{message || 'Você não tem permissão para acessar esta página.'}</p>
            </div>
        </div>
    );
}

// Loading component
export function RoleLoading() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
}
