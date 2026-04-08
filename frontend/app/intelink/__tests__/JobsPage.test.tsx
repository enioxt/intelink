import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import JobsPage from '../jobs/page';
import { intelinkClient } from '@/lib/intelink-client';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Mock intelink client
jest.mock('@/lib/intelink-client', () => ({
  intelinkClient: {
    listJobs: jest.fn(),
    requeueJob: jest.fn(),
    cancelJob: jest.fn(),
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

describe('JobsPage', () => {
  const mockJobs = {
    items: [
      {
        id: 1,
        type: 'extract_entities',
        status: 'pending',
        progress: 0,
        document_id: 10,
        created_at: '2025-10-13T15:00:00Z',
        updated_at: '2025-10-13T15:00:00Z',
      },
      {
        id: 2,
        type: 'extract_entities',
        status: 'running',
        progress: 45,
        document_id: 11,
        created_at: '2025-10-13T14:50:00Z',
        updated_at: '2025-10-13T15:05:00Z',
      },
      {
        id: 3,
        type: 'extract_entities',
        status: 'completed',
        progress: 100,
        document_id: 12,
        created_at: '2025-10-13T14:00:00Z',
        updated_at: '2025-10-13T14:10:00Z',
      },
      {
        id: 4,
        type: 'extract_entities',
        status: 'failed',
        progress: 0,
        document_id: 13,
        error: 'Extraction failed',
        created_at: '2025-10-13T13:00:00Z',
        updated_at: '2025-10-13T13:05:00Z',
      },
    ],
    total: 4,
    page: 1,
    page_size: 21,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders jobs page', async () => {
    (intelinkClient.listJobs as jest.Mock).mockResolvedValue(mockJobs);
    
    render(<JobsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/jobs monitoring/i)).toBeInTheDocument();
    });
  });

  it('loads and displays jobs', async () => {
    (intelinkClient.listJobs as jest.Mock).mockResolvedValue(mockJobs);
    
    render(<JobsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/extract_entities/i)).toBeInTheDocument();
      expect(screen.getAllByText(/extract_entities/i)).toHaveLength(4);
    });
  });

  it('shows job status badges', async () => {
    (intelinkClient.listJobs as jest.Mock).mockResolvedValue(mockJobs);
    
    render(<JobsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('running')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
    });
  });

  it('displays progress bars for running jobs', async () => {
    (intelinkClient.listJobs as jest.Mock).mockResolvedValue(mockJobs);
    
    render(<JobsPage />);
    
    await waitFor(() => {
      // Running job should show progress
      expect(screen.getByText('45%')).toBeInTheDocument();
    });
  });

  it('auto-refreshes every 5 seconds', async () => {
    (intelinkClient.listJobs as jest.Mock).mockResolvedValue(mockJobs);
    
    render(<JobsPage />);
    
    // Initial load
    await waitFor(() => {
      expect(intelinkClient.listJobs).toHaveBeenCalledTimes(1);
    });
    
    // Fast-forward 5 seconds
    jest.advanceTimersByTime(5000);
    
    await waitFor(() => {
      expect(intelinkClient.listJobs).toHaveBeenCalledTimes(2);
    });
    
    // Fast-forward another 5 seconds
    jest.advanceTimersByTime(5000);
    
    await waitFor(() => {
      expect(intelinkClient.listJobs).toHaveBeenCalledTimes(3);
    });
  });

  it('shows loading state initially', () => {
    (intelinkClient.listJobs as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    
    render(<JobsPage />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('handles API errors', async () => {
    (intelinkClient.listJobs as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );
    
    render(<JobsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('allows requeue for failed jobs', async () => {
    (intelinkClient.listJobs as jest.Mock).mockResolvedValue(mockJobs);
    (intelinkClient.requeueJob as jest.Mock).mockResolvedValue({ success: true });
    
    render(<JobsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('failed')).toBeInTheDocument();
    });
    
    const requeueButton = screen.getByRole('button', { name: /requeue/i });
    await userEvent.click(requeueButton);
    
    await waitFor(() => {
      expect(intelinkClient.requeueJob).toHaveBeenCalledWith(4, expect.anything());
    });
  });

  it('allows cancel for running jobs', async () => {
    (intelinkClient.listJobs as jest.Mock).mockResolvedValue(mockJobs);
    (intelinkClient.cancelJob as jest.Mock).mockResolvedValue({ success: true });
    
    render(<JobsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('running')).toBeInTheDocument();
    });
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(intelinkClient.cancelJob).toHaveBeenCalledWith(2, expect.anything());
    });
  });

  it('filters jobs by status', async () => {
    (intelinkClient.listJobs as jest.Mock).mockResolvedValue(mockJobs);
    
    render(<JobsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/all jobs/i)).toBeInTheDocument();
    });
    
    const statusFilter = screen.getByRole('combobox', { name: /status/i });
    await userEvent.selectOptions(statusFilter, 'running');
    
    await waitFor(() => {
      expect(intelinkClient.listJobs).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'running' }),
        expect.anything()
      );
    });
  });

  it('paginates results', async () => {
    (intelinkClient.listJobs as jest.Mock).mockResolvedValue(mockJobs);
    
    render(<JobsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/page 1/i)).toBeInTheDocument();
    });
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    await userEvent.click(nextButton);
    
    await waitFor(() => {
      expect(intelinkClient.listJobs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
        expect.anything()
      );
    });
  });

  it('uses Fibonacci page size (21)', async () => {
    (intelinkClient.listJobs as jest.Mock).mockResolvedValue(mockJobs);
    
    render(<JobsPage />);
    
    await waitFor(() => {
      expect(intelinkClient.listJobs).toHaveBeenCalledWith(
        expect.objectContaining({ page_size: 21 }),
        expect.anything()
      );
    });
  });

  it('highlights job from URL query', async () => {
    const mockGet = jest.fn().mockReturnValue('123');
    jest.spyOn(require('next/navigation'), 'useSearchParams').mockReturnValue({
      get: mockGet,
    });
    
    (intelinkClient.listJobs as jest.Mock).mockResolvedValue(mockJobs);
    
    render(<JobsPage />);
    
    expect(mockGet).toHaveBeenCalledWith('highlight');
  });

  it('shows job detail on click', async () => {
    (intelinkClient.listJobs as jest.Mock).mockResolvedValue(mockJobs);
    
    render(<JobsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('pending')).toBeInTheDocument();
    });
    
    const jobRow = screen.getByText('pending').closest('tr');
    if (jobRow) {
      await userEvent.click(jobRow);
      
      // Should show detail panel or modal
      expect(screen.getByText(/job.*detail/i)).toBeInTheDocument();
    }
  });

  it('displays error message for failed jobs', async () => {
    (intelinkClient.listJobs as jest.Mock).mockResolvedValue(mockJobs);
    
    render(<JobsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Extraction failed')).toBeInTheDocument();
    });
  });

  it('shows document ID link', async () => {
    (intelinkClient.listJobs as jest.Mock).mockResolvedValue(mockJobs);
    
    render(<JobsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/document.*10/i)).toBeInTheDocument();
    });
  });

  it('formats timestamps correctly', async () => {
    (intelinkClient.listJobs as jest.Mock).mockResolvedValue(mockJobs);
    
    render(<JobsPage />);
    
    await waitFor(() => {
      // Should format ISO timestamps to readable format
      expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
    });
  });

  it('uses token from localStorage', async () => {
    localStorageMock.setItem('intelink_token', 'test-token-123');
    (intelinkClient.listJobs as jest.Mock).mockResolvedValue(mockJobs);
    
    render(<JobsPage />);
    
    await waitFor(() => {
      expect(intelinkClient.listJobs).toHaveBeenCalledWith(
        expect.anything(),
        'test-token-123'
      );
    });
  });
});
