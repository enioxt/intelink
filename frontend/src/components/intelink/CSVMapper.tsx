'use client';

/**
 * CSV Column Mapper Component
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Features:
 * - Auto-detect CSV headers
 * - Drag-and-drop column mapping
 * - Save/load templates (localStorage)
 * - Preview first 5 rows
 */

import { useState, useEffect } from 'react';
import { ArrowRight, Save, Upload as UploadIcon, Eye, AlertCircle } from 'lucide-react';

interface CSVColumn {
  index: number;
  name: string;
  sample: string[];
  detectedType?: 'text' | 'number' | 'date' | 'phone' | 'cpf' | 'email';
}

interface FieldMapping {
  csvColumn: string;
  targetField: string;
}

interface CSVMapperProps {
  file: File;
  onMappingComplete: (mapping: FieldMapping[]) => void;
  onSkip: () => void;
}

// Target fields for Intelink entities
const TARGET_FIELDS = [
  { id: 'name', label: 'Nome', description: 'Nome da pessoa ou entidade' },
  { id: 'cpf', label: 'CPF', description: 'Documento CPF' },
  { id: 'phone', label: 'Telefone', description: 'Número de telefone' },
  { id: 'email', label: 'Email', description: 'Endereço de email' },
  { id: 'address', label: 'Endereço', description: 'Endereço completo' },
  { id: 'date', label: 'Data', description: 'Data do evento/registro' },
  { id: 'type', label: 'Tipo', description: 'Tipo de entidade (person, org, etc)' },
  { id: 'notes', label: 'Observações', description: 'Notas adicionais' },
];

