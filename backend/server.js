require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const weatherRoutes = require('./routes/weatherRoutes');
const exportRoutes = require('./routes/exportRoutes');
const historyRoutes = require('./routes/historyRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Rotas
app.use('/api/weather', weatherRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/history', historyRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 ThingSpeak Channel: ${process.env.THINGSPEAK_CHANNEL_ID || 'NÃO CONFIGURADO'}`);
  console.log(`📍 Localização: ${process.env.LATITUDE || '-21.8322'}, ${process.env.LONGITUDE || '-46.8936'}`);
});