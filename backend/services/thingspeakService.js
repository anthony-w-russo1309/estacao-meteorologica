// ==================== backend/services/thingspeakService.js ====================
const axios = require('axios');
const database = require('../database');

// Tentar importar storageService, mas não falhar se não existir
let storageService = null;
try {
  storageService = require('./storageService');
} catch (e) {
  console.log('⚠️ StorageService não disponível');
}

class ThingSpeakService {
  async fetchLatest(channelId, apiKey = '') {
    try {
      let url = `https://api.thingspeak.com/channels/${channelId}/feeds/last.json`;
      if (apiKey && apiKey !== '') {
        url += `?api_key=${apiKey}`;
      }
      
      console.log(`📡 ThingSpeak URL: ${url}`);
      
      const response = await axios.get(url, { 
        timeout: 10000,
        headers: { 'Accept': 'application/json' }
      });
      
      console.log(`📡 ThingSpeak resposta recebida`);
      
      if (response.data && response.data.field1 !== undefined) {
        console.log(`📊 Dados ESP32: field1=${response.data.field1}, field2=${response.data.field2}, field3=${response.data.field3}`);
        return response.data;
      } else {
        console.error('❌ ThingSpeak retornou dados inválidos');
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar do ThingSpeak:', error.message);
      return null;
    }
  }

  async fetchHistory(channelId, limit = 120, apiKey = '') {
    try {
      let url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?results=${limit}`;
      if (apiKey && apiKey !== '') {
        url += `&api_key=${apiKey}`;
      }
      
      const response = await axios.get(url, { timeout: 10000 });
      return response.data.feeds || [];
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error.message);
      return [];
    }
  }

  async fetchAndSave(channelId, apiKey = '') {
    try {
      const latest = await this.fetchLatest(channelId, apiKey);
      
      if (latest && latest.field1 !== undefined && latest.field1 !== null && latest.field1 !== '') {
        const dadosProcessados = {
          temperature: parseFloat(latest.field1) || null,
          humidity: parseFloat(latest.field2) || null,
          pressure: parseFloat(latest.field3) || null,
          source: 'ESP32',
          timestamp: latest.created_at || new Date().toISOString()
        };
        
        console.log(`💾 Salvando dados ESP32: Temp=${dadosProcessados.temperature}°C, Hum=${dadosProcessados.humidity}%, Press=${dadosProcessados.pressure}hPa`);
        
        // Salvar no SQLite
        await database.salvarLeitura({
          timestamp: dadosProcessados.timestamp,
          temperatura: dadosProcessados.temperature,
          umidade: dadosProcessados.humidity,
          pressao: dadosProcessados.pressure
        });
        
        // Tentar salvar no MongoDB se disponível
        if (storageService && storageService.saveWeatherData) {
          await storageService.saveWeatherData(dadosProcessados);
        }
        
        return latest;
      } else {
        console.log('⚠️ ThingSpeak sem dados válidos da ESP32');
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao processar dados:', error.message);
      throw error;
    }
  }
}

module.exports = new ThingSpeakService();