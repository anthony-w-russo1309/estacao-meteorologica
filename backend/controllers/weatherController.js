// ==================== backend/controllers/weatherController.js (COMPLETO CORRIGIDO) ====================

const thingspeakService = require('../services/thingspeakService');
const database = require('../database');
const analysisService = require('../services/analysisService');
const weatherApiService = require('../services/weatherApiService');

let channelConfig = {
  channelId: process.env.THINGSPEAK_CHANNEL_ID || '3276829',
  readApiKey: process.env.THINGSPEAK_READ_API_KEY || ''
};

// Limite para considerar dados como "online" (30 segundos)
const ONLINE_THRESHOLD_SECONDS = 30;

// Diferença aceitável entre API externa e sensor local (usado no endpoint /comparison)
const TEMP_DIFF_THRESHOLD = parseFloat(process.env.TEMP_DIFF_THRESHOLD) || 2;
const HUMIDITY_DIFF_THRESHOLD = parseFloat(process.env.HUMIDITY_DIFF_THRESHOLD) || 10;
const PRESSURE_DIFF_THRESHOLD = parseFloat(process.env.PRESSURE_DIFF_THRESHOLD) || 2;

// Função para verificar se o timestamp é recente (online)
function isTimestampRecent(timestamp) {
  if (!timestamp) return false;
  const dataTime = new Date(timestamp).getTime();
  const now = Date.now();
  const diffSeconds = (now - dataTime) / 1000;
  return diffSeconds < ONLINE_THRESHOLD_SECONDS;
}

