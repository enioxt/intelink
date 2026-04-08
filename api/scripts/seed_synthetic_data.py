#!/usr/bin/env python3
"""
Seed Synthetic Data — EGOS Inteligência / Intelink
Popula Neo4j com dados sintéticos para desenvolvimento e demos.

Usage:
    python scripts/seed_synthetic_data.py [--clear]

Sacred Code: 000.111.369.963.1618
"""

import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta
from typing import Any

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from neo4j import AsyncGraphDatabase


# =============================================================================
# Synthetic Data Definitions
# =============================================================================

SYNTHETIC_PEOPLE = [
    {"name": "João Silva", "role": "Investigador", "org": "PCMG"},
    {"name": "Maria Santos", "role": "Analista", "org": "MPMG"},
    {"name": "Carlos Oliveira", "role": "Delegado", "org": "PF"},
    {"name": "Ana Costa", "role": "Perita", "org": "PCMG"},
    {"name": "Pedro Ferreira", "role": "Escrivão", "org": "PCMG"},
]

SYNTHETIC_ENTITIES = [
    {"name": "Empresa Alfa Ltda", "type": "PJ", "cnpj": "12.345.678/0001-90"},
    {"name": "Construtora Beta S.A.", "type": "PJ", "cnpj": "98.765.432/0001-10"},
    {"name": "José dos Reis", "type": "PF", "cpf": "123.456.789-00"},
    {"name": "Transporte Gama ME", "type": "PJ", "cnpj": "11.222.333/0001-44"},
    {"name": "Maria Benedita", "type": "PF", "cpf": "987.654.321-00"},
]

SYNTHETIC_INVESTIGATIONS = [
    {
        "title": "Operação Lava Rápido",
        "description": "Investigação de lavagem de dinheiro em postos de combustível",
        "status": "ativa",
        "priority": "alta",
    },
    {
        "title": "Caso das Licitações Fantasma",
        "description": "Fraude em processos licitatórios de prefeituras do interior",
        "status": "ativa",
        "priority": "alta",
    },
    {
        "title": "Desvio de Verbas Educacionais",
        "description": "Desvio de recursos do Fundeb em município do norte de MG",
        "status": "arquivada",
        "priority": "média",
    },
    {
        "title": "Tráfico de Droga Sintética",
        "description": "Rede de distribuição de drogas sintéticas em capitais do Sudeste",
        "status": "ativa",
        "priority": "urgente",
    },
    {
        "title": "Corrupção em Obras Públicas",
        "description": "Superfaturamento em obras de infraestrutura viária",
        "status": "suspenso",
        "priority": "alta",
    },
]

SYNTHETIC_LOCATIONS = [
    {"name": "Belo Horizonte", "state": "MG", "type": "cidade"},
    {"name": "São Paulo", "state": "SP", "type": "cidade"},
    {"name": "Rio de Janeiro", "state": "RJ", "type": "cidade"},
    {"name": "Brasília", "state": "DF", "type": "cidade"},
    {"name": "Uberlândia", "state": "MG", "type": "cidade"},
]


# =============================================================================
# Neo4j Queries
# =============================================================================

QUERIES = {
    "clear_all": "MATCH (n) DETACH DELETE n",
    
    "create_person": """
        CREATE (p:Person {
            id: $id,
            name: $name,
            role: $role,
            organization: $org,
            created_at: datetime()
        })
        RETURN p.id as id
    """,
    
    "create_entity": """
        CREATE (e:Entity {
            id: $id,
            name: $name,
            type: $type,
            document: $document,
            created_at: datetime()
        })
        RETURN e.id as id
    """,
    
    "create_investigation": """
        CREATE (i:Investigation {
            id: $id,
            title: $title,
            description: $description,
            status: $status,
            priority: $priority,
            created_at: datetime(),
            updated_at: datetime()
        })
        RETURN i.id as id
    """,
    
    "create_location": """
        CREATE (l:Location {
            id: $id,
            name: $name,
            state: $state,
            type: $type,
            created_at: datetime()
        })
        RETURN l.id as id
    """,
    
    "relate_person_investigation": """
        MATCH (p:Person {id: $person_id}), (i:Investigation {id: $inv_id})
        CREATE (p)-[r:PARTICIPA {role: $role, since: datetime()}]->(i)
        RETURN r
    """,
    
    "relate_entity_investigation": """
        MATCH (e:Entity {id: $entity_id}), (i:Investigation {id: $inv_id})
        CREATE (e)-[r:INVESTIGADA_EM {motivo: $motivo, desde: datetime()}]->(i)
        RETURN r
    """,
    
    "relate_investigation_location": """
        MATCH (i:Investigation {id: $inv_id}), (l:Location {id: $loc_id})
        CREATE (i)-[r:OCORRE_EM {detalhes: $detalhes}]->(l)
        RETURN r
    """,
    
    "relate_entity_entity": """
        MATCH (e1:Entity {id: $entity1_id}), (e2:Entity {id: $entity2_id})
        CREATE (e1)-[r:RELACIONADA {tipo: $tipo, evidencia: $evidencia}]->(e2)
        RETURN r
    """,
}


