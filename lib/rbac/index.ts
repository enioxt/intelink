/**
 * Intelink RBAC (Role-Based Access Control) System
 * ================================================
 * 
 * Arquitetura moderna de permissões com:
 * - Roles hierárquicos (system + functional)
 * - Permissions granulares
 * - Multi-tenancy por unidade
 * - Guards para rotas e ações
 * 
 * @version 2.0.0
 * @author EGOSv3
 */

// ========================================
// TYPES
// ========================================

/**
 * System Roles - Nível de acesso ao sistema
 */
export type SystemRole = 
    | 'super_admin'   // Full system access
    | 'admin'         // Admin (manages investigations + members)
    | 'contributor'   // GitHub-authenticated contributor
    | 'public';       // Open access (read-only)

/**
 * Functional Roles - Função policial específica
 */
export type FunctionalRole = 
    | 'delegado'      // Autoridade policial
    | 'investigador'  // Investigador de campo
    | 'escrivao'      // Escrivão de polícia
    | 'perito'        // Perito criminal
    | 'agente'        // Agente de polícia
    | 'analista'      // Analista de inteligência
    | 'estagiario';   // Estagiário

/**
 * Permissions - Ações específicas no sistema
 */
export type Permission =
    // Operações
    | 'investigation:view'
    | 'investigation:create'
    | 'investigation:edit'
    | 'investigation:delete'
    | 'investigation:archive'
    | 'investigation:assign_team'
    // Entidades
    | 'entity:view'
    | 'entity:create'
    | 'entity:edit'
    | 'entity:delete'
    // Documentos/Evidências
    | 'document:view'
    | 'document:upload'
    | 'document:delete'
    // Membros/Equipe
    | 'member:view'
    | 'member:view_all_units'  // Ver membros de outras unidades
    | 'member:create'
    | 'member:edit'
    | 'member:delete'
    | 'member:change_role'
    // Central de Inteligência
    | 'central:access'
    | 'central:vinculos'
    | 'central:graph'
    | 'central:analytics'
    // Chat IA
    | 'chat:use'
    | 'chat:view_history'
    // Votos/Confirmações
    | 'vote:submit'
    | 'vote:view_timeline'
    // Configurações
    | 'config:access'
    | 'config:edit_system'
    | 'config:manage_permissions'
    // Relatórios
    | 'report:view'
    | 'report:export'
    | 'report:generate_analysis'
    // Auditoria
    | 'audit:view'
    | 'audit:export';

/**
 * Resource Scope - Escopo de aplicação da permissão
 */
export type ResourceScope = 
    | 'own'       // Apenas seus próprios recursos
    | 'unit'      // Recursos da sua unidade
    | 'all';      // Todos os recursos

/**
 * Permission with Scope
 */
export interface ScopedPermission {
    permission: Permission;
    scope: ResourceScope;
}

/**
 * Complete User Access Context
 */
export interface UserAccessContext {
    userId: string;
    systemRole: SystemRole;
    functionalRole: FunctionalRole;
    unitId: string;
    unitName?: string;
    permissions: ScopedPermission[];
    isHidden: boolean;
}

// ========================================
// ROLE HIERARCHY (Higher = More Access)
// ========================================

export const SYSTEM_ROLE_HIERARCHY: Record<SystemRole, number> = {
    super_admin: 1000,
    admin: 800,
    contributor: 400,
    public: 100,
};

export const FUNCTIONAL_ROLE_HIERARCHY: Record<FunctionalRole, number> = {
    delegado: 100,
    analista: 80,
    investigador: 70,
    escrivao: 60,
    perito: 60,
    agente: 50,
    estagiario: 20,
};

// ========================================
// ROLE METADATA
// ========================================

export const SYSTEM_ROLE_METADATA: Record<SystemRole, {
    label: string;
    description: string;
    color: string;
    icon: string;
    isHidden?: boolean;
}> = {
    super_admin: {
        label: 'Super Admin',
        description: 'Full system access',
        color: 'red',
        icon: 'Crown',
    },
    admin: {
        label: 'Admin',
        description: 'Manages investigations and members',
        color: 'orange',
        icon: 'ShieldCheck',
    },
    contributor: {
        label: 'Contributor',
        description: 'Can suggest edits and give feedback',
        color: 'blue',
        icon: 'User',
    },
    public: {
        label: 'Public',
        description: 'Open access - read only',
        color: 'slate',
        icon: 'Globe',
    },
};

