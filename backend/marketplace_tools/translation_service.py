"""
Translation Service Tool

A tool for translating text between multiple languages using Deep Translator.
Provides text translation, language detection, and batch translation capabilities.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Union
from deep_translator import GoogleTranslator
from deep_translator.exceptions import LanguageNotSupportedException
from langdetect import detect

from .base import BaseTool

logger = logging.getLogger(__name__)

class TranslationServiceTool(BaseTool):
    """
    Translation Service Tool using Deep Translator.
    
    Features:
    - Text translation between multiple languages
    - Language detection
    - Batch translation
    - Translation with context
    - Language code mapping
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.default_source = config.get('default_source', 'auto')
        self.default_target = config.get('default_target', 'en')
        self.supported_languages = self._get_supported_languages()
        
    def _get_supported_languages(self) -> Dict[str, str]:
        """Get supported languages for Google Translator"""
        try:
            # Get supported languages from Google Translator
            languages = GoogleTranslator.get_supported_languages()
            return {lang: lang for lang in languages}
        except Exception as e:
            logger.warning(f"Could not get supported languages: {e}")
            # Fallback to common languages
            return {
                'en': 'English',
                'es': 'Spanish',
                'fr': 'French',
                'de': 'German',
                'it': 'Italian',
                'pt': 'Portuguese',
                'ru': 'Russian',
                'ja': 'Japanese',
                'ko': 'Korean',
                'zh': 'Chinese',
                'ar': 'Arabic',
                'hi': 'Hindi'
            }
        
    async def execute(self, operation: str, text: str, 
                     source_lang: Optional[str] = None,
                     target_lang: Optional[str] = None,
                     **kwargs) -> Dict[str, Any]:
        """
        Execute translation operation.
        
        Args:
            operation: Type of operation (translate, detect, batch_translate)
            text: Text to translate or detect
            source_lang: Source language code (optional for auto-detection)
            target_lang: Target language code
            **kwargs: Additional operation-specific parameters
            
        Returns:
            Translation result
        """
        if not operation or not text:
            return self._format_error("Operation and text are required")
        
        try:
            if operation == "translate":
                return await self._translate_text(text, source_lang, target_lang, **kwargs)
            elif operation == "detect":
                return await self._detect_language(text, **kwargs)
            elif operation == "batch_translate":
                return await self._batch_translate(text, source_lang, target_lang, **kwargs)
            elif operation == "get_languages":
                return await self._get_supported_languages_info(**kwargs)
            else:
                return self._format_error(f"Unsupported operation: {operation}")
                
        except Exception as e:
            logger.error(f"Translation error: {str(e)}")
            return self._format_error(f"Translation failed: {str(e)}")
    
    async def _translate_text(self, text: str, source_lang: Optional[str] = None,
                            target_lang: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """Translate text from source language to target language."""
        try:
            source_lang = source_lang or self.default_source
            target_lang = target_lang or self.default_target
            
            # Validate language codes
            if source_lang != 'auto' and source_lang not in self.supported_languages:
                return self._format_error(f"Unsupported source language: {source_lang}")
            
            if target_lang not in self.supported_languages:
                return self._format_error(f"Unsupported target language: {target_lang}")
            
            # Perform translation
            if source_lang == 'auto':
                translator = GoogleTranslator(target=target_lang)
            else:
                translator = GoogleTranslator(source=source_lang, target=target_lang)
            
            translated_text = translator.translate(text)
            
            # Detect actual source language if auto-detection was used
            detected_source = source_lang
            if source_lang == 'auto':
                try:
                    detected_source = detect(text)
                except:
                    detected_source = 'unknown'
            
            translation_data = {
                'original_text': text,
                'translated_text': translated_text,
                'source_language': detected_source,
                'target_language': target_lang,
                'source_language_name': self.supported_languages.get(detected_source, detected_source),
                'target_language_name': self.supported_languages.get(target_lang, target_lang),
                'character_count': len(text),
                'translation_confidence': 'high'  # Deep translator doesn't provide confidence scores
            }
            
            return self._format_success(translation_data)
            
        except LanguageNotSupportedException as e:
            return self._format_error(f"Language not supported: {str(e)}")
        except Exception as e:
            return self._format_error(f"Translation failed: {str(e)}")
    
    async def _detect_language(self, text: str, **kwargs) -> Dict[str, Any]:
        """Detect the language of the given text."""
        try:
            if not text.strip():
                return self._format_error("Text cannot be empty")
            
            # Detect language
            detected_lang = detect(text)
            
            detection_data = {
                'text': text,
                'detected_language': detected_lang,
                'detected_language_name': self.supported_languages.get(detected_lang, detected_lang),
                'confidence': 'high',  # Deep translator doesn't provide confidence scores
                'character_count': len(text)
            }
            
            return self._format_success(detection_data)
            
        except Exception as e:
            return self._format_error(f"Language detection failed: {str(e)}")
    
    async def _batch_translate(self, texts: Union[str, List[str]], 
                             source_lang: Optional[str] = None,
                             target_lang: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """Translate multiple texts."""
        try:
            # Convert single text to list
            if isinstance(texts, str):
                texts = [texts]
            
            if not texts:
                return self._format_error("No texts provided for translation")
            
            source_lang = source_lang or self.default_source
            target_lang = target_lang or self.default_target
            
            # Validate language codes
            if source_lang != 'auto' and source_lang not in self.supported_languages:
                return self._format_error(f"Unsupported source language: {source_lang}")
            
            if target_lang not in self.supported_languages:
                return self._format_error(f"Unsupported target language: {target_lang}")
            
            # Perform batch translation
            translations = []
            errors = []
            
            for i, text in enumerate(texts):
                try:
                    if source_lang == 'auto':
                        translator = GoogleTranslator(target=target_lang)
                    else:
                        translator = GoogleTranslator(source=source_lang, target=target_lang)
                    
                    translated_text = translator.translate(text)
                    
                    translations.append({
                        'index': i,
                        'original_text': text,
                        'translated_text': translated_text,
                        'success': True
                    })
                    
                except Exception as e:
                    errors.append({
                        'index': i,
                        'original_text': text,
                        'error': str(e),
                        'success': False
                    })
            
            batch_data = {
                'total_texts': len(texts),
                'successful_translations': len(translations),
                'failed_translations': len(errors),
                'translations': translations,
                'errors': errors,
                'source_language': source_lang,
                'target_language': target_lang
            }
            
            return self._format_success(batch_data)
            
        except Exception as e:
            return self._format_error(f"Batch translation failed: {str(e)}")
    
    async def _get_supported_languages_info(self, **kwargs) -> Dict[str, Any]:
        """Get information about supported languages."""
        try:
            languages_info = {
                'total_languages': len(self.supported_languages),
                'languages': [
                    {
                        'code': code,
                        'name': name
                    }
                    for code, name in self.supported_languages.items()
                ],
                'default_source': self.default_source,
                'default_target': self.default_target
            }
            
            return self._format_success(languages_info)
            
        except Exception as e:
            return self._format_error(f"Failed to get language information: {str(e)}")
    
    async def translate_with_context(self, text: str, context: str,
                                   target_lang: str, source_lang: Optional[str] = None) -> Dict[str, Any]:
        """Translate text with additional context."""
        try:
            # Combine text with context for better translation
            combined_text = f"{context}\n\n{text}"
            
            # Perform translation
            result = await self._translate_text(text, source_lang, target_lang)
            
            if result.get('success'):
                # Add context information to result
                result['result']['context'] = context
                result['result']['context_used'] = True
                
            return result
            
        except Exception as e:
            return self._format_error(f"Contextual translation failed: {str(e)}")
    
    async def get_language_info(self, language_code: str) -> Dict[str, Any]:
        """Get detailed information about a specific language."""
        try:
            if language_code not in self.supported_languages:
                return self._format_error(f"Language code not supported: {language_code}")
            
            language_info = {
                'code': language_code,
                'name': self.supported_languages[language_code],
                'is_supported': True,
                'translation_available': True
            }
            
            return self._format_success(language_info)
            
        except Exception as e:
            return self._format_error(f"Failed to get language info: {str(e)}")
    
    def get_tool_info(self) -> Dict[str, Any]:
        """Get tool information."""
        return {
            'name': 'Translation Service Tool',
            'description': 'Translate text between multiple languages using Deep Translator',
            'version': '1.0.0',
            'author': 'KooAgent',
            'features': [
                'Text translation between multiple languages',
                'Language detection',
                'Batch translation',
                'Translation with context',
                'Language code mapping'
            ],
            'required_config': {
                'default_source': 'Default source language (optional)',
                'default_target': 'Default target language (optional)'
            },
            'operations': [
                'translate - Translate text from one language to another',
                'detect - Detect the language of given text',
                'batch_translate - Translate multiple texts at once',
                'get_languages - Get list of supported languages'
            ],
            'supported_languages': len(self.supported_languages),
            'translation_provider': 'Deep Translator (Google)',
            'max_text_length': 5000,  # Approximate limit for Google Translator
            'rate_limits': 'Subject to Google Translator limits'
        } 