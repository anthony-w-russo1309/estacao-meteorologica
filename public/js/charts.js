// Gerenciamento de gráficos
const ChartManager = {
  initChart(canvasId, label, data, color, useFixedScale = true) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleColor: '#fff',
          bodyColor: '#ddd'
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.1)' },
          ticks: { color: '#ccc', maxRotation: 45, minRotation: 30 }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.1)' },
          ticks: { color: '#ccc' }
        }
      },
      elements: {
        point: {
          radius: 3,
          hoverRadius: 6
        },
        line: {
          tension: 0.3
        }
      }
    };
    
    // Configurar escalas fixas para cada tipo de gráfico
    if (useFixedScale) {
      if (canvasId.includes('temp')) {
        options.scales.y.min = 0;
        options.scales.y.max = 50;
        options.scales.y.title = { display: true, text: '°C', color: '#ccc' };
      } else if (canvasId.includes('hum')) {
        options.scales.y.min = 0;
        options.scales.y.max = 100;
        options.scales.y.title = { display: true, text: '%', color: '#ccc' };
      } else if (canvasId.includes('pres')) {
        options.scales.y.min = 900;
        options.scales.y.max = 1100;
        options.scales.y.title = { display: true, text: 'hPa', color: '#ccc' };
      }
    }
    
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i + 1),
        datasets: [{
          label: label,
          data: data,
          borderColor: color,
          backgroundColor: color + '20',
          fill: true,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointBorderWidth: 1
        }]
      },
      options: options
    });
  },

  updateChart(chart, data, labels) {
    if (!chart) return;
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
  },

  destroyChart(key) {
    if (AppState.charts[key]) {
      AppState.charts[key].destroy();
      AppState.charts[key] = null;
    }
  }
};