"""
Unit tests for AgentContextProvider
Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)

Tests context loading, search, analysis, and prompt generation.
"""

import pytest
from unittest.mock import patch, mock_open, MagicMock
import json
from pathlib import Path

from app.intelink.agent_context import AgentContextProvider


@pytest.fixture
def mock_data_files():
    """Mock synthetic data files."""
    return {
        'investigacoes.json': json.dumps([
            {"id": "inv-001", "title": "Operação Alpha", "status": "active"},
            {"id": "inv-002", "title": "Operação Beta", "status": "closed"}
        ]),
        'documents.json': json.dumps([
            {"id": "doc-001", "investigation_id": "inv-001", "title": "BO #123"},
            {"id": "doc-002", "investigation_id": "inv-001", "title": "Perícia"},
            {"id": "doc-003", "investigation_id": "inv-002", "title": "Relatório"}
        ]),
        'entidades.json': json.dumps([
            {"id": "ent-001", "type": "person", "name": "João Silva", "investigation_id": "inv-001"},
            {"id": "ent-002", "type": "person", "name": "Maria Santos", "investigation_id": "inv-001"},
            {"id": "ent-003", "type": "organization", "name": "Empresa X", "investigation_id": "inv-002"}
        ]),
        'links_sugeridos.json': json.dumps([
            {"id": "link-001", "type": "phone_number_match", "doc_a": "doc-001", "doc_b": "doc-002", "confidence": 0.9},
            {"id": "link-002", "type": "address_similarity", "doc_a": "doc-002", "doc_b": "doc-003", "confidence": 0.7}
        ]),
        'comunicacoes_delegacias.json': json.dumps([
            {"id": "comm-001", "from_delegacia": "1-DP", "to_delegacia": "2-DP"}
        ]),
        'delegacias.json': json.dumps([
            {"id": "1-DP", "name": "1ª Delegacia"},
            {"id": "2-DP", "name": "2ª Delegacia"}
        ])
    }


def test_context_provider_loads_data_successfully(mock_data_files):
    """Test that AgentContextProvider loads all synthetic data files."""
    
    def mock_open_factory(files_dict):
        def mock_open_side_effect(path, *args, **kwargs):
            path_str = str(path)
            for filename, content in files_dict.items():
                if filename in path_str:
                    return mock_open(read_data=content).return_value
            raise FileNotFoundError(f"Mock file not found: {path}")
        return mock_open_side_effect
    
    with patch('builtins.open', side_effect=mock_open_factory(mock_data_files)):
        provider = AgentContextProvider()
        
        assert provider.data_loaded is True
        assert len(provider.investigations) == 2
        assert len(provider.documents) == 3
        assert len(provider.entities) == 3
        assert len(provider.links) == 2
        assert len(provider.comms) == 1
        assert len(provider.delegacias) == 2


def test_context_provider_handles_missing_files():
    """Test graceful handling of missing data files."""
    
    with patch('builtins.open', side_effect=FileNotFoundError("File not found")):
        provider = AgentContextProvider()
        
        assert provider.data_loaded is False
        assert len(provider.investigations) == 0


def test_get_full_context(mock_data_files):
    """Test get_full_context returns complete aggregated data."""
    
    def mock_open_factory(files_dict):
        def mock_open_side_effect(path, *args, **kwargs):
            path_str = str(path)
            for filename, content in files_dict.items():
                if filename in path_str:
                    return mock_open(read_data=content).return_value
            raise FileNotFoundError(f"Mock file not found: {path}")
        return mock_open_side_effect
    
    with patch('builtins.open', side_effect=mock_open_factory(mock_data_files)):
        provider = AgentContextProvider()
        context = provider.get_full_context()
        
        assert 'statistics' in context
        assert context['statistics']['total_investigations'] == 2
        assert context['statistics']['total_documents'] == 3
        assert context['statistics']['total_entities'] == 3
        assert context['statistics']['total_links'] == 2
        
        assert len(context['investigations']) == 2
        assert len(context['documents']) == 3  # All 3 (since < 100 limit)
        assert len(context['entities']) == 3
        assert len(context['links']) == 2  # All 2 (since < 200 limit)


def test_get_full_context_limits_documents_and_links(mock_data_files):
    """Test that get_full_context limits documents to 100 and links to 200."""
    
    # Create data with more than limits
    large_docs = [{"id": f"doc-{i:03d}", "investigation_id": "inv-001"} for i in range(150)]
    large_links = [{"id": f"link-{i:03d}", "type": "test", "confidence": 0.5} for i in range(250)]
    
    mock_data_files['documents.json'] = json.dumps(large_docs)
    mock_data_files['links_sugeridos.json'] = json.dumps(large_links)
    
    def mock_open_factory(files_dict):
        def mock_open_side_effect(path, *args, **kwargs):
            path_str = str(path)
            for filename, content in files_dict.items():
                if filename in path_str:
                    return mock_open(read_data=content).return_value
            raise FileNotFoundError(f"Mock file not found: {path}")
        return mock_open_side_effect
    
    with patch('builtins.open', side_effect=mock_open_factory(mock_data_files)):
        provider = AgentContextProvider()
        context = provider.get_full_context()
        
        assert len(context['documents']) == 100  # Limited to 100
        assert len(context['links']) == 200  # Limited to 200


