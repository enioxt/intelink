import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import SearchAutocomplete from '../_components/SearchAutocomplete';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('SearchAutocomplete', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('renders search input', () => {
    render(<SearchAutocomplete onSelect={mockOnSelect} />);
    expect(screen.getByPlaceholderText(/search documents/i)).toBeInTheDocument();
  });

  it('shows custom placeholder', () => {
    render(<SearchAutocomplete onSelect={mockOnSelect} placeholder="Find cases..." />);
    expect(screen.getByPlaceholderText('Find cases...')).toBeInTheDocument();
  });

  it('updates input value on typing', async () => {
    render(<SearchAutocomplete onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText(/search documents/i);
    
    await userEvent.type(input, 'homicídio');
    expect(input).toHaveValue('homicídio');
  });

  it('shows clear button when input has value', async () => {
    render(<SearchAutocomplete onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText(/search documents/i);
    
    await userEvent.type(input, 'test');
    
    const clearButton = screen.getByRole('button', { name: '' }); // X button
    expect(clearButton).toBeInTheDocument();
  });

  it('clears input when clear button clicked', async () => {
    render(<SearchAutocomplete onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText(/search documents/i) as HTMLInputElement;
    
    await userEvent.type(input, 'test query');
    expect(input.value).toBe('test query');
    
    const clearButton = screen.getByRole('button', { name: '' });
    await userEvent.click(clearButton);
    
    expect(input.value).toBe('');
  });

  it('shows suggestions after typing 2+ characters', async () => {
    render(<SearchAutocomplete onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText(/search documents/i);
    
    await userEvent.type(input, 'ho');
    
    await waitFor(() => {
      expect(screen.getByText(/homicídio/i)).toBeInTheDocument();
    });
  });

  it('does not show suggestions for single character', async () => {
    render(<SearchAutocomplete onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText(/search documents/i);
    
    await userEvent.type(input, 'h');
    
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('navigates suggestions with arrow keys', async () => {
    render(<SearchAutocomplete onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText(/search documents/i);
    
    await userEvent.type(input, 'test');
    
    await waitFor(() => {
      expect(screen.getByText(/test/i)).toBeInTheDocument();
    });
    
    // Arrow down
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    
    // First suggestion should be highlighted
    const suggestions = screen.getAllByRole('button');
    expect(suggestions[0]).toHaveClass('bg-blue-50');
  });

  it('selects suggestion with Enter key', async () => {
    render(<SearchAutocomplete onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText(/search documents/i);
    
    await userEvent.type(input, 'homicídio');
    
    await waitFor(() => {
      expect(screen.getByText(/homicídio em Belo Horizonte/i)).toBeInTheDocument();
    });
    
    // Select first suggestion with arrow + enter
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    await waitFor(() => {
      expect(mockOnSelect).toHaveBeenCalledWith(expect.stringContaining('homicídio'));
    });
  });

  it('selects suggestion on click', async () => {
    render(<SearchAutocomplete onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText(/search documents/i);
    
    await userEvent.type(input, 'test');
    
    await waitFor(() => {
      const suggestion = screen.getByText(/test em Minas Gerais/i);
      expect(suggestion).toBeInTheDocument();
    });
    
    const suggestion = screen.getByText(/test em Minas Gerais/i);
    await userEvent.click(suggestion);
    
    expect(mockOnSelect).toHaveBeenCalledWith('test em Minas Gerais');
  });

  it('saves search to history', async () => {
    render(<SearchAutocomplete onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText(/search documents/i);
    
    await userEvent.type(input, 'my search query{Enter}');
    
    const history = JSON.parse(localStorageMock.getItem('intelink_search_history') || '[]');
    expect(history).toContain('my search query');
  });

  it('displays search history', async () => {
    // Pre-populate history
    localStorageMock.setItem(
      'intelink_search_history',
      JSON.stringify(['previous search 1', 'previous search 2'])
    );
    
    render(<SearchAutocomplete onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText(/search documents/i);
    
    // Focus input to show suggestions
    fireEvent.focus(input);
    
    await waitFor(() => {
      expect(screen.getByText('previous search 1')).toBeInTheDocument();
      expect(screen.getByText('previous search 2')).toBeInTheDocument();
    });
  });

  it('filters history by current query', async () => {
    localStorageMock.setItem(
      'intelink_search_history',
      JSON.stringify(['homicídio case', 'robbery case', 'homicídio investigation'])
    );
    
    render(<SearchAutocomplete onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText(/search documents/i);
    
    await userEvent.type(input, 'homicídio');
    
    await waitFor(() => {
      expect(screen.getByText('homicídio case')).toBeInTheDocument();
      expect(screen.getByText('homicídio investigation')).toBeInTheDocument();
      expect(screen.queryByText('robbery case')).not.toBeInTheDocument();
    });
  });

  it('clears search history', async () => {
    localStorageMock.setItem(
      'intelink_search_history',
      JSON.stringify(['search 1', 'search 2'])
    );
    
    render(<SearchAutocomplete onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText(/search documents/i);
    
    fireEvent.focus(input);
    
    await waitFor(() => {
      expect(screen.getByText(/clear search history/i)).toBeInTheDocument();
    });
    
    const clearButton = screen.getByText(/clear search history/i);
    await userEvent.click(clearButton);
    
    expect(localStorageMock.getItem('intelink_search_history')).toBeNull();
  });

  it('closes suggestions on Escape key', async () => {
    render(<SearchAutocomplete onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText(/search documents/i);
    
    await userEvent.type(input, 'test');
    
    await waitFor(() => {
      expect(screen.getByText(/test/i)).toBeInTheDocument();
    });
    
    fireEvent.keyDown(input, { key: 'Escape' });
    
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('closes suggestions on click outside', async () => {
    render(
      <div>
        <SearchAutocomplete onSelect={mockOnSelect} />
        <button>Outside button</button>
      </div>
    );
    
    const input = screen.getByPlaceholderText(/search documents/i);
    await userEvent.type(input, 'test');
    
    await waitFor(() => {
      expect(screen.getByText(/test/i)).toBeInTheDocument();
    });
    
    const outsideButton = screen.getByText('Outside button');
    await userEvent.click(outsideButton);
    
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('limits history to 10 items', async () => {
    render(<SearchAutocomplete onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText(/search documents/i);
    
    // Add 12 searches
    for (let i = 1; i <= 12; i++) {
      await userEvent.clear(input);
      await userEvent.type(input, `search ${i}{Enter}`);
    }
    
    const history = JSON.parse(localStorageMock.getItem('intelink_search_history') || '[]');
    expect(history.length).toBe(10);
    expect(history[0]).toBe('search 12'); // Most recent first
    expect(history[9]).toBe('search 3'); // Oldest kept (11 and 12 were added, 1 and 2 removed)
  });
});
