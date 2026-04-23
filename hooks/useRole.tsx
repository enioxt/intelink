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

                // R4: use /api/v2/auth/verify as the single source of truth.
                // Old code queried 'intelink_members' (table doesn't exist) and
                // read 'intelink_access_token' from localStorage (field doesn't
                // exist — v2 uses the httpOnly cookie 'intelink_access').
                const verifyRes = await fetch('/api/v2/auth/verify', {
                    method: 'GET',
                    credentials: 'include',
                });

                if (verifyRes.ok) {
                    const data = await verifyRes.json();
                    if (data.valid && data.member?.systemRole) {
                        setRole(data.member.systemRole as SystemRole);
                        setIsLoading(false);
                        return;
                    }
                }

                // No valid v2 session — fall back to checking Supabase session
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user?.email) {
                    setRole('public');
                    setIsLoading(false);
                    return;
                }

                // Supabase session exists but v2 not ready yet — trigger bridge
                // and retry verify once.
                try {
                    const bridgeRes = await fetch('/api/auth/bridge', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({ email: session.user.email }),
                    });
                    if (bridgeRes.ok) {
                        const retryRes = await fetch('/api/v2/auth/verify', {
                            method: 'GET',
                            credentials: 'include',
                        });
                        if (retryRes.ok) {
                            const retryData = await retryRes.json();
                            if (retryData.valid && retryData.member?.systemRole) {
                                setRole(retryData.member.systemRole as SystemRole);
                                setIsLoading(false);
                                return;
                            }
                        }
                    }
                } catch { /* bridge failed — fall through to public */ }

                setRole('public');
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
