import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import UploadPage from '../upload/page';
import { intelinkClient } from '@/lib/intelink-client';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock intelink client
jest.mock('@/lib/intelink-client', () => ({
  intelinkClient: {
    uploadDocument: jest.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('UploadPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('renders upload page', () => {
    render(<UploadPage />);
    expect(screen.getByText(/upload document/i)).toBeInTheDocument();
  });

  it('shows drag and drop area', () => {
    render(<UploadPage />);
    expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
  });

  it('accepts file via input', async () => {
    render(<UploadPage />);
    
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/choose file/i, { selector: 'input' });
    
    await userEvent.upload(input, file);
    
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });

  it('validates file type', async () => {
    render(<UploadPage />);
    
    const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
    const input = screen.getByLabelText(/choose file/i, { selector: 'input' });
    
    await userEvent.upload(input, invalidFile);
    
    expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
  });

  it('validates file size (max 50MB)', async () => {
    render(<UploadPage />);
    
    // Create file larger than 50MB
    const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.pdf', { 
      type: 'application/pdf' 
    });
    const input = screen.getByLabelText(/choose file/i, { selector: 'input' });
    
    await userEvent.upload(input, largeFile);
    
    expect(screen.getByText(/file too large/i)).toBeInTheDocument();
  });

  it('allows multiple files (max 10)', async () => {
    render(<UploadPage />);
    
    const files = Array.from({ length: 10 }, (_, i) => 
      new File(['content'], `file${i}.pdf`, { type: 'application/pdf' })
    );
    
    const input = screen.getByLabelText(/choose file/i, { selector: 'input' });
    await userEvent.upload(input, files);
    
    expect(screen.getAllByText(/file\d+\.pdf/)).toHaveLength(10);
  });

  it('prevents more than 10 files', async () => {
    render(<UploadPage />);
    
    const files = Array.from({ length: 12 }, (_, i) => 
      new File(['content'], `file${i}.pdf`, { type: 'application/pdf' })
    );
    
    const input = screen.getByLabelText(/choose file/i, { selector: 'input' });
    await userEvent.upload(input, files);
    
    expect(screen.getByText(/maximum 10 files/i)).toBeInTheDocument();
  });

  it('requires metadata before upload', async () => {
    render(<UploadPage />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/choose file/i, { selector: 'input' });
    await userEvent.upload(input, file);
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(uploadButton);
    
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it('validates metadata fields', async () => {
    render(<UploadPage />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/choose file/i, { selector: 'input' });
    await userEvent.upload(input, file);
    
    // Try to upload without filling metadata
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(uploadButton);
    
    // Should show validation errors
    expect(screen.getByText(/title.*required/i)).toBeInTheDocument();
  });

  it('fills metadata form', async () => {
    render(<UploadPage />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/choose file/i, { selector: 'input' });
    await userEvent.upload(input, file);
    
    // Fill metadata
    await userEvent.type(screen.getByLabelText(/title/i), 'Test Report');
    await userEvent.type(screen.getByLabelText(/author/i), 'Inspector Silva');
    await userEvent.type(screen.getByLabelText(/case.*id/i), 'PCMG-2025-001');
    await userEvent.type(screen.getByLabelText(/tags/i), 'evidence, urgent');
    
    expect(screen.getByDisplayValue('Test Report')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Inspector Silva')).toBeInTheDocument();
    expect(screen.getByDisplayValue('PCMG-2025-001')).toBeInTheDocument();
  });

  it('uploads file with metadata', async () => {
    (intelinkClient.uploadDocument as jest.Mock).mockResolvedValue({
      document_id: 1,
      job_id: 123,
      status: 'queued',
    });
    
    localStorageMock.setItem('intelink_token', 'test-token');
    
    render(<UploadPage />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/choose file/i, { selector: 'input' });
    await userEvent.upload(input, file);
    
    // Fill metadata
    await userEvent.type(screen.getByLabelText(/title/i), 'Test Report');
    await userEvent.type(screen.getByLabelText(/author/i), 'Inspector Silva');
    
    // Upload
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(intelinkClient.uploadDocument).toHaveBeenCalledWith(
        expect.any(File),
        expect.objectContaining({
          title: 'Test Report',
          author: 'Inspector Silva',
        }),
        'test-token'
      );
    });
  });

  it('shows upload progress', async () => {
    (intelinkClient.uploadDocument as jest.Mock).mockImplementation(
      () => new Promise((resolve) => {
        setTimeout(() => resolve({ document_id: 1, job_id: 123 }), 1000);
      })
    );
    
    render(<UploadPage />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/choose file/i, { selector: 'input' });
    await userEvent.upload(input, file);
    
    await userEvent.type(screen.getByLabelText(/title/i), 'Test');
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(uploadButton);
    
    expect(screen.getByText(/uploading/i)).toBeInTheDocument();
  });

  it('handles upload error', async () => {
    (intelinkClient.uploadDocument as jest.Mock).mockRejectedValue(
      new Error('Upload failed')
    );
    
    render(<UploadPage />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/choose file/i, { selector: 'input' });
    await userEvent.upload(input, file);
    
    await userEvent.type(screen.getByLabelText(/title/i), 'Test');
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
    });
  });

  it('removes file from list', async () => {
    render(<UploadPage />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/choose file/i, { selector: 'input' });
    await userEvent.upload(input, file);
    
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
    
    const removeButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeButton);
    
    expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
  });

  it('parses tags correctly', async () => {
    render(<UploadPage />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/choose file/i, { selector: 'input' });
    await userEvent.upload(input, file);
    
    await userEvent.type(screen.getByLabelText(/tags/i), 'tag1, tag2, tag3');
    
    // Tags should be split by comma
    const tagsInput = screen.getByLabelText(/tags/i) as HTMLInputElement;
    expect(tagsInput.value).toBe('tag1, tag2, tag3');
  });

  it('redirects to jobs page after successful upload', async () => {
    const mockPush = jest.fn();
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      push: mockPush,
      back: jest.fn(),
    });
    
    (intelinkClient.uploadDocument as jest.Mock).mockResolvedValue({
      document_id: 1,
      job_id: 123,
    });
    
    render(<UploadPage />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/choose file/i, { selector: 'input' });
    await userEvent.upload(input, file);
    
    await userEvent.type(screen.getByLabelText(/title/i), 'Test');
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/intelink/jobs?highlight=123');
    });
  });

  it('allows Sacred Mathematics in case ID', async () => {
    render(<UploadPage />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/choose file/i, { selector: 'input' });
    await userEvent.upload(input, file);
    
    // Test with Fibonacci number
    await userEvent.type(screen.getByLabelText(/case.*id/i), 'PCMG-144-2025');
    
    const caseIdInput = screen.getByLabelText(/case.*id/i) as HTMLInputElement;
    expect(caseIdInput.value).toBe('PCMG-144-2025');
  });
});
