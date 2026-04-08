# Fontes OSINT Curadas para Intelink
> **Repositório-fonte:** Astrosp/Awesome-OSINT-For-Everything  
> **Data de curadoria:** 2026-04-08  
> **Foco:** Polícia / LE / Fed / Inteligência / Investigação Criminal

---

## 1. DADOS PESSOAIS & IDENTIDADE (Prioridade: ALTA)

| Fonte | URL | Uso Policial | Tipo |
|-------|-----|--------------|------|
| **Dehashed** | dehashed.com | Vazamentos email/senha | Breach |
| **HaveIBeenPwned** | haveibeenpwned.com | Verificar comprometimento | Breach |
| **Intelligence X** | intelx.io | Arquivo de dados + selectors | Archive |
| **LeakRadar** | leakradar.io | 2B+ credenciais em plaintext | Darknet |
| **InfoStealers** | infostealers.com | Logs de malware infostealer | Darknet |
| **WhiteIntel** | whiteintel.io | Dark web leak search | Darknet |
| **SpyCloud** | spycloud.com | Comprometimento corporativo | Breach |

### Brasileiras específicas:
- **SINESP CPF** (restrito LE) — integração futura via API oficial
- **REDS/BOINT** — consulta operacional direta
- **CNH/CRLV** — via sistemas SIGM/INFOVIA

---

## 2. REDES SOCIAIS & MONITORAMENTO (Prioridade: ALTA)

