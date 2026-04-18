# EGOS Inteligência — Terraform Variables

variable "hcloud_token" {
  description = "Hetzner Cloud API Token (obter em console.hetzner.cloud)"
  type        = string
  sensitive   = true
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token (obter em dash.cloudflare.com)"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID para domínio intelink.ia.br"
  type        = string
}

variable "environment" {
  description = "Ambiente de deploy (production, staging, dev)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["production", "staging", "dev"], var.environment)
    error_message = "Environment deve ser production, staging ou dev."
  }
}

variable "ssh_public_key" {
  description = "Chave SSH pública para acesso ao servidor"
  type        = string
}

variable "server_type" {
  description = "Tipo de servidor Hetzner"
  type        = string
  default     = "cx42"  # 4 vCPUs, 16 GB RAM

  validation {
    condition     = contains(["cx22", "cx32", "cx42", "cx52", "cpx21", "cpx31", "cpx41", "cpx51"], var.server_type)
    error_message = "Tipo de servidor inválido. Ver opções em hetzner.com/cloud"
  }
}

variable "volume_size" {
  description = "Tamanho do volume de dados em GB"
  type        = number
  default     = 100

  validation {
    condition     = var.volume_size >= 10 && var.volume_size <= 1000
    error_message = "Volume deve estar entre 10 e 1000 GB."
  }
}

variable "location" {
  description = "Região Hetzner (nbg1=Nuremberg, fsn1=Falkenstein, hel1=Helsinki)"
  type        = string
  default     = "nbg1"

  validation {
    condition     = contains(["nbg1", "fsn1", "hel1"], var.location)
    error_message = "Região inválida. Use nbg1, fsn1 ou hel1."
  }
}

variable "enable_backups" {
  description = "Habilitar snapshots automáticos diários"
  type        = bool
  default     = true
}

variable "backup_retention_hours" {
  description = "Tempo de retenção de backups em horas"
  type        = number
  default     = 168  # 7 dias
}

variable "enable_monitoring" {
  description = "Habilitar monitoramento básico"
  type        = bool
  default     = true
}

variable "additional_ssh_keys" {
  description = "Chaves SSH adicionais (lista de strings)"
  type        = list(string)
  default     = []
}

variable "alert_email" {
  description = "Email para alertas de segurança e manutenção"
  type        = string
  default     = ""
}
