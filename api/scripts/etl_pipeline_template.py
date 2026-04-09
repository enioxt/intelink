#!/usr/bin/env python3
"""
ETL Pipeline Template for EGOS Inteligência
Implements ETL-001: 46 pipelines for external data sources

Sources:
- Base dos Dados (BigQuery)
- Receita Federal (CNPJ, QSA)
- TCU (Portal da Transparência)
- TSE (Eleições, CEPESP)
- ANA (Agência Nacional de Águas)
- INCRA (SIGTAP, SIGMIG)
- ANA (Dados Abertos)
- SICONFI (Tesouro Nacional)
- Compras Governamentais (PNCP)
- Diário Oficial da União

Architecture:
- Extract: API clients with rate limiting and retry logic
- Transform: Data cleaning, normalization, entity extraction
- Load: Neo4j graph database + PostgreSQL relational store
"""

import os
import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, Dict, Any, List, Iterator
from datetime import datetime, timedelta
from pathlib import Path
import hashlib
import requests
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class ETLConfig:
    """Configuration for ETL pipelines"""
    source_name: str
    api_endpoint: str
    api_key: Optional[str] = None
    rate_limit_per_minute: int = 60
    retry_attempts: int = 3
    batch_size: int = 1000
    output_dir: str = "./data/raw"
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"


