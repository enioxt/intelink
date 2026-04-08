"""
Archive Processor - ZIP/TAR/TAR.GZ Support
Sacred Code: 000.369.963.144.1618 (∞△⚡◎φ)
Sprint 4: Archive extraction with security controls
"""

import io
import os
import zipfile
import tarfile
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass

# Security limits
MAX_FILES = 100
MAX_TOTAL_SIZE = 100 * 1024 * 1024  # 100MB uncompressed
MAX_FILE_SIZE = 50 * 1024 * 1024     # 50MB per file
MAX_PATH_DEPTH = 10

# Allowed file extensions (security whitelist)
ALLOWED_EXTENSIONS = {
    # Documents
    '.txt', '.md', '.pdf', '.docx', '.doc', '.pptx', '.xlsx', '.xml', '.json',
    # Code
    '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h', '.go',
    '.rs', '.rb', '.php', '.css', '.scss', '.html', '.vue', '.svelte',
    # Config
    '.yaml', '.yml', '.toml', '.ini', '.env', '.config',
    # Data
    '.csv', '.sql',
}

# Blocked extensions (security blacklist)
BLOCKED_EXTENSIONS = {
    '.exe', '.dll', '.so', '.dylib', '.bat', '.cmd', '.sh', '.ps1',
    '.msi', '.app', '.deb', '.rpm', '.dmg', '.pkg',
}


@dataclass
class ExtractedFile:
    """Representa um arquivo extraído do archive"""
    filename: str
    content: bytes
    size: int
    mime_type: Optional[str] = None


@dataclass
class ArchiveResult:
    """Resultado do processamento de archive"""
    ok: bool
    files: List[ExtractedFile]
    warnings: List[str]
    stats: Dict[str, int]


def sanitize_path(path: str) -> Tuple[bool, str]:
    """
    Sanitiza path do arquivo para prevenir path traversal
    
    Returns:
        (is_safe, sanitized_path)
    """
    # Remove leading slashes
    path = path.lstrip('/')
    
    # Check for path traversal attempts
    if '..' in path or path.startswith('/'):
        return False, ""
    
    # Check path depth
    depth = path.count(os.sep)
    if depth > MAX_PATH_DEPTH:
        return False, ""
    
    # Get just the filename (remove directory structure)
    # This is safer for our use case
    safe_name = os.path.basename(path)
    
    return True, safe_name


def is_allowed_file(filename: str) -> Tuple[bool, str]:
    """
    Verifica se arquivo é permitido
    
    Returns:
        (is_allowed, reason)
    """
    # Get extension
    _, ext = os.path.splitext(filename.lower())
    
    # Check blocked first
    if ext in BLOCKED_EXTENSIONS:
        return False, f"Blocked extension: {ext}"
    
    # Check allowed
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Extension not in whitelist: {ext}"
    
    return True, ""


def detect_mime_type(filename: str, content: bytes) -> str:
    """
    Detecta MIME type básico por extensão
    """
    ext = os.path.splitext(filename.lower())[1]
    
    mime_map = {
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.json': 'application/json',
        '.xml': 'application/xml',
        '.py': 'text/x-python',
        '.js': 'text/javascript',
        '.ts': 'text/typescript',
        '.html': 'text/html',
        '.css': 'text/css',
    }
    
    return mime_map.get(ext, 'application/octet-stream')


def process_zip(data: bytes) -> ArchiveResult:
    """
    Processa arquivo ZIP
    
    Security features:
    - Limita número de arquivos
    - Limita tamanho total descompactado
    - Valida paths (previne path traversal)
    - Whitelist de extensões
    - Detecta zip bombs
    """
    warnings = []
    extracted_files = []
    total_size = 0
    file_count = 0
    
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            # Get info list
            info_list = zf.infolist()
            
            # Check for zip bomb (compressed vs uncompressed ratio)
            compressed_size = sum(info.compress_size for info in info_list)
            uncompressed_size = sum(info.file_size for info in info_list)
            
            if compressed_size > 0:
                ratio = uncompressed_size / compressed_size
                if ratio > 100:  # More than 100:1 ratio
                    warnings.append(f"Suspicious compression ratio: {ratio:.1f}:1 (possible zip bomb)")
                    # Still process but with extra caution
            
            # Check total uncompressed size
            if uncompressed_size > MAX_TOTAL_SIZE:
                return ArchiveResult(
                    ok=False,
                    files=[],
                    warnings=[f"Archive too large when uncompressed: {uncompressed_size / 1024 / 1024:.1f}MB (max {MAX_TOTAL_SIZE / 1024 / 1024}MB)"],
                    stats={'total_size': uncompressed_size, 'file_count': len(info_list)}
                )
            
            # Process each file
            for info in info_list:
                # Skip directories
                if info.is_dir():
                    continue
                
                # Check file limit
                if file_count >= MAX_FILES:
                    warnings.append(f"Reached max files limit ({MAX_FILES}), remaining files skipped")
                    break
                
                # Sanitize path
                is_safe, safe_name = sanitize_path(info.filename)
                if not is_safe:
                    warnings.append(f"Skipped unsafe path: {info.filename}")
                    continue
                
                # Check if allowed
                is_allowed, reason = is_allowed_file(safe_name)
                if not is_allowed:
                    warnings.append(f"Skipped {safe_name}: {reason}")
                    continue
                
                # Check individual file size
                if info.file_size > MAX_FILE_SIZE:
                    warnings.append(f"Skipped {safe_name}: too large ({info.file_size / 1024 / 1024:.1f}MB)")
                    continue
                
                # Extract file
                try:
                    file_data = zf.read(info.filename)
                    
                    # Detect MIME type
                    mime_type = detect_mime_type(safe_name, file_data)
                    
                    extracted_files.append(ExtractedFile(
                        filename=safe_name,
                        content=file_data,
                        size=len(file_data),
                        mime_type=mime_type
                    ))
                    
                    total_size += len(file_data)
                    file_count += 1
                    
                except Exception as e:
                    warnings.append(f"Error extracting {safe_name}: {str(e)}")
                    continue
        
        return ArchiveResult(
            ok=True,
            files=extracted_files,
            warnings=warnings,
            stats={
                'total_size': total_size,
                'file_count': file_count,
                'warnings_count': len(warnings)
            }
        )
        
    except zipfile.BadZipFile:
        return ArchiveResult(
            ok=False,
            files=[],
            warnings=["Invalid ZIP file"],
            stats={'total_size': 0, 'file_count': 0}
        )
    except Exception as e:
        return ArchiveResult(
            ok=False,
            files=[],
            warnings=[f"Error processing ZIP: {str(e)}"],
            stats={'total_size': 0, 'file_count': 0}
        )


