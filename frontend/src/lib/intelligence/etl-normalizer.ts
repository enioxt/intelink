export interface PublicDataRecord {
    source: string;
    [key: string]: any;
}

export interface IntelinkEntityDraft {
    id?: string; // If matched with existing, or external ID
    type: string; // 'PERSON', 'COMPANY', 'ORGANIZATION', 'GOVERNMENT'
    name: string;
    metadata: Record<string, any>;
}

export interface IntelinkRelationshipDraft {
    source_id: string; // Or a reference to source draft
    target_id: string;
    type: string; // 'EMPLOYED_BY', 'OWNS', 'DONATED_TO', 'CONTRACTED_BY'
    weight?: number; // 0.0 to 1.0 confidence
    metadata?: Record<string, any>;
}

/**
 * Base Interface for all ETL Normalizers.
 * Transforms an external public data record into Intelink Entities and Relationships.
 */
export interface ETLNormalizer {
    sourceName: string;
    normalize(record: PublicDataRecord): {
        entities: IntelinkEntityDraft[];
        relationships: IntelinkRelationshipDraft[];
    };
}

/**
 * Example: RAIS (Relação Anual de Informações Sociais) Normalizer
 * Extracts the Person (Employee) and Company (Employer).
 */
export class RaisNormalizer implements ETLNormalizer {
    sourceName = 'RAIS';

    normalize(record: PublicDataRecord): { entities: IntelinkEntityDraft[], relationships: IntelinkRelationshipDraft[] } {
        const employee: IntelinkEntityDraft = {
            type: 'PERSON',
            name: String(record.nome_trabalhador || 'Desconhecido').toUpperCase(),
            metadata: {
                cpf: record.cpf || null,
                pis: record.pis || null,
                source: this.sourceName,
            }
        };

        const employer: IntelinkEntityDraft = {
            type: 'COMPANY',
            name: String(record.razao_social || 'Empresa Desconhecida').toUpperCase(),
            metadata: {
                cnpj: record.cnpj || null,
                cnae: record.cnae || null,
                source: this.sourceName,
            }
        };

        // We use a temporary ID pattern based on CPF/CNPJ. In a real system, we'd query Intelink DB or emit these drafts.
        const employeeRefId = `ext_person_${record.cpf}`;
        const employerRefId = `ext_company_${record.cnpj}`;

        employee.id = employeeRefId;
        employer.id = employerRefId;

        const employedBy: IntelinkRelationshipDraft = {
            source_id: employeeRefId,
            target_id: employerRefId,
            type: 'EMPLOYED_BY',
            weight: 1.0,
            metadata: {
                salary: record.remuneracao_media || null,
                admission_date: record.data_admissao || null,
                source: this.sourceName,
            }
        };

        return {
            entities: [employee, employer],
            relationships: [employedBy]
        };
    }
}