def test_get_investigation_context_found(mock_data_files):
    """Test get_investigation_context returns specific investigation data."""
    
    def mock_open_factory(files_dict):
        def mock_open_side_effect(path, *args, **kwargs):
            path_str = str(path)
            for filename, content in files_dict.items():
                if filename in path_str:
                    return mock_open(read_data=content).return_value
            raise FileNotFoundError(f"Mock file not found: {path}")
        return mock_open_side_effect
    
    with patch('builtins.open', side_effect=mock_open_factory(mock_data_files)):
        provider = AgentContextProvider()
        context = provider.get_investigation_context("inv-001")
        
        assert 'investigation' in context
        assert context['investigation']['id'] == "inv-001"
        assert context['investigation']['title'] == "Operação Alpha"
        
        # Should have docs from inv-001
        assert len(context['documents']) == 2  # doc-001, doc-002
        
        # Should have entities from inv-001
        assert len(context['entities']) == 2  # ent-001, ent-002
        
        # Should have links involving doc-001 or doc-002
        assert len(context['links']) >= 1


def test_get_investigation_context_not_found(mock_data_files):
    """Test get_investigation_context with invalid ID."""
    
    def mock_open_factory(files_dict):
        def mock_open_side_effect(path, *args, **kwargs):
            path_str = str(path)
            for filename, content in files_dict.items():
                if filename in path_str:
                    return mock_open(read_data=content).return_value
            raise FileNotFoundError(f"Mock file not found: {path}")
        return mock_open_side_effect
    
    with patch('builtins.open', side_effect=mock_open_factory(mock_data_files)):
        provider = AgentContextProvider()
        context = provider.get_investigation_context("inv-nonexistent")
        
        assert 'error' in context
        assert context['error'] == 'investigation_not_found'


def test_get_investigation_context_filters_correctly(mock_data_files):
    """Test that investigation context only includes relevant documents and entities."""
    
    def mock_open_factory(files_dict):
        def mock_open_side_effect(path, *args, **kwargs):
            path_str = str(path)
            for filename, content in files_dict.items():
                if filename in path_str:
                    return mock_open(read_data=content).return_value
            raise FileNotFoundError(f"Mock file not found: {path}")
        return mock_open_side_effect
    
    with patch('builtins.open', side_effect=mock_open_factory(mock_data_files)):
        provider = AgentContextProvider()
        context = provider.get_investigation_context("inv-002")
        
        # Should only have doc-003
        assert len(context['documents']) == 1
        assert context['documents'][0]['id'] == "doc-003"
        
        # Should only have ent-003
        assert len(context['entities']) == 1
        assert context['entities'][0]['id'] == "ent-003"
        
        # Should only have links involving doc-003
        for link in context['links']:
            assert 'doc-003' in [link.get('doc_a'), link.get('doc_b')]


def test_get_investigation_context_links_relationship(mock_data_files):
    """Test that links are filtered by document relationships."""
    
    # Add more links with specific doc relationships
    links_data = [
        {"id": "link-001", "doc_a": "doc-001", "doc_b": "doc-002", "type": "test"},  # Both in inv-001
        {"id": "link-002", "doc_a": "doc-001", "doc_b": "doc-003", "type": "test"},  # Spans investigations
        {"id": "link-003", "doc_a": "doc-003", "doc_b": "doc-004", "type": "test"},  # Only one in inv-002
    ]
    mock_data_files['links_sugeridos.json'] = json.dumps(links_data)
    
    def mock_open_factory(files_dict):
        def mock_open_side_effect(path, *args, **kwargs):
            path_str = str(path)
            for filename, content in files_dict.items():
                if filename in path_str:
                    return mock_open(read_data=content).return_value
            raise FileNotFoundError(f"Mock file not found: {path}")
        return mock_open_side_effect
    
    with patch('builtins.open', side_effect=mock_open_factory(mock_data_files)):
        provider = AgentContextProvider()
        context = provider.get_investigation_context("inv-001")
        
        # Should include link-001 (both docs in inv-001) and link-002 (doc-001 in inv-001)
        link_ids = [l['id'] for l in context['links']]
        assert 'link-001' in link_ids
        assert 'link-002' in link_ids
        assert 'link-003' not in link_ids  # Neither doc is from inv-001


def test_context_provider_empty_data():
    """Test context provider with empty data files."""
    
    empty_data = {
        'investigacoes.json': json.dumps([]),
        'documents.json': json.dumps([]),
        'entidades.json': json.dumps([]),
        'links_sugeridos.json': json.dumps([]),
        'comunicacoes_delegacias.json': json.dumps([]),
        'delegacias.json': json.dumps([])
    }
    
    def mock_open_factory(files_dict):
        def mock_open_side_effect(path, *args, **kwargs):
            path_str = str(path)
            for filename, content in files_dict.items():
                if filename in path_str:
                    return mock_open(read_data=content).return_value
            raise FileNotFoundError(f"Mock file not found: {path}")
        return mock_open_side_effect
    
    with patch('builtins.open', side_effect=mock_open_factory(empty_data)):
        provider = AgentContextProvider()
        
        assert provider.data_loaded is True
        context = provider.get_full_context()
        
        assert context['statistics']['total_investigations'] == 0
        assert len(context['investigations']) == 0


def test_context_provider_data_loaded_false_returns_error():
    """Test that get_full_context returns error when data not loaded."""
    
    with patch('builtins.open', side_effect=FileNotFoundError):
        provider = AgentContextProvider()
        
        context = provider.get_full_context()
        
        assert 'error' in context
        assert context['error'] == 'context_not_available'


# Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