export const FUNCTIONAL_ROLE_METADATA: Record<FunctionalRole, {
    label: string;
    description: string;
    color: string;
}> = {
    delegado: {
        label: 'Delegado(a)',
        description: 'Autoridade policial responsável',
        color: 'red',
    },
    analista: {
        label: 'Analista',
        description: 'Analista de inteligência policial',
        color: 'purple',
    },
    investigador: {
        label: 'Investigador(a)',
        description: 'Investigador de campo',
        color: 'blue',
    },
    escrivao: {
        label: 'Escrivão(ã)',
        description: 'Documentação e registros',
        color: 'emerald',
    },
    perito: {
        label: 'Perito(a)',
        description: 'Análises técnicas e laudos',
        color: 'cyan',
    },
    agente: {
        label: 'Agente',
        description: 'Apoio operacional',
        color: 'slate',
    },
    estagiario: {
        label: 'Estagiário(a)',
        description: 'Em treinamento',
        color: 'gray',
    },
};

// ========================================
// PERMISSION MATRICES BY ROLE
// ========================================

/**
 * System Role → Permissions
 * Defines the BASE permissions for each system role
 */
export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRole, ScopedPermission[]> = {
    super_admin: [
        // All permissions with 'all' scope
        { permission: 'investigation:view', scope: 'all' },
        { permission: 'investigation:create', scope: 'all' },
        { permission: 'investigation:edit', scope: 'all' },
        { permission: 'investigation:delete', scope: 'all' },
        { permission: 'investigation:archive', scope: 'all' },
        { permission: 'investigation:assign_team', scope: 'all' },
        { permission: 'entity:view', scope: 'all' },
        { permission: 'entity:create', scope: 'all' },
        { permission: 'entity:edit', scope: 'all' },
        { permission: 'entity:delete', scope: 'all' },
        { permission: 'document:view', scope: 'all' },
        { permission: 'document:upload', scope: 'all' },
        { permission: 'document:delete', scope: 'all' },
        { permission: 'member:view', scope: 'all' },
        { permission: 'member:view_all_units', scope: 'all' },
        { permission: 'member:create', scope: 'all' },
        { permission: 'member:edit', scope: 'all' },
        { permission: 'member:delete', scope: 'all' },
        { permission: 'member:change_role', scope: 'all' },
        { permission: 'central:access', scope: 'all' },
        { permission: 'central:vinculos', scope: 'all' },
        { permission: 'central:graph', scope: 'all' },
        { permission: 'central:analytics', scope: 'all' },
        { permission: 'chat:use', scope: 'all' },
        { permission: 'chat:view_history', scope: 'all' },
        { permission: 'vote:submit', scope: 'all' },
        { permission: 'vote:view_timeline', scope: 'all' },
        { permission: 'config:access', scope: 'all' },
        { permission: 'config:edit_system', scope: 'all' },
        { permission: 'config:manage_permissions', scope: 'all' },
        { permission: 'report:view', scope: 'all' },
        { permission: 'report:export', scope: 'all' },
        { permission: 'report:generate_analysis', scope: 'all' },
        { permission: 'audit:view', scope: 'all' },
        { permission: 'audit:export', scope: 'all' },
    ],
    
    admin: [
        { permission: 'investigation:view', scope: 'all' },
        { permission: 'investigation:create', scope: 'all' },
        { permission: 'investigation:edit', scope: 'all' },
        { permission: 'investigation:archive', scope: 'all' },
        { permission: 'investigation:assign_team', scope: 'all' },
        { permission: 'entity:view', scope: 'all' },
        { permission: 'entity:create', scope: 'all' },
        { permission: 'entity:edit', scope: 'all' },
        { permission: 'document:view', scope: 'all' },
        { permission: 'document:upload', scope: 'all' },
        { permission: 'member:view', scope: 'all' },
        { permission: 'member:view_all_units', scope: 'all' },
        { permission: 'member:create', scope: 'all' },
        { permission: 'member:edit', scope: 'all' },
        { permission: 'member:change_role', scope: 'all' },
        { permission: 'central:access', scope: 'all' },
        { permission: 'central:vinculos', scope: 'all' },
        { permission: 'central:graph', scope: 'all' },
        { permission: 'central:analytics', scope: 'all' },
        { permission: 'chat:use', scope: 'all' },
        { permission: 'chat:view_history', scope: 'all' },
        { permission: 'vote:submit', scope: 'all' },
        { permission: 'vote:view_timeline', scope: 'all' },
        { permission: 'config:access', scope: 'all' },
        { permission: 'report:view', scope: 'all' },
        { permission: 'report:export', scope: 'all' },
        { permission: 'report:generate_analysis', scope: 'all' },
        { permission: 'audit:view', scope: 'all' },
        { permission: 'central:access', scope: 'unit' },
        { permission: 'central:vinculos', scope: 'unit' },
        { permission: 'central:graph', scope: 'unit' },
        { permission: 'central:analytics', scope: 'unit' },
        { permission: 'chat:use', scope: 'unit' },
        { permission: 'chat:view_history', scope: 'unit' },
        { permission: 'vote:submit', scope: 'unit' },
        { permission: 'vote:view_timeline', scope: 'unit' },
        { permission: 'config:access', scope: 'unit' },
        { permission: 'report:view', scope: 'unit' },
        { permission: 'report:export', scope: 'unit' },
        { permission: 'report:generate_analysis', scope: 'unit' },
    ],
    
    contributor: [
        { permission: 'investigation:view', scope: 'all' },
        { permission: 'entity:view', scope: 'all' },
        { permission: 'entity:create', scope: 'all' },
        { permission: 'entity:edit', scope: 'own' },
        { permission: 'document:view', scope: 'all' },
        { permission: 'member:view', scope: 'all' },
        { permission: 'central:vinculos', scope: 'all' },
        { permission: 'central:graph', scope: 'all' },
        { permission: 'chat:use', scope: 'own' },
        { permission: 'vote:submit', scope: 'all' },
        { permission: 'vote:view_timeline', scope: 'all' },
        { permission: 'report:view', scope: 'all' },
    ],
    
    public: [
        { permission: 'investigation:view', scope: 'all' },
        { permission: 'entity:view', scope: 'all' },
        { permission: 'document:view', scope: 'all' },
        { permission: 'member:view', scope: 'all' },
        { permission: 'central:access', scope: 'all' },
        { permission: 'central:vinculos', scope: 'all' },
        { permission: 'central:graph', scope: 'all' },
        { permission: 'vote:view_timeline', scope: 'all' },
        { permission: 'report:view', scope: 'all' },
    ],
};

