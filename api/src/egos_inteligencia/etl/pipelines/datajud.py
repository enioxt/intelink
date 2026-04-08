"""
DataJud Pipeline — CNJ (Conselho Nacional de Justiça)
Processos judiciais — metadados públicos

Sacred Code: 000.111.369.963.1618
"""

from __future__ import annotations

import logging
from typing import Any

import requests

logger = logging.getLogger(__name__)


class DataJudPipeline:
    """
    Pipeline ETL para DataJud — metadados processuais.
    
    API Pública: https://www.cnj.jus.br/sistemas/datajud/api-publica/
    
    Limitações:
    - Dados agregados (não individualizados em massa)
    - Alguns tribunais com coverage parcial
    - Necessita credenciais para API completa
    """
    
    source_id = "datajud"
    source_name = "DataJud CNJ — Processos Judiciais"
    source_url = "https://www.cnj.jus.br/sistemas/datajud/"
    api_endpoint = "https://api-publica.datajud.cnj.jus.br"
    
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key
        self.session = requests.Session()
        
        if api_key:
            self.session.headers.update({
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json"
            })
    
    def extract_process(
        self,
        process_number: str,
    ) -> dict[str, Any] | None:
        """
        Extrai metadados de um processo específico.
        
        Args:
            process_number: Número CNJ do processo
        
        Returns:
            Dados do processo ou None se não encontrado
        """
        endpoint = f"{self.api_endpoint}/processos/{process_number}"
        
        try:
            resp = self.session.get(endpoint, timeout=30)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as e:
            logger.error(f"Erro ao extrair processo {process_number}: {e}")
            return None
    
    def extract_by_cpf_cnpj(
        self,
        document: str,
        role: str | None = None,  # autor, reu, testemunha
    ) -> list[dict[str, Any]]:
        """
        Busca processos por CPF/CNPJ.
        
        ⚠️ API pública pode ter limitações de busca por documento.
        """
        endpoint = f"{self.api_endpoint}/busca"
        
        params: dict[str, Any] = {
            "documento": document.replace(".", "").replace("-", "").replace("/", ""),
        }
        if role:
            params["polo"] = role
        
        try:
            resp = self.session.get(
                endpoint,
                params=params,
                timeout=30
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("processos", [])
        except requests.RequestException as e:
            logger.error(f"Erro na busca por documento {document}: {e}")
            return []
    
    def extract_classifications(self) -> list[dict[str, Any]]:
        """
        Extrai classificação CNJ de assuntos processuais.
        
        Útil para enriquecer dados de investigação.
        """
        endpoint = f"{self.api_endpoint}/classificacoes"
        
        try:
            resp = self.session.get(endpoint, timeout=30)
            resp.raise_for_status()
            return resp.json().get("classificacoes", [])
        except requests.RequestException as e:
            logger.warning(f"Erro ao extrair classificações: {e}")
            return []
    
    def transform(self, raw_process: dict[str, Any]) -> dict[str, Any] | None:
        """
        Normaliza processo para schema Intelink.
        """
        try:
            numero = raw_process.get("numeroProcesso")
            if not numero:
                return None
            
            return {
                "element_id": f"datajud:{numero}",
                "numero_processo": numero,
                "tipo": raw_process.get("classe", {}).get("descricao"),
                "tipo_codigo": raw_process.get("classe", {}).get("codigo"),
                "assunto_principal": raw_process.get("assuntos", [{}])[0].get("descricao"),
                "assunto_codigo": raw_process.get("assuntos", [{}])[0].get("codigo"),
                "orgao_julgador": raw_process.get("orgaoJulgador", {}).get("nome"),
                "tribunal": raw_process.get("siglaTribunal"),
                "grau": raw_process.get("grau"),  # 1ª instância, etc.
                "data_ajuizamento": raw_process.get("dataAjuizamento"),
                "situacao": raw_process.get("situacao"),
                "fonte": "DataJud/CNJ",
                "url": f"https://pje-consulta-publica.tjmg.jus.br/pje/ConsultaPublica/listView.seam?numeroProcesso={numero}",
            }
        except Exception as e:
            logger.warning(f"Erro transformando processo: {e}")
            return None
    
    async def load(
        self,
        neo4j_session,
        records: list[dict[str, Any]],
    ) -> dict[str, int]:
        """
        Carrega processos no Neo4j.
        
        Schema:
        - (:ProcessoJudicial) — nó principal
        - (:Organization {type: 'Court'}) — órgão julgador
        """
        stats = {"processos": 0}
        
        cypher = """
        UNWIND $records as r
        
        MERGE (p:ProcessoJudicial {element_id: r.element_id})
        SET p.numero_processo = r.numero_processo,
            p.tipo = r.tipo,
            p.tipo_codigo = r.tipo_codigo,
            p.assunto_principal = r.assunto_principal,
            p.assunto_codigo = r.assunto_codigo,
            p.grau = r.grau,
            p.data_ajuizamento = date(r.data_ajuizamento),
            p.situacao = r.situacao,
            p.fonte = r.fonte,
            p.url = r.url,
            p.updated_at = datetime()
        
        WITH p, r
        WHERE r.orgao_julgador IS NOT NULL
        MERGE (o:Organization {name: r.orgao_julgador})
        SET o.type = 'Court',
            o.tribunal = r.tribunal,
            o.updated_at = datetime()
        MERGE (p)-[:JULGADO_POR]->(o)
        
        RETURN count(p) as processos
        """
        
        try:
            result = await neo4j_session.run(cypher, {"records": records})
            summary = await result.consume()
            stats["processos"] = summary.counters.nodes_created
            
        except Exception as e:
            logger.error(f"Erro na carga Neo4j: {e}")
            raise
        
        return stats
