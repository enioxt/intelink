/**
 * Interface for fetching data from 'Base dos Dados' BigQuery.
 * This is a placeholder for the open-source release to abstract the connection details.
 */

// import { BigQuery } from '@google-cloud/bigquery'; // Uncomment in final prod with dependencies
import { PublicDataRecord } from './normalizer';

export interface BigQueryConfig {
    projectId: string;
    keyFilename?: string;
}

export class BaseDosDadosClient {
    private config: BigQueryConfig;
    // private client: BigQuery;

    constructor(config: BigQueryConfig) {
        this.config = config;
        // this.client = new BigQuery(config);
    }

    /**
     * Run a custom query against Base dos Dados datasets.
     * Note: Requires a GCP account and BigQuery configured. First TB/month is free.
     */
    async query(queryString: string): Promise<PublicDataRecord[]> {
        console.log(`[BaseDosDados] Executing query: ${queryString.substring(0, 50)}...`);

        // MOCK IMPLEMENTATION FOR DEMO/DEVELOPMENT
        // In production:
        // const [rows] = await this.client.query({ query: queryString });
        // return rows;

        return this.mockedResponse(queryString);
    }

    private mockedResponse(queryString: string): PublicDataRecord[] {
        if (queryString.includes('br_me_rais')) {
            return [
                {
                    source: 'BD_RAIS',
                    ano: 2023,
                    cpf: '11122233344',
                    nome_trabalhador: 'João da Silva',
                    cnpj: '000123456000100',
                    razao_social: 'ABC CONSTRUCOES LTDA',
                    remuneracao_media: 5500.00
                },
                {
                    source: 'BD_RAIS',
                    ano: 2023,
                    cpf: '55566677788',
                    nome_trabalhador: 'Maria Oliveira',
                    cnpj: '000123456000100',
                    razao_social: 'ABC CONSTRUCOES LTDA',
                    remuneracao_media: 4200.00
                }
            ];
        }

        if (queryString.includes('br_tse_eleicoes')) {
            return [
                {
                    source: 'BD_TSE',
                    cpf: '11122233344',
                    nome_candidato: 'João da Silva',
                    cargo: 'Deputado Estadual',
                    bens_declarados: 2800000.00
                }
            ];
        }

        return [];
    }
}
