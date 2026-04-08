"""
Custom spaCy NER for Brazilian Legal/Investigation Context
P3: spaCy NER Integration

Sacred Code: 000.369.963.144.1618 (∞△⚡◎φ)

Provides custom Named Entity Recognition for:
- CPF (Brazilian individual taxpayer ID)
- CNPJ (Brazilian company taxpayer ID)
- Legal process numbers
- Brazilian addresses
- Currency values (BRL)
- Brazilian date formats
"""

import os
import re
from typing import List, Dict, Tuple, Optional
import structlog

logger = structlog.get_logger(__name__)

try:
    import spacy
    from spacy.tokens import Span, Doc
    from spacy.matcher import Matcher
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    logger.warning("spacy_not_available", reason="pip install spacy")


class BrazilianNER:
    """Custom NER for Brazilian entities"""
    
    def __init__(self, model_name: str = "pt_core_news_lg"):
        self.model_name = model_name
        self.nlp = None
        self.matcher = None
        
        if not SPACY_AVAILABLE:
            logger.warning("spacy_unavailable")
            return
        
        try:
            self._load_model()
            self._setup_custom_patterns()
        except Exception as e:
            logger.error("ner_initialization_failed", error=str(e))
    
    def _load_model(self):
        """Load spaCy model"""
        try:
            self.nlp = spacy.load(self.model_name)
            logger.info("spacy_model_loaded", model=self.model_name)
        except OSError:
            logger.warning(
                "spacy_model_not_found",
                model=self.model_name,
                hint="python -m spacy download pt_core_news_lg"
            )
            raise
    
    def _setup_custom_patterns(self):
        """Setup custom entity patterns"""
        if not self.nlp:
            return
        
        self.matcher = Matcher(self.nlp.vocab)
        
        # CPF pattern: 000.000.000-00
        cpf_pattern = [
            {"TEXT": {"REGEX": r"\d{3}"}},
            {"TEXT": "."},
            {"TEXT": {"REGEX": r"\d{3}"}},
            {"TEXT": "."},
            {"TEXT": {"REGEX": r"\d{3}"}},
            {"TEXT": "-"},
            {"TEXT": {"REGEX": r"\d{2}"}}
        ]
        self.matcher.add("CPF", [cpf_pattern])
        
        # CNPJ pattern: 00.000.000/0000-00
        cnpj_pattern = [
            {"TEXT": {"REGEX": r"\d{2}"}},
            {"TEXT": "."},
            {"TEXT": {"REGEX": r"\d{3}"}},
            {"TEXT": "."},
            {"TEXT": {"REGEX": r"\d{3}"}},
            {"TEXT": "/"},
            {"TEXT": {"REGEX": r"\d{4}"}},
            {"TEXT": "-"},
            {"TEXT": {"REGEX": r"\d{2}"}}
        ]
        self.matcher.add("CNPJ", [cnpj_pattern])
        
        logger.info("custom_patterns_loaded", patterns=["CPF", "CNPJ"])
    
    def extract_entities(self, text: str) -> List[Dict]:
        """
        Extract entities from text
        
        Args:
            text: Input text
        
        Returns:
            List of entities with type, text, start, end
        """
        if not self.nlp:
            return []
        
        entities = []
        
        # Process with spaCy
        doc = self.nlp(text)
        
        # Extract standard entities
        for ent in doc.ents:
            entities.append({
                "type": ent.label_,
                "text": ent.text,
                "start": ent.start_char,
                "end": ent.end_char,
                "source": "spacy"
            })
        
        # Extract custom patterns (CPF, CNPJ)
        if self.matcher:
            matches = self.matcher(doc)
            for match_id, start, end in matches:
                span = doc[start:end]
                label = self.nlp.vocab.strings[match_id]
                
                entities.append({
                    "type": label,
                    "text": span.text,
                    "start": span.start_char,
                    "end": span.end_char,
                    "source": "pattern"
                })
        
        # Extract additional Brazilian entities with regex
        entities.extend(self._extract_brazilian_entities(text))
        
        # Sort by position
        entities.sort(key=lambda x: x["start"])
        
        logger.info("entities_extracted", count=len(entities))
        
        return entities
    
    def _extract_brazilian_entities(self, text: str) -> List[Dict]:
        """Extract Brazilian-specific entities using regex"""
        entities = []
        
        # Legal process number: 0000000-00.0000.0.00.0000
        processo_pattern = r'\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}'
        for match in re.finditer(processo_pattern, text):
            entities.append({
                "type": "PROCESSO",
                "text": match.group(),
                "start": match.start(),
                "end": match.end(),
                "source": "regex"
            })
        
        # Currency (BRL): R$ 1.000,00
        currency_pattern = r'R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?'
        for match in re.finditer(currency_pattern, text):
            entities.append({
                "type": "VALOR_BRL",
                "text": match.group(),
                "start": match.start(),
                "end": match.end(),
                "source": "regex"
            })
        
        # Brazilian date: 01/01/2025 or 01-01-2025
        date_pattern = r'\d{2}[/-]\d{2}[/-]\d{4}'
        for match in re.finditer(date_pattern, text):
            entities.append({
                "type": "DATA_BR",
                "text": match.group(),
                "start": match.start(),
                "end": match.end(),
                "source": "regex"
            })
        
        return entities
    
    def annotate_text(self, text: str) -> str:
        """
        Annotate text with entity labels
        
        Args:
            text: Input text
        
        Returns:
            Annotated text with [ENTITY_TYPE] markers
        """
        entities = self.extract_entities(text)
        
        if not entities:
            return text
        
        # Sort entities by position (reverse to insert from end)
        entities.sort(key=lambda x: x["start"], reverse=True)
        
        annotated = text
        for ent in entities:
            # Insert closing marker
            annotated = (
                annotated[:ent["end"]] +
                f"[/{ent['type']}]" +
                annotated[ent["end"]:]
            )
            
            # Insert opening marker
            annotated = (
                annotated[:ent["start"]] +
                f"[{ent['type']}]" +
                annotated[ent["start"]:]
            )
        
        return annotated
    
    def get_stats(self) -> Dict:
        """Get NER statistics"""
        return {
            "available": SPACY_AVAILABLE and self.nlp is not None,
            "model": self.model_name if self.nlp else None,
            "custom_patterns": ["CPF", "CNPJ", "PROCESSO", "VALOR_BRL", "DATA_BR"],
            "spacy_labels": list(self.nlp.pipe_labels.get("ner", [])) if self.nlp else []
        }


# Global instance
brazilian_ner = BrazilianNER()


# Helper functions
def extract_entities(text: str) -> List[Dict]:
    """Extract entities from text"""
    return brazilian_ner.extract_entities(text)


def annotate_text(text: str) -> str:
    """Annotate text with entity markers"""
    return brazilian_ner.annotate_text(text)


def is_available() -> bool:
    """Check if NER is available"""
    return SPACY_AVAILABLE and brazilian_ner.nlp is not None