export default function CSVMapper({ file, onMappingComplete, onSkip }: CSVMapperProps) {
  const [columns, setColumns] = useState<CSVColumn[]>([]);
  const [mapping, setMapping] = useState<FieldMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<{ name: string; mapping: FieldMapping[] }[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    parseCSV();
    loadTemplates();
  }, [file]);

  const parseCSV = async () => {
    try {
      setLoading(true);
      setError(null);

      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      
      if (lines.length === 0) {
        setError('Arquivo CSV vazio');
        return;
      }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
      
      // Parse first 5 data rows for sample
      const dataRows = lines.slice(1, 6).map(line => 
        line.split(',').map(cell => cell.trim().replace(/['"]/g, ''))
      );

      // Build columns with samples
      const cols: CSVColumn[] = header.map((name, idx) => ({
        index: idx,
        name,
        sample: dataRows.map(row => row[idx] || '').filter(Boolean),
        detectedType: detectColumnType(dataRows.map(row => row[idx] || ''))
      }));

      setColumns(cols);

      // Auto-suggest mappings based on column names
      const autoMapping = autoSuggestMapping(cols);
      setMapping(autoMapping);

    } catch (err) {
      setError(`Erro ao processar CSV: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const detectColumnType = (samples: string[]): CSVColumn['detectedType'] => {
    const nonEmpty = samples.filter(Boolean);
    if (nonEmpty.length === 0) return 'text';

    // CPF pattern
    if (nonEmpty.some(s => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(s) || /^\d{11}$/.test(s))) {
      return 'cpf';
    }

    // Phone pattern
    if (nonEmpty.some(s => /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/.test(s) || /^\d{10,11}$/.test(s))) {
      return 'phone';
    }

    // Email pattern
    if (nonEmpty.some(s => /@/.test(s))) {
      return 'email';
    }

    // Date pattern
    if (nonEmpty.some(s => /^\d{2}\/\d{2}\/\d{4}$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s))) {
      return 'date';
    }

    // Number pattern
    if (nonEmpty.every(s => !isNaN(Number(s)))) {
      return 'number';
    }

    return 'text';
  };

  const autoSuggestMapping = (cols: CSVColumn[]): FieldMapping[] => {
    const suggestions: FieldMapping[] = [];

    cols.forEach(col => {
      const lower = col.name.toLowerCase();
      
      if (lower.includes('nome') || lower.includes('name')) {
        suggestions.push({ csvColumn: col.name, targetField: 'name' });
      } else if (lower.includes('cpf')) {
        suggestions.push({ csvColumn: col.name, targetField: 'cpf' });
      } else if (lower.includes('tel') || lower.includes('phone') || lower.includes('fone')) {
        suggestions.push({ csvColumn: col.name, targetField: 'phone' });
      } else if (lower.includes('email') || lower.includes('e-mail')) {
        suggestions.push({ csvColumn: col.name, targetField: 'email' });
      } else if (lower.includes('endereco') || lower.includes('address')) {
        suggestions.push({ csvColumn: col.name, targetField: 'address' });
      } else if (lower.includes('data') || lower.includes('date')) {
        suggestions.push({ csvColumn: col.name, targetField: 'date' });
      } else if (lower.includes('tipo') || lower.includes('type')) {
        suggestions.push({ csvColumn: col.name, targetField: 'type' });
      } else if (lower.includes('obs') || lower.includes('nota') || lower.includes('note')) {
        suggestions.push({ csvColumn: col.name, targetField: 'notes' });
      }
    });

    return suggestions;
  };

  const updateMapping = (csvColumn: string, targetField: string) => {
    setMapping(prev => {
      const existing = prev.filter(m => m.csvColumn !== csvColumn);
      if (targetField === '') return existing; // Remove mapping
      return [...existing, { csvColumn, targetField }];
    });
  };

  const loadTemplates = () => {
    try {
      const stored = localStorage.getItem('intelink_csv_templates');
      if (stored) {
        setTemplates(JSON.parse(stored));
      }
    } catch (err) {
      console.warn('Failed to load templates:', err);
    }
  };

  const saveTemplate = () => {
    const name = prompt('Nome do template:');
    if (!name) return;

    const newTemplate = { name, mapping };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    localStorage.setItem('intelink_csv_templates', JSON.stringify(updated));
  };

  const loadTemplate = (template: { name: string; mapping: FieldMapping[] }) => {
    setMapping(template.mapping);
  };

  const handleComplete = () => {
    if (mapping.length === 0) {
      alert('Por favor, mapeie pelo menos uma coluna');
      return;
    }
    onMappingComplete(mapping);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Processando CSV...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button onClick={onSkip} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
          Pular Mapeamento
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Mapeamento de Colunas CSV</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {columns.length} colunas detectadas • {mapping.length} mapeadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {showPreview ? 'Ocultar' : 'Preview'}
          </button>
          <button
            onClick={saveTemplate}
            disabled={mapping.length === 0}
            className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Salvar Template
          </button>
        </div>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Templates Salvos:</p>
          <div className="flex flex-wrap gap-2">
            {templates.map((t, i) => (
              <button
                key={i}
                onClick={() => loadTemplate(t)}
                className="px-3 py-1 text-xs bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/40"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {showPreview && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-600">
                {columns.map(col => (
                  <th key={col.index} className="text-left p-2 font-medium text-gray-900 dark:text-white">
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(...columns.map(c => c.sample.length)) }).map((_, rowIdx) => (
                <tr key={rowIdx} className="border-b border-gray-200 dark:border-gray-700">
                  {columns.map(col => (
                    <td key={col.index} className="p-2 text-gray-700 dark:text-gray-300">
                      {col.sample[rowIdx] || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mapping Grid */}
      <div className="space-y-3">
        {columns.map(col => {
          const currentMapping = mapping.find(m => m.csvColumn === col.name);
          return (
            <div key={col.index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-4">
                {/* CSV Column */}
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{col.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">
                      {col.detectedType}
                    </span>
                    {col.sample.length > 0 && (
                      <span className="text-xs text-gray-500 truncate max-w-xs">
                        Ex: {col.sample[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />

                {/* Target Field */}
                <div className="flex-1">
                  <select
                    value={currentMapping?.targetField || ''}
                    onChange={(e) => updateMapping(col.name, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Não mapear</option>
                    {TARGET_FIELDS.map(field => (
                      <option key={field.id} value={field.id}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                  {currentMapping && (
                    <p className="text-xs text-gray-500 mt-1">
                      {TARGET_FIELDS.find(f => f.id === currentMapping.targetField)?.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onSkip}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          Pular Mapeamento
        </button>
        <button
          onClick={handleComplete}
          disabled={mapping.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <UploadIcon className="w-4 h-4" />
          Confirmar Mapeamento
        </button>
      </div>
    </div>
  );
}
