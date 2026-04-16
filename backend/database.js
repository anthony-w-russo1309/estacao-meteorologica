// ==================== backend/database.js ====================
// Banco de dados SQLite para cache local das leituras
// Usando better-sqlite3 (síncrono, mais rápido e simples)

const Database = require('better-sqlite3');

// Cria ou abre o banco automaticamente
const db = new Database('estacao.db');

// Log simples pra saber que conectou
console.log("✅ Banco SQLite conectado com sucesso");

// ==================== CRIAÇÃO DAS TABELAS ====================

// Tabela de leituras
db.exec(`
  CREATE TABLE IF NOT EXISTS leituras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    temperatura REAL,
    umidade REAL,
    pressao REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Índices para consultas mais rápidas
db.exec(`CREATE INDEX IF NOT EXISTS idx_timestamp ON leituras(timestamp)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_created ON leituras(created_at)`);

console.log("✅ Tabelas e índices verificados/criados");

// ==================== FUNÇÕES DO BANCO ====================

class DatabaseManager {
  /**
   * Salvar uma leitura no banco
   * @param {Object} leitura - { timestamp, temperatura, umidade, pressao }
   * @returns {number} ID da leitura inserida
   */
  salvarLeitura(leitura) {
    const stmt = db.prepare(`
      INSERT INTO leituras (timestamp, temperatura, umidade, pressao)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      leitura.timestamp || new Date().toISOString(),
      leitura.temperatura || null,
      leitura.umidade || null,
      leitura.pressao || null
    );
    
    return result.lastInsertRowid;
  }

  /**
   * Buscar as últimas N leituras
   * @param {number} limite - Número de registros (padrão 120)
   * @returns {Array} Lista de leituras
   */
  buscarUltimas(limite = 120) {
    const stmt = db.prepare(`
      SELECT * FROM leituras 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    
    const rows = stmt.all(limite);
    // Retorna em ordem crescente (mais antigo primeiro)
    return rows.reverse();
  }

  /**
   * Buscar leituras com filtros
   * @param {Object} filtros - { dataInicio, dataFim, limite, offset }
   * @returns {Array} Lista de leituras filtradas
   */
  buscarLeituras(filtros = {}) {
    let query = `SELECT * FROM leituras WHERE 1=1`;
    const params = [];
    
    if (filtros.dataInicio) {
      query += ` AND timestamp >= ?`;
      params.push(filtros.dataInicio);
    }
    if (filtros.dataFim) {
      query += ` AND timestamp <= ?`;
      params.push(filtros.dataFim);
    }
    
    query += ` ORDER BY timestamp ASC`;
    
    if (filtros.limite) {
      query += ` LIMIT ?`;
      params.push(filtros.limite);
    }
    if (filtros.offset) {
      query += ` OFFSET ?`;
      params.push(filtros.offset);
    }
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Obter estatísticas de um período
   * @param {string} dataInicio - Data início (ISO)
   * @param {string} dataFim - Data fim (ISO)
   * @returns {Object} Estatísticas do período
   */
  obterEstatisticas(dataInicio, dataFim) {
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
    
    const stmt = db.prepare(query);
    const result = stmt.get(...params);
    
    return {
      total: result.total || 0,
      temperatura: {
        media: result.temp_media ? parseFloat(result.temp_media.toFixed(1)) : null,
        min: result.temp_min ? parseFloat(result.temp_min.toFixed(1)) : null,
        max: result.temp_max ? parseFloat(result.temp_max.toFixed(1)) : null
      },
      umidade: {
        media: result.hum_media ? parseFloat(result.hum_media.toFixed(1)) : null,
        min: result.hum_min ? parseFloat(result.hum_min.toFixed(1)) : null,
        max: result.hum_max ? parseFloat(result.hum_max.toFixed(1)) : null
      },
      pressao: {
        media: result.pres_media ? parseFloat(result.pres_media.toFixed(1)) : null,
        min: result.pres_min ? parseFloat(result.pres_min.toFixed(1)) : null,
        max: result.pres_max ? parseFloat(result.pres_max.toFixed(1)) : null
      }
    };
  }

  /**
   * Limpar dados antigos (opcional)
   * @param {number} diasManter - Dias para manter (padrão 30)
   * @returns {number} Quantidade de registros removidos
   */
  limparDadosAntigos(diasManter = 30) {
    const dataCorte = new Date();
    dataCorte.setDate(dataCorte.getDate() - diasManter);
    
    const stmt = db.prepare(`DELETE FROM leituras WHERE timestamp < ?`);
    const result = stmt.run(dataCorte.toISOString());
    
    console.log(`🗑️ Limpeza: ${result.changes} registros antigos removidos`);
    return result.changes;
  }

  /**
   * Obter a última leitura
   * @returns {Object|null} Última leitura ou null
   */
  obterUltima() {
    const stmt = db.prepare(`SELECT * FROM leituras ORDER BY timestamp DESC LIMIT 1`);
    return stmt.get() || null;
  }

  /**
   * Contar total de registros
   * @returns {number} Total de registros
   */
  contarRegistros() {
    const stmt = db.prepare(`SELECT COUNT(*) as total FROM leituras`);
    const result = stmt.get();
    return result.total;
  }

  /**
   * Fechar conexão com o banco
   */
  fechar() {
    db.close();
    console.log("🔒 Conexão com banco de dados fechada");
  }
}

// Exporta uma única instância do gerenciador
module.exports = new DatabaseManager();