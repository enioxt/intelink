"""
BNMP Pipeline — Banco Nacional de Monitoramento de Prisões
ETL para mandados de prisão do CNJ

Sacred Code: 000.111.369.963.1618
"""

from __future__ import annotations

import logging
from typing import Any

import requests
from neo4j import AsyncSession

from bracc.services.benford_analyzer import to_dict  # Reusable util

logger = logging.getLogger(__name__)


class BNMPPipeline:
    """
    Pipeline ETL para extrair mandados de prisão da API pública do CNJ.
    
    Documentação: https://www.cnj.jus.br/sistemas/datajud/api-publica/
    Endpoint: https://api-publica.datajud.cnj.jus.br/bnmp
    
    Limitações:
    - API pública tem rate limiting (recomendado: 1 req/segundo)
    - Dados agregados — não inclui detalhes sigilosos
    - Alguns campos podem estar nulos (CPF não sempre disponível)
    """
    
    source_id = "bnmp"
    source_name = "Banco Nacional de Monitoramento de Prisões"
    source_url = "https://portalbnmp.cnj.jus.br/"
    api_endpoint = "https://api-publica.datajud.cnj.jus.br/bnmp"
    
    def __init__(self, api_key: str | None = None, rate_limit_delay: float = 1.0):
        self.api_key = api_key
        self.rate_limit_delay = rate_limit_delay
        self.session = requests.Session()
        
        if api_key:
            self.session.headers.update({
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json"
            })
    
    def extract(
        self,
        state_code: str | None = None,
        limit: int = 1000,
        include_canceled: bool = False,
    ) -> list[dict[str, Any]]:
        """
        Extrai mandados da API pública do CNJ.
        
        Args:
            state_code: Sigla UF (ex: 'MG', 'SP', 'RJ') — None = todos estados
            limit: Máximo de registros a extrair
            include_canceled: Incluir mandados cancelados/revogados
        
        Returns:
            Lista de mandados normalizados
        
        Raises:
            requests.RequestException: Em falhas de conexão
        """
        records: list[dict[str, Any]] = []
        page = 1
        
        headers = {
            "Accept": "application/json",
            "User-Agent": "EGOS-Intelink/1.0 (research purposes)",
        }
        
        while len(records) < limit:
            params: dict[str, Any] = {
                "ordenacao": "dataExpedicao,DESC",
                "pagina": page,
                "tamanhoPagina": min(100, limit - len(records)),
            }
            
            if state_code:
                params["orgaoExpedidor"] = state_code
            
            if not include_canceled:
                params["situacao"] = "ATIVO"
            
            try:
                resp = self.session.get(
                    self.api_endpoint,
                    headers=headers,
                    params=params,
                    timeout=30,
                )
                resp.raise_for_status()
                data = resp.json()
                
                mandados = data.get("mandados", [])
                if not mandados:
                    break
                
                for item in mandados:
                    record = self._normalize_record(item)
                    if record:
                        records.append(record)
                    
                    if len(records) >= limit:
                        break
                
                # Paginação
                if not data.get("hasNextPage", False):
                    break
                page += 1
                
                # Rate limiting
                import time
                time.sleep(self.rate_limit_delay)
                
            except requests.RequestException as e:
                logger.error(f"Erro ao extrair página {page}: {e}")
                break
        
        logger.info(f"Extraídos {len(records)} mandados do BNMP")
        return records[:limit]
    
    def _normalize_record(self, item: dict[str, Any]) -> dict[str, Any] | None:
        """Normaliza registro bruto para schema interno."""
        try:
            pessoa = item.get("pessoa", {})
            situacao = item.get("situacao", {})
            orgao = item.get("orgaoExpedidor", {})
            tipo = item.get("tipo", {})
            
            return {
                "element_id": f"bnmp:{item.get('numero', 'unknown')}",
                "numero_mandado": item.get("numero"),
                "nome_pessoa": pessoa.get("nome"),
                "cpf": self._clean_cpf(pessoa.get("cpf")),
                "situacao": situacao.get("descricao", "INDEFINIDO"),
                "situacao_codigo": situacao.get("codigo"),
                "data_expedicao": item.get("dataExpedicao"),
                "data_validade": item.get("dataValidade"),
                "orgao_expedidor": orgao.get("nome"),
                "orgao_sigla": orgao.get("sigla"),
                "tipo_mandado": tipo.get("descricao"),
                "tipo_codigo": tipo.get("codigo"),
                "numero_processo": item.get("numeroProcesso"),
                "descricao": item.get("descricao"),
                "source": "BNMP",
                "url": f"https://portalbnmp.cnj.jus.br/mandado/{item.get('numero', '')}",
            }
        except Exception as e:
            logger.warning(f"Erro normalizando registro: {e}")
            return None
    
    def _clean_cpf(self, cpf: str | None) -> str | None:
        """Limpa CPF (remove formatação)."""
        if not cpf:
            return None
        return cpf.replace(".", "").replace("-", "").strip() or None
    
    def transform(self, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        Transforma para schema Intelink.
        
        Cria entidades:
        - MandadoPrisao (nó principal)
        - Person (se CPF disponível)
        - Organization (órgão expedidor)
        """
        transformed = []
        
        for r in records:
            # Enriquecimento
            r["searchable_text"] = f"{r['nome_pessoa']} {r['numero_processo'] or ''}"
            r["risk_score"] = self._calculate_risk_score(r)
            
            transformed.append(r)
        
        return transformed
    
    def _calculate_risk_score(self, record: dict[str, Any]) -> int:
        """Score de risco baseado na situação e tipo."""
        score = 50  # Base
        
        situacao = record.get("situacao", "").upper()
        tipo = record.get("tipo_mandado", "").upper()
        
        # Situação
        if "ATIVO" in situacao:
            score += 30
        elif "CUMPRIDO" in situacao:
            score -= 20
        elif "SUSPENSO" in situacao:
            score -= 10
        
        # Tipo
        if "PREVENTIVA" in tipo:
            score += 20
        elif "CONDENAÇÃO" in tipo:
            score += 15
        elif "TEMPORÁRIA" in tipo:
            score += 10
        
        # Data (mais recente = maior prioridade)
        # (Simplificado — em produção calcular dias desde expedição)
        
        return max(0, min(100, score))
    
    async def load(
        self,
        neo4j_session: AsyncSession,
        records: list[dict[str, Any]],
    ) -> dict[str, int]:
        """
        Carrega no Neo4j.
        
        Schema:
        - (:MandadoPrisao) — nó principal
        - (:Person) — se CPF disponível
        - (:Organization {type: 'Court'}) — órgão expedidor
        - [:ISSUED_BY] — mandado → órgão
        - [:HAS_MANDATE] — pessoa → mandado
        """
        stats = {"mandados": 0, "persons": 0, "orgs": 0}
        
        cypher = """
        UNWIND $records as r
        
        // Criar/Atualizar Mandado
        MERGE (m:MandadoPrisao {element_id: r.element_id})
        SET m.name = r.nome_pessoa,
            m.numero_mandado = r.numero_mandado,
            m.situacao = r.situacao,
            m.situacao_codigo = r.situacao_codigo,
            m.data_expedicao = date(r.data_expedicao),
            m.data_validade = date(r.data_validade),
            m.tipo_mandado = r.tipo_mandado,
            m.tipo_codigo = r.tipo_codigo,
            m.numero_processo = r.numero_processo,
            m.descricao = r.descricao,
            m.source = r.source,
            m.url = r.url,
            m.searchable_text = r.searchable_text,
            m.risk_score = r.risk_score,
            m.updated_at = datetime()
        
        // Criar Órgão Expedidor
        WITH m, r
        WHERE r.orgao_expedidor IS NOT NULL
        MERGE (o:Organization {name: r.orgao_expedidor})
        SET o.type = 'Court',
            o.sigla = r.orgao_sigla,
            o.updated_at = datetime()
        MERGE (m)-[:ISSUED_BY]->(o)
        
        // Criar Pessoa (se CPF disponível)
        WITH m, r
        WHERE r.cpf IS NOT NULL
        MERGE (p:Person {cpf: r.cpf})
        SET p.name = r.nome_pessoa,
            p.has_active_mandate = (r.situacao = 'ATIVO'),
            p.updated_at = datetime()
        MERGE (p)-[:HAS_MANDATE {type: r.tipo_mandado}]->(m)
        
        RETURN count(m) as mandados
        """
        
        try:
            result = await neo4j_session.run(cypher, {"records": records})
            summary = await result.consume()
            stats["mandados"] = summary.counters.nodes_created
            
            logger.info(f"Carregados {stats['mandados']} mandados no Neo4j")
            
        except Exception as e:
            logger.error(f"Erro na carga Neo4j: {e}")
            raise
        
        return stats
    
    async def run(
        self,
        neo4j_session: AsyncSession,
        state_code: str | None = None,
        limit: int = 1000,
    ) -> dict[str, Any]:
        """
        Executa pipeline completo.
        
        Returns:
            Estatísticas da execução
        """
        logger.info(f"Iniciando pipeline BNMP — state={state_code}, limit={limit}")
        
        # Extract
        raw = self.extract(state_code=state_code, limit=limit)
        
        # Transform
        transformed = self.transform(raw)
        
        # Load
        stats = await self.load(neo4j_session, transformed)
        
        return {
            "source": self.source_id,
            "extracted": len(raw),
            "transformed": len(transformed),
            "loaded": stats,
            "state": state_code,
        }


# =============================================================================
# CLI / Standalone
# =============================================================================

if __name__ == "__main__":
    import asyncio
    import sys
    
    from bracc.dependencies import get_session
    
    async def main():
        """CLI para execução manual."""
        import argparse
        
        parser = argparse.ArgumentParser(description="ETL BNMP — Mandados de Prisão")
        parser.add_argument("--state", "-s", help="UF (ex: MG, SP, RJ)")
        parser.add_argument("--limit", "-l", type=int, default=100, help="Limite de registros")
        parser.add_argument("--dry-run", "-d", action="store_true", help="Não salvar no Neo4j")
        
        args = parser.parse_args()
        
        pipeline = BNMPPipeline()
        
        print(f"🔍 Extraindo mandados do BNMP — state={args.state}, limit={args.limit}")
        
        # Extract only
        records = pipeline.extract(state_code=args.state, limit=args.limit)
        
        print(f"✅ Extraídos {len(records)} mandados")
        
        if records:
            print("\n📋 Primeiros 3 registros:")
            for r in records[:3]:
                print(f"  - {r['nome_pessoa']}: {r['situacao']} ({r['tipo_mandado']})")
        
        if not args.dry_run and records:
            print("\n💾 Salvando no Neo4j...")
            
            # This would need proper async session setup
            # async with get_session() as session:
            #     stats = await pipeline.load(session, records)
            #     print(f"✅ Carregados {stats['mandados']} mandados")
            
            print("⚠️  Modo dry-run — use via API para carga real")
        
        return 0
    
    sys.exit(asyncio.run(main()))
