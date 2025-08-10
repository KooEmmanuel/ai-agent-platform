"""
Weather API Tool

A tool for fetching weather information using OpenWeatherMap API.
Provides current weather, forecasts, and weather alerts.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
import aiohttp

from .base import BaseTool

logger = logging.getLogger(__name__)

class WeatherAPITool(BaseTool):
    """
    Weather API Tool using OpenWeatherMap API.
    
    Features:
    - Current weather conditions
    - Weather forecasts (daily/hourly)
    - Weather alerts
    - Multiple units (metric/imperial)
    - Location search by city/coordinates
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_key = config.get('api_key', '')
        self.base_url = "https://api.openweathermap.org/data/2.5"
        self.units = config.get('units', 'metric')  # metric, imperial, kelvin
        self.language = config.get('language', 'en')
        
    async def execute(self, location: str, forecast_type: str = "current", 
                     days: Optional[int] = None) -> Dict[str, Any]:
        """
        Get weather information.
        
        Args:
            location: City name, coordinates, or location query
            forecast_type: Type of forecast (current, daily, hourly)
            days: Number of days for forecast (1-7 for daily, 1-48 for hourly)
            
        Returns:
            Weather information
        """
        if not location:
            return self._format_error("Location is required")
        
        if not self.api_key:
            return self._format_error("OpenWeatherMap API key is required")
        
        try:
            if forecast_type == "current":
                result = await self._get_current_weather(location)
            elif forecast_type == "daily":
                days = min(max(days or 5, 1), 7)  # Limit to 1-7 days
                result = await self._get_daily_forecast(location, days)
            elif forecast_type == "hourly":
                days = min(max(days or 24, 1), 48)  # Limit to 1-48 hours
                result = await self._get_hourly_forecast(location, days)
            else:
                return self._format_error(f"Unsupported forecast type: {forecast_type}")
            
            return result
            
        except Exception as e:
            logger.error(f"Weather API error: {str(e)}")
            return self._format_error(f"Weather data fetch failed: {str(e)}")
    
    async def _get_current_weather(self, location: str) -> Dict[str, Any]:
        """Get current weather for a location."""
        url = f"{self.base_url}/weather"
        params = {
            'q': location,
            'appid': self.api_key,
            'units': self.units,
            'lang': self.language
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    weather_info = {
                        'location': {
                            'name': data.get('name', ''),
                            'country': data.get('sys', {}).get('country', ''),
                            'coordinates': {
                                'lat': data.get('coord', {}).get('lat'),
                                'lon': data.get('coord', {}).get('lon')
                            }
                        },
                        'current': {
                            'temperature': data.get('main', {}).get('temp'),
                            'feels_like': data.get('main', {}).get('feels_like'),
                            'humidity': data.get('main', {}).get('humidity'),
                            'pressure': data.get('main', {}).get('pressure'),
                            'description': data.get('weather', [{}])[0].get('description', ''),
                            'icon': data.get('weather', [{}])[0].get('icon', ''),
                            'wind_speed': data.get('wind', {}).get('speed'),
                            'wind_direction': data.get('wind', {}).get('deg'),
                            'visibility': data.get('visibility'),
                            'clouds': data.get('clouds', {}).get('all')
                        },
                        'sun': {
                            'sunrise': data.get('sys', {}).get('sunrise'),
                            'sunset': data.get('sys', {}).get('sunset')
                        },
                        'units': self.units,
                        'timestamp': data.get('dt')
                    }
                    
                    metadata = {
                        'location': location,
                        'forecast_type': 'current',
                        'units': self.units
                    }
                    
                    return self._format_success(weather_info, metadata)
                else:
                    error_data = await response.json()
                    raise Exception(f"API Error: {error_data.get('message', 'Unknown error')}")
    
    async def _get_daily_forecast(self, location: str, days: int) -> Dict[str, Any]:
        """Get daily weather forecast."""
        url = f"{self.base_url}/forecast"
        params = {
            'q': location,
            'appid': self.api_key,
            'units': self.units,
            'lang': self.language,
            'cnt': days * 8  # 8 forecasts per day (every 3 hours)
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Group forecasts by day
                    daily_forecasts = {}
                    for forecast in data.get('list', []):
                        date = datetime.fromtimestamp(forecast['dt']).strftime('%Y-%m-%d')
                        if date not in daily_forecasts:
                            daily_forecasts[date] = []
                        daily_forecasts[date].append(forecast)
                    
                    # Calculate daily averages
                    processed_forecasts = []
                    for date, forecasts in list(daily_forecasts.items())[:days]:
                        daily_data = self._calculate_daily_averages(forecasts)
                        processed_forecasts.append({
                            'date': date,
                            'day_name': datetime.strptime(date, '%Y-%m-%d').strftime('%A'),
                            **daily_data
                        })
                    
                    weather_info = {
                        'location': {
                            'name': data.get('city', {}).get('name', ''),
                            'country': data.get('city', {}).get('country', ''),
                            'coordinates': data.get('city', {}).get('coord', {})
                        },
                        'forecasts': processed_forecasts,
                        'units': self.units
                    }
                    
                    metadata = {
                        'location': location,
                        'forecast_type': 'daily',
                        'days': days,
                        'units': self.units
                    }
                    
                    return self._format_success(weather_info, metadata)
                else:
                    error_data = await response.json()
                    raise Exception(f"API Error: {error_data.get('message', 'Unknown error')}")
    
    async def _get_hourly_forecast(self, location: str, hours: int) -> Dict[str, Any]:
        """Get hourly weather forecast."""
        url = f"{self.base_url}/forecast"
        params = {
            'q': location,
            'appid': self.api_key,
            'units': self.units,
            'lang': self.language,
            'cnt': min(hours, 40)  # API limit is 40 forecasts (5 days)
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    hourly_forecasts = []
                    for forecast in data.get('list', [])[:hours]:
                        hourly_forecasts.append({
                            'datetime': forecast['dt'],
                            'datetime_formatted': datetime.fromtimestamp(forecast['dt']).strftime('%Y-%m-%d %H:%M'),
                            'temperature': forecast.get('main', {}).get('temp'),
                            'feels_like': forecast.get('main', {}).get('feels_like'),
                            'humidity': forecast.get('main', {}).get('humidity'),
                            'description': forecast.get('weather', [{}])[0].get('description', ''),
                            'icon': forecast.get('weather', [{}])[0].get('icon', ''),
                            'wind_speed': forecast.get('wind', {}).get('speed'),
                            'wind_direction': forecast.get('wind', {}).get('deg'),
                            'clouds': forecast.get('clouds', {}).get('all'),
                            'pop': forecast.get('pop', 0)  # Probability of precipitation
                        })
                    
                    weather_info = {
                        'location': {
                            'name': data.get('city', {}).get('name', ''),
                            'country': data.get('city', {}).get('country', ''),
                            'coordinates': data.get('city', {}).get('coord', {})
                        },
                        'forecasts': hourly_forecasts,
                        'units': self.units
                    }
                    
                    metadata = {
                        'location': location,
                        'forecast_type': 'hourly',
                        'hours': len(hourly_forecasts),
                        'units': self.units
                    }
                    
                    return self._format_success(weather_info, metadata)
                else:
                    error_data = await response.json()
                    raise Exception(f"API Error: {error_data.get('message', 'Unknown error')}")
    
    def _calculate_daily_averages(self, forecasts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate daily averages from hourly forecasts."""
        temps = [f.get('main', {}).get('temp', 0) for f in forecasts]
        humidities = [f.get('main', {}).get('humidity', 0) for f in forecasts]
        wind_speeds = [f.get('wind', {}).get('speed', 0) for f in forecasts]
        pops = [f.get('pop', 0) for f in forecasts]
        
        # Get most common weather description
        descriptions = [f.get('weather', [{}])[0].get('description', '') for f in forecasts]
        most_common_desc = max(set(descriptions), key=descriptions.count)
        
        return {
            'temperature_avg': sum(temps) / len(temps) if temps else 0,
            'temperature_min': min(temps) if temps else 0,
            'temperature_max': max(temps) if temps else 0,
            'humidity_avg': sum(humidities) / len(humidities) if humidities else 0,
            'wind_speed_avg': sum(wind_speeds) / len(wind_speeds) if wind_speeds else 0,
            'precipitation_probability': max(pops) if pops else 0,
            'description': most_common_desc,
            'icon': forecasts[0].get('weather', [{}])[0].get('icon', '') if forecasts else ''
        }
    
    async def search_location(self, query: str) -> Dict[str, Any]:
        """
        Search for locations by name.
        
        Args:
            query: Location search query
            
        Returns:
            List of matching locations
        """
        if not query:
            return self._format_error("Search query is required")
        
        if not self.api_key:
            return self._format_error("OpenWeatherMap API key is required")
        
        try:
            url = "http://api.openweathermap.org/geo/1.0/direct"
            params = {
                'q': query,
                'limit': 5,
                'appid': self.api_key
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        locations = []
                        for location in data:
                            locations.append({
                                'name': location.get('name', ''),
                                'country': location.get('country', ''),
                                'state': location.get('state', ''),
                                'coordinates': {
                                    'lat': location.get('lat'),
                                    'lon': location.get('lon')
                                }
                            })
                        
                        return self._format_success(locations, {'query': query})
                    else:
                        error_data = await response.json()
                        raise Exception(f"API Error: {error_data.get('message', 'Unknown error')}")
                        
        except Exception as e:
            logger.error(f"Location search error: {str(e)}")
            return self._format_error(f"Location search failed: {str(e)}")
    
    async def get_weather_alerts(self, location: str) -> Dict[str, Any]:
        """
        Get weather alerts for a location.
        
        Args:
            location: City name or coordinates
            
        Returns:
            Weather alerts information
        """
        if not location:
            return self._format_error("Location is required")
        
        if not self.api_key:
            return self._format_error("OpenWeatherMap API key is required")
        
        try:
            url = f"{self.base_url}/onecall"
            params = {
                'q': location,
                'appid': self.api_key,
                'exclude': 'current,minutely,hourly,daily',
                'units': self.units
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        alerts = data.get('alerts', [])
                        alert_info = []
                        
                        for alert in alerts:
                            alert_info.append({
                                'sender_name': alert.get('sender_name', ''),
                                'event': alert.get('event', ''),
                                'start': alert.get('start'),
                                'end': alert.get('end'),
                                'description': alert.get('description', ''),
                                'tags': alert.get('tags', [])
                            })
                        
                        return self._format_success({
                            'alerts': alert_info,
                            'alerts_count': len(alerts)
                        }, {'location': location})
                    else:
                        error_data = await response.json()
                        raise Exception(f"API Error: {error_data.get('message', 'Unknown error')}")
                        
        except Exception as e:
            logger.error(f"Weather alerts error: {str(e)}")
            return self._format_error(f"Weather alerts fetch failed: {str(e)}")
    
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
                'Current weather conditions',
                'Daily weather forecasts',
                'Hourly weather forecasts',
                'Weather alerts',
                'Location search',
                'Multiple units support',
                'Multi-language support'
            ],
            'supported_units': ['metric', 'imperial', 'kelvin'],
            'parameters': {
                'location': 'City name, coordinates, or location query (required)',
                'forecast_type': 'Type of forecast (current, daily, hourly)',
                'days': 'Number of days/hours for forecast'
            }
        } 