# Capacitação OSINT — GeoGuessr & Análise Geoespacial

> **Task:** OSINT-005 | **Status:** Documentação de Treinamento  
> **Público-alvo:** Analistas de inteligência, investigadores, policiais  
> **Nível:** Iniciante → Intermediário → Avançado

---

## 🎯 Objetivos de Aprendizagem

Ao completar este treinamento, o analista será capaz de:

1. **Identificar localizações** a partir de imagens/vídeos sem metadados
2. **Analisar padrões geográficos** em dados de investigação
3. **Utilizar ferramentas OSINT geoespaciais** (Google Earth, Street View, Mapillary)
4. **Extrair inteligência** de dados de localização (GPS, redes sociais)
5. **Correlacionar eventos** por proximidade geográfica

---

## 📚 Módulos do Treinamento

### Módulo 1: Fundamentos de Geolocalização (4h)

#### 1.1 Conceitos Básicos
- Sistemas de coordenadas (WGS84, SAD69)
- Precisão GPS: 5m vs 50m vs 500m
- Metadados EXIF em imagens
- Rastros digitais de localização

#### 1.2 Ferramentas Essenciais
```
Google Earth Pro (gratuito)
Google Street View
Mapillary (crowdsourced street view)
OpenStreetMap
What3Words (sistema de endereçamento alternativo)
SunCalc (posição do sol para determinar hora/direção)
```

#### 1.3 Exercício Prático 1
**Desafio:** Identificar a localização exata desta imagem:
- Imagem: [rua_com_predios_coloniais.jpg]
- Dicas visuais: Placas, arquitetura, vegetação, placas de trânsito
- Tempo: 30 minutos
- Resposta: Rua dos Tupiniquins, Ouro Preto, MG

---

### Módulo 2: GeoGuessr Profissional (8h)

#### 2.1 Modo de Treinamento
- Mapa "Brasil" (familiarização nacional)
- Mapa "World" (diversidade global)
- Mapa "Famous Places" (landmarks reconhecíveis)

#### 2.2 Técnicas Avançadas
| Técnica | Aplicação | Exemplo |
|---------|-----------|---------|
| **Vegetação** | Identificar bioma | Cerrado ≠ Mata Atlântica |
| **Solar** | Determinar hemisfério/hora | Posição das sombras |
| **Linguagem** | País/região | Placas, arquitetura |
| **Topografia** | Relevo local | Montanha vs planície |
| **Infraestrutura** | Nível de desenvolvimento | Estradas, postes, fiação |

#### 2.3 Exercício Prático 2 — Desafios GeoGuessr

**Desafio A: Centro-Oeste**
- Vegetação: Cerrado com chapada
- Solo vermelho característico
- Placas em português
- **Resposta:** Goiás/Tocantins

**Desafio B: Nordeste**
- Vegetação: Caatinga semiárida
- Arquitetura colonial
- Sinalização turística
- **Resposta:** Serra da Capivara, PI

**Desafio C: Sul**
- Vegetação: Campos/Pampa
- Arquitetura germânica/italiana
- Placas bilíngues
- **Resposta:** Gramado, RS

---

### Módulo 3: OSINT Geoespacial em Investigações (8h)

#### 3.1 Fontes de Dados Geográficos

**Fontes Públicas (LGPD-compliant):**
- ANA: Dados de bacias hidrográficas
- INCRA: SIGTERRA (territórios quilombolas)
- IBGE: Malhas municipais, setores censitários
- ICMBio: Unidades de conservação
- DENATRAN: Radar/SIMRA (dados agregados)

**Fontes Comerciais:**
- Google Maps API (custos aplicam-se)
- Mapbox
- HERE Technologies

#### 3.2 Técnicas de Análise

**Análise de Movimentação:**
```
Input: Check-ins de rede social (fictícios)
Timeline:
  14:30 - Shopping Pátio Savassi, BH
  15:45 - Parque Municipal, BH  
  17:00 - Aeroporto Confins, BH
Análise: Deslocamento dentro da RMBH, provável residente
```

**Análise de Concentração:**
```
Heatmap de ocorrências:
  - Furto: Cluster no bairro Funcionários
  - Roubo: Dispersão ao longo de avenidas
  - Conclusão: Padrão de oportunidade vs planejamento
```

**Análise de Rota:**
```
Input: Placas de veículos (consulta a base de dados)
Rota identificada: Belo Horizonte → São Paulo → Rio de Janeiro
Tempo médio: 8h entre cidades
Pontos de parada: Postos BR-381
```

#### 3.3 Exercício Prático 3 — Caso Investigativo

