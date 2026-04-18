# EGOS Inteligência — Ansible Playbook

> **Versão:** 1.0.0  
> **Purpose:** Provisionamento automatizado de servidor Ubuntu 22.04

---

## 🚀 Quick Start

### 1. Instalar Ansible

```bash
# macOS
brew install ansible

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install ansible

# Verificar
ansible --version  # >= 2.14
```

### 2. Configurar Inventário

```bash
# Editar o arquivo de inventário
vim inventory/production

# Atualizar IP do servidor e SSH key path
```

### 3. Executar Playbook

```bash
# Testar conectividade
ansible -i inventory/production egos_servers -m ping

# Executar playbook (dry-run)
ansible-playbook -i inventory/production playbook.yml --check --diff

# Executar playbook (real)
ansible-playbook -i inventory/production playbook.yml
```

---

## 📋 O que é Configurado

### Sistema Base
- ✅ Ubuntu 22.04 LTS atualizado
- ✅ Timezone: America/Sao_Paulo
- ✅ Pacotes essenciais (git, curl, vim, htop, etc.)

### Segurança
- ✅ UFW (Uncomplicated Firewall) — apenas 22, 80, 443
- ✅ Fail2ban — proteção contra brute force
- ✅ Unattended-upgrades — atualizações automáticas de segurança
- ✅ SSH hardening (desabilitado password login)

### Docker
- ✅ Docker CE (última versão)
- ✅ Docker Compose plugin
- ✅ Usuário `deploy` no grupo docker

### Monitoramento
- ✅ Node Exporter (métricas do sistema)
- ✅ Scripts de health check

### Automação
- ✅ Script `egos-health` — verificação de saúde
- ✅ Script `egos-backup` — backup diário
- ✅ Script `egos-deploy` — deploy automatizado
- ✅ Cron jobs para backup e health checks

---

## 🔧 Comandos Úteis

### Check Mode (Dry Run)
```bash
ansible-playbook -i inventory/production playbook.yml --check
```

### Limitar a Tasks Específicas
```bash
# Apenas segurança
ansible-playbook -i inventory/production playbook.yml --tags security

# Apenas Docker
ansible-playbook -i inventory/production playbook.yml --tags docker
```

### Verbose Output
```bash
ansible-playbook -i inventory/production playbook.yml -v
ansible-playbook -i inventory/production playbook.yml -vvv  # mais detalhes
```

### Ad-hoc Commands
```bash
# Verificar uptime
ansible -i inventory/production egos_servers -a "uptime"

# Verificar espaço em disco
ansible -i inventory/production egos_servers -a "df -h"

# Verificar containers Docker
ansible -i inventory/production egos_servers -a "docker ps"

# Verificar logs
ansible -i inventory/production egos_servers -a "tail -n 50 /opt/egos-inteligencia/logs/health.log"
```

---

## 📁 Estrutura

```
ansible/
├── playbook.yml              # Playbook principal
├── inventory/
│   └── production            # Inventário de produção
├── templates/
│   ├── fail2ban.local.j2     # Configuração Fail2ban
│   ├── egos-health.sh.j2     # Script health check
│   ├── egos-backup.sh.j2     # Script backup
│   ├── egos-deploy.sh.j2     # Script deploy
│   ├── node-exporter.service.j2  # Systemd service
│   └── unattended-upgrades.j2    # Auto-updates
└── README.md                 # Este arquivo
```

---

## 🔒 Segurança

### Firewall (UFW)

| Porta | Serviço | Origem |
|-------|---------|--------|
| 22 | SSH | 0.0.0.0/0 |
| 80 | HTTP | 0.0.0.0/0 |
| 443 | HTTPS | 0.0.0.0/0 |

### Fail2ban

- **SSH:** 3 tentativas → ban 2 horas
- **Docker:** 10 tentativas → ban 1 hora
- **API:** 20 req/min → ban 1 hora

### Usuário de Deploy

- Username: `deploy`
- Sem senha (SSH key only)
- Sudo sem senha
- Membro do grupo `docker`

---

## 🔄 CI/CD Integration

### GitHub Actions

Veja `.github/workflows/ansible.yml` para pipeline de execução automática.

### Execução Manual

```bash
# Exportar variáveis
export ANSIBLE_HOST_KEY_CHECKING=False

# Executar
ansible-playbook -i inventory/production playbook.yml
```

---

## 📊 Scripts Automáticos

### egos-health
Verifica saúde de todos os serviços.

```bash
# Manual
/usr/local/bin/egos-health

# Saída esperada:
# ✅ Docker (4 containers running)
# ✅ API (port 8000)
# ✅ Frontend (port 3000)
# ✅ Disk usage (23%)
# ✅ Memory usage (45%)
# ✅ Load average (0.50)
```

### egos-backup
Backup automatizado de dados.

```bash
# Manual
/usr/local/bin/egos-backup

# Cron (automático diário às 2h)
0 2 * * * deploy /usr/local/bin/egos-backup

# O que é backup:
# - Neo4j database dump
# - Redis persistence
# - Caddy certificates
# - .env e configurações
```

### egos-deploy
Deploy automatizado da aplicação.

```bash
# Manual
/usr/local/bin/egos-deploy [branch]

# Default: main branch
# 1. Git pull
# 2. Docker compose build
# 3. Docker compose up -d
# 4. Health check
```

---

## 🆘 Troubleshooting

### Erro: "SSH permission denied"
```bash
# Verificar chave SSH
ssh-add ~/.ssh/id_ed25519
ssh -i ~/.ssh/id_ed25519 root@204.168.217.125
```

### Erro: "Python not found"
```bash
# O playbook usa ansible_python_interpreter=/usr/bin/python3
# Verificar no servidor
ssh root@204.168.217.125 "which python3"
```

### Serviços não iniciam
```bash
# Verificar logs
journalctl -u node-exporter -f

# Verificar Docker
docker compose logs -f
```

---

## 📝 Variáveis

Variáveis podem ser definidas em:

1. **Inventory file:** `inventory/production`
2. **Group vars:** `group_vars/egos_servers.yml`
3. **Host vars:** `host_vars/intelink.ia.br.yml`
4. **Command line:** `--extra-vars "environment=staging"`

### Variáveis Principais

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `app_dir` | `/opt/egos-inteligencia` | Diretório da aplicação |
| `deploy_user` | `deploy` | Usuário de deploy |
| `environment` | `production` | Ambiente |
| `alert_email` | `""` | Email para alertas |
| `backup_retention_days` | `7` | Dias de retenção de backup |
| `s3_backup_bucket` | `""` | Bucket S3 para backups |

---

## 📚 Referências

- [Ansible Documentation](https://docs.ansible.com/)
- [Ansible Best Practices](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_best_practices.html)
- [Hetzner Cloud](https://docs.hetzner.com/cloud/)

---

## ✅ Checklist

- [ ] Ansible instalado (>= 2.14)
- [ ] SSH key gerada (`ssh-keygen -t ed25519`)
- [ ] Inventário configurado com IP correto
- [ ] Conectividade testada (`ansible -m ping`)
- [ ] Playbook executado com sucesso
- [ ] Docker funcionando (`docker ps`)
- [ ] Health check passando (`egos-health`)
- [ ] Backup configurado (cron job ativo)

---

*Ansible Automation — EGOS Inteligência v1.0*
