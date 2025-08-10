"""
Text Analyzer Tool

A tool for performing various text analysis operations including sentiment analysis,
keyword extraction, text summarization, and language processing.
"""

import asyncio
import json
import logging
import re
from typing import Any, Dict, List, Optional, Union
from collections import Counter
import nltk
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.corpus import stopwords
from nltk.sentiment import SentimentIntensityAnalyzer
from textblob import TextBlob

from .base import BaseTool

logger = logging.getLogger(__name__)

class TextAnalyzerTool(BaseTool):
    """
    Text Analyzer Tool for comprehensive text analysis.
    
    Features:
    - Sentiment analysis
    - Keyword extraction
    - Text summarization
    - Language detection
    - Text statistics
    - Named entity recognition
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.max_text_length = config.get('max_text_length', 100000)
        
        # Download required NLTK data
        try:
            nltk.download('punkt', quiet=True)
            nltk.download('stopwords', quiet=True)
            nltk.download('vader_lexicon', quiet=True)
            nltk.download('averaged_perceptron_tagger', quiet=True)
            nltk.download('maxent_ne_chunker', quiet=True)
            nltk.download('words', quiet=True)
        except Exception as e:
            logger.warning(f"Could not download NLTK data: {str(e)}")
        
        self.stop_words = set(stopwords.words('english'))
        self.sentiment_analyzer = SentimentIntensityAnalyzer()
        
    async def execute(self, operation: str, text: str, **kwargs) -> Dict[str, Any]:
        """
        Execute text analysis operation.
        
        Args:
            operation: Type of operation (sentiment, keywords, summarize, etc.)
            text: Text to analyze
            **kwargs: Additional operation-specific parameters
            
        Returns:
            Analysis result
        """
        if not operation or not text:
            return self._format_error("Operation and text are required")
        
        if len(text) > self.max_text_length:
            return self._format_error(f"Text too long: {len(text)} characters (max: {self.max_text_length})")
        
        try:
            if operation == "sentiment":
                return await self._analyze_sentiment(text, **kwargs)
            elif operation == "keywords":
                return await self._extract_keywords(text, **kwargs)
            elif operation == "summarize":
                return await self._summarize_text(text, **kwargs)
            elif operation == "statistics":
                return await self._get_text_statistics(text, **kwargs)
            elif operation == "entities":
                return await self._extract_entities(text, **kwargs)
            elif operation == "language":
                return await self._detect_language(text, **kwargs)
            else:
                return self._format_error(f"Unsupported operation: {operation}")
                
        except Exception as e:
            logger.error(f"Text analysis error: {str(e)}")
            return self._format_error(f"Text analysis failed: {str(e)}")
    
    async def _analyze_sentiment(self, text: str, method: str = "vader") -> Dict[str, Any]:
        """Analyze sentiment of the text."""
        try:
            if method == "vader":
                # Use VADER sentiment analyzer
                scores = self.sentiment_analyzer.polarity_scores(text)
                
                sentiment_data = {
                    'compound_score': scores['compound'],
                    'positive_score': scores['pos'],
                    'negative_score': scores['neg'],
                    'neutral_score': scores['neu'],
                    'sentiment': self._get_sentiment_label(scores['compound'])
                }
            elif method == "textblob":
                # Use TextBlob sentiment analyzer
                blob = TextBlob(text)
                polarity = blob.sentiment.polarity
                subjectivity = blob.sentiment.subjectivity
                
                sentiment_data = {
                    'polarity': polarity,
                    'subjectivity': subjectivity,
                    'sentiment': self._get_sentiment_label(polarity)
                }
            else:
                return self._format_error(f"Unsupported sentiment method: {method}")
            
            metadata = {
                'operation': 'sentiment',
                'method': method,
                'text_length': len(text)
            }
            
            return self._format_success(sentiment_data, metadata)
            
        except Exception as e:
            raise Exception(f"Sentiment analysis error: {str(e)}")
    
    async def _extract_keywords(self, text: str, max_keywords: int = 10, 
                              min_length: int = 3) -> Dict[str, Any]:
        """Extract keywords from text."""
        try:
            # Tokenize and clean text
            tokens = word_tokenize(text.lower())
            
            # Remove stop words and short words
            keywords = [word for word in tokens 
                       if word.isalnum() and len(word) >= min_length 
                       and word not in self.stop_words]
            
            # Count frequencies
            keyword_freq = Counter(keywords)
            
            # Get top keywords
            top_keywords = keyword_freq.most_common(max_keywords)
            
            keyword_data = {
                'keywords': [{'word': word, 'frequency': freq} for word, freq in top_keywords],
                'total_keywords': len(keyword_freq),
                'unique_keywords': len(set(keywords))
            }
            
            metadata = {
                'operation': 'keywords',
                'max_keywords': max_keywords,
                'min_length': min_length,
                'text_length': len(text)
            }
            
            return self._format_success(keyword_data, metadata)
            
        except Exception as e:
            raise Exception(f"Keyword extraction error: {str(e)}")
    
    async def _summarize_text(self, text: str, max_sentences: int = 3) -> Dict[str, Any]:
        """Summarize text using extractive summarization."""
        try:
            # Tokenize into sentences
            sentences = sent_tokenize(text)
            
            if len(sentences) <= max_sentences:
                # Text is already short enough
                summary = sentences
            else:
                # Simple extractive summarization based on sentence length and position
                sentence_scores = []
                
                for i, sentence in enumerate(sentences):
                    # Score based on position (first sentences are more important)
                    position_score = 1.0 - (i / len(sentences))
                    
                    # Score based on length (medium length sentences are preferred)
                    length_score = min(len(sentence.split()) / 20.0, 1.0)
                    
                    # Combined score
                    score = (position_score + length_score) / 2
                    sentence_scores.append((score, sentence))
                
                # Sort by score and take top sentences
                sentence_scores.sort(reverse=True)
                summary = [sentence for score, sentence in sentence_scores[:max_sentences]]
                
                # Sort back to original order
                summary.sort(key=lambda x: sentences.index(x))
            
            summary_data = {
                'summary': ' '.join(summary),
                'summary_sentences': summary,
                'original_length': len(text),
                'summary_length': len(' '.join(summary)),
                'compression_ratio': round(len(' '.join(summary)) / len(text), 2)
            }
            
            metadata = {
                'operation': 'summarize',
                'max_sentences': max_sentences,
                'original_sentences': len(sentences)
            }
            
            return self._format_success(summary_data, metadata)
            
        except Exception as e:
            raise Exception(f"Text summarization error: {str(e)}")
    
    async def _get_text_statistics(self, text: str) -> Dict[str, Any]:
        """Get comprehensive text statistics."""
        try:
            # Basic statistics
            characters = len(text)
            words = len(text.split())
            sentences = len(sent_tokenize(text))
            paragraphs = len([p for p in text.split('\n\n') if p.strip()])
            
            # Word-level statistics
            tokens = word_tokenize(text.lower())
            unique_words = len(set(tokens))
            
            # Calculate average word length
            word_lengths = [len(word) for word in tokens if word.isalnum()]
            avg_word_length = sum(word_lengths) / len(word_lengths) if word_lengths else 0
            
            # Calculate average sentence length
            avg_sentence_length = words / sentences if sentences > 0 else 0
            
            # Readability metrics
            readability_score = self._calculate_readability(text)
            
            statistics_data = {
                'basic_stats': {
                    'characters': characters,
                    'words': words,
                    'sentences': sentences,
                    'paragraphs': paragraphs,
                    'unique_words': unique_words
                },
                'averages': {
                    'word_length': round(avg_word_length, 2),
                    'sentence_length': round(avg_sentence_length, 2)
                },
                'readability': {
                    'score': readability_score,
                    'level': self._get_readability_level(readability_score)
                }
            }
            
            metadata = {
                'operation': 'statistics',
                'text_length': characters
            }
            
            return self._format_success(statistics_data, metadata)
            
        except Exception as e:
            raise Exception(f"Statistics calculation error: {str(e)}")
    
    async def _extract_entities(self, text: str) -> Dict[str, Any]:
        """Extract named entities from text."""
        try:
            # Tokenize and tag parts of speech
            tokens = nltk.word_tokenize(text)
            pos_tags = nltk.pos_tag(tokens)
            
            # Extract named entities
            entities = nltk.chunk.ne_chunk(pos_tags)
            
            entity_data = {
                'entities': [],
                'entity_types': {}
            }
            
            for entity in entities:
                if hasattr(entity, 'label'):
                    entity_text = ' '.join([word for word, tag in entity.leaves()])
                    entity_type = entity.label()
                    
                    entity_data['entities'].append({
                        'text': entity_text,
                        'type': entity_type
                    })
                    
                    if entity_type not in entity_data['entity_types']:
                        entity_data['entity_types'][entity_type] = []
                    entity_data['entity_types'][entity_type].append(entity_text)
            
            metadata = {
                'operation': 'entities',
                'text_length': len(text),
                'total_entities': len(entity_data['entities'])
            }
            
            return self._format_success(entity_data, metadata)
            
        except Exception as e:
            raise Exception(f"Entity extraction error: {str(e)}")
    
    async def _detect_language(self, text: str) -> Dict[str, Any]:
        """Detect the language of the text."""
        try:
            blob = TextBlob(text)
            detected_lang = blob.detect_language()
            
            language_data = {
                'language_code': detected_lang,
                'confidence': 0.9,  # TextBlob doesn't provide confidence
                'text_sample': text[:100] + '...' if len(text) > 100 else text
            }
            
            metadata = {
                'operation': 'language',
                'text_length': len(text)
            }
            
            return self._format_success(language_data, metadata)
            
        except Exception as e:
            raise Exception(f"Language detection error: {str(e)}")
    
    def _get_sentiment_label(self, score: float) -> str:
        """Convert sentiment score to label."""
        if score >= 0.05:
            return 'positive'
        elif score <= -0.05:
            return 'negative'
        else:
            return 'neutral'
    
    def _calculate_readability(self, text: str) -> float:
        """Calculate Flesch Reading Ease score."""
        try:
            sentences = len(sent_tokenize(text))
            words = len(text.split())
            syllables = self._count_syllables(text)
            
            if sentences == 0 or words == 0:
                return 0
            
            # Flesch Reading Ease formula
            score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words))
            return max(0, min(100, score))
            
        except Exception:
            return 0
    
    def _count_syllables(self, text: str) -> int:
        """Count syllables in text (simplified method)."""
        text = text.lower()
        count = 0
        vowels = "aeiouy"
        on_vowel = False
        
        for char in text:
            is_vowel = char in vowels
            if is_vowel and not on_vowel:
                count += 1
            on_vowel = is_vowel
        
        return max(1, count)
    
    def _get_readability_level(self, score: float) -> str:
        """Convert readability score to level."""
        if score >= 90:
            return 'Very Easy'
        elif score >= 80:
            return 'Easy'
        elif score >= 70:
            return 'Fairly Easy'
        elif score >= 60:
            return 'Standard'
        elif score >= 50:
            return 'Fairly Difficult'
        elif score >= 30:
            return 'Difficult'
        else:
            return 'Very Difficult'
    
    def get_tool_info(self) -> Dict[str, Any]:
        """
        Get information about this tool.
        
        Returns:
            Tool information dictionary
        """
        return {
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'tool_type': self.tool_type,
            'capabilities': [
                'Sentiment analysis (VADER and TextBlob)',
                'Keyword extraction',
                'Text summarization',
                'Text statistics and metrics',
                'Named entity recognition',
                'Language detection',
                'Readability analysis'
            ],
            'supported_operations': [
                'sentiment',
                'keywords',
                'summarize',
                'statistics',
                'entities',
                'language'
            ],
            'parameters': {
                'operation': 'Type of analysis operation (required)',
                'text': 'Text to analyze (required)',
                'method': 'Sentiment analysis method (vader/textblob)',
                'max_keywords': 'Maximum number of keywords to extract',
                'max_sentences': 'Maximum sentences for summarization'
            }
        } 