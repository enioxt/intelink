"""
Audio and Video Processing for Intelink
Sprint 8: Multimedia Support

Sacred Code: 000.369.963.144.1618 (∞△⚡◎φ)

Provides transcription and metadata extraction for:
- Audio files (MP3, WAV, OGG, M4A)
- Video files (MP4, AVI, MKV, MOV)
"""

import os
import tempfile
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import structlog

logger = structlog.get_logger(__name__)

# Check availability
try:
    import whisper
    WHISPER_AVAILABLE = True
    logger.info("whisper_available")
except ImportError:
    WHISPER_AVAILABLE = False
    logger.warning("whisper_not_available", reason="pip install openai-whisper")

try:
    from moviepy.editor import VideoFileClip
    MOVIEPY_AVAILABLE = True
    logger.info("moviepy_available")
except ImportError:
    MOVIEPY_AVAILABLE = False
    logger.warning("moviepy_not_available", reason="pip install moviepy")


class AudioVideoProcessor:
    """Processor for audio and video files"""
    
    def __init__(self):
        self.whisper_model = None
        self.model_size = os.getenv("WHISPER_MODEL", "base")  # tiny, base, small, medium, large
        
    def _load_whisper_model(self):
        """Lazy load Whisper model"""
        if not WHISPER_AVAILABLE:
            raise RuntimeError("Whisper not installed. Run: pip install openai-whisper")
        
        if self.whisper_model is None:
            logger.info("loading_whisper_model", size=self.model_size)
            self.whisper_model = whisper.load_model(self.model_size)
            logger.info("whisper_model_loaded", size=self.model_size)
        
        return self.whisper_model
    
    async def process_audio(
        self,
        audio_data: bytes,
        filename: str = "audio.mp3",
        language: Optional[str] = None
    ) -> Tuple[str, List[str]]:
        """
        Process audio file with Whisper transcription
        
        Args:
            audio_data: Raw audio bytes
            filename: Original filename (for format detection)
            language: Language code (pt, en, es, etc.) or None for auto-detect
        
        Returns:
            (transcription_text, warnings)
        """
        warnings = []
        
        if not WHISPER_AVAILABLE:
            warnings.append("Whisper not installed - audio transcription disabled")
            return "", warnings
        
        try:
            # Save to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as tmp:
                tmp.write(audio_data)
                tmp_path = tmp.name
            
            try:
                # Load model
                model = self._load_whisper_model()
                
                # Transcribe
                logger.info("transcribing_audio", filename=filename, language=language or "auto")
                result = model.transcribe(
                    tmp_path,
                    language=language,
                    fp16=False  # CPU compatibility
                )
                
                # Extract text
                text = result["text"].strip()
                detected_language = result.get("language", "unknown")
                
                logger.info(
                    "audio_transcribed",
                    filename=filename,
                    text_length=len(text),
                    language=detected_language
                )
                
                # Add metadata as structured text
                metadata = f"[AUDIO TRANSCRIPTION]\n"
                metadata += f"File: {filename}\n"
                metadata += f"Language: {detected_language}\n"
                metadata += f"Duration: {result.get('duration', 0):.2f}s\n\n"
                metadata += f"Transcript:\n{text}"
                
                return metadata, warnings
                
            finally:
                # Cleanup temp file
                try:
                    os.unlink(tmp_path)
                except Exception as e:
                    logger.warning("temp_file_cleanup_failed", error=str(e))
        
        except Exception as e:
            logger.error("audio_processing_failed", error=str(e), filename=filename)
            warnings.append(f"Audio processing error: {str(e)}")
            return "", warnings
    
    async def process_video(
        self,
        video_data: bytes,
        filename: str = "video.mp4",
        language: Optional[str] = None
    ) -> Tuple[str, List[str]]:
        """
        Process video file: extract audio → transcribe with Whisper
        
        Args:
            video_data: Raw video bytes
            filename: Original filename
            language: Language code or None for auto-detect
        
        Returns:
            (transcription_text, warnings)
        """
        warnings = []
        
        if not MOVIEPY_AVAILABLE:
            warnings.append("MoviePy not installed - video processing disabled")
            return "", warnings
        
        if not WHISPER_AVAILABLE:
            warnings.append("Whisper not installed - audio transcription disabled")
            return "", warnings
        
        try:
            # Save video to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as tmp_video:
                tmp_video.write(video_data)
                tmp_video_path = tmp_video.name
            
            # Extract audio to temporary file
            tmp_audio_path = None
            
            try:
                logger.info("extracting_audio_from_video", filename=filename)
                
                # Load video
                video = VideoFileClip(tmp_video_path)
                
                # Extract metadata
                duration = video.duration
                fps = video.fps
                size = video.size
                
                # Check if video has audio
                if video.audio is None:
                    warnings.append("Video has no audio track")
                    metadata = f"[VIDEO METADATA]\n"
                    metadata += f"File: {filename}\n"
                    metadata += f"Duration: {duration:.2f}s\n"
                    metadata += f"FPS: {fps}\n"
                    metadata += f"Resolution: {size[0]}x{size[1]}\n"
                    metadata += f"Audio: None\n"
                    return metadata, warnings
                
                # Extract audio
                tmp_audio_path = tempfile.mktemp(suffix=".wav")
                video.audio.write_audiofile(tmp_audio_path, logger=None, verbose=False)
                
                # Close video
                video.close()
                
                logger.info("audio_extracted", duration=duration)
                
                # Read extracted audio
                with open(tmp_audio_path, 'rb') as f:
                    audio_data = f.read()
                
                # Transcribe audio
                transcription, audio_warnings = await self.process_audio(
                    audio_data,
                    filename=f"{filename}.audio.wav",
                    language=language
                )
                
                warnings.extend(audio_warnings)
                
                # Add video metadata
                metadata = f"[VIDEO + AUDIO TRANSCRIPTION]\n"
                metadata += f"File: {filename}\n"
                metadata += f"Duration: {duration:.2f}s\n"
                metadata += f"FPS: {fps}\n"
                metadata += f"Resolution: {size[0]}x{size[1]}\n\n"
                metadata += transcription
                
                return metadata, warnings
                
            finally:
                # Cleanup temp files
                try:
                    os.unlink(tmp_video_path)
                except Exception as e:
                    logger.warning("video_cleanup_failed", error=str(e))
                
                if tmp_audio_path and os.path.exists(tmp_audio_path):
                    try:
                        os.unlink(tmp_audio_path)
                    except Exception as e:
                        logger.warning("audio_cleanup_failed", error=str(e))
        
        except Exception as e:
            logger.error("video_processing_failed", error=str(e), filename=filename)
            warnings.append(f"Video processing error: {str(e)}")
            return "", warnings
    
    def get_status(self) -> Dict:
        """Get processor status"""
        return {
            "whisper": {
                "available": WHISPER_AVAILABLE,
                "model": self.model_size if WHISPER_AVAILABLE else None,
                "loaded": self.whisper_model is not None
            },
            "moviepy": {
                "available": MOVIEPY_AVAILABLE
            },
            "supported_audio_formats": [".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"],
            "supported_video_formats": [".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv"]
        }


# Global processor instance
audio_video_processor = AudioVideoProcessor()


# Helper functions for easy integration
async def process_audio_file(data: bytes, filename: str, language: Optional[str] = None) -> Tuple[str, List[str]]:
    """Process audio file"""
    return await audio_video_processor.process_audio(data, filename, language)


async def process_video_file(data: bytes, filename: str, language: Optional[str] = None) -> Tuple[str, List[str]]:
    """Process video file"""
    return await audio_video_processor.process_video(data, filename, language)


def is_audio_video_available() -> Dict[str, bool]:
    """Check if audio/video processing is available"""
    return {
        "audio": WHISPER_AVAILABLE,
        "video": WHISPER_AVAILABLE and MOVIEPY_AVAILABLE
    }
