"""OSINT Brasil tools for EGOS Inteligência.

Integrations:
- HaveIBeenPwned (HIBP): Email breach monitoring
- Shodan: Internet-exposed services and devices
- Image analysis: Metadata extraction and geolocation hints

Following OSINT_BRASIL_TOOLKIT.md standards and LGPD compliance.
"""

import hashlib
import logging
import os
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus

import httpx
from PIL import Image
from PIL.ExifTags import GPSTAGS, TAGS

logger = logging.getLogger(__name__)

# API Keys from environment
HIBP_API_KEY = os.environ.get("HIBP_API_KEY", "")
SHODAN_API_KEY = os.environ.get("SHODAN_API_KEY", "")

# HIBP API v3
HIBP_BASE_URL = "https://haveibeenpwned.com/api/v3"
HIBP_HEADERS = {
    "User-Agent": "EGOS-Inteligencia-OSINT",
    "Accept": "application/json",
}

# Shodan API
SHODAN_BASE_URL = "https://api.shodan.io"


async def hibp_check_email(email: str) -> dict[str, Any]:
    """Check email against HaveIBeenPwned breach database.
    
    LGPD Note: Only checks breach exposure, not content. No PII stored.
    Rate limit: 1.5s between requests (HIBP requirement).
    """
    if not HIBP_API_KEY:
        logger.warning("HIBP_API_KEY not configured")
        return {
            "error": "HIBP_API_KEY not configured",
            "email": _mask_email(email),
            "breaches": [],
            "status": "unconfigured"
        }
    
    # Hash email for logging (privacy)
    email_hash = hashlib.sha256(email.lower().encode()).hexdigest()[:16]
    
    headers = {
        **HIBP_HEADERS,
        "hibp-api-key": HIBP_API_KEY,
    }
    
    try:
        # Check breached accounts
        encoded_email = quote_plus(email)
        url = f"{HIBP_BASE_URL}/breachedaccount/{encoded_email}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=headers)
            
            if resp.status_code == 404:
                # No breaches found - good news!
                return {
                    "email": _mask_email(email),
                    "email_hash": email_hash,
                    "breaches_found": 0,
                    "breaches": [],
                    "exposed_data_types": [],
                    "status": "clean",
                    "message": "Email não encontrado em vazamentos conhecidos",
                    "fonte": "Have I Been Pwned (Troy Hunt)",
                }
            
            if resp.status_code == 429:
                logger.warning("HIBP rate limit exceeded")
                return {
                    "email": _mask_email(email),
                    "error": "Rate limit exceeded. Wait 1.5s between requests.",
                    "status": "rate_limited"
                }
            
            resp.raise_for_status()
            breaches = resp.json()
            
            # Process breach data
            processed_breaches = []
            all_data_types = set()
            
            for breach in breaches:
                data_classes = breach.get("DataClasses", [])
                all_data_types.update(data_classes)
                
                processed_breaches.append({
                    "name": breach.get("Name", ""),
                    "title": breach.get("Title", ""),
                    "domain": breach.get("Domain", ""),
                    "breach_date": breach.get("BreachDate", ""),
                    "added_date": breach.get("AddedDate", ""),
                    "data_classes": data_classes,
                    "is_verified": breach.get("IsVerified", False),
                    "is_sensitive": breach.get("IsSensitive", False),
                    "description": breach.get("Description", "")[:200],
                })
            
            # Assess risk level
            risk_level = _assess_breach_risk(processed_breaches, all_data_types)
            
            return {
                "email": _mask_email(email),
                "email_hash": email_hash,
                "breaches_found": len(processed_breaches),
                "breaches": processed_breaches,
                "exposed_data_types": sorted(all_data_types),
                "high_risk_data": _get_high_risk_data(all_data_types),
                "risk_level": risk_level,
                "status": "compromised" if processed_breaches else "clean",
                "recommendation": _generate_recommendation(risk_level, all_data_types),
                "fonte": "Have I Been Pwned (Troy Hunt)",
                "lgpd_note": "Dados de vazamento públicos. Nenhum conteúdo armazenado.",
            }
            
    except httpx.HTTPStatusError as e:
        logger.error("HIBP API error: %s", e)
        return {
            "email": _mask_email(email),
            "error": f"HIBP API error: {e.response.status_code}",
            "status": "error"
        }
    except Exception as e:
        logger.error("HIBP check failed: %s", e)
        return {
            "email": _mask_email(email),
            "error": f"Check failed: {str(e)}",
            "status": "error"
        }


