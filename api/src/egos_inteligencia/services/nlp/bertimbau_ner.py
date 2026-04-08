"""
EGOS v.2 - Intelink BERTimbau NER
Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)

Portuguese NER using BERTimbau (BERT for Brazilian Portuguese)
Replaces spaCy with transformer-based model for better accuracy
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Try to import transformers
try:
    from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.warning("transformers not available - BERTimbau NER disabled")

# Fallback to spaCy if transformers not available
try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    logger.warning("spaCy not available - NER severely limited")


@dataclass
class Entity:
    """Represents a named entity extracted from text"""
    text: str
    label: str
    start_char: int
    end_char: int
    confidence: float = 1.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "label": self.label,
            "start_char": self.start_char,
            "end_char": self.end_char,
            "confidence": round(self.confidence, 3)
        }


class BERTimbauNER:
    """
    Named Entity Recognition using BERTimbau
    
    Model: neuralmind/bert-base-portuguese-cased (or similar)
    Labels: PER (person), ORG (organization), LOC (location), MISC
    """
    
    def __init__(self, model_name: str = "pierreguillou/bert-base-cased-pt-lenerbr"):
        """
        Initialize BERTimbau NER pipeline
        
        Args:
            model_name: HuggingFace model identifier
                Default: pierreguillou/bert-base-cased-pt-lenerbr (LeNER-Br legal entities)
                Alternative: neuralmind/bert-base-portuguese-cased (general purpose)
        """
        self.model_name = model_name
        self.pipeline = None
        self._initialized = False
        
        if not TRANSFORMERS_AVAILABLE:
            logger.warning("Transformers not available - NER will use fallback")
            return
        
        try:
            logger.info(f"Loading BERTimbau model: {model_name}")
            self.pipeline = pipeline(
                "ner",
                model=model_name,
                tokenizer=model_name,
                aggregation_strategy="simple"  # Merge subword tokens
            )
            self._initialized = True
            logger.info(f"✓ BERTimbau NER loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load BERTimbau model: {e}")
            logger.warning("Falling back to spaCy if available")
    
    def extract_entities(self, text: str, min_confidence: float = 0.5) -> List[Entity]:
        """
        Extract named entities from text
        
        Args:
            text: Input text to analyze
            min_confidence: Minimum confidence threshold (default 0.5)
        
        Returns:
            List of Entity objects
        """
        if not text or len(text.strip()) < 10:
            return []
        
        # Use BERTimbau if available
        if self._initialized and self.pipeline:
            return self._extract_with_bertimbau(text, min_confidence)
        
        # Fallback to spaCy
        elif SPACY_AVAILABLE:
            return self._extract_with_spacy(text)
        
        # No NER available
        else:
            logger.error("No NER engine available (transformers and spaCy both missing)")
            return []
    
    def _extract_with_bertimbau(self, text: str, min_confidence: float) -> List[Entity]:
        """Extract entities using BERTimbau transformer model"""
        try:
            # Run NER pipeline
            results = self.pipeline(text)
            
            entities = []
            for result in results:
                # Filter by confidence
                if result.get('score', 0) < min_confidence:
                    continue
                
                # Normalize label (B-PER → PERSON, I-ORG → ORG, etc.)
                label = self._normalize_label(result['entity_group'])
                
                entities.append(Entity(
                    text=result['word'],
                    label=label,
                    start_char=result['start'],
                    end_char=result['end'],
                    confidence=result['score']
                ))
            
            logger.debug(f"BERTimbau extracted {len(entities)} entities")
            return entities
            
        except Exception as e:
            logger.error(f"BERTimbau extraction failed: {e}")
            return []
    
    def _extract_with_spacy(self, text: str) -> List[Entity]:
        """Fallback: Extract entities using spaCy"""
        try:
            # Load Portuguese model
            try:
                nlp = spacy.load("pt_core_news_lg")
            except OSError:
                # Try smaller model
                nlp = spacy.load("pt_core_news_sm")
            
            doc = nlp(text)
            
            entities = []
            for ent in doc.ents:
                # Normalize spaCy labels to our schema
                label = self._normalize_label(ent.label_)
                
                entities.append(Entity(
                    text=ent.text,
                    label=label,
                    start_char=ent.start_char,
                    end_char=ent.end_char,
                    confidence=0.85  # spaCy doesn't provide confidence
                ))
            
            logger.debug(f"spaCy extracted {len(entities)} entities (fallback)")
            return entities
            
        except Exception as e:
            logger.error(f"spaCy extraction failed: {e}")
            return []
    
    def _normalize_label(self, label: str) -> str:
        """
        Normalize entity labels to standard schema
        
        BERTimbau labels: PER, ORG, LOC, MISC
        spaCy labels: PER, ORG, LOC, MISC, GPE, etc.
        
        Output schema:
        - PERSON (pessoa)
        - ORGANIZATION (organização)
        - LOCATION (local)
        - MONEY (valor monetário)
        - DATE (data)
        - MISC (outros)
        """
        label_upper = label.upper()
        
        # Remove B- and I- prefixes (BIO tagging)
        if label_upper.startswith(('B-', 'I-')):
            label_upper = label_upper[2:]
        
        # Mapping
        mappings = {
            'PER': 'PERSON',
            'PERSON': 'PERSON',
            'PESSOAL': 'PERSON',
            'ORG': 'ORGANIZATION',
            'ORGANIZATION': 'ORGANIZATION',
            'ORGANIZACAO': 'ORGANIZATION',
            'LOC': 'LOCATION',
            'LOCATION': 'LOCATION',
            'LOCAL': 'LOCATION',
            'GPE': 'LOCATION',  # Geopolitical entity
            'MONEY': 'MONEY',
            'VALOR': 'MONEY',
            'DATE': 'DATE',
            'TIME': 'DATE',
            'DATA': 'DATE',
            'MISC': 'MISC',
            'LEGISLACAO': 'MISC',
            'JURISPRUDENCIA': 'MISC'
        }
        
        return mappings.get(label_upper, 'MISC')
    
    def extract_entities_grouped(self, text: str) -> Dict[str, List[str]]:
        """
        Extract entities grouped by type
        
        Returns:
            Dict like:
            {
                "PERSON": ["João Silva", "Maria Santos"],
                "ORGANIZATION": ["Empresa X"],
                "LOCATION": ["São Paulo"]
            }
        """
        entities = self.extract_entities(text)
        
        grouped = {}
        for entity in entities:
            if entity.label not in grouped:
                grouped[entity.label] = []
            grouped[entity.label].append(entity.text)
        
        return grouped


# Singleton instance
_ner_engine = None

def get_ner_engine(model_name: Optional[str] = None) -> BERTimbauNER:
    """Get singleton NER engine"""
    global _ner_engine
    if _ner_engine is None:
        _ner_engine = BERTimbauNER(model_name or "pierreguillou/bert-base-cased-pt-lenerbr")
    return _ner_engine


def extract_entities(text: str, min_confidence: float = 0.5) -> List[Entity]:
    """
    Convenience function to extract entities
    
    Args:
        text: Input text
        min_confidence: Minimum confidence threshold
    
    Returns:
        List of Entity objects
    """
    engine = get_ner_engine()
    return engine.extract_entities(text, min_confidence)


if __name__ == "__main__":
    # Quick test
    test_texts = [
        "João Silva foi preso em São Paulo pela Polícia Federal por suspeita de lavagem de dinheiro.",
        "A organização criminosa operava em Belo Horizonte e tinha conexões com o PCC.",
        "O Tribunal de Justiça de Minas Gerais condenou o réu a 15 anos de prisão."
    ]
    
    print("=" * 60)
    print("BERTimbau NER Test")
    print("=" * 60)
    
    engine = get_ner_engine()
    
    for i, text in enumerate(test_texts, 1):
        print(f"\n--- Test {i} ---")
        print(f"Text: {text}")
        
        entities = engine.extract_entities(text)
        print(f"Entities found: {len(entities)}")
        
        for entity in entities:
            print(f"  • {entity.text} ({entity.label}) - confidence: {entity.confidence:.3f}")
        
        # Grouped view
        grouped = engine.extract_entities_grouped(text)
        print(f"Grouped: {grouped}")
