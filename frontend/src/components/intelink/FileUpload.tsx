
import React, { useState, useCallback } from 'react';

const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFileSelect = (selectedFile: File) => {
    if (selectedFile.type === 'application/zip' || selectedFile.type === 'application/x-zip-compressed') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Por favor, selecione um arquivo .zip.");
      setFile(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, []);

  return (
    <div
      className={`relative w-full p-8 border-2 border-dashed rounded-lg transition-colors duration-300 ${isDragging ? 'border-blue-400 bg-gray-800' : 'border-gray-600 hover:border-gray-500'}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-upload"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileChange}
        accept=".zip,application/zip,application/x-zip,application/x-zip-compressed"
      />
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
        <p className="text-lg text-gray-400">
          <label htmlFor="file-upload" className="font-medium text-blue-400 hover:text-blue-300 cursor-pointer">
            Clique para fazer upload
          </label>
          {' '}ou arraste e solte o arquivo .zip
        </p>
        {file && <p className="text-md text-green-400">Arquivo selecionado: {file.name}</p>}
        {error && <p className="text-md text-red-400">{error}</p>}
      </div>
    </div>
  );
};

export default FileUpload;
