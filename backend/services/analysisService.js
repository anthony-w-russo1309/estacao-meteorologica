// ==================== backend/services/analysisService.js ====================
/**
 * Intelligent Analysis Service
 * Handles data analysis, rate calculations, and anomaly detection
 */

// Carregar thresholds do .env
const TEMP_RATE_THRESHOLD = parseFloat(process.env.TEMP_RATE_THRESHOLD) || 0.1;
const HUMIDITY_RATE_THRESHOLD = parseFloat(process.env.HUMIDITY_RATE_THRESHOLD) || 0.5;
const PRESSURE_RATE_THRESHOLD = parseFloat(process.env.PRESSURE_RATE_THRESHOLD) || 0.05;
const TEMP_DIFF_THRESHOLD = parseFloat(process.env.TEMP_DIFF_THRESHOLD) || 2;
const HUMIDITY_DIFF_THRESHOLD = parseFloat(process.env.HUMIDITY_DIFF_THRESHOLD) || 10;
const PRESSURE_DIFF_THRESHOLD = parseFloat(process.env.PRESSURE_DIFF_THRESHOLD) || 2;

class AnalysisService {
  /**
   * Calculate time difference in minutes between two timestamps
   * @param {string} currentTimestamp - ISO timestamp of current data
   * @param {string} previousTimestamp - ISO timestamp of previous data
   * @returns {number} Time difference in minutes
   */
  calculateTimeDifference(currentTimestamp, previousTimestamp) {
    if (!currentTimestamp || !previousTimestamp) return null;
    
    const current = new Date(currentTimestamp).getTime();
    const previous = new Date(previousTimestamp).getTime();
    const diffMinutes = (current - previous) / (1000 * 60);
    
    return Math.abs(diffMinutes);
  }

  /**
   * Calculate rate of change per minute
   * @param {number} currentValue - Current value
   * @param {number} previousValue - Previous value
   * @param {number} timeDiffMinutes - Time difference in minutes
   * @returns {number|null} Rate of change per minute
   */
  calculateRateOfChange(currentValue, previousValue, timeDiffMinutes) {
    if (currentValue === null || previousValue === null || !timeDiffMinutes || timeDiffMinutes === 0) {
      return null;
    }
    
    return (currentValue - previousValue) / timeDiffMinutes;
  }

  /**
   * Generate alerts based on rate of change
   * @param {Object} rates - Object with temperature, humidity, pressure rates
   * @returns {Array} Array of alert strings
   */
  generateRateAlerts(rates) {
    const alerts = [];
    
    // Temperature alerts (usando thresholds do .env)
    if (rates.temperature !== null) {
      if (rates.temperature > TEMP_RATE_THRESHOLD) {
        alerts.push(`⚠️ Temperature rising rapidly (${rates.temperature.toFixed(2)}°C/min)`);
      } else if (rates.temperature < -TEMP_RATE_THRESHOLD) {
        alerts.push(`⚠️ Temperature dropping rapidly (${Math.abs(rates.temperature).toFixed(2)}°C/min)`);
      }
    }
    
    // Humidity alerts (usando thresholds do .env)
    if (rates.humidity !== null) {
      if (rates.humidity > HUMIDITY_RATE_THRESHOLD) {
        alerts.push(`⚠️ Humidity rising rapidly (${rates.humidity.toFixed(2)}%/min)`);
      } else if (rates.humidity < -HUMIDITY_RATE_THRESHOLD) {
        alerts.push(`⚠️ Humidity dropping rapidly (${Math.abs(rates.humidity).toFixed(2)}%/min)`);
      }
    }
    
    // Pressure alerts (usando thresholds do .env)
    if (rates.pressure !== null) {
      if (rates.pressure < -PRESSURE_RATE_THRESHOLD) {
        alerts.push(`⚠️ Pressure dropping rapidly - possible instability (${rates.pressure.toFixed(2)} hPa/min)`);
      } else if (rates.pressure > PRESSURE_RATE_THRESHOLD) {
        alerts.push(`ℹ️ Pressure rising (${rates.pressure.toFixed(2)} hPa/min)`);
      }
    }
    
    return alerts;
  }

  /**
   * Generate discrepancy alerts comparing local and external data
   * @param {Object} localData - Local sensor data
   * @param {Object} externalData - External weather data
   * @returns {Array} Array of discrepancy alert strings
   */
  generateDiscrepancyAlerts(localData, externalData) {
    const alerts = [];
    
    if (!externalData || externalData.temp === null) return alerts;
    
    // Temperature discrepancy (usando thresholds do .env)
    if (localData.temperature !== null && externalData.temp !== null) {
      const tempDiff = Math.abs(localData.temperature - externalData.temp);
      if (tempDiff > TEMP_DIFF_THRESHOLD) {
        alerts.push(`🔍 Local temperature differs from official data by ${tempDiff.toFixed(1)}°C`);
      }
    }
    
    // Humidity discrepancy (usando thresholds do .env)
    if (localData.humidity !== null && externalData.humidity !== null) {
      const humDiff = Math.abs(localData.humidity - externalData.humidity);
      if (humDiff > HUMIDITY_DIFF_THRESHOLD) {
        alerts.push(`🔍 Humidity discrepancy detected: ${humDiff.toFixed(1)}% difference from official data`);
      }
    }
    
    // Pressure discrepancy (usando thresholds do .env)
    if (localData.pressure !== null && externalData.pressure !== null) {
      const presDiff = Math.abs(localData.pressure - externalData.pressure);
      if (presDiff > PRESSURE_DIFF_THRESHOLD) {
        alerts.push(`🔍 Pressure discrepancy detected: ${presDiff.toFixed(1)} hPa difference from official data`);
      }
    }
    
    return alerts;
  }

