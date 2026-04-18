# EGOS Inteligência — Infrastructure as Code (Terraform)

> **Versão:** 1.0.0  
> **Provider:** Hetzner Cloud + Cloudflare  
> **Propósito:** Provisionamento automatizado de infraestrutura

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare DNS + Proxy                    │
│                    (intelink.ia.br)                        │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Hetzner Cloud — CX42 (4 vCPUs, 16 GB RAM)                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Ubuntu 22.04 LTS                                        ││
│  │  ├── Docker + Docker Compose                             ││
│  │  ├── Caddy (reverse proxy + TLS)                         ││
│  │  ├── UFW Firewall                                        ││
│  │  └── Fail2ban                                            ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Neo4j     │  │   Redis     │  │  EGOS API/Frontend  │  │
│  │  (Graph DB) │  │   (Cache)   │  │    (Docker)         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Hetzner Volume — 100 GB SSD (dados persistentes)            │
│  ├── /data/neo4j    (graph database)                         │
│  ├── /data/redis    (session cache)                        │
│  └── /data/caddy    (TLS certificates)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Instalar Terraform

```bash
# macOS
brew install terraform

# Linux
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Verificar
terraform -v  # >= 1.5.0
```

### 2. Configurar Credenciais

```bash
# Copiar arquivo de exemplo
cp terraform.tfvars.example terraform.tfvars

# Editar com valores reais
vim terraform.tfvars
```

#### Variáveis Necessárias:

| Variável | Como Obter |
|----------|------------|
| `hcloud_token` | [Hetzner Console](https://console.hetzner.cloud) → Project → Security → API Tokens |
| `cloudflare_api_token` | [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) → Create Token (Zone:Read, DNS:Edit) |
| `cloudflare_zone_id` | Cloudflare Dashboard → intelink.ia.br → Overview → Zone ID |
| `ssh_public_key` | `cat ~/.ssh/id_ed25519.pub` |

### 3. Inicializar e Aplicar

```bash
terraform init
terraform plan
terraform apply
```

---

## 📋 Comandos Úteis

### Plan (Preview)
```bash
terraform plan -out=tfplan
```

### Apply
```bash
terraform apply tfplan
# ou diretamente
terraform apply -auto-approve
```

### Destroy (⚠️ Cuidado!)
```bash
terraform destroy
# Requer confirmação
```

### State Management
```bash
# Ver state atual
terraform show

# Listar recursos
terraform state list

# Ver detalhes de um recurso
terraform state show hcloud_server.egos

# Importar recurso existente
terraform import hcloud_server.egos [SERVER_ID]
```

---

## 🔧 Workspaces (Multi-Environment)

```bash
# Criar workspaces
terraform workspace new staging
terraform workspace new production

# Listar
terraform workspace list

# Selecionar
terraform workspace select staging

# Aplicar com variáveis específicas
terraform apply -var-file=staging.tfvars
```

---

## 📊 Recursos Criados

| Recurso | Descrição | Custo Estimado |
|---------|-----------|----------------|
| `hcloud_server.egos` | CX42 (4 vCPUs, 16 GB) | €16.72/mês |
| `hcloud_volume.egos_data` | 100 GB SSD | €5.50/mês |
| `hcloud_firewall.egos_firewall` | Firewall (gratuito) | €0 |
| `cloudflare_record.*` | DNS records (gratuito) | €0 |
| **Total** | | **~€22/mês (~R$120)** |

---

## 🔒 Segurança

### Firewall Rules (Hetzner + UFW)

| Porta | Protocolo | Origem | Propósito |
|-------|-----------|--------|-----------|
| 22 | TCP | 0.0.0.0/0 | SSH (Fail2ban protegido) |
| 80 | TCP | 0.0.0.0/0 | HTTP → HTTPS redirect |
| 443 | TCP | 0.0.0.0/0 | HTTPS (Caddy + Cloudflare) |

### Boas Práticas

1. **SSH Key Only** — Nunca use senha para SSH
2. **Cloudflare Proxy** — Esconde IP real do servidor
3. **UFW + Fail2ban** — Proteção contra brute force
4. **Unattended Upgrades** — Atualizações automáticas de segurança
5. **Daily Backups** — Snapshots automáticos (7 dias retenção)

---

## 🔄 CI/CD Integration

### GitHub Actions

Veja `.github/workflows/terraform.yml` para pipeline de deploy automatizado.

### Local Development

```bash
# Formatar código
terraform fmt

# Validar
terraform validate

# Verificar segurança (tfsec)
tfsec .

# Docs automático (terraform-docs)
terraform-docs markdown . > TERRAFORM.md
```

---

## 🆘 Troubleshooting

### Erro: "API token invalid"
```bash
# Verificar token
export HCLOUD_TOKEN="seu-token"
hcloud server list
```

### Erro: "SSH key already exists"
```bash
# Importar chave existente
terraform import hcloud_ssh_key.egos_admin [KEY_ID]
```

### Servidor não responde após apply
```bash
# Verificar cloud-init logs
ssh root@[IP] "tail -f /var/log/cloud-init-output.log"

# Verificar Docker
ssh root@[IP] "docker ps"
```

---

## 📚 Referências

- [Hetzner Cloud Terraform Provider](https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs)
- [Cloudflare Terraform Provider](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)
- [Hetzner Pricing](https://www.hetzner.com/cloud/)

---

## ✅ Checklist de Deploy

- [ ] Terraform instalado (>= 1.5.0)
- [ ] `terraform.tfvars` configurado
- [ ] Hetzner API token válido
- [ ] Cloudflare API token válido
- [ ] SSH key pair gerado (`ssh-keygen -t ed25519`)
- [ ] `terraform plan` executado e revisado
- [ ] `terraform apply` concluído com sucesso
- [ ] DNS propagation verificado (`dig intelink.ia.br`)
- [ ] SSH access testado (`ssh root@[IP]`)
- [ ] Cloud-init finalizado (`tail /var/log/cloud-init-output.log`)
- [ ] Docker funcionando (`docker run hello-world`)

---

*Infrastructure as Code — EGOS Inteligência v1.0*
