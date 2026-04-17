// ==================== backend/controllers/weatherController.js ====================
const thingspeakService = require('../services/thingspeakService');
const database = require('../database');
const analysisService = require('../services/analysisService');
const weatherApiService = require('../services/weatherApiService');

let channelConfig = {
  channelId: process.env.THINGSPEAK_CHANNEL_ID || '3276829',
  readApiKey: process.env.THINGSPEAK_READ_API_KEY || ''
};

const ONLINE_THRESHOLD_SECONDS = 60;

function isTimestampRecent(timestamp) {
  if (!timestamp) return false;
  const dataTime = new Date(timestamp).getTime();
  const now = Date.now();
  const diffSeconds = (now - dataTime) / 1000;
  return diffSeconds < ONLINE_THRESHOLD_SECONDS;
}

function getDataAge(timestamp) {
  if (!timestamp) return 'desconhecido';
  const dataTime = new Date(timestamp).getTime();
  const now = Date.now();
  const diffSeconds = Math.floor((now - dataTime) / 1000);
  
  if (diffSeconds < 60) return `${diffSeconds} segundos`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutos`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} horas`;
  return `${Math.floor(diffSeconds / 86400)} dias`;
}

class WeatherController {
  async getLatest(req, res) {
    let data = null;
    let isOnline = false;
    let fromCache = false;
    let dataAge = null;
    let analysis = null;
    let externalData = null;
    
    try {
      // PRIORIDADE 1: Buscar dados da ESP32 via ThingSpeak
      console.log('🌐 [PRIORIDADE 1] Buscando dados da ESP32 no ThingSpeak...');
      
      let internalData = null;
      let internalDataSuccess = false;
      
      try {
        const freshData = await thingspeakService.fetchLatest(
          channelConfig.channelId, 
          channelConfig.readApiKey
        );
        
        if (freshData && freshData.field1 !== undefined && freshData.field1 !== null && freshData.field1 !== '') {
          const isRecent = isTimestampRecent(freshData.created_at);
          const age = getDataAge(freshData.created_at);
          
          internalData = {
            temperature: parseFloat(freshData.field1),
            humidity: parseFloat(freshData.field2),
            pressure: parseFloat(freshData.field3),
            timestamp: freshData.created_at,
            raw_field1: freshData.field1,
            raw_field2: freshData.field2,
            raw_field3: freshData.field3
          };
          
          console.log(`✅ ESP32 detectada! Dados: ${internalData.temperature}°C, ${internalData.humidity}%, ${internalData.pressure}hPa`);
          console.log(`📅 Timestamp: ${internalData.timestamp}, Idade: ${age}`);
          
          internalDataSuccess = true;
          
          if (isRecent) {
            console.log(`✅ ESP32 ONLINE! Dados em tempo real`);
            isOnline = true;
            data = internalData;
            dataAge = age;
            
            await thingspeakService.fetchAndSave(channelConfig.channelId, channelConfig.readApiKey);
          } else {
            console.log(`⚠️ ESP32 com dados antigos (${age}) - pode estar offline`);
            isOnline = false;
            data = internalData;
            dataAge = age;
          }
        } else {
          console.log('❌ ThingSpeak retornou dados vazios');
          throw new Error('Dados inválidos do ThingSpeak');
        }
      } catch (fetchError) {
        console.error('❌ Falha ao buscar dados do ThingSpeak:', fetchError.message);
        isOnline = false;
        
        const cache = await database.buscarUltimas(1);
        if (cache.length > 0) {
          data = {
            temperature: cache[0].temperatura,
            humidity: cache[0].umidade,
            pressure: cache[0].pressao,
            timestamp: cache[0].timestamp
          };
          fromCache = true;
          dataAge = getDataAge(cache[0].timestamp);
          console.log(`📦 Usando cache local SQLite (dados de ${dataAge})`);
          internalDataSuccess = true;
        } else {
          console.log('❌ Sem dados da ESP32 no cache');
        }
      }
      
      // PRIORIDADE 2: Buscar dados externos APENAS para comparação
      console.log('🌍 [PRIORIDADE 2] Buscando dados externos para comparação...');
      
      try {
        externalData = await weatherApiService.fetchLatestData();
        if (externalData) {
          console.log(`✅ Dados externos: ${externalData.temp}°C`);
        }
      } catch (weatherError) {
        console.error('❌ Erro ao buscar dados externos:', weatherError.message);
        externalData = null;
      }
      
      // Buscar dados anteriores para análise
      const previousRecords = await database.buscarUltimas(2);
      let previousData = null;
      
      if (previousRecords.length >= 2) {
        previousData = {
          temperature: previousRecords[0].temperatura,
          humidity: previousRecords[0].umidade,
          pressure: previousRecords[0].pressao,
          timestamp: previousRecords[0].timestamp
        };
      }
      
      // Preparar dados atuais
      const currentData = {
        temperature: data?.temperature || null,
        humidity: data?.humidity || null,
        pressure: data?.pressure || null,
        timestamp: data?.timestamp || new Date().toISOString()
      };
      
      // Análise inteligente
      try {
        analysis = analysisService.analyzeData(currentData, previousData, externalData);
        console.log(`📊 Análise: ${analysis.summary.alert_count} alertas`);
      } catch (analysisError) {
        console.error('❌ Erro na análise:', analysisError.message);
        analysis = { alerts: [], metrics: {}, comparison: null, summary: { alert_count: 0 } };
      }
      
      // Resposta final
      const responseData = {
        success: true,
        source: internalDataSuccess ? 'esp32' : (fromCache ? 'cache_local' : 'nenhum'),
        is_online: isOnline,
        location: {
          lat: parseFloat(process.env.LATITUDE) || -21.8322,
          lon: parseFloat(process.env.LONGITUDE) || -46.8936,
          name: process.env.CIDADE || 'Vargem Grande do Sul - SP'
        },
        internal: {
          temperature: data?.temperature || null,
          humidity: data?.humidity || null,
          pressure: data?.pressure || null,
          timestamp: data?.timestamp,
          from_cache: fromCache,
          is_online: isOnline,
          data_age: dataAge
        },
        status: {
          online: isOnline,
          from_cache: fromCache,
          data_age: dataAge,
          message: isOnline ? 'ESP32 online - dados em tempo real' : 'ESP32 offline - últimos dados disponíveis'
        },
        analysis: {
          alerts: analysis.alerts,
          metrics: analysis.metrics,
          comparison: analysis.comparison,
          summary: analysis.summary
        }
      };
      
      if (externalData) {
        responseData.external_comparison = {
          temperature: externalData.temp,
          humidity: externalData.humidity,
          pressure: externalData.pressure,
          source: externalData.source
        };
      }
      
      res.json(responseData);
      
    } catch (error) {
      console.error('Erro fatal:', error.message);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        is_online: false,
        internal: { temperature: null, humidity: null, pressure: null }
      });
    }
  }

  async getHistory(req, res) {
    try {
      const limit = parseInt(req.params.limit) || 120;
      const data = await database.buscarUltimas(limit);
      
      res.json({ 
        success: true, 
        source: 'sqlite',
        data: data.map(record => ({
          temperature: record.temperatura,
          humidity: record.umidade,
          pressure: record.pressao,
          timestamp: record.timestamp
        }))
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getHistoryWithFilters(req, res) {
    try {
      const { dataInicio, dataFim, limite } = req.query;
      const filtros = {};
      if (dataInicio) filtros.dataInicio = dataInicio;
      if (dataFim) filtros.dataFim = dataFim;
      if (limite) filtros.limite = parseInt(limite);
      
      const data = await database.buscarLeituras(filtros);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getComparison(req, res) {
    try {
      const currentRecord = await database.buscarUltimas(1);
      const externalData = await weatherApiService.fetchLatestData();
      
      res.json({
        success: true,
        local: currentRecord[0] || null,
        external: externalData
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getForecast(req, res) {
    try {
      const days = parseInt(req.query.days) || 7;
      const forecast = await weatherApiService.fetchForecast(days);
      res.json({ success: true, forecast });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async saveConfig(req, res) {
    try {
      const { channelId, readApiKey } = req.body;
      if (channelId) channelConfig.channelId = channelId;
      if (readApiKey) channelConfig.readApiKey = readApiKey;
      res.json({ success: true, config: channelConfig });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getConfig(req, res) {
    res.json({ 
      success: true, 
      config: channelConfig,
      location: {
        lat: parseFloat(process.env.LATITUDE) || -21.8322,
        lon: parseFloat(process.env.LONGITUDE) || -46.8936,
        name: process.env.CIDADE || 'Vargem Grande do Sul - SP'
      }
    });
  }

  async testThingSpeak(req, res) {
    try {
      const data = await thingspeakService.fetchLatest(
        channelConfig.channelId, 
        channelConfig.readApiKey
      );
      res.json({
        success: true,
        raw_data: data,
        has_field1: data && data.field1 !== undefined,
        field1_value: data?.field1,
        field2_value: data?.field2,
        field3_value: data?.field3,
        timestamp: data?.created_at
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new WeatherController();