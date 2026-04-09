'use client';

import { useState } from 'react';
import { 
  Building2, Users, Shield, Key, Settings, Plus, 
  Search, MoreVertical, CheckCircle, AlertCircle,
  Trash2, Edit2, Eye
} from 'lucide-react';
import { GlassCard } from '@/components/primitives/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ChatSidebar } from '@/components/chat/ChatSidebar';

interface Tenant {
  id: string;
  name: string;
  delegacia: string;
  codigo: string;
  users: number;
  maxUsers: number;
  storage: number; // GB
  maxStorage: number; // GB
  status: 'active' | 'suspended' | 'pending';
  plan: 'basic' | 'pro' | 'enterprise';
  createdAt: string;
  rlsEnabled: boolean;
}

interface TenantUser {
  id: string;
  name: string;
  email: string;
  masp: string;
  role: 'admin' | 'investigator' | 'viewer';
  status: 'active' | 'inactive';
  lastLogin: string;
}

const MOCK_TENANTS: Tenant[] = [
  {
    id: 't-001',
    name: '1ª DP Belo Horizonte',
    delegacia: 'BH Centro',
    codigo: '31.001',
    users: 12,
    maxUsers: 20,
    storage: 45,
    maxStorage: 100,
    status: 'active',
    plan: 'pro',
    createdAt: '2024-01-15',
    rlsEnabled: true,
  },
  {
    id: 't-002',
    name: '2ª DP Contagem',
    delegacia: 'Contagem',
    codigo: '31.002',
    users: 8,
    maxUsers: 15,
    storage: 23,
    maxStorage: 50,
    status: 'active',
    plan: 'basic',
    createdAt: '2024-02-20',
    rlsEnabled: true,
  },
  {
    id: 't-003',
    name: 'DIG Delegacia',
    delegacia: 'DIG',
    codigo: '31.999',
    users: 25,
    maxUsers: 50,
    storage: 127,
    maxStorage: 200,
    status: 'active',
    plan: 'enterprise',
    createdAt: '2024-01-10',
    rlsEnabled: true,
  },
  {
    id: 't-004',
    name: '3ª DP Betim',
    delegacia: 'Betim',
    codigo: '31.003',
    users: 5,
    maxUsers: 10,
    storage: 8,
    maxStorage: 30,
    status: 'pending',
    plan: 'basic',
    createdAt: '2024-04-08',
    rlsEnabled: false,
  },
];

const MOCK_USERS: TenantUser[] = [
  { id: 'u-001', name: 'João Silva', email: 'joao.silva@pc.mg.gov.br', masp: '123456', role: 'admin', status: 'active', lastLogin: '2 minutos atrás' },
  { id: 'u-002', name: 'Maria Santos', email: 'maria.santos@pc.mg.gov.br', masp: '234567', role: 'investigator', status: 'active', lastLogin: '1 hora atrás' },
  { id: 'u-003', name: 'Pedro Costa', email: 'pedro.costa@pc.mg.gov.br', masp: '345678', role: 'viewer', status: 'inactive', lastLogin: '3 dias atrás' },
];