# =============================================================================
# Seeder Class
# =============================================================================

class Neo4jSeeder:
    def __init__(self, uri: str, user: str, password: str):
        self.driver = AsyncGraphDatabase.driver(uri, auth=(user, password))
    
    async def close(self):
        await self.driver.close()
    
    async def clear_all(self):
        """Remove all nodes and relationships."""
        async with self.driver.session() as session:
            await session.run(QUERIES["clear_all"])
        print("🗑️  Database limpo")
    
    async def seed_persons(self) -> list[str]:
        """Create person nodes."""
        ids = []
        async with self.driver.session() as session:
            for person in SYNTHETIC_PEOPLE:
                person_id = str(uuid.uuid4())
                result = await session.run(
                    QUERIES["create_person"],
                    id=person_id,
                    name=person["name"],
                    role=person["role"],
                    org=person["org"]
                )
                await result.consume()
                ids.append(person_id)
        print(f"👥 {len(ids)} pessoas criadas")
        return ids
    
    async def seed_entities(self) -> list[str]:
        """Create entity nodes."""
        ids = []
        async with self.driver.session() as session:
            for entity in SYNTHETIC_ENTITIES:
                entity_id = str(uuid.uuid4())
                result = await session.run(
                    QUERIES["create_entity"],
                    id=entity_id,
                    name=entity["name"],
                    type=entity["type"],
                    document=entity.get("cnpj") or entity.get("cpf")
                )
                await result.consume()
                ids.append(entity_id)
        print(f"🏢 {len(ids)} entidades criadas")
        return ids
    
    async def seed_investigations(self) -> list[str]:
        """Create investigation nodes."""
        ids = []
        async with self.driver.session() as session:
            for inv in SYNTHETIC_INVESTIGATIONS:
                inv_id = str(uuid.uuid4())
                result = await session.run(
                    QUERIES["create_investigation"],
                    id=inv_id,
                    title=inv["title"],
                    description=inv["description"],
                    status=inv["status"],
                    priority=inv["priority"]
                )
                await result.consume()
                ids.append(inv_id)
        print(f"📁 {len(ids)} investigações criadas")
        return ids
    
    async def seed_locations(self) -> list[str]:
        """Create location nodes."""
        ids = []
        async with self.driver.session() as session:
            for loc in SYNTHETIC_LOCATIONS:
                loc_id = str(uuid.uuid4())
                result = await session.run(
                    QUERIES["create_location"],
                    id=loc_id,
                    name=loc["name"],
                    state=loc["state"],
                    type=loc["type"]
                )
                await result.consume()
                ids.append(loc_id)
        print(f"📍 {len(ids)} locais criados")
        return ids
    
    async def create_relationships(
        self,
        person_ids: list[str],
        entity_ids: list[str],
        investigation_ids: list[str],
        location_ids: list[str]
    ):
        """Create relationships between nodes."""
        async with self.driver.session() as session:
            # Person -> Investigation (every person assigned to at least one investigation)
            for i, person_id in enumerate(person_ids):
                inv_idx = i % len(investigation_ids)
                result = await session.run(
                    QUERIES["relate_person_investigation"],
                    person_id=person_id,
                    inv_id=investigation_ids[inv_idx],
                    role="Responsável" if i % 2 == 0 else "Colaborador"
                )
                await result.consume()
            
            # Entity -> Investigation (every entity linked to at least one investigation)
            for i, entity_id in enumerate(entity_ids):
                inv_idx = i % len(investigation_ids)
                result = await session.run(
                    QUERIES["relate_entity_investigation"],
                    entity_id=entity_id,
                    inv_id=investigation_ids[inv_idx],
                    motivo="Suspeita" if i % 2 == 0 else "Referência"
                )
                await result.consume()
            
            # Investigation -> Location
            for i, inv_id in enumerate(investigation_ids):
                loc_idx = i % len(location_ids)
                result = await session.run(
                    QUERIES["relate_investigation_location"],
                    inv_id=inv_id,
                    loc_id=location_ids[loc_idx],
                    detalhes="Local principal" if i % 2 == 0 else "Filial"
                )
                await result.consume()
            
            # Entity -> Entity (some entities related)
            for i in range(0, len(entity_ids) - 1, 2):
                result = await session.run(
                    QUERIES["relate_entity_entity"],
                    entity1_id=entity_ids[i],
                    entity2_id=entity_ids[i + 1],
                    tipo="Sócio" if i % 4 == 0 else "Fornecedor",
                    evidencia="Contrato social" if i % 4 == 0 else "Nota fiscal"
                )
                await result.consume()
        
        print(f"🔗 Relacionamentos criados")
    
    async def verify(self) -> dict[str, Any]:
        """Verify seed data."""
        async with self.driver.session() as session:
            # Count nodes
            node_result = await session.run("MATCH (n) RETURN labels(n)[0] as label, count(*) as count")
            node_counts = {record["label"]: record["count"] async for record in node_result}
            
            # Count relationships
            rel_result = await session.run("MATCH ()-[r]->() RETURN type(r) as type, count(*) as count")
            rel_counts = {record["type"]: record["count"] async for record in rel_result}
            
            return {"nodes": node_counts, "relationships": rel_counts}


