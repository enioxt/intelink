'use client';

import { useState } from 'react';
import UploadWizard from '@/components/intelink/UploadWizard';

export default function UploadPage() {
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto py-10 px-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Upload de Documentos</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Envie arquivos (PDF, DOCX, CSV, ZIP, imagens) para ingestão. Eles serão validados e normalizados.
        </p>

        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Abrir Assistente de Upload
          </button>
        )}
      </div>

      {open && (
        <UploadWizard
          onClose={() => setOpen(false)}
          onComplete={() => {
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
