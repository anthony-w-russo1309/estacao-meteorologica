// ==================== backend/models/weatherModel.js ====================
const mongoose = require('mongoose');

// Schema dos dados meteorológicos
const weatherSchema = new mongoose.Schema({
    // Dados principais
    temperature: { type: Number, required: true },     // Temperatura (°C)
    humidity: { type: Number, required: true },        // Umidade (%)
    pressure: { type: Number, required: true },        // Pressão (hPa)

    // Dados de vento (para expansão futura)
    windSpeed: { type: Number, default: null },        // Velocidade do vento (km/h)
    windDirection: { type: Number, default: null },    // Direção do vento (graus)

    // Pluviometria (para expansão futura)
    rain: { type: Number, default: null },             // Chuva (mm)

    // Metadados
    source: { 
        type: String, 
        enum: ['ESP32', 'API_EXTERNA', 'SIMULADO'],
        default: 'ESP32'
    },
    
    location: {
        lat: { type: Number, default: -21.8322 },
        lon: { type: Number, default: -46.8936 },
        city: { type: String, default: 'Vargem Grande do Sul' },
        state: { type: String, default: 'SP' }
    },

    // Timestamps automáticos
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Índices para consultas rápidas
weatherSchema.index({ createdAt: -1 });
weatherSchema.index({ source: 1, createdAt: -1 });
weatherSchema.index({ temperature: 1 });

// Middleware para atualizar updatedAt
weatherSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Método estático para calcular média das últimas 24h
weatherSchema.statics.getMedia24h = async function() {
    const dataLimite = new Date();
    dataLimite.setHours(dataLimite.getHours() - 24);
    
    const result = await this.aggregate([
        { $match: { createdAt: { $gte: dataLimite } } },
        { $group: {
            _id: null,
            temp_media: { $avg: '$temperature' },
            temp_min: { $min: '$temperature' },
            temp_max: { $max: '$temperature' },
            hum_media: { $avg: '$humidity' },
            pres_media: { $avg: '$pressure' }
        }}
    ]);
    
    return result[0] || null;
};

// Método para detectar anomalias
weatherSchema.statics.detectarAnomalias = async function(leituraAtual) {
    const media24h = await this.getMedia24h();
    const alertas = [];
    
    if (media24h) {
        const diffTemp = Math.abs(leituraAtual.temperature - media24h.temp_media);
        if (diffTemp > 5) {
            alertas.push(`🌡️ Temperatura ${diffTemp.toFixed(1)}°C fora da média das últimas 24h`);
        }
        
        const diffHum = Math.abs(leituraAtual.humidity - media24h.hum_media);
        if (diffHum > 20) {
            alertas.push(`💧 Umidade ${diffHum.toFixed(1)}% fora da média das últimas 24h`);
        }
    }
    
    return alertas;
};

module.exports = mongoose.model('Weather', weatherSchema);