class DataSourceClient(ABC):
    """Abstract base class for data source clients"""
    
    def __init__(self, config: ETLConfig):
        self.config = config
        self.session = requests.Session()
        self.last_request_time = datetime.min
        
    def _rate_limit(self):
        """Implement rate limiting"""
        min_interval = 60.0 / self.config.rate_limit_per_minute
        elapsed = (datetime.now() - self.last_request_time).total_seconds()
        if elapsed < min_interval:
            import time
            time.sleep(min_interval - elapsed)
        self.last_request_time = datetime.now()
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def _get(self, url: str, params: Dict[str, Any] = None) -> requests.Response:
        """Make GET request with retry logic"""
        self._rate_limit()
        response = self.session.get(url, params=params, timeout=30)
        response.raise_for_status()
        return response
    
    @abstractmethod
    def extract(self, **kwargs) -> Iterator[Dict[str, Any]]:
        """Extract data from source"""
        pass
    
    @abstractmethod
    def transform(self, raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Transform raw data to standardized format"""
        pass


class BaseDosDadosClient(DataSourceClient):
    """Client for Base dos Dados (BigQuery public datasets)"""
    
    DATASETS = {
        'cnpj': 'br_me_cnpj',
        'rais': 'br_me_rais',
        'sicg': 'br_cgu_sigmig',
        'siconfi': 'br_tesouro_siconfi',
    }
    
    def __init__(self, config: ETLConfig):
        super().__init__(config)
        self.base_url = "https://basedosdados.org/api/3/action"
        
    def extract(self, dataset_id: str, table_id: str, **kwargs) -> Iterator[Dict[str, Any]]:
        """Extract data from Base dos Dados CKAN API"""
        url = f"{self.base_url}/datastore_search"
        params = {
            'resource_id': f'{dataset_id}.{table_id}',
            'limit': self.config.batch_size,
        }
        
        offset = 0
        while True:
            params['offset'] = offset
            try:
                response = self._get(url, params)
                data = response.json()
                
                if not data.get('success'):
                    logger.error(f"API error: {data.get('error', 'Unknown error')}")
                    break
                
                records = data['result'].get('records', [])
                if not records:
                    break
                
                for record in records:
                    yield record
                
                offset += len(records)
                logger.info(f"Fetched {offset} records from {dataset_id}.{table_id}")
                
            except Exception as e:
                logger.error(f"Error extracting data: {e}")
                break
    
    def transform(self, raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Transform Base dos Dados record to standardized entity"""
        # Normalize CNPJ data
        if 'cnpj' in raw_data:
            cnpj = str(raw_data['cnpj']).zfill(14)
            return {
                'id': f"cnpj_{cnpj}",
                'type': 'company',
                'cnpj': cnpj,
                'name': raw_data.get('razao_social', ''),
                'trade_name': raw_data.get('nome_fantasia', ''),
                'status': raw_data.get('situacao_cadastral', ''),
                'address': {
                    'street': raw_data.get('logradouro', ''),
                    'number': raw_data.get('numero', ''),
                    'neighborhood': raw_data.get('bairro', ''),
                    'city': raw_data.get('municipio', ''),
                    'state': raw_data.get('uf', ''),
                    'zip': raw_data.get('cep', ''),
                },
                'cnae': raw_data.get('cnae_fiscal_principal', ''),
                'legal_nature': raw_data.get('natureza_juridica', ''),
                'capital': raw_data.get('capital_social', 0),
                'source': 'basedosdados',
                'extracted_at': datetime.now().isoformat(),
            }
        return raw_data


class ReceitaFederalClient(DataSourceClient):
    """Client for Receita Federal CNPJ API (CNPJ.ws or similar)"""
    
    def __init__(self, config: ETLConfig):
        super().__init__(config)
        self.base_url = "https://receitaws.com.br/v1"
        
    def extract(self, cnpj: str, **kwargs) -> Iterator[Dict[str, Any]]:
        """Extract CNPJ data from Receita Federal"""
        clean_cnpj = cnpj.replace('.', '').replace('-', '').replace('/', '')
        url = f"{self.base_url}/cnpj/{clean_cnpj}"
        
        try:
            response = self._get(url)
            data = response.json()
            
            if data.get('status') == 'ERROR':
                logger.error(f"CNPJ {cnpj} not found: {data.get('message', '')}")
                return
            
            yield data
            
        except Exception as e:
            logger.error(f"Error extracting CNPJ {cnpj}: {e}")
    
    def transform(self, raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Transform Receita Federal data to standardized format"""
        return {
            'id': f"cnpj_{raw_data.get('cnpj', '').replace('.', '').replace('-', '').replace('/', '')}",
            'type': 'company',
            'cnpj': raw_data.get('cnpj', ''),
            'name': raw_data.get('nome', ''),
            'trade_name': raw_data.get('fantasia', ''),
            'status': raw_data.get('situacao', ''),
            'address': {
                'street': raw_data.get('logradouro', ''),
                'number': raw_data.get('numero', ''),
                'neighborhood': raw_data.get('bairro', ''),
                'city': raw_data.get('municipio', ''),
                'state': raw_data.get('uf', ''),
                'zip': raw_data.get('cep', ''),
            },
            'phone': raw_data.get('telefone', ''),
            'email': raw_data.get('email', ''),
            'cnae': raw_data.get('atividade_principal', [{}])[0].get('code', ''),
            'cnae_description': raw_data.get('atividade_principal', [{}])[0].get('text', ''),
            'legal_nature': raw_data.get('natureza_juridica', ''),
            'capital': raw_data.get('capital_social', '0'),
            'qsa': raw_data.get('qsa', []),  # Quadro Societário
            'source': 'receitafederal',
            'extracted_at': datetime.now().isoformat(),
        }


class TCUPortalClient(DataSourceClient):
    """Client for TCU Portal da Transparência"""
    
    def __init__(self, config: ETLConfig):
        super().__init__(config)
        self.base_url = "https://portaldatransparencia.gov.br/api-de-dados"
        
    def extract(self, endpoint: str, params: Dict[str, Any], **kwargs) -> Iterator[Dict[str, Any]]:
        """Extract data from TCU Portal API"""
        url = f"{self.base_url}/{endpoint}"
        
        page = 1
        while True:
            params['pagina'] = page
            try:
                response = self._get(url, params)
                data = response.json()
                
                if isinstance(data, list):
                    if not data:
                        break
                    for record in data:
                        yield record
                else:
                    break
                
                page += 1
                logger.info(f"Fetched page {page} from {endpoint}")
                
            except Exception as e:
                logger.error(f"Error extracting data: {e}")
                break
    
    def transform(self, raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Transform TCU data to standardized format"""
        # Handle different TCU endpoints
        if 'nomeOrgaoSuperior' in raw_data:
            # Despesas endpoint
            return {
                'id': f"despesa_{hashlib.md5(str(raw_data).encode()).hexdigest()[:12]}",
                'type': 'expense',
                'orgao_superior': raw_data.get('nomeOrgaoSuperior', ''),
                'orgao': raw_data.get('nomeOrgao', ''),
                'unidade': raw_data.get('nomeUnidadeGestora', ''),
                'categoria': raw_data.get('nomeCategoriaEconomica', ''),
                'grupo': raw_data.get('nomeGrupoDespesa', ''),
                'elemento': raw_data.get('nomeElementoDespesa', ''),
                'valor': raw_data.get('valor', 0),
                'mes': raw_data.get('mes', ''),
                'ano': raw_data.get('ano', ''),
                'source': 'tcu_portal',
                'extracted_at': datetime.now().isoformat(),
            }
        return raw_data


class ETLPipeline:
    """Main ETL pipeline orchestrator"""
    
    def __init__(self, config: ETLConfig, client: DataSourceClient):
        self.config = config
        self.client = client
        self.stats = {
            'extracted': 0,
            'transformed': 0,
            'loaded': 0,
            'errors': 0,
        }
    
    def run(self, **extract_kwargs) -> Dict[str, int]:
        """Run full ETL pipeline"""
        logger.info(f"Starting ETL pipeline for {self.config.source_name}")
        
        # Ensure output directory exists
        Path(self.config.output_dir).mkdir(parents=True, exist_ok=True)
        
        # Extract
        raw_data_list = list(self.client.extract(**extract_kwargs))
        self.stats['extracted'] = len(raw_data_list)
        logger.info(f"Extracted {len(raw_data_list)} records")
        
        # Transform
        transformed_data = []
        for raw_data in raw_data_list:
            try:
                transformed = self.client.transform(raw_data)
                if transformed:
                    transformed_data.append(transformed)
            except Exception as e:
                logger.error(f"Transform error: {e}")
                self.stats['errors'] += 1
        
        self.stats['transformed'] = len(transformed_data)
        logger.info(f"Transformed {len(transformed_data)} records")
        
        # Save to JSON (Load phase placeholder)
        output_file = Path(self.config.output_dir) / f"{self.config.source_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(transformed_data, f, ensure_ascii=False, indent=2)
        
        self.stats['loaded'] = len(transformed_data)
        logger.info(f"Saved to {output_file}")
        
        # TODO: Load to Neo4j and PostgreSQL
        # self._load_to_neo4j(transformed_data)
        # self._load_to_postgres(transformed_data)
        
        return self.stats
    
    def _load_to_neo4j(self, data: List[Dict[str, Any]]):
        """Load data to Neo4j graph database"""
        from neo4j import GraphDatabase
        
        driver = GraphDatabase.driver(
            self.config.neo4j_uri,
            auth=(self.config.neo4j_user, self.config.neo4j_password)
        )
        
        with driver.session() as session:
            for record in data:
                if record.get('type') == 'company':
                    session.run("""
                        MERGE (c:Company {cnpj: $cnpj})
                        SET c.name = $name,
                            c.trade_name = $trade_name,
                            c.status = $status,
                            c.source = $source,
                            c.updated_at = datetime()
                        MERGE (a:Address {zip: $zip})
                        SET a.street = $street,
                            a.city = $city,
                            a.state = $state
                        MERGE (c)-[:LOCATED_AT]->(a)
                    """, {
                        'cnpj': record.get('cnpj'),
                        'name': record.get('name'),
                        'trade_name': record.get('trade_name'),
                        'status': record.get('status'),
                        'source': record.get('source'),
                        'zip': record.get('address', {}).get('zip'),
                        'street': record.get('address', {}).get('street'),
                        'city': record.get('address', {}).get('city'),
                        'state': record.get('address', {}).get('state'),
                    })
        
        driver.close()
        logger.info(f"Loaded {len(data)} records to Neo4j")


# Pipeline registry
PIPELINES = {
    'basedosdados_cnpj': {
        'config': ETLConfig(
            source_name='basedosdados_cnpj',
            api_endpoint='https://basedosdados.org/api/3/action',
            rate_limit_per_minute=100,
        ),
        'client_class': BaseDosDadosClient,
        'extract_params': {'dataset_id': 'br_me_cnpj', 'table_id': 'empresas'},
    },
    'receitafederal_cnpj': {
        'config': ETLConfig(
            source_name='receitafederal_cnpj',
            api_endpoint='https://receitaws.com.br/v1',
            rate_limit_per_minute=3,  # Very limited
        ),
        'client_class': ReceitaFederalClient,
        'extract_params': {'cnpj': '00000000000191'},  # Example
    },
    'tcu_despesas': {
        'config': ETLConfig(
            source_name='tcu_despesas',
            api_endpoint='https://portaldatransparencia.gov.br/api-de-dados',
            rate_limit_per_minute=60,
        ),
        'client_class': TCUPortalClient,
        'extract_params': {
            'endpoint': 'despesas/por-orgao',
            'params': {'ano': '2024', 'mes': '01'}
        },
    },
}


def run_pipeline(pipeline_name: str):
    """Run a specific pipeline by name"""
    if pipeline_name not in PIPELINES:
        raise ValueError(f"Unknown pipeline: {pipeline_name}")
    
    spec = PIPELINES[pipeline_name]
    client = spec['client_class'](spec['config'])
    pipeline = ETLPipeline(spec['config'], client)
    
    stats = pipeline.run(**spec['extract_params'])
    print(f"\nPipeline {pipeline_name} completed:")
    print(f"  Extracted: {stats['extracted']}")
    print(f"  Transformed: {stats['transformed']}")
    print(f"  Loaded: {stats['loaded']}")
    print(f"  Errors: {stats['errors']}")


def run_all_pipelines():
    """Run all registered pipelines"""
    for name in PIPELINES:
        try:
            run_pipeline(name)
        except Exception as e:
            logger.error(f"Pipeline {name} failed: {e}")


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        pipeline_name = sys.argv[1]
        if pipeline_name == 'all':
            run_all_pipelines()
        else:
            run_pipeline(pipeline_name)
    else:
        print("Usage: python etl_pipeline_template.py <pipeline_name|all>")
        print("\nAvailable pipelines:")
        for name in PIPELINES:
            print(f"  - {name}")
