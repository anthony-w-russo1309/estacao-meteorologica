// ==================== backend/services/inmetService.js ====================
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
      : process.env.INMET_API_URL || 'https://api.open-meteo.com/v1';
    
    this.lat = process.env.LAT || '-21.8322';
    this.lon = process.env.LON || '-46.8936';
    this.alt = process.env.ALT || '721';
    this.timeout = 10000;
  }

  /**
   * Fetch latest weather data from Open-Meteo API
   * @returns {Promise<Object|null>} Normalized weather data or null on error
   */
  async fetchLatestData() {
    try {
      // Open-Meteo API - dados atuais (sem necessidade de chave)
      const url = `${this.baseUrl}/forecast?latitude=${this.lat}&longitude=${this.lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,pressure_msl&timezone=America/Sao_Paulo`;
      
      console.log(`🌍 Buscando dados externos de: ${this.lat}, ${this.lon}`);
      
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MeteorologicalStation/1.0'
        }
      });
      
      if (response.data && response.data.current_weather) {
        const current = response.data.current_weather;
        const hourly = response.data.hourly;
        
        // Encontrar o índice da hora atual nos dados horários
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
        
        console.log(`✅ Dados externos obtidos: ${weatherData.temp}°C, ${weatherData.humidity}%, ${weatherData.pressure}hPa`);
        
        return weatherData;
      }
      
      throw new Error('Invalid response from Open-Meteo API');
      
    } catch (error) {
      console.error('[WeatherAPI] Error fetching data:', error.message);
      
      // Fallback para dados simulados baseados em padrões reais
      return this.getSimulatedData();
    }
  }

  /**
   * Fetch forecast data for the next days
   * @param {number} days - Number of days to forecast (default 7)
   * @returns {Promise<Array|null>} Forecast data
   */
  async fetchForecast(days = 7) {
    try {
      const url = `${this.baseUrl}/forecast?latitude=${this.lat}&longitude=${this.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=America/Sao_Paulo&forecast_days=${days}`;
      
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MeteorologicalStation/1.0'
        }
      });
      
      if (response.data && response.data.daily) {
        return response.data.daily;
      }
      
      return null;
      
    } catch (error) {
      console.error('[WeatherAPI] Error fetching forecast:', error.message);
      return null;
    }
  }

  /**
   * Fetch historical data for a specific date range
   * @param {string} startDate - ISO date string (YYYY-MM-DD)
   * @param {string} endDate - ISO date string (YYYY-MM-DD)
   * @returns {Promise<Array|null>} Historical data
   */
  async fetchHistoricalData(startDate, endDate) {
    try {
      const url = `${this.baseUrl}/archive?latitude=${this.lat}&longitude=${this.lon}&start_date=${startDate}&end_date=${endDate}&hourly=temperature_2m,relative_humidity_2m,pressure_msl&timezone=America/Sao_Paulo`;
      
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MeteorologicalStation/1.0'
        }
      });
      
      if (response.data && response.data.hourly) {
        return response.data.hourly;
      }
      
      return null;
      
    } catch (error) {
      console.error('[WeatherAPI] Error fetching historical data:', error.message);
      return null;
    }
  }

  /**
   * Get simulated data when API is unavailable
   * Uses realistic meteorological patterns based on location and time
   * @returns {Object} Simulated weather data
   */
  getSimulatedData() {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth();
    
    // Temperatura base por estação (Vargem Grande do Sul - clima tropical de altitude)
    let baseTemp = 22;
    
    // Ajuste por estação
    if (month >= 11 || month <= 2) { // Verão (dez-fev)
      baseTemp = 26;
    } else if (month >= 3 && month <= 5) { // Outono
      baseTemp = 22;
    } else if (month >= 6 && month <= 8) { // Inverno
      baseTemp = 18;
    } else { // Primavera
      baseTemp = 24;
    }
    
    // Variação diária (mais quente às 15h, mais frio às 6h)
    const dailyVariation = Math.sin((hour - 6) * Math.PI / 12) * 6;
    const temp = parseFloat((baseTemp + dailyVariation + (Math.random() - 0.5) * 2).toFixed(1));
    
    // Umidade (inversamente proporcional à temperatura)
    const baseHumidity = 70;
    const humidityVariation = (temp - baseTemp) * -1.5;
    const humidity = parseFloat(Math.min(100, Math.max(30, baseHumidity + humidityVariation + (Math.random() - 0.5) * 10)).toFixed(1));
    
    // Pressão (variação pequena)
    const pressure = parseFloat((1013 + Math.sin(hour * Math.PI / 12) * 3 + (Math.random() - 0.5) * 2).toFixed(1));
    
    console.log(`[WeatherAPI] Usando dados simulados para ${this.lat}, ${this.lon}`);
    
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

  /**
   * Check if API is available
   * @returns {Promise<boolean>} True if API is available
   */
  async isAPIAvailable() {
    try {
      const url = `${this.baseUrl}/forecast?latitude=${this.lat}&longitude=${this.lon}&current_weather=true`;
      const response = await axios.get(url, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new WeatherAPIService();