| Plataforma | Ferramenta | Capacidade |
|------------|------------|------------|
| **Instagram** | [Osmedeus](https://github.com/j3ssie/osmedeus) | Workflow engine + recon |
| **Twitter/X** | [Tookie](https://github.com/ArtemBay/tookie-osint) | Busca por username |
| **TikTok** | [TikTok-OSINT](https://github.com/amitlzkpa/tiktok-osint) | Video/user analysis |
| **Telegram** | [Telegago](https://github.com/ItIsMeCall911/Awesome-Telegram-OSINT) | Grupos/channels search |
| **WhatsApp** | [WhatsMyName](https://whatsmyname.app/) | Username enumeration |
| **Discord** | [DiscordLeaks](https://discordleaks.unicornriot.ninja/discord/server/) | Leaked servers |

### Ferramentas unificadas:
- **WhatsMyName** — enumera username em 500+ sites
- **FaceCheck.ID** — reconhecimento facial reverso
- **SpiderFoot** — 200+ módulos de coleta automatizada

---

## 3. GEOLOCALIZAÇÃO & IMAGENS (Prioridade: ALTA)

| Ferramenta | URL | Uso |
|------------|-----|-----|
| **GeoGuessr** (prática) | geoguessr.com | Treino análise de imagens |
| **SunCalc** | suncalc.org | Determinar hora por sombras |
| **FotoForensics** | fotoforensics.com | Análise de manipulação |
| **Jeffrey's EXIF Viewer** | exif.regex.info | Metadados de imagem |
| **Google Lens** | lens.google.com | Busca visual reversa |
| **Yandex Images** | yandex.com/images | Busca reversa (melhor que Google) |
| **TinEye** | tineye.com | Busca reversa por similaridade |

### Veículos (Brasil):
- **Mercado Livre/OLX** — busca por placa parcial
- **Fipe/Zap** — histórico de anúncios
- **RadarBot** (app) — comunidade de alertas

---

## 4. INFRAESTRUTURA & DOMÍNIOS (Prioridade: MÉDIA)

| Ferramenta | URL | Capacidade |
|------------|-----|------------|
| **Shodan** | shodan.io | Dispositivos conectados |
| **Censys** | censys.io | Asset discovery |
| **FOFA** | fofa.info | Busca cyberspace (China) |
| **VirusTotal** | virustotal.com | Análise de URLs/arquivos |
| **URLScan** | urlscan.io | Scan de websites |
| **CRT.sh** | crt.sh | Certificados SSL/TLS |
| **DNSDumpster** | dnsdumpster.com | Mapeamento DNS |

---

## 5. CRYPTOCURRENCY & FINANCEIRO (Prioridade: ALTA)

| Ferramenta | URL | Blockchain |
|------------|-----|------------|
| **Etherscan** | etherscan.io | Ethereum |
| **BscScan** | bscscan.com | BNB Smart Chain |
| **PolygonScan** | polygonscan.com | Polygon |
| **Solscan** | solscan.io | Solana |
| **Chainabuse** | chainabuse.com | Reportar/endereços scam |
| **MistTrack** | misttrack.io | AML risk score |
| **TRM Labs** | trmlabs.com | Enterprise (restrito LE) |

### Brasileiras:
- **Receita Federal CNPJ** — dados públicos de empresa
- **BCB CPF/CNPJ** — consulta situação cadastral
- **SERASA Experian** (API restrita) — dados cadastrais

---

## 6. THREAT INTELLIGENCE & DARKNET (Prioridade: MÉDIA)

| Fonte | URL | Acesso |
|-------|-----|--------|
| **GreyNoise** | greynoise.io | API disponível |
| **Abuse.ch** | abuse.ch | Malware hashes/IOC |
| **URLHaus** | urlhaus.abuse.ch | URLs maliciosas |
| **ThreatFox** | threatfox.abuse.ch | IOC sharing |
| **PSBDMP** | psbdmp.ws | Pastebin dumps |
| **Leak-Lookup** | leak-lookup.com | 3B+ records |

---

## 7. OSINT BRASIL — ESPECÍFICOS NACIONAIS

| Fonte | URL | Tipo |
|-------|-----|------|
| **Portal da Transparência** | portaldatransparencia.gov.br | Gastos públicos, salários |
| **Diário Oficial da União** | in.gov.br/leis | Publicações oficiais |
| **TSE CEPESP** | cepesp.io | Dados eleitorais |
| **IBGE Cidades** | ibge.gov.br | Dados demográficos |
| **CNEFE** | ibge.gov.br/geociencias/organizacao-do-territorio/tipos-e-categorias-de- enderecos.html | Endereços oficiais |
| **DETRANs estaduais** | — | Consulta veículos (parcial) |
| **Tribunais (TJ/TRE/TRF)** | jurisprudencia | Processos públicos |
| **SINTEGRA** | — | Cadastro de contribuintes ICMS |

---

## 8. FERRAMENTAS DE ANÁLISE & AUTOMATION

| Categoria | Ferramenta | Uso |
|-----------|------------|-----|
| **Link Analysis** | Maltego CE | Visualização de conexões |
| **Recon Framework** | Recon-ng | Módulos de coleta |
| **Attack Surface** | Amass | Mapeamento de superfície |
| **Vulnerability** | Nuclei | Scanner YAML-based |
| **Crawling** | Katana | Spider moderno |
| **Content Discovery** | Feroxbuster | Directory busting |

---

## 9. LLM/AI PARA OSINT (Emergente)

| Ferramenta | URL | Uso |
|------------|-----|-----|
| **OSINT LLM (HF)** | huggingface.co | Assistente OSINT |
| **NotebookLM** | notebooklm.google | Análise de documentos |
| **Perplexity** | perplexity.ai | Search com sources |
| **Claude/GPT** | — | Análise de textos/longos |
| **Garak** | github.com/leondz/garak | Teste de vulnerabilidades LLM |

---

## 10. INTEGRAÇÃO RECOMENDADA PARA INTELINK

### Prioridade P0 (Imediato):
1. **Shodan API** — mapeamento de infraestrutura de suspeitos
2. **HaveIBeenPwned** — verificação de comprometimento
3. **VirusTotal** — análise de arquivos/links
4. **GeoGuessr treino** — capacitação analistas

### Prioridade P1 (Curto prazo):
1. **Maltego** — link analysis visual
2. **SpiderFoot** — automação de recon
3. **Chainabuse** — rastreamento crypto
4. **Intelligence X** — arquivo de dados

### Prioridade P2 (Médio prazo):
1. **GreyNoise** — threat intel
2. **FOFA/BinaryEdge** — alternativas Shodan
3. **TRM Labs** (se parceria LE) — crypto AML enterprise
4. **FaceCheck.ID** — reconhecimento facial (questões LGPD)

---

## METADADOS DE CURADORIA

```yaml
curator: cascade-agent
source_repo: Astrosp/Awesome-OSINT-For-Everything
date: 2026-04-08
total_sources_original: 500+
total_sources_curated: 78
filter_criteria:
  - relevance_police: alta
  - lgpd_compliance: verificada onde aplicável
  - api_availability: preferida
  - brazilian_focus: inclusa quando relevante
excluded_categories:
  - Bug Bounty (fora escopo policial)
  - Gaming/Steam (baixa relevância)
  - General AI tools (não-OSINT)
  - Marketing/SEO tools
```

---

*Documento gerado para Intelink — EGOS Inteligência. Uso restrito a operações policiais conforme LGPD e procedimentos internos.*
