// ==================== backend/services/storageService.js ====================
const Weather = require('../models/weatherModel');
const database = require('../database'); // SQLite local

class StorageService {
    /**
     * Salvar dados no MongoDB Atlas (persistência principal)
     */
    async saveToMongo(data) {
        try {
            // Verificar se é uma leitura válida
            if (!data.temperature && !data.humidity && !data.pressure) {
                console.log('⚠️ Dados inválidos, não salvos no MongoDB');
                return null;
            }

            const weather = new Weather({
                temperature: data.temperature,
                humidity: data.humidity,
                pressure: data.pressure,
                windSpeed: data.windSpeed || null,
                windDirection: data.windDirection || null,
                rain: data.rain || null,
                source: data.source || 'ESP32',
                location: {
                    lat: parseFloat(process.env.LATITUDE) || -21.8322,
                    lon: parseFloat(process.env.LONGITUDE) || -46.8936,
                    city: process.env.CIDADE || 'Vargem Grande do Sul',
                    state: process.env.ESTADO || 'SP'
                }
            });

            const saved = await weather.save();
            console.log(`📊 Dados salvos no MongoDB Atlas (ID: ${saved._id})`);
            
            // Detectar anomalias assincronamente (não bloquear)
            Weather.detectarAnomalias(data).then(alertas => {
                if (alertas.length > 0) {
                    console.log('⚠️ Anomalias detectadas:', alertas);
                }
            }).catch(err => console.error('Erro ao detectar anomalias:', err));
            
            return saved;
            
        } catch (error) {
            console.error('❌ Erro ao salvar no MongoDB:', error.message);
            return null;
        }
    }

    /**
     * Salvar dados no SQLite (cache local - fallback)
     */
    async saveToSQLite(data) {
        try {
            const leitura = {
                timestamp: new Date().toISOString(),
                temperatura: data.temperature,
                umidade: data.humidity,
                pressao: data.pressure
            };
            
            const id = await database.salvarLeitura(leitura);
            console.log(`💾 Dados salvos no SQLite local (ID: ${id})`);
            return id;
            
        } catch (error) {
            console.error('❌ Erro ao salvar no SQLite:', error.message);
            return null;
        }
    }

    /**
     * Salvar dados em ambos os bancos (redundância)
     */
    async saveWeatherData(data) {
        console.log('💾 Iniciando persistência dos dados...');
        
        // Salvar em paralelo
        const [mongoResult, sqliteResult] = await Promise.allSettled([
            this.saveToMongo(data),
            this.saveToSQLite(data)
        ]);
        
        const result = {
            mongo: mongoResult.status === 'fulfilled' ? mongoResult.value : null,
            sqlite: sqliteResult.status === 'fulfilled' ? sqliteResult.value : null,
            success: mongoResult.status === 'fulfilled' || sqliteResult.status === 'fulfilled'
        };
        
        if (!result.mongo) {
            console.warn('⚠️ MongoDB indisponível - dados apenas no cache local');
        }
        
        return result;
    }

    /**
     * Buscar histórico do MongoDB
     */
    async getHistoryFromMongo(limit = 100, startDate = null, endDate = null) {
        try {
            const query = {};
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }
            
            const data = await Weather.find(query)
                .sort({ createdAt: -1 })
                .limit(limit);
            
            return data;
        } catch (error) {
            console.error('❌ Erro ao buscar histórico do MongoDB:', error.message);
            return [];
        }
    }

    /**
     * Obter estatísticas do MongoDB
     */
    async getStatsFromMongo() {
        try {
            const [total, media24h, ultima] = await Promise.all([
                Weather.countDocuments(),
                Weather.getMedia24h(),
                Weather.findOne().sort({ createdAt: -1 })
            ]);
            
            return {
                total_registros: total,
                media_24h: media24h,
                ultima_leitura: ultima,
                disponivel: true
            };
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error.message);
            return { disponivel: false, error: error.message };
        }
    }
}

module.exports = new StorageService();