**Cenário:**
> Suspeito posta fotos em redes sociais. Identificar rotina e possíveis locais de residência/trabalho.

**Dados fornecidos:**
- Foto 1: Café na manhã, background: "Padaria Real"
- Foto 2: Academia à noite, espelho reflete "Smart Fit - BH Shopping"
- Foto 3: Final de semana, parque com lago

**Tarefas:**
1. Geolocalizar cada foto
2. Determinar área provável de residência
3. Mapear rotina diária
4. Identificar gaps na rotina (possíveis pontos de interesse)

---

### Módulo 4: Ferramentas Técnicas (4h)

#### 4.1 ExifTool — Extração de Metadados
```bash
# Instalar
sudo apt install libimage-exiftool-perl

# Extrair GPS
exiftool -gpslatitude -gpslongitude -c "%+.6f" imagem.jpg

# Extrair todos os metadados
exiftool -a -u -g1 imagem.jpg > metadata.txt
```

#### 4.2 Python para Análise Geoespacial
```python
import exifread
from geopy.geocoders import Nominatim
import folium

# Ler EXIF
with open('imagem.jpg', 'rb') as f:
    tags = exifread.process_file(f)
    lat = tags.get('GPS GPSLatitude')
    lon = tags.get('GPS GPSLongitude')

# Geocoding reverso
geolocator = Nominatim(user_agent="osint_training")
location = geolocator.reverse(f"{lat}, {lon}")
print(location.address)

# Visualizar no mapa
mapa = folium.Map(location=[lat, lon], zoom_start=15)
folium.Marker([lat, lon], popup=location.address).add_to(mapa)
mapa.save('mapa.html')
```

#### 4.3 ETL de Dados Geoespaciais
```python
# Script fornecido em: api/scripts/etl_pipeline_template.py
# Exemplo: Carregar dados ANA para Neo4j
from api.scripts.etl_pipeline_template import run_pipeline
run_pipeline('ana_bacias')
```

---

## 🎓 Sistema de Avaliação

### Quiz Teórico (20%)
- 20 questões de múltipla escolha
- Mínimo 70% para aprovação

### Desafios Práticos (40%)
- 5 desafios GeoGuessr (tempo + precisão)
- 2 análises de caso investigativo

### Projeto Final (40%)
**Entregável:** Relatório de análise geoespacial completo

**Requisitos:**
- Mínimo 10 pontos de dados geoespaciais analisados
- Heatmap de concentração
- Timeline de movimentação
- Correlações identificadas
- Recomendações investigativas

---

## 📊 Métricas de Sucesso

| Métrica | Meta | Como Medir |
|---------|------|------------|
| Precisão GeoGuessr | < 100km média | Plataforma GeoGuessr |
| Tempo de identificação | < 15 min/foto | Exercícios práticos |
| Casos resolvidos | 1/mês | Sistema interno 852 |
| Satisfação | > 4.0/5.0 | Pesquisa pós-treinamento |

---

## 🛠️ Recursos Complementares

### Plataformas de Treinamento
- [GeoGuessr Free](https://www.geoguessr.com/free) — Modo gratuitos
- [GeoGuessr Pro](https://www.geoguessr.com/pro) — Mapas ilimitados

### Comunidades
- r/GeoGuessr — Discussões e dicas
- OSINT Curious Discord — Canal #geolocation

### Leitura Recomendada
- "Open Source Intelligence Techniques" — Michael Bazzell (Cap. 6: Geolocation)
- "Geolocation in OSINT" — OSINTCurious blog series

---

## ✅ Checklist de Implementação

- [x] Estrutura do treinamento definida
- [ ] Slides apresentáveis (Google Slides/Canva)
- [ ] Vídeos explicativos (Loom/YouTube privado)
- [ ] Quiz online (Google Forms/Typeform)
- [ ] Plataforma de desafios (GeoGuessr turma virtual)
- [ ] Certificados de conclusão
- [ ] Acompanhamento pós-treinamento (30-60-90 dias)

---

## 🚀 Próximos Passos

1. **P0 (Esta semana):** Criar turma piloto com 5 analistas
2. **P1 (Próximo mês):** Executar primeiro ciclo completo
3. **P2 (Trimestre):** Avaliar resultados e iterar
4. **P3 (Semestre):** Escalar para todas as unidades

---

**Instrutor Responsável:** [A definir]  
**Coordenação Técnica:** EGOS Inteligência — Unidade de Capacitação  
**Contato:** treinamento@egos.ia.br

---

*Documento criado em: 2026-04-08*  
*Versão: 1.0*  
*Sacred Code: 000.111.369.963.1618*