// ========================================
// PERMISSION CHECK FUNCTIONS
// ========================================

/**
 * Check if user has a specific permission
 */
export function hasPermission(
    context: UserAccessContext,
    permission: Permission,
    resourceOwnerId?: string,
    resourceUnitId?: string
): boolean {
    const scopedPerm = context.permissions.find(p => p.permission === permission);
    
    if (!scopedPerm) return false;
    
    switch (scopedPerm.scope) {
        case 'all':
            return true;
        case 'unit':
            return !resourceUnitId || resourceUnitId === context.unitId;
        case 'own':
            return !resourceOwnerId || resourceOwnerId === context.userId;
        default:
            return false;
    }
}

/**
 * Check if user can manage another user's role
 */
export function canManageRole(
    managerSystemRole: SystemRole,
    targetSystemRole: SystemRole
): boolean {
    const managerLevel = SYSTEM_ROLE_HIERARCHY[managerSystemRole];
    const targetLevel = SYSTEM_ROLE_HIERARCHY[targetSystemRole];
    return managerLevel > targetLevel;
}

/**
 * Get all permissions for a system role
 */
export function getPermissionsForRole(role: SystemRole): ScopedPermission[] {
    return SYSTEM_ROLE_PERMISSIONS[role] || [];
}

/**
 * Build user access context from DB data
 */
export function buildAccessContext(
    userId: string,
    systemRole: SystemRole,
    functionalRole: FunctionalRole,
    unitId: string,
    unitName?: string
): UserAccessContext {
    const permissions = getPermissionsForRole(systemRole);
    const isHidden = SYSTEM_ROLE_METADATA[systemRole]?.isHidden || false;
    
    return {
        userId,
        systemRole,
        functionalRole,
        unitId,
        unitName,
        permissions,
        isHidden,
    };
}

/**
 * Check if user can access a specific page/route
 */
export function canAccessRoute(context: UserAccessContext, route: string): boolean {
    const routePermissions: Record<string, Permission> = {
        '/central': 'central:access',
        '/central/vinculos': 'central:vinculos',
        '/central/graph': 'central:graph',
        '/central/membros': 'member:view',
        '/central/permissoes': 'config:manage_permissions',
        '/central/delegacias': 'member:view',
        '/central/configuracoes': 'config:access',
        '/chat': 'chat:use',
        '/investigation': 'investigation:view',
        '/investigation/new': 'investigation:create',
        '/reports': 'report:view',
        '/equipe': 'member:view',
    };
    
    const requiredPermission = routePermissions[route];
    if (!requiredPermission) return true; // Allow unknown routes
    
    return hasPermission(context, requiredPermission);
}

/**
 * Get restricted routes for a user
 */
export function getRestrictedRoutes(context: UserAccessContext): string[] {
    const allRoutes = [
        '/central',
        '/central/vinculos',
        '/central/graph',
        '/central/membros',
        '/central/permissoes',
        '/central/delegacias',
        '/central/configuracoes',
        '/chat',
        '/investigation',
        '/investigation/new',
        '/reports',
        '/equipe',
    ];
    
    return allRoutes.filter(route => !canAccessRoute(context, route));
}

// ========================================
// EXPORTS
// ========================================

export default {
    hasPermission,
    canManageRole,
    getPermissionsForRole,
    buildAccessContext,
    canAccessRoute,
    getRestrictedRoutes,
    SYSTEM_ROLE_HIERARCHY,
    FUNCTIONAL_ROLE_HIERARCHY,
    SYSTEM_ROLE_METADATA,
    FUNCTIONAL_ROLE_METADATA,
    SYSTEM_ROLE_PERMISSIONS,
};