export default function TenantAdminPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'tenants' | 'users' | 'rls' | 'settings'>('tenants');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);

  const filteredTenants = MOCK_TENANTS.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.delegacia.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.codigo.includes(searchQuery)
  );

  const getStatusBadge = (status: Tenant['status']) => {
    const config = {
      active: { className: 'bg-emerald-500/20 text-emerald-400', label: 'Ativo' },
      suspended: { className: 'bg-red-500/20 text-red-400', label: 'Suspenso' },
      pending: { className: 'bg-amber-500/20 text-amber-400', label: 'Pendente' },
    };
    const { className, label } = config[status];
    return <Badge className={className}>{label}</Badge>;
  };

  const getPlanBadge = (plan: Tenant['plan']) => {
    const config = {
      basic: { className: 'bg-neutral-500/20 text-neutral-400', label: 'Basic' },
      pro: { className: 'bg-blue-500/20 text-blue-400', label: 'Pro' },
      enterprise: { className: 'bg-purple-500/20 text-purple-400', label: 'Enterprise' },
    };
    const { className, label } = config[plan];
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <div className="flex h-screen bg-[#050508] text-neutral-100">
      <ChatSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} conversations={[]} />
      
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="border-b border-white/[0.06] bg-[#050508]/85 backdrop-blur-xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Administração Multi-Tenant</h1>
              <p className="text-sm text-neutral-500">
                Gestão de delegacias, RLS e isolamento de dados
              </p>
            </div>
            <Badge variant="outline" className="border-purple-500/30 text-purple-400">
              <Shield className="w-3 h-3 mr-1" />
              Super Admin
            </Badge>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <GlassCard className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Building2 className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{MOCK_TENANTS.length}</p>
                <p className="text-xs text-neutral-500">Delegacias</p>
              </div>
            </GlassCard>
            <GlassCard className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <Users className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">50</p>
                <p className="text-xs text-neutral-500">Usuários Ativos</p>
              </div>
            </GlassCard>
            <GlassCard className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Shield className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-neutral-500">RLS Ativo</p>
              </div>
            </GlassCard>
            <GlassCard className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Key className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">1</p>
                <p className="text-xs text-neutral-500">Pendentes</p>
              </div>
            </GlassCard>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'tenants' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('tenants')}
              className={activeTab === 'tenants' ? 'bg-blue-600' : ''}
            >
              <Building2 className="w-4 h-4 mr-2" />
              Delegacias
            </Button>
            <Button
              variant={activeTab === 'users' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('users')}
              className={activeTab === 'users' ? 'bg-blue-600' : ''}
            >
              <Users className="w-4 h-4 mr-2" />
              Usuários
            </Button>
            <Button
              variant={activeTab === 'rls' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('rls')}
              className={activeTab === 'rls' ? 'bg-blue-600' : ''}
            >
              <Shield className="w-4 h-4 mr-2" />
              RLS
            </Button>
            <Button
              variant={activeTab === 'settings' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('settings')}
              className={activeTab === 'settings' ? 'bg-blue-600' : ''}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
          </div>

          {/* Tenants Tab */}
          {activeTab === 'tenants' && (
            <>
              <div className="flex justify-between items-center">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <Input
                    placeholder="Buscar delegacia..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-neutral-900/50 border-neutral-800"
                  />
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Delegacia
                </Button>
              </div>

              <GlassCard>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-neutral-500 border-b border-white/[0.06]">
                        <th className="pb-3 pl-4">Nome</th>
                        <th className="pb-3">Código</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Plano</th>
                        <th className="pb-3">Usuários</th>
                        <th className="pb-3">Armazenamento</th>
                        <th className="pb-3">RLS</th>
                        <th className="pb-3 pr-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTenants.map((tenant) => (
                        <tr 
                          key={tenant.id} 
                          className="border-b border-white/[0.06] hover:bg-white/[0.03]"
                        >
                          <td className="py-3 pl-4">
                            <div>
                              <p className="font-medium">{tenant.name}</p>
                              <p className="text-xs text-neutral-500">{tenant.delegacia}</p>
                            </div>
                          </td>
                          <td className="py-3 font-mono text-sm">{tenant.codigo}</td>
                          <td className="py-3">{getStatusBadge(tenant.status)}</td>
                          <td className="py-3">{getPlanBadge(tenant.plan)}</td>
                          <td className="py-3 text-sm">
                            {tenant.users}/{tenant.maxUsers}
                          </td>
                          <td className="py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${(tenant.storage / tenant.maxStorage) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs">{tenant.storage}GB</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <Switch 
                              checked={tenant.rlsEnabled}
                              className={tenant.rlsEnabled ? 'data-[state=checked]:bg-emerald-500' : ''}
                            />
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <GlassCard>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Usuários por Delegacia</h3>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Usuário
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-neutral-500 border-b border-white/[0.06]">
                      <th className="pb-3 pl-4">Nome</th>
                      <th className="pb-3">MASP</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Função</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Último Acesso</th>
                      <th className="pb-3 pr-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_USERS.map((user) => (
                      <tr 
                        key={user.id} 
                        className="border-b border-white/[0.06] hover:bg-white/[0.03]"
                      >
                        <td className="py-3 pl-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-400">
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <p className="font-medium">{user.name}</p>
                          </div>
                        </td>
                        <td className="py-3 font-mono text-sm">{user.masp}</td>
                        <td className="py-3 text-sm">{user.email}</td>
                        <td className="py-3">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {user.role}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge className={user.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-500/20 text-neutral-400'}>
                            {user.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-sm text-neutral-500">{user.lastLogin}</td>
                        <td className="py-3 pr-4 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {/* RLS Tab */}
          {activeTab === 'rls' && (
            <div className="grid grid-cols-2 gap-6">
              <GlassCard>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-500" />
                  Row Level Security
                </h3>
                <p className="text-sm text-neutral-400 mb-4">
                  RLS garante que cada delegacia veja apenas seus próprios dados. 
                  Implementado via PostgreSQL policies.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
                    <div>
                      <p className="font-medium">RLS Global</p>
                      <p className="text-xs text-neutral-500">Aplicar a todas as tabelas</p>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-emerald-500" />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
                    <div>
                      <p className="font-medium">Isolamento de Entidades</p>
                      <p className="text-xs text-neutral-500">Neo4j tenant_id labels</p>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-emerald-500" />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
                    <div>
                      <p className="font-medium">Isolamento de Conversas</p>
                      <p className="text-xs text-neutral-500">Chat messages por tenant</p>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-emerald-500" />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
                    <div>
                      <p className="font-medium">Auditoria Cross-Tenant</p>
                      <p className="text-xs text-neutral-500">Admin pode ver tudo</p>
                    </div>
                    <Switch className="data-[state=checked]:bg-emerald-500" />
                  </div>
                </div>
              </GlassCard>

              <GlassCard>
                <h3 className="font-semibold mb-4">Políticas Ativas</h3>
                <div className="space-y-2">
                  {[
                    { name: 'entities_tenant_isolation', table: 'entities', enabled: true },
                    { name: 'investigations_tenant_access', table: 'investigations', enabled: true },
                    { name: 'chat_messages_tenant_view', table: 'chat_messages', enabled: true },
                    { name: 'users_tenant_membership', table: 'users', enabled: true },
                    { name: 'audit_log_admin_access', table: 'audit_logs', enabled: false },
                  ].map((policy, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]"
                    >
                      <div>
                        <p className="font-medium text-sm">{policy.name}</p>
                        <p className="text-xs text-neutral-500">{policy.table}</p>
                      </div>
                      <Badge className={policy.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-500/20 text-neutral-400'}>
                        {policy.enabled ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-2 gap-6">
              <GlassCard>
                <h3 className="font-semibold mb-4">Configurações Globais</h3>
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-white/[0.03]">
                    <p className="font-medium mb-1">Modo de Isolamento</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-blue-500/20 text-blue-400">Tenant por Delegacia</Badge>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.03]">
                    <p className="font-medium mb-1">Máximo de Tenants</p>
                    <p className="text-2xl font-bold">50</p>
                    <p className="text-xs text-neutral-500">4 atualmente (8%)</p>
                  </div>

                  <div className="p-3 rounded-lg bg-white/[0.03]">
                    <p className="font-medium mb-1">Usuários por Tenant</p>
                    <p className="text-2xl font-bold">50</p>
                    <p className="text-xs text-neutral-500">Máximo no plano Enterprise</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard>
                <h3 className="font-semibold mb-4">Alertas de Segurança</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-400">Tenant sem RLS</p>
                      <p className="text-sm text-neutral-400">3ª DP Betim não tem RLS ativado</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-emerald-400">Verificação Completa</p>
                      <p className="text-sm text-neutral-400">Todas as políticas RLS verificadas</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
