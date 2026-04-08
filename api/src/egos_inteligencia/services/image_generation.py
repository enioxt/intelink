"""
Intelink Image Generation Integration
Sprint 7: AI-Generated Images for Investigations

Sacred Code: 000.369.963.144.1618 (∞△⚡◎φ)

Permite aos usuários do Intelink gerar imagens para:
- Reconstrução de locais de crime
- Demonstração de conceitos
- Visualização de cenários
- Documentação visual
"""

import asyncio
import aiohttp
import base64
import os
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import hashlib
from datetime import datetime
import structlog

logger = structlog.get_logger(__name__)


class IntelinkImageGenerator:
    """Gerador de imagens integrado ao Intelink"""
    
    def __init__(self):
        self.hf_api_key = os.getenv("HUGGINGFACE_API_KEY")
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        
        # Default model selection
        self.default_model = "flux"  # flux ou nano
        
        # Cost tracking
        self.generations_count = 0
        self.total_processing_time = 0.0
    
    async def generate_image(
        self,
        prompt: str,
        model: str = "flux",
        width: int = 1024,
        height: int = 1024,
        style: str = "realistic",
        user_id: Optional[str] = None,
        document_id: Optional[str] = None
    ) -> Dict:
        """
        Gera imagem com contexto Intelink
        
        Args:
            prompt: Descrição da imagem
            model: "flux" (Hugging Face) ou "nano" (OpenRouter)
            width: Largura (256-2048)
            height: Altura (256-2048)
            style: Estilo (realistic, artistic, technical, forensic)
            user_id: ID do usuário solicitante
            document_id: ID do documento relacionado (opcional)
        
        Returns:
            {
                "image_id": str,
                "image_base64": str,
                "image_url": str (se salvo),
                "prompt": str,
                "metadata": {
                    "model": str,
                    "dimensions": str,
                    "style": str,
                    "processing_time_ms": int,
                    "generated_at": str
                },
                "cost": {
                    "model": str,
                    "estimated_usd": float
                }
            }
        """
        start_time = datetime.now()
        
        try:
            # Enhance prompt based on style
            enhanced_prompt = self._enhance_prompt(prompt, style)
            
            logger.info(
                "intelink_image_generation_started",
                model=model,
                user_id=user_id,
                prompt_length=len(prompt),
                style=style
            )
            
            # Generate based on model
            if model == "flux":
                result = await self._generate_flux(enhanced_prompt, width, height)
            elif model == "nano":
                result = await self._generate_nano(enhanced_prompt, f"{width}x{height}")
            else:
                raise ValueError(f"Modelo não suportado: {model}")
            
            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            self.total_processing_time += processing_time
            self.generations_count += 1
            
            # Generate unique image ID
            image_id = self._generate_image_id(prompt, model)
            
            # Prepare response
            response = {
                "image_id": image_id,
                "image_base64": result.get("image_base64", ""),
                "image_url": result.get("image_url", ""),
                "prompt": prompt,
                "enhanced_prompt": enhanced_prompt,
                "metadata": {
                    "model": model,
                    "dimensions": f"{width}x{height}",
                    "style": style,
                    "processing_time_ms": int(processing_time),
                    "generated_at": datetime.now().isoformat(),
                    "user_id": user_id,
                    "document_id": document_id
                },
                "cost": self._estimate_cost(model, width, height)
            }
            
            logger.info(
                "intelink_image_generation_success",
                image_id=image_id,
                processing_time_ms=int(processing_time),
                model=model
            )
            
            return response
            
        except Exception as e:
            logger.error(
                "intelink_image_generation_failed",
                error=str(e),
                model=model,
                user_id=user_id
            )
            raise
    
    def _enhance_prompt(self, prompt: str, style: str) -> str:
        """Enhance prompt based on style"""
        style_enhancements = {
            "realistic": "photorealistic, high detail, 4k quality",
            "artistic": "artistic interpretation, creative vision",
            "technical": "technical diagram, clear labels, professional",
            "forensic": "forensic quality, evidence documentation, detailed"
        }
        
        enhancement = style_enhancements.get(style, "high quality")
        return f"{prompt}, {enhancement}"
    
    async def _generate_flux(
        self,
        prompt: str,
        width: int,
        height: int
    ) -> Dict:
        """Generate with Flux 1 Schnell via Hugging Face"""
        if not self.hf_api_key:
            raise ValueError("HUGGINGFACE_API_KEY not configured")
        
        model_endpoint = "black-forest-labs/FLUX.1-schnell"
        url = f"https://api-inference.huggingface.co/models/{model_endpoint}"
        
        headers = {
            "Authorization": f"Bearer {self.hf_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "width": width,
                "height": height,
                "num_inference_steps": 4  # Fast generation
            }
        }
        
        async with aiohttp.ClientSession() as session:
            response = await session.post(url, headers=headers, json=payload)
            async with response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Hugging Face API error {response.status}: {error_text}")
                
                image_bytes = await response.read()
                image_base64 = base64.b64encode(image_bytes).decode('utf-8')
                
                return {
                    "image_base64": image_base64,
                    "image_url": f"data:image/png;base64,{image_base64}"
                }
    
    async def _generate_nano(
        self,
        prompt: str,
        size: str
    ) -> Dict:
        """Generate with Gemini 2.5 Flash Image via OpenRouter"""
        if not self.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY not configured")
        
        headers = {
            "Authorization": f"Bearer {self.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://egos.ia.br/intelink",
            "X-Title": "EGOS Intelink Image Generation"
        }
        
        payload = {
            "model": "google/gemini-2.5-flash-preview-image",
            "messages": [
                {
                    "role": "user",
                    "content": [{"type": "text", "text": prompt}]
                }
            ],
            "temperature": 0.7
        }
        
        async with aiohttp.ClientSession() as session:
            response = await session.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload
            )
            async with response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"OpenRouter API error {response.status}: {error_text}")
                
                result = await response.json()
                image_base64 = result["choices"][0]["message"]["content"]
                
                return {
                    "image_base64": image_base64,
                    "image_url": f"data:image/png;base64,{image_base64}"
                }
    
    def _generate_image_id(self, prompt: str, model: str) -> str:
        """Generate unique image ID"""
        content = f"{prompt}:{model}:{datetime.now().isoformat()}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _estimate_cost(self, model: str, width: int, height: int) -> Dict:
        """Estimate generation cost"""
        costs = {
            "flux": {
                "model": "Flux 1 Schnell",
                "estimated_usd": 0.003  # ~$3 per 1000 images
            },
            "nano": {
                "model": "Gemini 2.5 Flash Image",
                "estimated_usd": 0.002  # ~$2 per 1000 images
            }
        }
        
        return costs.get(model, {"model": "Unknown", "estimated_usd": 0.0})
    
    async def batch_generate(
        self,
        prompts: List[str],
        model: str = "flux",
        parallel_jobs: int = 3,
        **kwargs
    ) -> List[Dict]:
        """
        Generate multiple images for investigation scenarios
        
        Args:
            prompts: List of prompts
            model: Model to use
            parallel_jobs: Number of simultaneous generations
            **kwargs: Additional parameters
        
        Returns:
            List of generation results
        """
        semaphore = asyncio.Semaphore(parallel_jobs)
        
        async def generate_with_semaphore(prompt: str, index: int):
            async with semaphore:
                try:
                    result = await self.generate_image(
                        prompt=prompt,
                        model=model,
                        **kwargs
                    )
                    result["batch_index"] = index
                    return result
                except Exception as e:
                    return {
                        "batch_index": index,
                        "error": str(e),
                        "prompt": prompt
                    }
        
        tasks = [generate_with_semaphore(p, i) for i, p in enumerate(prompts)]
        results = await asyncio.gather(*tasks)
        
        return results
    
    async def save_to_disk(
        self,
        image_base64: str,
        filename: str,
        output_dir: str = "/tmp/intelink_images"
    ) -> str:
        """
        Save generated image to disk
        
        Args:
            image_base64: Base64 encoded image
            filename: Output filename
            output_dir: Output directory
        
        Returns:
            Path to saved file
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        file_path = output_path / filename
        
        # Decode and save
        image_bytes = base64.b64decode(image_base64)
        
        with open(file_path, 'wb') as f:
            f.write(image_bytes)
        
        logger.info(
            "intelink_image_saved",
            file_path=str(file_path),
            size_bytes=len(image_bytes)
        )
        
        return str(file_path)
    
    def get_stats(self) -> Dict:
        """Get generation statistics"""
        avg_time = self.total_processing_time / self.generations_count if self.generations_count > 0 else 0
        
        return {
            "total_generations": self.generations_count,
            "total_processing_time_ms": int(self.total_processing_time),
            "average_processing_time_ms": int(avg_time),
            "models_available": {
                "flux": bool(self.hf_api_key),
                "nano": bool(self.openrouter_api_key)
            }
        }


# Global instance
image_generator = IntelinkImageGenerator()
