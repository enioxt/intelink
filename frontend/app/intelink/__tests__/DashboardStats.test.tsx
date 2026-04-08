import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardStats from '../_components/DashboardStats';
import { intelinkClient } from '@/lib/intelink-client';

// Mock the intelink client
jest.mock('@/lib/intelink-client', () => ({
  intelinkClient: {
    getStats: jest.fn(),
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

describe('DashboardStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('renders loading state initially', () => {
    (intelinkClient.getStats as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<DashboardStats />);
    expect(screen.getAllByText('Loading...')).toHaveLength(3); // 3 stat cards
  });

  it('renders stats successfully', async () => {
    const mockStats = {
      documents: 42,
      entities: 369,
      cross_references: 144,
    };

    (intelinkClient.getStats as jest.Mock).mockResolvedValue(mockStats);

    render(<DashboardStats />);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('369')).toBeInTheDocument();
      expect(screen.getByText('144')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Documents')).toBeInTheDocument();
    expect(screen.getByText('Total Entities')).toBeInTheDocument();
    expect(screen.getByText('Cross-references')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    (intelinkClient.getStats as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<DashboardStats />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('auto-refreshes every 5 seconds', async () => {
    jest.useFakeTimers();

    const mockStats = {
      documents: 10,
      entities: 20,
      cross_references: 30,
    };

    (intelinkClient.getStats as jest.Mock).mockResolvedValue(mockStats);

    render(<DashboardStats />);

    // Initial load
    await waitFor(() => {
      expect(intelinkClient.getStats).toHaveBeenCalledTimes(1);
    });

    // Fast-forward 5 seconds
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(intelinkClient.getStats).toHaveBeenCalledTimes(2);
    });

    // Fast-forward another 5 seconds
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(intelinkClient.getStats).toHaveBeenCalledTimes(3);
    });

    jest.useRealTimers();
  });

  it('uses token from localStorage if available', async () => {
    localStorageMock.setItem('intelink_token', 'test-token-123');

    const mockStats = {
      documents: 1,
      entities: 2,
      cross_references: 3,
    };

    (intelinkClient.getStats as jest.Mock).mockResolvedValue(mockStats);

    render(<DashboardStats />);

    await waitFor(() => {
      expect(intelinkClient.getStats).toHaveBeenCalledWith('test-token-123');
    });
  });

  it('displays Sacred Mathematics correctly', async () => {
    const mockStats = {
      documents: 21, // Fibonacci F8
      entities: 144, // Fibonacci F12
      cross_references: 89, // Fibonacci F11
    };

    (intelinkClient.getStats as jest.Mock).mockResolvedValue(mockStats);

    render(<DashboardStats />);

    await waitFor(() => {
      expect(screen.getByText('21')).toBeInTheDocument(); // F8
      expect(screen.getByText('144')).toBeInTheDocument(); // F12
      expect(screen.getByText('89')).toBeInTheDocument(); // F11
    });
  });

  it('formats large numbers correctly', async () => {
    const mockStats = {
      documents: 1234567,
      entities: 9876543,
      cross_references: 555444,
    };

    (intelinkClient.getStats as jest.Mock).mockResolvedValue(mockStats);

    render(<DashboardStats />);

    await waitFor(() => {
      // Should format with commas or compact notation
      expect(screen.getByText(/1[.,]234[.,]567|1\.2M/)).toBeInTheDocument();
    });
  });
});
