# EGOS Inteligência — Infrastructure as Code
# Provider: Hetzner Cloud
# Purpose: Provisionamento completo de infraestrutura

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  backend "local" {
    path = "terraform.tfstate"
  }
}

# Providers
provider "hcloud" {
  token = var.hcloud_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Variables
variable "hcloud_token" {
  description = "Hetzner Cloud API Token"
  type        = string
  sensitive   = true
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for intelink.ia.br"
  type        = string
}

variable "environment" {
  description = "Environment (production, staging)"
  type        = string
  default     = "production"
}

variable "ssh_public_key" {
  description = "SSH Public Key for server access"
  type        = string
}

# SSH Key
resource "hcloud_ssh_key" "egos_admin" {
  name       = "egos-admin-${var.environment}"
  public_key = var.ssh_public_key
}

# Firewall — apenas portas necessárias
resource "hcloud_firewall" "egos_firewall" {
  name = "egos-firewall-${var.environment}"

  # SSH
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = ["0.0.0.0/0"]
    description = "SSH access"
  }

  # HTTP
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0"]
    description = "HTTP (redirect to HTTPS)"
  }

  # HTTPS
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  # Docker Swarm (se usar)
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "2377"
    source_ips = ["10.0.0.0/8"]
    description = "Docker Swarm management"
  }
}

# Volume para dados persistentes
resource "hcloud_volume" "egos_data" {
  name      = "egos-data-${var.environment}"
  size      = 100
  server_id = hcloud_server.egos.id
  format    = "ext4"
  delete_protection = true
}

# Servidor Principal (CX42 — 4 vCPUs, 16 GB RAM)
resource "hcloud_server" "egos" {
  name        = "egos-inteligencia-${var.environment}"
  server_type = "cx42"
  image       = "ubuntu-22.04"
  location    = "nbg1"  # Nuremberg
  ssh_keys    = [hcloud_ssh_key.egos_admin.id]
  firewall_ids = [hcloud_firewall.egos_firewall.id]

  labels = {
    environment = var.environment
    project     = "egos-inteligencia"
    managed_by  = "terraform"
  }

  # Cloud-init para inicialização
  user_data = templatefile("${path.module}/cloud-init.yml", {
    environment = var.environment
  })

  depends_on = [hcloud_volume.egos_data]
}

# DNS Records — Cloudflare
resource "cloudflare_record" "intelink_root" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  type    = "A"
  value   = hcloud_server.egos.ipv4_address
  ttl     = 300
  proxied = true
}

resource "cloudflare_record" "intelink_www" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  type    = "CNAME"
  value   = "intelink.ia.br"
  ttl     = 300
  proxied = true
}

resource "cloudflare_record" "intelink_api" {
  zone_id = var.cloudflare_zone_id
  name    = "api"
  type    = "A"
  value   = hcloud_server.egos.ipv4_address
  ttl     = 300
  proxied = true
}

# Snapshots automáticos (backup)
resource "hcloud_snapshot_schedule" "egos_backup" {
  server_id = hcloud_server.egos.id

  # Diariamente às 3h da manhã
  crontab = "0 3 * * *"

  # Retenção: 7 dias
  delete_after = 168  # horas
}

# Outputs
output "server_ip" {
  description = "IP do servidor EGOS"
  value       = hcloud_server.egos.ipv4_address
}

output "server_id" {
  description = "ID do servidor Hetzner"
  value       = hcloud_server.egos.id
}

output "volume_id" {
  description = "ID do volume de dados"
  value       = hcloud_volume.egos_data.id
}

output "dns_records" {
  description = "DNS records criados"
  value = {
    root = cloudflare_record.intelink_root.hostname
    www  = cloudflare_record.intelink_www.hostname
    api  = cloudflare_record.intelink_api.hostname
  }
}
