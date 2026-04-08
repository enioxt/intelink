"""
Investigation Templates for Intelink
P3: Investigation Templates (2 weeks)

Sacred Code: 000.369.963.144.1618 (∞△⚡◎φ)

Pre-configured investigation templates for:
- Corruption (follow the money)
- Money laundering
- Corporate compliance
- Investigative journalism
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class InvestigationTemplate:
    """Investigation template definition"""
    id: str
    name: str
    description: str
    entity_types: List[str]
    relationship_types: List[str]
    queries: List[Dict[str, str]]
    visualization_config: Dict
    suggested_sources: List[str]


class InvestigationTemplates:
    """Collection of investigation templates"""
    
    def __init__(self):
        self.templates = self._load_templates()
    
    def _load_templates(self) -> Dict[str, InvestigationTemplate]:
        """Load predefined templates"""
        return {
            "corruption": self._corruption_template(),
            "money_laundering": self._money_laundering_template(),
            "compliance": self._compliance_template(),
            "journalism": self._journalism_template(),
            "criminal_investigation": self._criminal_investigation_template(),
        }
    
    def _corruption_template(self) -> InvestigationTemplate:
        """Follow the money - corruption investigation"""
        return InvestigationTemplate(
            id="corruption",
            name="Corruption Investigation",
            description="Follow financial flows between public officials, companies, and contracts",
            entity_types=[
                "Person",
                "Company",
                "PublicOfficial",
                "Contract",
                "Payment",
                "BankAccount"
            ],
            relationship_types=[
                "OWNS",
                "CONTROLS",
                "RECEIVES_FROM",
                "PAYS_TO",
                "SIGNS_CONTRACT",
                "BENEFITS",
                "INFLUENCES"
            ],
            queries=[
                {
                    "name": "Find Public Officials with Company Ownership",
                    "cypher": """
                        MATCH (p:PublicOfficial)-[:OWNS]->(c:Company)
                        RETURN p.name, c.name, c.cnpj
                    """,
                    "description": "Identify potential conflicts of interest"
                },
                {
                    "name": "Trace Payment Flows",
                    "cypher": """
                        MATCH path = (company:Company)-[:PAYS_TO*1..3]->(official:PublicOfficial)
                        RETURN path
                    """,
                    "description": "Follow money from companies to officials"
                },
                {
                    "name": "Identify Contract Beneficiaries",
                    "cypher": """
                        MATCH (official:PublicOfficial)-[:SIGNS_CONTRACT]->(contract:Contract)
                        MATCH (contract)-[:BENEFITS]->(company:Company)
                        MATCH (company)<-[:OWNS]-(person:Person)
                        RETURN official.name, contract.value, company.name, person.name
                    """,
                    "description": "Find who benefits from official contracts"
                }
            ],
            visualization_config={
                "node_colors": {
                    "PublicOfficial": "#FF6B6B",
                    "Company": "#4ECDC4",
                    "Contract": "#FFE66D",
                    "Payment": "#95E1D3"
                },
                "edge_thickness": "weight",
                "layout": "force"
            },
            suggested_sources=[
                "Company registry (CNPJ)",
                "Public contracts database",
                "Asset declarations",
                "Bank transaction records",
                "News articles"
            ]
        )
    
    def _money_laundering_template(self) -> InvestigationTemplate:
        """Money laundering investigation"""
        return InvestigationTemplate(
            id="money_laundering",
            name="Money Laundering Investigation",
            description="Track suspicious financial flows through shell companies and intermediaries",
            entity_types=[
                "Person",
                "Company",
                "ShellCompany",
                "BankAccount",
                "Transaction",
                "Country"
            ],
            relationship_types=[
                "TRANSFERS_TO",
                "OWNS_ACCOUNT",
                "REGISTERED_IN",
                "INTERMEDIARY_FOR",
                "RECEIVES_FROM",
                "SENDS_TO"
            ],
            queries=[
                {
                    "name": "Find Shell Company Networks",
                    "cypher": """
                        MATCH (shell:ShellCompany)-[:REGISTERED_IN]->(country:Country)
                        WHERE country.name IN ['Panama', 'Cayman Islands', 'British Virgin Islands']
                        MATCH (shell)-[:INTERMEDIARY_FOR]->(company:Company)
                        RETURN shell, country, company
                    """,
                    "description": "Identify offshore intermediaries"
                },
                {
                    "name": "Trace Complex Transaction Chains",
                    "cypher": """
                        MATCH path = (source)-[:TRANSFERS_TO*3..5]->(destination)
                        WHERE source <> destination
                        RETURN path, length(path) as hops
                        ORDER BY hops DESC
                    """,
                    "description": "Find layered transactions"
                },
                {
                    "name": "Detect Circular Flows",
                    "cypher": """
                        MATCH path = (account:BankAccount)-[:TRANSFERS_TO*3..5]->(account)
                        RETURN path
                    """,
                    "description": "Identify suspicious circular money flows"
                }
            ],
            visualization_config={
                "node_colors": {
                    "Person": "#74B9FF",
                    "Company": "#00B894",
                    "ShellCompany": "#FF7675",
                    "BankAccount": "#FDCB6E",
                    "Country": "#6C5CE7"
                },
                "edge_thickness": "amount",
                "layout": "hierarchical"
            },
            suggested_sources=[
                "Bank transaction records",
                "Company registries (offshore)",
                "SWIFT messages",
                "Suspicious Activity Reports (SARs)",
                "Panama Papers / Paradise Papers"
            ]
        )
    
    def _compliance_template(self) -> InvestigationTemplate:
        """Corporate compliance audit"""
        return InvestigationTemplate(
            id="compliance",
            name="Compliance Audit",
            description="Verify corporate governance and regulatory compliance",
            entity_types=[
                "Company",
                "Executive",
                "Department",
                "Policy",
                "Violation",
                "Audit"
            ],
            relationship_types=[
                "MANAGES",
                "REPORTS_TO",
                "ENFORCES",
                "VIOLATES",
                "APPROVED_BY",
                "AUDITED_BY"
            ],
            queries=[
                {
                    "name": "Find Policy Violations",
                    "cypher": """
                        MATCH (exec:Executive)-[:VIOLATES]->(policy:Policy)
                        RETURN exec.name, policy.name, policy.severity
                        ORDER BY policy.severity DESC
                    """,
                    "description": "Identify compliance violations"
                },
                {
                    "name": "Trace Approval Chains",
                    "cypher": """
                        MATCH path = (dept:Department)-[:APPROVED_BY*]->(exec:Executive)
                        RETURN path
                    """,
                    "description": "Verify approval hierarchies"
                },
                {
                    "name": "Audit Coverage Analysis",
                    "cypher": """
                        MATCH (dept:Department)
                        OPTIONAL MATCH (dept)-[:AUDITED_BY]->(audit:Audit)
                        RETURN dept.name, count(audit) as audit_count
                        ORDER BY audit_count ASC
                    """,
                    "description": "Find under-audited departments"
                }
            ],
            visualization_config={
                "node_colors": {
                    "Executive": "#3498DB",
                    "Department": "#2ECC71",
                    "Policy": "#F39C12",
                    "Violation": "#E74C3C",
                    "Audit": "#9B59B6"
                },
                "edge_thickness": "strength",
                "layout": "hierarchical"
            },
            suggested_sources=[
                "Internal audit reports",
                "Policy documents",
                "Incident reports",
                "Employee records",
                "Compliance databases"
            ]
        )
    
    def _journalism_template(self) -> InvestigationTemplate:
        """Investigative journalism"""
        return InvestigationTemplate(
            id="journalism",
            name="Investigative Journalism",
            description="Connect sources, documents, and key figures for journalistic investigation",
            entity_types=[
                "Person",
                "Organization",
                "Document",
                "Event",
                "Location",
                "Source"
            ],
            relationship_types=[
                "MENTIONED_IN",
                "ATTENDED",
                "LOCATED_AT",
                "WORKS_FOR",
                "CONNECTED_TO",
                "QUOTES"
            ],
            queries=[
                {
                    "name": "Find Central Figures",
                    "cypher": """
                        MATCH (p:Person)-[r]-()
                        RETURN p.name, count(r) as connections
                        ORDER BY connections DESC
                        LIMIT 10
                    """,
                    "description": "Identify most connected individuals"
                },
                {
                    "name": "Document Timeline",
                    "cypher": """
                        MATCH (doc:Document)
                        RETURN doc.title, doc.date
                        ORDER BY doc.date
                    """,
                    "description": "Create chronological document view"
                },
                {
                    "name": "Cross-Reference Sources",
                    "cypher": """
                        MATCH (person:Person)<-[:MENTIONS]-(doc1:Document)
                        MATCH (person)<-[:MENTIONS]-(doc2:Document)
                        WHERE doc1 <> doc2
                        RETURN person.name, collect(DISTINCT doc1.title) as sources
                    """,
                    "description": "Find corroborating sources"
                }
            ],
            visualization_config={
                "node_colors": {
                    "Person": "#E17055",
                    "Organization": "#00B894",
                    "Document": "#6C5CE7",
                    "Event": "#FDCB6E",
                    "Location": "#74B9FF",
                    "Source": "#A29BFE"
                },
                "edge_thickness": "relevance",
                "layout": "force"
            },
            suggested_sources=[
                "Public records",
                "Court documents",
                "Corporate filings",
                "News archives",
                "Social media",
                "Whistleblower tips"
            ]
        )
    
    def get_template(self, template_id: str) -> Optional[InvestigationTemplate]:
        """Get template by ID"""
        return self.templates.get(template_id)
    
    def list_templates(self) -> List[Dict]:
        """List all available templates"""
        return [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "entity_types_count": len(t.entity_types),
                "queries_count": len(t.queries)
            }
            for t in self.templates.values()
        ]
    
    def _criminal_investigation_template(self) -> InvestigationTemplate:
        """Criminal investigation (homicide, robbery, etc) - Brazilian law context"""
        return InvestigationTemplate(
            id="criminal_investigation",
            name="Criminal Investigation",
            description="Investigate criminal cases following Brazilian Penal Code (e.g., Art. 121 homicide)",
            entity_types=[
                "Suspect",
                "Victim",
                "Witness",
                "Location",
                "Vehicle",
                "Weapon",
                "Evidence",
                "Occurrence"
            ],
            relationship_types=[
                "KNOWS",
                "RELATED_TO",
                "PRESENT_AT",
                "OWNS",
                "USED_WEAPON",
                "FOUND_AT",
                "WITNESSED",
                "PARTICIPATED_IN"
            ],
            queries=[
                {
                    "name": "Find Common Locations",
                    "cypher": """
                        MATCH (suspect:Suspect)-[:PRESENT_AT]->(loc:Location)<-[:PRESENT_AT]-(victim:Victim)
                        RETURN suspect.name, victim.name, loc.address
                    """,
                    "description": "Identify locations where suspects and victims were both present"
                },
                {
                    "name": "Trace Weapon Ownership",
                    "cypher": """
                        MATCH (person)-[:OWNS]->(weapon:Weapon)-[:USED_IN]->(occurrence:Occurrence)
                        RETURN person.name, weapon.type, weapon.caliber, occurrence.type
                    """,
                    "description": "Track weapons used in occurrences"
                },
                {
                    "name": "Find Related Occurrences",
                    "cypher": """
                        MATCH (suspect:Suspect)-[:PARTICIPATED_IN]->(occ1:Occurrence)
                        MATCH (suspect)-[:PARTICIPATED_IN]->(occ2:Occurrence)
                        WHERE occ1 <> occ2
                        RETURN suspect.name, collect(occ1.case_number) as occurrences
                    """,
                    "description": "Identify repeat offenders across multiple occurrences"
                },
                {
                    "name": "Map Family/Social Connections",
                    "cypher": """
                        MATCH path = (p1:Suspect)-[:RELATED_TO|KNOWS*1..2]-(p2:Suspect)
                        RETURN path
                    """,
                    "description": "Discover social and family networks among suspects"
                }
            ],
            visualization_config={
                "node_colors": {
                    "Suspect": "#E74C3C",
                    "Victim": "#3498DB",
                    "Witness": "#F39C12",
                    "Location": "#2ECC71",
                    "Weapon": "#95A5A6",
                    "Evidence": "#9B59B6",
                    "Vehicle": "#1ABC9C",
                    "Occurrence": "#E67E22"
                },
                "edge_thickness": "strength",
                "layout": "force"
            },
            suggested_sources=[
                "Police reports (BO - Boletim de Ocorrência)",
                "Witness statements",
                "Forensic reports",
                "Phone records (CDR)",
                "CCTV footage",
                "Ballistic reports",
                "Vehicle registration (DETRAN)",
                "Criminal records",
                "Court documents"
            ]
        )
    
    def apply_template(
        self,
        template_id: str,
        investigation_id: str
    ) -> Dict:
        """
        Apply template to a new investigation
        
        Returns configuration for the investigation
        """
        template = self.get_template(template_id)
        
        if not template:
            raise ValueError(f"Template not found: {template_id}")
        
        logger.info(
            "template_applied",
            template_id=template_id,
            investigation_id=investigation_id
        )
        
        return {
            "investigation_id": investigation_id,
            "template": template.id,
            "entity_types": template.entity_types,
            "relationship_types": template.relationship_types,
            "queries": template.queries,
            "visualization": template.visualization_config,
            "sources": template.suggested_sources
        }


# Global instance
investigation_templates = InvestigationTemplates()