# =============================================================================
# Main
# =============================================================================

async def main():
    import argparse
    parser = argparse.ArgumentParser(description="Seed Neo4j with synthetic data")
    parser.add_argument("--clear", action="store_true", help="Clear database before seeding")
    parser.add_argument("--uri", default=os.getenv("NEO4J_URI", "bolt://localhost:7687"))
    parser.add_argument("--user", default=os.getenv("NEO4J_USER", "neo4j"))
    parser.add_argument("--password", default=os.getenv("NEO4J_PASSWORD", "password"))
    args = parser.parse_args()
    
    print("=" * 60)
    print("🌱 Neo4j Synthetic Data Seeder — Intelink")
    print("=" * 60)
    print(f"URI: {args.uri}")
    print(f"User: {args.user}")
    print()
    
    seeder = Neo4jSeeder(args.uri, args.user, args.password)
    
    try:
        # Test connection
        await seeder.driver.verify_connectivity()
        print("✅ Conexão Neo4j estabelecida\n")
        
        # Clear if requested
        if args.clear:
            await seeder.clear_all()
            print()
        
        # Seed data
        print("🌱 Criando dados sintéticos...")
        person_ids = await seeder.seed_persons()
        entity_ids = await seeder.seed_entities()
        investigation_ids = await seeder.seed_investigations()
        location_ids = await seeder.seed_locations()
        
        # Create relationships
        await seeder.create_relationships(person_ids, entity_ids, investigation_ids, location_ids)
        
        # Verify
        print("\n📊 Verificação:")
        stats = await seeder.verify()
        for label, count in stats["nodes"].items():
            print(f"   • {label}: {count} nós")
        for rel_type, count in stats["relationships"].items():
            print(f"   • {rel_type}: {count} relacionamentos")
        
        print("\n✅ Seed completo!")
        print(f"🎉 Total: {sum(stats['nodes'].values())} nós, {sum(stats['relationships'].values())} relacionamentos")
        
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        sys.exit(1)
    finally:
        await seeder.close()


if __name__ == "__main__":
    asyncio.run(main())