// Função para calcular idade do dado
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
    let lastValidData = null;
    let analysis = null;
    let externalData = null;
    
    try {
      // 1. Buscar dados atuais do ThingSpeak
      console.log('🌐 Verificando ESP online - buscando dados atuais do ThingSpeak...');
      
      try {
        const freshData = await thingspeakService.fetchLatest(channelConfig.channelId, channelConfig.readApiKey);
        
        if (freshData && freshData.field1 && freshData.created_at) {
          const isRecent = isTimestampRecent(freshData.created_at);
          const age = getDataAge(freshData.created_at);
          
          if (isRecent) {
            console.log(`✅ ESP ONLINE! Dados recebidos com ${age} de idade`);
            isOnline = true;
            data = freshData;
            dataAge = age;
            
            // Salvar no cache local
            await thingspeakService.fetchAndSave(channelConfig.channelId, channelConfig.readApiKey);
          } else {
            console.log(`⚠️ ESP possivelmente OFFLINE - Último dado há ${age}`);
            isOnline = false;
            data = freshData;
            dataAge = age;
          }
        } else {
          throw new Error('Dados inválidos do ThingSpeak');
        }
      } catch (fetchError) {
        console.error('❌ Falha ao buscar dados do ThingSpeak:', fetchError.message);
        isOnline = false;
        
        // Fallback: usar cache local
        const cache = await database.buscarUltimas(1);
        if (cache.length > 0) {
          data = {
            field1: cache[0].temperatura,
            field2: cache[0].umidade,
            field3: cache[0].pressao,
            created_at: cache[0].timestamp
          };
          fromCache = true;
          dataAge = getDataAge(cache[0].timestamp);
          console.log(`📦 Usando cache local (dados de ${dataAge}) - ESP OFFLINE`);
          lastValidData = data;
        } else {
          throw new Error('Sem dados no cache e ThingSpeak offline');
        }
      }
      
      // 2. Buscar dados anteriores do banco local para análise
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
      
      // 3. Buscar dados externos da API de clima (Open-Meteo)
      try {
        console.log(`🌍 Buscando dados externos da API de clima para ${process.env.LAT}, ${process.env.LON}...`);
        externalData = await weatherApiService.fetchLatestData();
        if (externalData) {
          console.log(`✅ Dados externos obtidos: ${externalData.temp}°C, ${externalData.humidity}%, ${externalData.pressure}hPa (fonte: ${externalData.source})`);
        }
      } catch (weatherError) {
        console.error('❌ Erro ao buscar dados da API de clima:', weatherError.message);
        externalData = null;
      }
      
      // 4. Preparar dados atuais para análise
      const currentData = {
        temperature: data?.field1 ? parseFloat(data.field1) : null,
        humidity: data?.field2 ? parseFloat(data.field2) : null,
        pressure: data?.field3 ? parseFloat(data.field3) : null,
        timestamp: data?.created_at || new Date().toISOString()
      };
      
      // 5. Executar análise inteligente
      try {
        analysis = analysisService.analyzeData(currentData, previousData, externalData);
        console.log(`📊 Análise concluída: ${analysis.summary.alert_count} alertas gerados`);
      } catch (analysisError) {
        console.error('❌ Erro na análise:', analysisError.message);
        analysis = {
          alerts: [],
          metrics: {},
          comparison: null,
          summary: { alert_count: 0, has_comparison: false, error: analysisError.message }
        };
      }
      
      // 6. Construir resposta
      const responseData = {
        success: true,
        is_online: isOnline,
        location: {
          lat: parseFloat(process.env.LAT) || -21.8322,
          lon: parseFloat(process.env.LON) || -46.8936,
          alt: parseFloat(process.env.ALT) || 721,
          name: 'Vargem Grande do Sul - SP'
        },
        data: {
          temperature: data?.field1 ? parseFloat(data.field1) : null,
          humidity: data?.field2 ? parseFloat(data.field2) : null,
          pressure: data?.field3 ? parseFloat(data.field3) : null,
          timestamp: data?.created_at,
          from_cache: fromCache
        },
        status: {
          online: isOnline,
          from_cache: fromCache,
          data_age: dataAge,
          message: isOnline ? 'ESP está online e enviando dados' : 'ESP está offline - exibindo últimos dados conhecidos'
        },
        // Análise inteligente
        analysis: {
          alerts: analysis.alerts,
          metrics: analysis.metrics,
          comparison: analysis.comparison,
          summary: analysis.summary
        }
      };
      
      // Adicionar dados externos se disponíveis
      if (externalData) {
        responseData.external = {
          temperature: externalData.temp,
          humidity: externalData.humidity,
          pressure: externalData.pressure,
          timestamp: externalData.timestamp,
          source: externalData.source,
          location: externalData.location
        };
      }
      
      // Adicionar último dado válido se disponível (fallback)
      if (lastValidData) {
        responseData.last_known_data = {
          temperature: lastValidData.field1 ? parseFloat(lastValidData.field1) : null,
          humidity: lastValidData.field2 ? parseFloat(lastValidData.field2) : null,
          pressure: lastValidData.field3 ? parseFloat(lastValidData.field3) : null,
          timestamp: lastValidData.created_at
        };
      }
      
      res.json(responseData);
      
    } catch (error) {
      console.error('Erro fatal no getLatest:', error.message);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        is_online: false,
        status: {
          online: false,
          message: 'Erro na comunicação com a estação'
        },
        analysis: {
          alerts: [],
          metrics: {},
          comparison: null,
          summary: { alert_count: 0, has_comparison: false, error: error.message }
        }
      });
    }
  }

  async getHistory(req, res) {
    try {
      const limit = parseInt(req.params.limit) || 120;
      const data = await database.buscarUltimas(limit);
      
      const lastUpdate = data.length > 0 ? data[data.length - 1].timestamp : null;
      const lastUpdateAge = lastUpdate ? getDataAge(lastUpdate) : null;
      const hasRecentData = lastUpdate ? isTimestampRecent(lastUpdate) : false;
      
      res.json({ 
        success: true, 
        data: data.map(record => ({
          temperature: record.temperatura,
          humidity: record.umidade,
          pressure: record.pressao,
          timestamp: record.timestamp
        })),
        metadata: {
          total_records: data.length,
          has_recent_data: hasRecentData,
          last_update: lastUpdate,
          last_update_age: lastUpdateAge,
          location: {
            lat: parseFloat(process.env.LAT) || -21.8322,
            lon: parseFloat(process.env.LON) || -46.8936,
            name: 'Vargem Grande do Sul - SP'
          }
        }
      });
    } catch (error) {
      console.error('Erro no getHistory:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getHistoryWithFilters(req, res) {
    try {
      const { dataInicio, dataFim, limite, offset } = req.query;
      const filtros = {};
      if (dataInicio) filtros.dataInicio = dataInicio;
      if (dataFim) filtros.dataFim = dataFim;
      if (limite) filtros.limite = parseInt(limite);
      if (offset) filtros.offset = parseInt(offset);
      
      const data = await database.buscarLeituras(filtros);
      const stats = await database.obterEstatisticas(dataInicio, dataFim);
      
      res.json({ 
        success: true, 
        data: data.map(record => ({
          temperature: record.temperatura,
          humidity: record.umidade,
          pressure: record.pressao,
          timestamp: record.timestamp
        })),
        statistics: stats
      });
    } catch (error) {
      console.error('Erro no getHistoryWithFilters:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getComparison(req, res) {
    try {
      // Buscar dados atuais
      const currentRecord = await database.buscarUltimas(1);
      if (currentRecord.length === 0) {
        throw new Error('Sem dados locais disponíveis');
      }
      
      const currentData = {
        temperature: currentRecord[0].temperatura,
        humidity: currentRecord[0].umidade,
        pressure: currentRecord[0].pressao,
        timestamp: currentRecord[0].timestamp
      };
      
      // Buscar dados externos
      const externalData = await weatherApiService.fetchLatestData();
      
      // Calcular diferenças
      const differences = {
        temperature: externalData && currentData.temperature !== null && externalData.temp !== null
          ? parseFloat((currentData.temperature - externalData.temp).toFixed(2))
          : null,
        humidity: externalData && currentData.humidity !== null && externalData.humidity !== null
          ? parseFloat((currentData.humidity - externalData.humidity).toFixed(2))
          : null,
        pressure: externalData && currentData.pressure !== null && externalData.pressure !== null
          ? parseFloat((currentData.pressure - externalData.pressure).toFixed(2))
          : null
      };
      
      // Verificar discrepâncias
      const discrepancies = [];
      if (differences.temperature !== null && Math.abs(differences.temperature) > TEMP_DIFF_THRESHOLD) {
        discrepancies.push(`Temperatura: ${Math.abs(differences.temperature)}°C de diferença`);
      }
      if (differences.humidity !== null && Math.abs(differences.humidity) > HUMIDITY_DIFF_THRESHOLD) {
        discrepancies.push(`Umidade: ${Math.abs(differences.humidity)}% de diferença`);
      }
      if (differences.pressure !== null && Math.abs(differences.pressure) > PRESSURE_DIFF_THRESHOLD) {
        discrepancies.push(`Pressão: ${Math.abs(differences.pressure)} hPa de diferença`);
      }
      
      res.json({
        success: true,
        local: {
          temperature: currentData.temperature,
          humidity: currentData.humidity,
          pressure: currentData.pressure,
          timestamp: currentData.timestamp
        },
        external: externalData ? {
          temperature: externalData.temp,
          humidity: externalData.humidity,
          pressure: externalData.pressure,
          timestamp: externalData.timestamp,
          source: externalData.source
        } : null,
        differences: differences,
        discrepancies: discrepancies,
        thresholds: {
          temperature: TEMP_DIFF_THRESHOLD,
          humidity: HUMIDITY_DIFF_THRESHOLD,
          pressure: PRESSURE_DIFF_THRESHOLD
        }
      });
    } catch (error) {
      console.error('Erro no getComparison:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getForecast(req, res) {
    try {
      const days = parseInt(req.query.days) || 7;
      const forecast = await weatherApiService.fetchForecast(days);
      
      res.json({
        success: true,
        location: {
          lat: parseFloat(process.env.LAT) || -21.8322,
          lon: parseFloat(process.env.LON) || -46.8936,
          name: 'Vargem Grande do Sul - SP'
        },
        forecast: forecast,
        source: 'Open-Meteo'
      });
    } catch (error) {
      console.error('Erro no getForecast:', error.message);
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
      thresholds: {
        temperature: TEMP_DIFF_THRESHOLD,
        humidity: HUMIDITY_DIFF_THRESHOLD,
        pressure: PRESSURE_DIFF_THRESHOLD
      },
      location: {
        lat: parseFloat(process.env.LAT) || -21.8322,
        lon: parseFloat(process.env.LON) || -46.8936,
        alt: parseFloat(process.env.ALT) || 721,
        name: 'Vargem Grande do Sul - SP'
      }
    });
  }
}

module.exports = new WeatherController();