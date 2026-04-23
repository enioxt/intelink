# Casos de Uso — Intelink

> Três fluxos reais ilustrando como o Intelink é usado em campo.
> **Nenhum dado pessoal real** aparece neste documento — exemplos são compostos/anonimizados.

---

## Caso 1 — Busca rápida no Telegram

**Contexto:** policial em campo recebe uma abordagem, precisa cruzar CPF do abordado rapidamente.

**Fluxo:**

1. Policial abre o bot do Intelink no Telegram do celular
2. Digita `/buscar 12345678900` (sem pontos/traços)
3. Bot responde em ~2 segundos:
   ```
   🔵 João da Silva (REDS OFICIAL)
   Nascimento: 15/03/1985 — 40 anos
   Bairro: Centro
   Mãe: Maria Silva

   📋 3 BOs relacionados
   👥 5 co-envolvidos
   🔗 https://intelink.ia.br/p/abc123

   [📋 Ver BOs] [👥 Envolvidos] [🌐 Abrir Web]
   ```
4. Policial clica em "Ver BOs" → bot mostra os 3 registros com data/tipo/bairro
5. Em 30 segundos, policial tem contexto suficiente pra decidir próximos passos

**Valor:** tempo de resposta reduziu de ~15min (navegando entre sistemas) para ~30 segundos.

---

## Caso 2 — Investigação DHPP com ingestão de documento

**Contexto:** investigador recebe um laudo pericial em PDF de 20 páginas com múltiplos nomes e datas.

**Fluxo:**

1. Investigador abre o Intelink Web, cria nova investigação em `/investigation/new`
2. Arrasta o PDF para a área de upload
3. Sistema processa em ~40 segundos:
   - Parser extrai texto puro (pdfjs)
   - LLM identifica: 7 pessoas, 3 endereços, 2 veículos, 5 datas-chave
   - Cross-reference engine verifica cada entidade no Neo4j:
     - 4 já existem como Person (CONFIRMED)
     - 2 são novas (pendem aprovação via proposta)
     - 1 está em conflito (nome bate mas CPF diverge — precisa humano)
4. Investigador abre `/ingest/[job_id]` → vê diff side-by-side
5. Aprova entidades novas → sistema cria proposta pendente
6. Dois outros investigadores votam → 3/3 → entidades promovidas para CONFIRMADO
7. Grafo de vínculos já reflete as novas conexões

**Valor:** o que tomava uma tarde de leitura + cruzamento manual vira trabalho de 15 minutos + revisão.

---

## Caso 3 — Agente conversacional no planejamento

**Contexto:** chefe de equipe quer entender a rede de contatos de um investigado antes de reunir a equipe.

**Fluxo (Telegram):**

1. Chefe digita `/agente`
2. Bot: "Modo agente ativo. Me pergunte sobre investigações."
3. Chefe: "O que eu tenho sobre CPF 98765432100?"
4. Agente (via tool-calling):
   - Chama `buscarPessoa(cpf)` → retorna nome + dados
   - Chama `getOccurrences(person_id)` → 8 BOs
   - Chama `getLinks(person_id)` → 12 co-envolvidos em 3 graus
   - Sintetiza resposta: "João Silva, 8 BOs (principalmente furto e receptação), aparece em 12 relações: 3 são familiares confirmados (proposta quórum), 4 são co-autores recorrentes, 5 são observações não-confirmadas. Dois co-autores recorrentes têm BOs que podem ser a mesma operação — posso mostrar?"
5. Chefe: "Sim, quais?"
6. Agente: "Operação Maré Alta (17/03/2026, Centro) e Operação Siri (21/03/2026, Centro). Ambos com Pedro Andrade e Carlos Mendes. Quer que eu gere um relatório?"
7. Chefe: "Gerar relatório."
8. Agente roda ferramenta de relatório, deixa artefato em `/reports/<id>`
9. Chefe abre link, revê, exporta como PDF para reunião

**Valor:** análise exploratória que levaria 1-2 horas vira conversa de 5 minutos; relatório sai pronto.

---

## Caso 4 (bonus) — Recuperação de senha fora do expediente

**Contexto:** delegado tenta acessar sistema sábado à noite, esqueceu a senha.

**Fluxo:**

1. Abre `/login`, clica "Esqueceu a senha?"
2. Redireciona para `/recover`
3. Informa email + escolhe "Telegram" (ativou durante o onboarding)
4. Sistema envia código 6-dígitos direto no Telegram via bot
5. Código chega em ~1 segundo
6. Delegado digita código + nova senha
7. Sistema redefine senha + audit loga ação + sessão volta ao normal

**Valor:** sem precisar esperar suporte de TI, sem depender de email (que pode estar bloqueado por filtro). Em 60 segundos tá logado.

---

## Contra-exemplos — o que o Intelink NÃO faz

### Não substitui perícia técnica

Intelink indexa o laudo pericial, mas não realiza perícia. Continua sendo trabalho do perito.

### Não faz julgamento de mérito

Sistema indica vínculos, correlações, padrões. Decisão sobre relevância legal é sempre humana.

### Não automatiza prisões, mandados ou notificações

Zero ação executável automaticamente sobre cidadãos. Só agrega informação para o operador decidir.

### Não vende dados nem publica informação sensível

Dados restritos por RBAC + delegacia. Sem API pública que exponha PII.

---

## Métricas de adoção (piloto DHPP)

Dados de abril 2026 (piloto em andamento):
- 13 membros ativos
- 12.730 Person + 2.092 Occurrence REDS local
- 8.242 entradas de recepção ingeridas
- 2.898 fotos vinculadas
- 96% pass rate no eval comportamental (48/50 casos)
- 100% pass rate em casos block-severity (0 regressões críticas)

Meta em 30 dias (até 2026-05-12 — Sprint de Validação):
- 1 processo real melhorado end-to-end (investigação → Intelink → laudo)
- Parceira policial compreende 80% do sistema sem treinamento formal
- Identificar a 2ª delegacia interessada

---

## Dúvidas comuns

**Minha delegacia pode usar?**
Depende de acordo — o piloto atual é single-tenant. Quando o modelo multi-tenant for ativado (`INTELINK-MT-001`), outras delegacias podem entrar.

**Meus dados ficam no Intelink para sempre?**
Audit logs sim (valor histórico de atos oficiais). Dados operacionais podem ser anonimizados/removidos via solicitação do titular (LGPD art. 18) — ver [LGPD_COMPLIANCE.md](LGPD_COMPLIANCE.md).

**Tem custo?**
Modelo atual: consultoria para implementação inicial. Open-source com suporte pago planejado para longo prazo. Ver [PUBLIC_OVERVIEW.md](PUBLIC_OVERVIEW.md).

---

*Última atualização: 2026-04-23 (DOC-PUB-008). Casos anonimizados — nenhum dado pessoal real.*