def _mask_email(email: str) -> str:
    """Mask email for privacy: j***@gmail.com"""
    if "@" not in email:
        return email[:2] + "***"
    user, domain = email.split("@", 1)
    if len(user) <= 2:
        return user + "***@" + domain
    return user[0] + "***@" + domain


def _assess_breach_risk(breaches: list[dict], data_types: set) -> str:
    """Assess overall risk level based on breach data."""
    high_risk_types = {"Passwords", "Credit cards", "Bank account numbers", "Health information"}
    medium_risk_types = {"Email addresses", "Phone numbers", "Physical addresses", "Dates of birth"}
    
    has_high = bool(data_types & high_risk_types)
    has_medium = bool(data_types & medium_risk_types)
    
    if has_high:
        return "high"
    elif has_medium or len(breaches) > 3:
        return "medium"
    else:
        return "low"


def _get_high_risk_data(data_types: set) -> list[str]:
    """Return high-risk data types found."""
    high_risk = {"Passwords", "Credit cards", "Bank account numbers", "Health information"}
    return sorted(data_types & high_risk)


def _generate_recommendation(risk_level: str, data_types: set) -> str:
    """Generate actionable recommendation."""
    recs = []
    
    if "Passwords" in data_types:
        recs.append("Mudar senhas imediatamente (senhas vazadas)")
    
    if risk_level == "high":
        recs.append("Ativar 2FA em todas as contas importantes")
        recs.append("Monitorar extratos bancários para atividade suspeita")
    
    if "Email addresses" in data_types:
        recs.append("Estar atento a phishing attempts dirigidos")
    
    if "Phone numbers" in data_types:
        recs.append("Possível aumento de spam calls/SMS")
    
    if not recs:
        recs.append("Manter boas práticas de segurança")
    
    return "; ".join(recs)


async def shodan_host_lookup(ip: str) -> dict[str, Any]:
    """Lookup IP/host in Shodan for exposed services and vulnerabilities.
    
    OSINT Use Cases:
    - Verify exposed services on suspicious IPs
    - Check for known vulnerabilities (CVEs)
    - Map infrastructure of targets
    """
    if not SHODAN_API_KEY:
        return {
            "error": "SHODAN_API_KEY not configured",
            "ip": ip,
            "status": "unconfigured"
        }
    
    try:
        url = f"{SHODAN_BASE_URL}/shodan/host/{ip}?key={SHODAN_API_KEY}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url)
            
            if resp.status_code == 404:
                return {
                    "ip": ip,
                    "found": False,
                    "status": "not_found",
                    "message": "IP não encontrado na base Shodan",
                    "fonte": "Shodan"
                }
            
            resp.raise_for_status()
            data = resp.json()
            
            # Extract relevant fields
            ports = data.get("ports", [])
            services = []
            
            for service in data.get("data", []):
                services.append({
                    "port": service.get("port"),
                    "transport": service.get("transport", ""),
                    "product": service.get("product", ""),
                    "version": service.get("version", ""),
                    "banner": service.get("data", "")[:200] if service.get("data") else "",
                    "cves": service.get("vulns", []),
                })
            
            # Vulnerabilities summary
            vulns = data.get("vulns", {})
            critical_vulns = [v for v, info in vulns.items() if info.get("cvss", 0) >= 9.0]
            high_vulns = [v for v, info in vulns.items() if 7.0 <= info.get("cvss", 0) < 9.0]
            
            return {
                "ip": ip,
                "found": True,
                "status": "found",
                "organization": data.get("org", ""),
                "isp": data.get("isp", ""),
                "asn": data.get("asn", ""),
                "country": data.get("country_name", ""),
                "city": data.get("city", ""),
                "last_update": data.get("last_update", ""),
                "ports": ports,
                "services_count": len(services),
                "services_summary": services[:5],  # Top 5 services
                "os": data.get("os", ""),
                "hostnames": data.get("hostnames", []),
                "domains": data.get("domains", []),
                "vulnerabilities": {
                    "total": len(vulns),
                    "critical": len(critical_vulns),
                    "high": len(high_vulns),
                    "cves": list(vulns.keys())[:10],  # Top 10 CVEs
                },
                "risk_indicators": _shodan_risk_assessment(ports, services, vulns),
                "fonte": "Shodan",
                "query_url": f"https://www.shodan.io/host/{ip}",
            }
            
    except httpx.HTTPStatusError as e:
        logger.error("Shodan API error: %s", e)
        return {
            "ip": ip,
            "error": f"Shodan API error: {e.response.status_code}",
            "status": "error"
        }
    except Exception as e:
        logger.error("Shodan lookup failed: %s", e)
        return {
            "ip": ip,
            "error": f"Lookup failed: {str(e)}",
            "status": "error"
        }


