// ==================== backend/database/mongo.js ====================
const mongoose = require('mongoose');

// Função de conexão com MongoDB Atlas
async function connectMongo() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });

        console.log('✅ MongoDB Atlas conectado com sucesso');
        console.log(`📁 Database: ${mongoose.connection.name}`);
        console.log(`🌐 Host: ${mongoose.connection.host}`);

    } catch (error) {
        console.error('❌ Erro ao conectar no MongoDB Atlas:', error.message);
        console.log('⚠️ Continuando sem MongoDB - apenas cache local');
    }
}

module.exports = connectMongo;