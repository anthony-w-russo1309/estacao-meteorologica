const axios = require('axios');
const database = require('../database');

class ThingSpeakService {
  async fetchLatest(channelId, apiKey = '') {
    const url = `https://api.thingspeak.com/channels/${channelId}/feeds/last.json${apiKey ? `?api_key=${apiKey}` : ''}`;
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  }

  async fetchHistory(channelId, limit = 120, apiKey = '') {
    const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json${apiKey ? `?api_key=${apiKey}&` : '?'}results=${limit}`;
    const response = await axios.get(url, { timeout: 10000 });
    return response.data.feeds || [];
  }

  async fetchAndSave(channelId, apiKey = '') {
    try {
      const latest = await this.fetchLatest(channelId, apiKey);
      
      if (latest && latest.field1) {
        const leitura = {
          timestamp: latest.created_at,
          temperatura: parseFloat(latest.field1) || null,
          umidade: parseFloat(latest.field2) || null,
          pressao: parseFloat(latest.field3) || null
        };
        
        // Verificar se já existe (evitar duplicatas)
        const ultimas = await database.buscarUltimas(1);
        const ultimoTimestamp = ultimas.length > 0 ? ultimas[0].timestamp : null;
        
        if (ultimoTimestamp !== leitura.timestamp) {
          await database.salvarLeitura(leitura);
          console.log('📊 Dados salvos no banco local:', leitura.timestamp);
        }
      }
      
      return latest;
    } catch (error) {
      console.error('Erro ao salvar no banco:', error.message);
      throw error;
    }
  }
}

module.exports = new ThingSpeakService();