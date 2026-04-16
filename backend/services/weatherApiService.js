// ==================== backend/services/weatherApiService.js ====================
/**
 * Weather API Service - Open-Meteo (gratuito, sem chave)
 * Busca dados meteorológicos externos para comparação
 */

const axios = require('axios');

class WeatherAPIService {
  constructor() {
    // Usando Open-Meteo API (gratuita, sem chave)
    this.baseUrl = process.env.WEATHER_PROVIDER === 'open-meteo' 
      ? 'https://api.open-meteo.com/v1'
      : 'https://api.open-meteo.com/v1';
    
    this.lat = process.env.LAT || '-21.8322';
    this.lon = process.env.LON || '-46.8936';
    this.alt = process.env.ALT || '721';
    this.timeout = 10000;
  }

  async fetchLatestData() {
    try {
      const url = `${this.baseUrl}/forecast?latitude=${this.lat}&longitude=${this.lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,pressure_msl&timezone=America/Sao_Paulo`;
      
      console.log(`🌍 Buscando dados externos de: ${this.lat}, ${this.lon}`);
      
      const response = await axios.get(url, { timeout: this.timeout });
      
      if (response.data && response.data.current_weather) {
        const current = response.data.current_weather;
        const hourly = response.data.hourly;
        
        const now = new Date();
        const currentHour = now.toISOString().slice(0, 13) + ':00';
        const hourIndex = hourly.time.findIndex(t => t === currentHour);
        
        const humidity = hourIndex !== -1 ? hourly.relative_humidity_2m[hourIndex] : null;
        const pressure = hourIndex !== -1 ? hourly.pressure_msl[hourIndex] : null;
        
        const weatherData = {
          temp: current.temperature,
          humidity: humidity,
          pressure: pressure,
          timestamp: new Date().toISOString(),
          station: 'Open-Meteo',
          source: 'open-meteo',
          location: `${this.lat}, ${this.lon}`
        };
        
        console.log(`✅ Dados externos: ${weatherData.temp}°C, ${weatherData.humidity}%, ${weatherData.pressure}hPa`);
        
        return weatherData;
      }
      
      throw new Error('Invalid response from Open-Meteo API');
      
    } catch (error) {
      console.error('[WeatherAPI] Error:', error.message);
      return this.getSimulatedData();
    }
  }

  async fetchForecast(days = 7) {
    try {
      const url = `${this.baseUrl}/forecast?latitude=${this.lat}&longitude=${this.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=America/Sao_Paulo&forecast_days=${days}`;
      
      const response = await axios.get(url, { timeout: this.timeout });
      
      if (response.data && response.data.daily) {
        return response.data.daily;
      }
      
      return null;
      
    } catch (error) {
      console.error('[WeatherAPI] Forecast error:', error.message);
      return null;
    }
  }

  getSimulatedData() {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth();
    
    let baseTemp = 22;
    if (month >= 11 || month <= 2) baseTemp = 26;
    else if (month >= 3 && month <= 5) baseTemp = 22;
    else if (month >= 6 && month <= 8) baseTemp = 18;
    else baseTemp = 24;
    
    const dailyVariation = Math.sin((hour - 6) * Math.PI / 12) * 6;
    const temp = parseFloat((baseTemp + dailyVariation + (Math.random() - 0.5) * 2).toFixed(1));
    
    const baseHumidity = 70;
    const humidityVariation = (temp - baseTemp) * -1.5;
    const humidity = parseFloat(Math.min(100, Math.max(30, baseHumidity + humidityVariation + (Math.random() - 0.5) * 10)).toFixed(1));
    
    const pressure = parseFloat((1013 + Math.sin(hour * Math.PI / 12) * 3 + (Math.random() - 0.5) * 2).toFixed(1));
    
    console.log(`[WeatherAPI] Usando dados simulados`);
    
    return {
      temp: temp,
      humidity: humidity,
      pressure: pressure,
      timestamp: now.toISOString(),
      station: 'Simulated Data',
      source: 'simulated',
      location: `${this.lat}, ${this.lon}`
    };
  }
}

module.exports = new WeatherAPIService();