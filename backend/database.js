const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'estacao.db');
const db = new sqlite3.Database(dbPath);

// Criar tabelas
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS leituras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      temperatura REAL,
      umidade REAL,
      pressao REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`CREATE INDEX IF NOT EXISTS idx_timestamp ON leituras(timestamp)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_created ON leituras(created_at)`);
  
  console.log('✅ Banco de dados SQLite inicializado');
});

class Database {
  // Salvar uma leitura
  async salvarLeitura(leitura) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO leituras (timestamp, temperatura, umidade, pressao)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run(
        leitura.timestamp || new Date().toISOString(),
        leitura.temperatura || null,
        leitura.umidade || null,
        leitura.pressao || null,
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
      stmt.finalize();
    });
  }

  // Buscar leituras com filtros
  async buscarLeituras(filtros = {}) {
    const { dataInicio, dataFim, limite = 1000, offset = 0 } = filtros;
    
    let query = `SELECT * FROM leituras WHERE 1=1`;
    const params = [];
    
    if (dataInicio) {
      query += ` AND timestamp >= ?`;
      params.push(dataInicio);
    }
    if (dataFim) {
      query += ` AND timestamp <= ?`;
      params.push(dataFim);
    }
    
    query += ` ORDER BY timestamp ASC LIMIT ? OFFSET ?`;
    params.push(limite, offset);
    
    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Buscar últimas N leituras
  async buscarUltimas(limite = 120) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM leituras ORDER BY timestamp DESC LIMIT ?`,
        [limite],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.reverse());
        }
      );
    });
  }

  // Obter estatísticas de um período
  async obterEstatisticas(dataInicio, dataFim) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT 
          COUNT(*) as total,
          AVG(temperatura) as temp_media,
          MIN(temperatura) as temp_min,
          MAX(temperatura) as temp_max,
          AVG(umidade) as hum_media,
          MIN(umidade) as hum_min,
          MAX(umidade) as hum_max,
          AVG(pressao) as pres_media,
          MIN(pressao) as pres_min,
          MAX(pressao) as pres_max
        FROM leituras
        WHERE 1=1
      `;
      const params = [];
      
      if (dataInicio) {
        query += ` AND timestamp >= ?`;
        params.push(dataInicio);
      }
      if (dataFim) {
        query += ` AND timestamp <= ?`;
        params.push(dataFim);
      }
      
      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Limpar dados antigos (opcional)
  async limparDadosAntigos(diasManter = 30) {
    return new Promise((resolve, reject) => {
      const dataCorte = new Date();
      dataCorte.setDate(dataCorte.getDate() - diasManter);
      
      db.run(
        `DELETE FROM leituras WHERE timestamp < ?`,
        [dataCorte.toISOString()],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }
}

module.exports = new Database();