def process_tar(data: bytes, compression: Optional[str] = None) -> ArchiveResult:
    """
    Processa arquivo TAR (com ou sem compressão)
    
    Args:
        data: Bytes do arquivo
        compression: None, 'gz', ou 'bz2'
    
    Security features: mesmas do ZIP
    """
    warnings = []
    extracted_files = []
    total_size = 0
    file_count = 0
    
    # Determine mode
    if compression == 'gz':
        mode = 'r:gz'
    elif compression == 'bz2':
        mode = 'r:bz2'
    else:
        mode = 'r'
    
    try:
        with tarfile.open(fileobj=io.BytesIO(data), mode=mode) as tf:
            members = tf.getmembers()
            
            # Check total size
            uncompressed_size = sum(m.size for m in members if m.isfile())
            if uncompressed_size > MAX_TOTAL_SIZE:
                return ArchiveResult(
                    ok=False,
                    files=[],
                    warnings=[f"Archive too large: {uncompressed_size / 1024 / 1024:.1f}MB (max {MAX_TOTAL_SIZE / 1024 / 1024}MB)"],
                    stats={'total_size': uncompressed_size, 'file_count': len(members)}
                )
            
            # Process each file
            for member in members:
                # Skip non-files
                if not member.isfile():
                    continue
                
                # Check file limit
                if file_count >= MAX_FILES:
                    warnings.append(f"Reached max files limit ({MAX_FILES})")
                    break
                
                # Sanitize path
                is_safe, safe_name = sanitize_path(member.name)
                if not is_safe:
                    warnings.append(f"Skipped unsafe path: {member.name}")
                    continue
                
                # Check if allowed
                is_allowed, reason = is_allowed_file(safe_name)
                if not is_allowed:
                    warnings.append(f"Skipped {safe_name}: {reason}")
                    continue
                
                # Check size
                if member.size > MAX_FILE_SIZE:
                    warnings.append(f"Skipped {safe_name}: too large")
                    continue
                
                # Extract
                try:
                    file_obj = tf.extractfile(member)
                    if file_obj:
                        file_data = file_obj.read()
                        mime_type = detect_mime_type(safe_name, file_data)
                        
                        extracted_files.append(ExtractedFile(
                            filename=safe_name,
                            content=file_data,
                            size=len(file_data),
                            mime_type=mime_type
                        ))
                        
                        total_size += len(file_data)
                        file_count += 1
                        
                except Exception as e:
                    warnings.append(f"Error extracting {safe_name}: {str(e)}")
                    continue
        
        return ArchiveResult(
            ok=True,
            files=extracted_files,
            warnings=warnings,
            stats={
                'total_size': total_size,
                'file_count': file_count,
                'warnings_count': len(warnings)
            }
        )
        
    except tarfile.TarError as e:
        return ArchiveResult(
            ok=False,
            files=[],
            warnings=[f"Invalid TAR file: {str(e)}"],
            stats={'total_size': 0, 'file_count': 0}
        )
    except Exception as e:
        return ArchiveResult(
            ok=False,
            files=[],
            warnings=[f"Error processing TAR: {str(e)}"],
            stats={'total_size': 0, 'file_count': 0}
        )


def process_archive(data: bytes, filename: str) -> ArchiveResult:
    """
    Detecta tipo de archive e processa
    
    Supported formats:
    - .zip
    - .tar
    - .tar.gz / .tgz
    - .tar.bz2
    """
    filename_lower = filename.lower()
    
    if filename_lower.endswith('.zip'):
        return process_zip(data)
    elif filename_lower.endswith('.tar.gz') or filename_lower.endswith('.tgz'):
        return process_tar(data, compression='gz')
    elif filename_lower.endswith('.tar.bz2'):
        return process_tar(data, compression='bz2')
    elif filename_lower.endswith('.tar'):
        return process_tar(data, compression=None)
    else:
        return ArchiveResult(
            ok=False,
            files=[],
            warnings=["Unsupported archive format"],
            stats={'total_size': 0, 'file_count': 0}
        )