  /**
   * Generate metrics summary
   * @param {Object} rates - Rate of change values
   * @returns {Object} Metrics object
   */
  generateMetrics(rates) {
    const metrics = {};
    
    if (rates.temperature !== null) {
      metrics.temperature_rate = parseFloat(rates.temperature.toFixed(2));
      metrics.temperature_trend = rates.temperature > 0 ? "rising" : rates.temperature < 0 ? "falling" : "stable";
    }
    
    if (rates.humidity !== null) {
      metrics.humidity_rate = parseFloat(rates.humidity.toFixed(2));
      metrics.humidity_trend = rates.humidity > 0 ? "rising" : rates.humidity < 0 ? "falling" : "stable";
    }
    
    if (rates.pressure !== null) {
      metrics.pressure_rate = parseFloat(rates.pressure.toFixed(2));
      metrics.pressure_trend = rates.pressure > 0 ? "rising" : rates.pressure < 0 ? "falling" : "stable";
    }
    
    return metrics;
  }

  /**
   * Main analysis function
   * @param {Object} currentData - Current sensor reading {temperature, humidity, pressure, timestamp}
   * @param {Object} previousData - Previous sensor reading {temperature, humidity, pressure, timestamp}
   * @param {Object} externalData - External weather data {temp, humidity, pressure}
   * @returns {Object} Analysis result with alerts, metrics, and comparison
   */
  analyzeData(currentData, previousData, externalData = null) {
    const result = {
      alerts: [],
      metrics: {},
      comparison: null,
      summary: {}
    };
    
    // Calculate time difference
    const timeDiffMinutes = this.calculateTimeDifference(
      currentData?.timestamp,
      previousData?.timestamp
    );
    
    // Calculate rates of change if previous data exists
    let rates = {
      temperature: null,
      humidity: null,
      pressure: null
    };
    
    if (previousData && timeDiffMinutes) {
      rates.temperature = this.calculateRateOfChange(
        currentData?.temperature,
        previousData?.temperature,
        timeDiffMinutes
      );
      
      rates.humidity = this.calculateRateOfChange(
        currentData?.humidity,
        previousData?.humidity,
        timeDiffMinutes
      );
      
      rates.pressure = this.calculateRateOfChange(
        currentData?.pressure,
        previousData?.pressure,
        timeDiffMinutes
      );
      
      // Generate rate alerts
      const rateAlerts = this.generateRateAlerts(rates);
      result.alerts.push(...rateAlerts);
      
      // Generate metrics
      result.metrics = this.generateMetrics(rates);
      result.metrics.time_since_previous = timeDiffMinutes;
    }
    
    // Compare with external data if available
    if (externalData && (externalData.temp !== null || externalData.humidity !== null || externalData.pressure !== null)) {
      const discrepancyAlerts = this.generateDiscrepancyAlerts(currentData, externalData);
      result.alerts.push(...discrepancyAlerts);
      
      result.comparison = {
        local: {
          temperature: currentData?.temperature,
          humidity: currentData?.humidity,
          pressure: currentData?.pressure
        },
        external: {
          temperature: externalData.temp,
          humidity: externalData.humidity,
          pressure: externalData.pressure
        },
        differences: {
          temperature: currentData?.temperature !== null && externalData.temp !== null 
            ? parseFloat((currentData.temperature - externalData.temp).toFixed(2)) : null,
          humidity: currentData?.humidity !== null && externalData.humidity !== null 
            ? parseFloat((currentData.humidity - externalData.humidity).toFixed(2)) : null,
          pressure: currentData?.pressure !== null && externalData.pressure !== null 
            ? parseFloat((currentData.pressure - externalData.pressure).toFixed(2)) : null
        }
      };
    }
    
    // Generate summary
    result.summary = {
      data_freshness: timeDiffMinutes ? 
        (timeDiffMinutes < 1 ? "Real-time" : timeDiffMinutes < 5 ? "Recent" : "Stale") : "Unknown",
      alert_count: result.alerts.length,
      has_comparison: result.comparison !== null,
      critical_alerts: result.alerts.filter(a => a.includes("⚠️")).length
    };
    
    return result;
  }
}

module.exports = new AnalysisService();