def _shodan_risk_assessment(ports: list, services: list, vulns: dict) -> list[str]:
    """Generate risk indicators from Shodan data."""
    indicators = []
    
    # Check for risky ports
    risky_ports = {23: "Telnet (não criptografado)", 
                   21: "FTP (não criptografado)",
                   3389: "RDP exposto",
                   3306: "MySQL exposto",
                   5432: "PostgreSQL exposto",
                   27017: "MongoDB exposto",
                   6379: "Redis exposto"}
    
    for port in ports:
        if port in risky_ports:
            indicators.append(f"Porta {port}: {risky_ports[port]}")
    
    # Check for default/admin services
    for svc in services:
        banner = svc.get("banner", "").lower()
        if "admin" in banner or "default" in banner or "password" in banner:
            indicators.append(f"Possível credencial exposta na porta {svc.get('port')}")
    
    # Vulnerability assessment
    if vulns:
        critical = [v for v, info in vulns.items() if info.get("cvss", 0) >= 9.0]
        if critical:
            indicators.append(f"Vulnerabilidades CRÍTICAS: {', '.join(critical[:3])}")
    
    return indicators if indicators else ["Nenhum indicador de alto risco identificado"]


async def shodan_search(query: str, limit: int = 10) -> dict[str, Any]:
    """Search Shodan for hosts matching query.
    
    Examples:
    - "webcam" - Find exposed webcams
    - "port:3389" - Find exposed RDP
    - "org:Target" - Find assets by organization
    """
    if not SHODAN_API_KEY:
        return {
            "error": "SHODAN_API_KEY not configured",
            "query": query,
            "status": "unconfigured"
        }
    
    try:
        encoded_query = quote_plus(query)
        url = f"{SHODAN_BASE_URL}/shodan/host/search?key={SHODAN_API_KEY}&query={encoded_query}&limit={limit}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            
            matches = []
            for match in data.get("matches", [])[:limit]:
                matches.append({
                    "ip": match.get("ip_str", ""),
                    "port": match.get("port"),
                    "product": match.get("product", ""),
                    "version": match.get("version", ""),
                    "org": match.get("org", ""),
                    "isp": match.get("isp", ""),
                    "country": match.get("location", {}).get("country_name", ""),
                    "city": match.get("location", {}).get("city", ""),
                    "last_seen": match.get("timestamp", ""),
                })
            
            return {
                "query": query,
                "total_results": data.get("total", 0),
                "returned": len(matches),
                "matches": matches,
                "fonte": "Shodan",
                "search_url": f"https://www.shodan.io/search?query={encoded_query}",
                "status": "success"
            }
            
    except Exception as e:
        logger.error("Shodan search failed: %s", e)
        return {
            "query": query,
            "error": f"Search failed: {str(e)}",
            "status": "error"
        }


