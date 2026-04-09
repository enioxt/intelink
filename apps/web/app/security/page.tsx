'use client';

import { useState } from 'react';
import { 
  Shield, Lock, Key, Smartphone, Fingerprint, 
  AlertTriangle, CheckCircle, RefreshCw, Download,
  Eye, EyeOff, Copy, QrCode, MessageSquare
} from 'lucide-react';
import { GlassCard } from '@/components/primitives/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { Switch } from '@/components/ui/switch';

interface SecuritySetting {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: React.ElementType;
}

export default function SecurityPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | '2fa' | 'encryption' | 'audit'>('overview');
  const [showPassword, setShowPassword] = useState(false);
  
  const [settings, setSettings] = useState<SecuritySetting[]>([
    { id: '2fa', name: 'Autenticação 2FA', description: 'Verificação via Telegram', enabled: true, icon: Smartphone },
    { id: 'biometric', name: 'Biometria', description: 'Face ID / Touch ID', enabled: false, icon: Fingerprint },
    { id: 'encryption', name: 'Criptografia Local', description: 'AES-256-GCM para dados offline', enabled: true, icon: Lock },
    { id: 'audit', name: 'Log de Auditoria', description: 'Registro append-only', enabled: true, icon: Shield },
  ]);

  const toggleSetting = (id: string) => {
    setSettings(prev => prev.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  return (
    <div className="flex h-screen bg-[#050508] text-neutral-100">
      <ChatSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} conversations={[]} />
      
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="border-b border-white/[0.06] bg-[#050508]/85 backdrop-blur-xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Segurança</h1>
              <p className="text-sm text-neutral-500">
                Configurações de segurança, 2FA e criptografia
              </p>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
              <Shield className="w-3 h-3 mr-1" />
              Protegido
            </Badge>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Security Status */}
          <div className="grid grid-cols-4 gap-4">
            <GlassCard className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <Shield className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-bold">A+</p>
                <p className="text-xs text-neutral-500">Security Score</p>
              </div>
            </GlassCard>
            <GlassCard className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Lock className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-bold">AES-256</p>
                <p className="text-xs text-neutral-500">Criptografia</p>
              </div>
            </GlassCard>
            <GlassCard className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Key className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-lg font-bold">bcrypt</p>
                <p className="text-xs text-neutral-500">Hash 14 rounds</p>
              </div>
            </GlassCard>
            <GlassCard className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <RefreshCw className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-lg font-bold">30d</p>
                <p className="text-xs text-neutral-500">Sessão</p>
              </div>
            </GlassCard>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'overview' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('overview')}
              className={activeTab === 'overview' ? 'bg-blue-600' : ''}
            >
              <Shield className="w-4 h-4 mr-2" />
              Visão Geral
            </Button>
            <Button
              variant={activeTab === '2fa' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('2fa')}
              className={activeTab === '2fa' ? 'bg-blue-600' : ''}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              2FA Telegram
            </Button>
            <Button
              variant={activeTab === 'encryption' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('encryption')}
              className={activeTab === 'encryption' ? 'bg-blue-600' : ''}
            >
              <Lock className="w-4 h-4 mr-2" />
              Criptografia
            </Button>
            <Button
              variant={activeTab === 'audit' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('audit')}
              className={activeTab === 'audit' ? 'bg-blue-600' : ''}
            >
              <Key className="w-4 h-4 mr-2" />
              Auditoria
            </Button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <GlassCard>
                <h3 className="font-semibold mb-4">Configurações de Segurança</h3>
                <div className="space-y-4">
                  {settings.map((setting) => {
                    const Icon = setting.icon;
                    return (
                      <div 
                        key={setting.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03]"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${setting.enabled ? 'bg-emerald-500/10' : 'bg-neutral-500/10'}`}>
                            <Icon className={`w-5 h-5 ${setting.enabled ? 'text-emerald-500' : 'text-neutral-500'}`} />
                          </div>
                          <div>
                            <p className="font-medium">{setting.name}</p>
                            <p className="text-sm text-neutral-500">{setting.description}</p>
                          </div>
                        </div>
                        <Switch 
                          checked={setting.enabled}
                          onCheckedChange={() => toggleSetting(setting.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </GlassCard>

              <div className="grid grid-cols-2 gap-6">
                <GlassCard>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Alertas de Segurança
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-400">Tentativa de acesso suspeita</p>
                        <p className="text-xs text-neutral-500">IP: 192.168.1.100 • 2h atrás</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Key className="w-5 h-5 text-amber-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-400">Senha expirando em 5 dias</p>
                        <p className="text-xs text-neutral-500">Recomendado trocar</p>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Verificações Passadas
                  </h4>
                  <div className="space-y-2">
                    {[
                      'gitleaks secret scan — OK',
                      'LGPD compliance check — OK',
                      'PII scanner validation — OK',
                      'Database encryption — OK',
                    ].map((check, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-neutral-300">{check}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </div>
          )}

          {/* 2FA Tab */}
          {activeTab === '2fa' && (
            <div className="grid grid-cols-2 gap-6">
              <GlassCard>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-500" />
                  2FA via Telegram
                </h3>
                <p className="text-sm text-neutral-400 mb-4">
                  Receba códigos de verificação diretamente no Telegram. 
                  Mais seguro que SMS e não requer instalação adicional.
                </p>

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">@EGOSin_bot</p>
                      <p className="text-xs text-neutral-500">Conectado</p>
                    </div>
                    <Badge className="ml-auto bg-emerald-500/20 text-emerald-400">Ativo</Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/[0.03]">
                    <span className="text-sm">Verificar no login</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/[0.03]">
                    <span className="text-sm">Verificar ações sensíveis</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/[0.03]">
                    <span className="text-sm">Notificar novos dispositivos</span>
                    <Switch />
                  </div>
                </div>
              </GlassCard>

              <GlassCard>
                <h3 className="font-semibold mb-4">Backup de Códigos</h3>
                <p className="text-sm text-neutral-400 mb-4">
                  Códigos de uso único para acesso caso perca acesso ao Telegram.
                  Guarde em local seguro.
                </p>

                <div className="p-4 rounded-lg bg-neutral-900/50 border border-neutral-800 mb-4">
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {['A7X9-KL2M', 'B3N8-PL4Q', 'C9R2-TY5W', 'D1F6-GH8J'].map((code, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-white/[0.03]">
                        <span className="text-neutral-400">{code}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Gerar Novos Códigos
                </Button>
              </GlassCard>
            </div>
          )}

          {/* Encryption Tab */}
          {activeTab === 'encryption' && (
            <div className="grid grid-cols-2 gap-6">
              <GlassCard>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-purple-500" />
                  Criptografia Local
                </h3>
                <p className="text-sm text-neutral-400 mb-4">
                  Dados sensíveis são criptografados usando AES-256-GCM com 
                  PBKDF2 (100k rounds). A chave nunca sai do dispositivo.
                </p>

                <div className="space-y-3 mb-4">
                  <div className="p-3 rounded-lg bg-white/[0.03]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Algoritmo</span>
                      <Badge variant="secondary">AES-256-GCM</Badge>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Key Derivation</span>
                      <Badge variant="secondary">PBKDF2 100k</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Storage</span>
                      <Badge variant="secondary">IndexedDB</Badge>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    Criptografia ativa — 1,247 registros protegidos
                  </div>
                </div>
              </GlassCard>

              <GlassCard>
                <h3 className="font-semibold mb-4">Chave de Recuperação</h3>
                <p className="text-sm text-neutral-400 mb-4">
                  Em caso de perda de senha, use a chave de recuperação para 
                  descriptografar seus dados locais.
                </p>

                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Senha mestre"
                      className="bg-neutral-900/50 border-neutral-800 pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>

                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Chave de Recuperação
                  </Button>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-400">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Atenção: Perder a chave de recuperação resultará em perda 
                    permanente dos dados locais criptografados.
                  </p>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Audit Tab */}
          {activeTab === 'audit' && (
            <GlassCard>
              <h3 className="font-semibold mb-4">Log de Auditoria</h3>
              <div className="space-y-2">
                {[
                  { action: 'Login', user: 'agent-852', time: '2 minutos atrás', ip: '192.168.1.50', status: 'success' },
                  { action: 'Consulta CNPJ', user: 'agent-852', time: '15 minutos atrás', ip: '192.168.1.50', status: 'success' },
                  { action: 'Export relatório', user: 'agent-852', time: '1 hora atrás', ip: '192.168.1.50', status: 'success' },
                  { action: 'Tentativa falha', user: 'unknown', time: '3 horas atrás', ip: '10.0.0.15', status: 'failed' },
                  { action: '2FA ativado', user: 'agent-852', time: '2 dias atrás', ip: '192.168.1.50', status: 'success' },
                ].map((log, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm font-medium">{log.action}</p>
                        <p className="text-xs text-neutral-500">{log.user} • {log.ip}</p>
                      </div>
                    </div>
                    <span className="text-xs text-neutral-500">{log.time}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-400">
                  Logs são append-only e verificáveis via Merkle tree. 
                  Integridade garantida por hash SHA-256.
                </p>
              </div>
            </GlassCard>
          )}
        </div>
      </main>
    </div>
  );
}
