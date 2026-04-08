'use client';

/**
 * New Investigation Form Page
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Create new criminal investigation with template selection
 */


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, AlertCircle, Scale, Users } from 'lucide-react';
import { useCreateInvestigation, useInvestigationTemplates } from '@/hooks/useInvestigations';

type Priority = 'low' | 'medium' | 'high' | 'critical';

export default function NewInvestigationPage() {
  const router = useRouter();
  const { data: templatesData, isLoading: templatesLoading } = useInvestigationTemplates();
  const createMutation = useCreateInvestigation();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    template_id: '',
    case_number: '',
    priority: 'medium' as Priority,
    team_members: '',
    metadata: {},
  });

  const [delegacias, setDelegacias] = useState<Array<{id: string; nome: string}>>([])
  const [delegaciaId, setDelegaciaId] = useState('')

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_INTELINK_API || 'http://localhost:8042/api/v1/intelink'
    fetch(`${API}/delegacias`)
      .then(res => res.json())
      .then(data => setDelegacias(data.delegacias || []))
      .catch(() => setDelegacias([]))
  }, [])

  const templates = templatesData?.templates || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const teamMembersArray = formData.team_members
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      const investigation = await createMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        template_id: formData.template_id || undefined,
        case_number: formData.case_number || undefined,
        priority: formData.priority,
        team_members: teamMembersArray,
        metadata: {
          ...formData.metadata,
          delegacia_id: delegaciaId || undefined,
          delegacia_nome: delegacias.find(d => d.id === delegaciaId)?.nome || undefined,
        },
      });

      // Redirect to investigation detail page
      router.push(`/intelink/investigations/${investigation.id}`);
    } catch (error) {
      console.error('Failed to create investigation:', error);
    }
  };

  const selectedTemplate = templates.find((t: any) => t.id === formData.template_id);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/intelink/investigations"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Investigações
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Nova Investigação
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Criar novo caso criminal ou investigação
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-3xl">
        {/* Template Selection */}
        <div className="mb-6 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Template de Investigação
          </label>
          
          {templatesLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando templates...
            </div>
          ) : (
            <select
              value={formData.template_id}
              onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sem template (personalizado)</option>
              {templates.map((template: any) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          )}

          {selectedTemplate && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                {selectedTemplate.description}
              </p>
              <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                <strong>Entidades:</strong> {selectedTemplate.entity_types.join(', ')}
              </div>
            </div>
          )}
        </div>

        {/* Basic Information */}
        <div className="mb-6 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Informações Básicas
          </h3>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Título da Investigação *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Homicídio na Rua das Flores - Art. 121 CPB"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Case Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Número do Caso
            </label>
            <input
              type="text"
              value={formData.case_number}
              onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
              placeholder="Ex: INV-2025-001"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descrição *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva os fatos, local, data, vítimas, suspeitos..."
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prioridade
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </div>

          {/* Delegacia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Delegacia responsável
            </label>
            <select
              value={delegaciaId}
              onChange={(e) => setDelegaciaId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione a delegacia</option>
              {delegacias.map((d) => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Team Members */}
        <div className="mb-6 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Equipe
            </h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Membros da Equipe (emails separados por vírgula)
            </label>
            <input
              type="text"
              value={formData.team_members}
              onChange={(e) => setFormData({ ...formData, team_members: e.target.value })}
              placeholder="delegado@policia.br, escrivao@policia.br, investigador1@policia.br"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Insira os emails dos membros da equipe separados por vírgula
            </p>
          </div>
        </div>

        {/* Error Message */}
        {createMutation.isError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-red-700 dark:text-red-300">
                Erro ao criar investigação: {createMutation.error?.message}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Criar Investigação
              </>
            )}
          </button>

          <Link
            href="/intelink/investigations"
            className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </Link>
        </div>

        {/* Footer informativo */}
        <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Defina a delegacia correta para habilitar métricas, compartilhamento e análises por unidade.
          </div>
        </div>
      </form>
    </div>
  );
}