async def analyze_image_metadata(image_path: str | bytes) -> dict[str, Any]:
    """Extract metadata (EXIF) from image for OSINT analysis.
    
    Returns GPS coordinates, device info, timestamps, and software used.
    LGPD: Does not store image, only extracts metadata.
    """
    try:
        # Load image
        if isinstance(image_path, str):
            img = Image.open(image_path)
        else:
            img = Image.open(BytesIO(image_path))
        
        # Extract EXIF
        exif_data = img._getexif()
        
        if not exif_data:
            return {
                "has_metadata": False,
                "status": "no_exif",
                "message": "Imagem sem metadados EXIF",
                "format": img.format,
                "mode": img.mode,
                "size": img.size,
            }
        
        # Parse EXIF tags
        metadata = {
            "has_metadata": True,
            "status": "success",
            "format": img.format,
            "size": img.size,
            "tags": {},
            "gps": None,
            "device": {},
            "software": None,
            "timestamps": {},
        }
        
        for tag_id, value in exif_data.items():
            tag_name = TAGS.get(tag_id, tag_id)
            
            # GPS Info
            if tag_name == "GPSInfo":
                gps_data = {}
                for key in value.keys():
                    decode = GPSTAGS.get(key, key)
                    gps_data[decode] = value[key]
                
                lat, lon = _convert_gps_coords(gps_data)
                if lat and lon:
                    metadata["gps"] = {
                        "latitude": lat,
                        "longitude": lon,
                        "coordinates": f"{lat}, {lon}",
                        "google_maps": f"https://www.google.com/maps?q={lat},{lon}",
                        "raw": gps_data,
                    }
            
            # Device info
            elif tag_name in ["Make", "Model"]:
                metadata["device"][tag_name.lower()] = str(value)
            
            # Software
            elif tag_name == "Software":
                metadata["software"] = str(value)
            
            # Timestamps
            elif "Date" in tag_name or "Time" in tag_name:
                metadata["timestamps"][tag_name] = str(value)
            
            # Store all tags
            metadata["tags"][tag_name] = str(value)[:100]  # Limit length
        
        # Risk assessment
        risks = []
        if metadata["gps"]:
            risks.append("GPS coordinates exposed - location identifiable")
        if metadata["device"]:
            risks.append(f"Device info: {metadata['device'].get('make', '')} {metadata['device'].get('model', '')}")
        if metadata["timestamps"]:
            risks.append("Timestamps present - temporal analysis possible")
        
        metadata["risk_assessment"] = risks if risks else ["No obvious OSINT risks found"]
        metadata["osint_value"] = "high" if metadata["gps"] else ("medium" if metadata["device"] else "low")
        
        return metadata
        
    except Exception as e:
        logger.error("Image analysis failed: %s", e)
        return {
            "error": f"Analysis failed: {str(e)}",
            "status": "error"
        }


def _convert_gps_coords(gps_data: dict) -> tuple[float | None, float | None]:
    """Convert GPS EXIF data to decimal coordinates."""
    try:
        def convert_to_degrees(value):
            d = float(value[0])
            m = float(value[1])
            s = float(value[2])
            return d + (m / 60.0) + (s / 3600.0)
        
        lat_ref = gps_data.get("GPSLatitudeRef")
        lat = gps_data.get("GPSLatitude")
        lon_ref = gps_data.get("GPSLongitudeRef")
        lon = gps_data.get("GPSLongitude")
        
        if lat and lon:
            lat_deg = convert_to_degrees(lat)
            lon_deg = convert_to_degrees(lon)
            
            if lat_ref == "S":
                lat_deg = -lat_deg
            if lon_ref == "W":
                lon_deg = -lon_deg
            
            return round(lat_deg, 6), round(lon_deg, 6)
        
        return None, None
        
    except Exception:
        return None, None


# Export functions for use in chat_tools.py
__all__ = [
    "hibp_check_email",
    "shodan_host_lookup",
    "shodan_search",
    "analyze_image_metadata",
]
