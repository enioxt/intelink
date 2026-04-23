# Intelink — Visão Geral

> O que é, para quem, por que existe.
> Linguagem simples. Para quem NÃO é desenvolvedor.

---

## O que é

**Intelink é um sistema de inteligência policial** que reúne, numa plataforma só:

1. **Busca integrada** — CPF, nome, CNPJ — num banco com 83 milhões de nós já relacionados
2. **Grafo de vínculos** — ver quem se relaciona com quem, em até 3 graus de distância
3. **Ingestão de documentos** — envia PDF, foto, áudio ou planilha; o sistema extrai entidades (pessoas, empresas, datas, lugares) e cruza com o que já está no banco
4. **Sistema de sugestões com quórum** — operadores propõem edições; três precisam aprovar para virar oficial; histórico fica tamper-evident
5. **Agente conversacional** — operador conversa no Telegram ou no web com um assistente de IA que sabe buscar, ler documentos, montar relatórios e cruzar fontes

**Em uma frase:** reduz o Excel + PDF disperso em mesas de investigação para um painel auditável, colaborativo e inteligente.

---

## Para quem

- **Delegacias civis brasileiras**, principalmente divisões de homicídio e inteligência
- **Polícias especializadas** (tráfico, narcóticos, patrimônio) que fazem cruzamento entre casos
- **Unidades de inteligência** (DIE/AINI) que centralizam dados
- **Pequenos municípios** que não têm recursos para ter analistas dedicados

**NÃO é para:**
- Advogados ou público leigo (acesso restrito por RBAC)
- Uso fora do exercício policial autorizado
- Substituir o REDS oficial (integra com ele, não substitui)

---

## Por que existe

**Problema observado em campo:**

- Policial abre 5 abas de 5 sistemas diferentes pra investigar uma pessoa
- Dados preciosos ficam em Excel/PDF pessoais, não viram conhecimento coletivo
- Quando alguém sai, leva junto metade da memória da unidade
- Cruzamento manual demora dias; muitos vínculos escapam

**O que o Intelink faz:**

- Concentra tudo numa interface
- Cada nova informação enriquece o grafo coletivo
- Audit tamper-evident evita "quem alterou o quê"
- Cruzamento automático via grafo, não manual

---

## O que está pronto (abril 2026)

- ✅ Busca REDS por CPF/nome em banco de 12.730 Person + 2.092 Ocorrência (dados reais de uma delegacia piloto)
- ✅ Grafo público com 83.7M nós (dados de acesso público)
- ✅ Ingestão de PDF/DOC/imagem/áudio com extração por IA
- ✅ Sistema de sugestão com quórum 3/3
- ✅ Agente conversacional no Telegram e no web
- ✅ Audit hash-chained (comprova integridade)
- ✅ Compliance LGPD (PII masking, base legal, retenção)
- ✅ Auth self-service com verificação obrigatória

## O que vem a seguir

- UI mais limpa focada nos fluxos mais usados
- Backup automático diário
- Integração WhatsApp (depende de CNPJ)
- Observabilidade (Langfuse)
- Multi-tenant quando 3ª delegacia entrar no piloto

---

## Quem construiu

**Enio Rocha** (Patos de Minas, MG) — formado em Direito pela UNIPAM (2019), desenvolvedor autodidata, parte do ecossistema **EGOS** (kernel de orquestração para produtos com governança de IA).

**Parceria de campo:** policial civil que testa as features no dia a dia e valida fluxo real de investigação.

---

## Licenciamento e modelo

**Uso atual:** interno em delegacia piloto DHPP.

**Modelo de distribuição planejado:**
1. **Consultoria A** (implementação in-house por delegacia) — modelo principal de curto prazo
2. **Framework licenciável C** (open-source com suporte pago) — quando modelo provar valor

Não há plano de SaaS público com dados de múltiplas unidades compartilhados.

---

## Contato

- Website produção: [intelink.ia.br](https://intelink.ia.br)
- Documentação técnica: [README.md](../README.md), [FEATURES.md](FEATURES.md)
- Autoria: enioxt@gmail.com

---

*Última atualização: 2026-04-23 (DOC-PUB-007, pré-divulgação). Linguagem simples intencional — ver README.md para detalhes técnicos.*
