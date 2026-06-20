// ================================================================
//  CONFIGURACIÓN DE SUPABASE
// ================================================================
const SUPABASE_URL  = 'https://mrsrxgtffmnovgypldiw.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yc3J4Z3RmZm1ub3ZneXBsZGl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzM5NDMsImV4cCI6MjA5NjAwOTk0M30.xvlnBw5zNFY4K_Wiev12zJnIyTobPZx_9wS6QFt2CZk';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// Estadísticas del período — se actualizan desde cargarHistorial()
const statsCache = {
  t_min: '--', t_prom: '--', t_max: '--',
  h_min: '--', h_prom: '--', h_max: '--',
};



// ================================================================
//  REFERENCIAS AL DOM
// ================================================================
const canvas = document.getElementById('histCanvas');
const ctx    = canvas.getContext('2d');


// ================================================================
//  SECCIÓN 1 — DATASETS DE LA GRÁFICA
//  Contienen datos de demostración que serán reemplazados por
//  los datos reales de Firebase al cargar la página.
// ================================================================
const DATASETS = {
  temp: {
    label: 'Temperatura', unit: '°C',
    colorA: '#FF8C00', colorB: '#E63A00',
    data1h: [], data2h: [], data3h: [],
  },
  hum: {
    label: 'Humedad', unit: '%',
    colorA: '#4E9AF1', colorB: '#A855F7',
    data1h: [], data2h: [], data3h: [],
  },
  pm1: {
    label: 'PM 1.0', unit: 'µg',
    colorA: '#3DD17A', colorB: '#1A7A45',
    data1h: [], data2h: [], data3h: [],
  },
  pm25: {
    label: 'PM 2.5', unit: 'µg',
    colorA: '#FFC83C', colorB: '#CC8800',
    data1h: [], data2h: [], data3h: [],
  },
  pm10: {
    label: 'PM 10', unit: 'µg',
    colorA: '#FF4B4B', colorB: '#CC0000',
    data1h: [], data2h: [], data3h: [],
  },
};


// ================================================================
//  SECCIÓN 2 — ETIQUETAS DEL EJE X (se sobreescriben con datos reales)
// ================================================================
const LABELS_1H = [];
const LABELS_2H = [];
const LABELS_3H = [];

let activeMetric = 'temp';
let activeRango  = '1h';

function getLabels(rango) {
  if (rango === '1h')  return LABELS_1H;
  if (rango === '6h')  return LABELS_2H;
  return LABELS_3H;
}

function getData(metric, rango) {
  const ds = DATASETS[metric];
  if (rango === '1h')  return ds.data1h;
  if (rango === '6h')  return ds.data2h;
  return ds.data3h;
}


// ================================================================
//  SECCIÓN 3 — PLUGIN DE BRILLO + INICIALIZACIÓN DE CHART.JS
// ================================================================
const glowPlugin = {
  id: 'lineGlow',
  beforeDatasetsDraw(chart) {
    chart.ctx.save();
    chart.ctx.shadowBlur = 12;
    chart.ctx.shadowOffsetY = 4;
    chart.ctx.shadowColor = DATASETS[activeMetric].colorA;
  },
  afterDatasetsDraw(chart) {
    chart.ctx.restore();
  }
};

const chartInstance = new Chart(canvas, {
  type: 'line',
  plugins: [glowPlugin],
  data: {
    labels: [],
    datasets: [{
      data: [],
      borderColor: '#FF8C00',
      backgroundColor: 'transparent',
      borderWidth: 3,
      pointRadius: 4.5,
      pointBackgroundColor: '#0C1220',
      pointBorderColor: '#FF8C00',
      pointBorderWidth: 2.5,
      fill: true,
      tension: 0,
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0C1220',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: '#8A95B0',
        bodyColor: '#FFFFFF',
        callbacks: {
          label: (c) => ` ${c.parsed.y} ${DATASETS[activeMetric].unit}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: {
          color: 'rgba(90,100,130,0.9)',
          font: { family: 'Outfit, sans-serif', size: 9 },
          maxRotation: 0,
          maxTicksLimit: 8,
        }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.08)' },
        ticks: {
          color: 'rgba(160,170,195,0.7)',
          font: { family: 'Outfit, sans-serif', size: 10 },
        }
      }
    }
  }
});

// ================================================================
//  SECCIÓN 4 — ACTUALIZAR GRÁFICA
// ================================================================
function updateChart() {
  const ds     = DATASETS[activeMetric];
  const data   = getData(activeMetric, activeRango);
  const labels = getLabels(activeRango);

  let bg = ds.colorA + '22';
  if (chartInstance.chartArea) {
    const gradient = ctx.createLinearGradient(0, chartInstance.chartArea.top, 0, chartInstance.chartArea.bottom);
    gradient.addColorStop(0, ds.colorA + '55');
    gradient.addColorStop(1, ds.colorA + '00');
    bg = gradient;
  }

  chartInstance.data.labels = [...labels];
  chartInstance.data.datasets[0].data = [...data];
  chartInstance.data.datasets[0].borderColor = ds.colorA;
  chartInstance.data.datasets[0].pointBorderColor = ds.colorA;
  chartInstance.data.datasets[0].backgroundColor = bg;
  chartInstance.update();
}


// ================================================================
//  SECCIÓN 6 — ANIMACIÓN DEL DONUT
// ================================================================
function animateDonut(porcentaje) {
  // Solo para la carga inicial desde 0
  const arc  = document.getElementById('donutArc');
  if (!arc) return;
  const circ = 2 * Math.PI * 78;
  arc.style.transition = 'none';
  arc.setAttribute('stroke-dasharray', `0 ${circ}`);
  requestAnimationFrame(() => {
    setTimeout(() => {
      arc.style.transition = 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)';
      arc.setAttribute('stroke-dasharray', `${(porcentaje / 100) * circ} ${circ}`);
    }, 400);
  });
}


// ================================================================
//  SECCIÓN 7 — COLORES DINÁMICOS DE LAS PESTAÑAS
// ================================================================
function updateTabColors() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.classList.contains('active')) {
      const color = DATASETS[btn.dataset.metric].colorA;
      btn.style.backgroundColor = color;
      btn.style.borderColor     = color;
      document.documentElement.style.setProperty('--active-color', color);
    } else {
      btn.style.backgroundColor = 'transparent';
      btn.style.borderColor     = 'var(--border)';
    }
  });
}

// ================================================================
//  SECCIÓN 8 - CÁLCULOS DERIVADOS 
// ================================================================
function calcSensacion(T, H) {
  if (T < 27 || H < 40) return T;
  const HI = -8.78469475556
    + 1.61139411      * T
    + 2.33854883889   * H
    - 0.14611605      * T * H
    - 0.012308094     * T * T
    - 0.0164248277778 * H * H
    + 0.002211732     * T * T * H
    + 0.00072546      * T * H * H
    - 0.000003582     * T * T * H * H;
  return parseFloat(HI.toFixed(1));
}

function calcAQI(pm25, pm10) {
  const bp25 = [
    [0,    12,    0,   50],
    [12.1, 35.4,  51,  100],
    [35.5, 55.4,  101, 150],
    [55.5, 150.4, 151, 200],
    [150.5,250.4, 201, 300],
    [250.5,500.4, 301, 500],
  ];
  const bp10 = [
    [0,   54,   0,   50],
    [55,  154,  51,  100],
    [155, 254,  101, 150],
    [255, 354,  151, 200],
    [355, 424,  201, 300],
    [425, 604,  301, 500],
  ];

  function subIndice(val, bp) {
    for (const [cLo, cHi, iLo, iHi] of bp) {
      if (val <= cHi)
        return Math.round(((iHi - iLo) / (cHi - cLo)) * (val - cLo) + iLo);
    }
    return 500;
  }

  return Math.max(subIndice(pm25, bp25), subIndice(pm10, bp10));
}

function calcPMStatus(val, tipo) {
  const limits = {
    pm1:  [[15, 'Bueno'], [30,       'Moderado']],
    pm25: [[12, 'Bueno'], [35.4,     'Moderado']],
    pm10: [[54, 'Bueno'], [154,      'Moderado']],
  };
  for (const [umbral, label] of limits[tipo]) {
    if (val <= umbral) return label;
  }
  return 'Malo';
}

function calcRecomendacion(aqi) {
  if (aqi <= 50)  return 'Sin Riesgo';
  if (aqi <= 100) return 'Riesgo Minimo';
  if (aqi <= 150) return 'Riesgo Moderado';
  if (aqi <= 200) return 'Riesgo Alto';
  if (aqi <= 300) return 'Riesgo Muy Alto';
  return 'Peligroso';
}

function calcular(raw) {
  const T   = parseFloat(raw.temperatura);
  const H   = parseFloat(raw.humedad);
  const pm1  = parseFloat(raw.pm1);
  const pm25 = parseFloat(raw.pm25);
  const pm10 = parseFloat(raw.pm10);
  const aqi  = calcAQI(pm25, pm10);

  return {
    temperatura:   T,
    humedad:       H,
    sensacion:     calcSensacion(T, H),
    pm1, pm25, pm10,
    aqi,
    estado_humo:   raw.estado_humo,
    estado_pm1:    calcPMStatus(pm1,  'pm1'),
    estado_pm25:   calcPMStatus(pm25, 'pm25'),
    estado_pm10:   calcPMStatus(pm10, 'pm10'),
    recomendacion: calcRecomendacion(aqi),
    ...statsCache,
  };
}

// ================================================================
//  SECCIÓN 9 — ACTUALIZAR DASHBOARD CON DATOS DE SUPABASE
// ================================================================

const UMBRAL_STALE_SEG = 180;

function esDato(v) {
  return v !== null && v !== undefined && v !== '' && !isNaN(parseFloat(v));
}

function esFresco(d) {
  if (!d?.updated_at) return false;
  const segundos = (Date.now() - new Date(d.updated_at).getTime()) / 1000;
  return segundos < UMBRAL_STALE_SEG;
}

function actualizarDashboard(d) {

  // ── TEMPERATURA ────────────────────────────────────────────────
  const tempEl = document.querySelector('.temp-value');
  if (esDato(d.temperatura)) {
    tempEl.textContent = parseFloat(d.temperatura).toFixed(1) + '°C';
    tempEl.style.color = '';
    document.querySelector('.temp-sensation').textContent = 'Sensación  ' + (esDato(d.sensacion) ? parseFloat(d.sensacion).toFixed(1) + '°C' : '--°C');
  } else {
    tempEl.textContent = 'Sin Datos';
    tempEl.style.color = 'rgba(255,255,255,0.3)';
    document.querySelector('.temp-sensation').textContent = 'Sensación  --°C';
  }

  const statsTemp = document.querySelectorAll('.stats-row:not(.dark) .s-value');
  if (statsTemp.length >= 3) {
    statsTemp[0].textContent = esDato(d.t_min)  ? parseFloat(d.t_min).toFixed(1)  + '°C' : '--°C';
    statsTemp[1].textContent = esDato(d.t_prom) ? parseFloat(d.t_prom).toFixed(1) + '°C' : '--°C';
    statsTemp[2].textContent = esDato(d.t_max)  ? parseFloat(d.t_max).toFixed(1)  + '°C' : '--°C';
  }

  // ── FLECHA DE TENDENCIA ────────────────────────────────────
  const arrow = document.querySelector('.temp-arrow-classic');
  if (esDato(d.temperatura)) {
    const tempActual   = parseFloat(d.temperatura);
    const tempAnterior = parseFloat(arrow.dataset.prev || tempActual);
    if (tempActual > tempAnterior)      { arrow.style.transform = 'rotate(0deg)';   arrow.style.color = 'white'; }
    else if (tempActual < tempAnterior) { arrow.style.transform = 'rotate(180deg)'; arrow.style.color = 'white'; }
    arrow.dataset.prev = tempActual;
  }

  // ── HUMEDAD ────────────────────────────────────────────────────
  const humEl = document.querySelector('.hum-value');
  if (esDato(d.humedad)) {
    humEl.textContent = parseFloat(d.humedad).toFixed(1) + '%';
    humEl.style.color = '';
    document.getElementById('humBar').style.width = d.humedad + '%';
  } else {
    humEl.textContent = 'Sin Datos';
    humEl.style.color = 'rgba(255,255,255,0.3)';
    document.getElementById('humBar').style.width = '0%';
  }

  const statsHum = document.querySelectorAll('.stats-row.dark .s-value');
  if (statsHum.length >= 3) {
    statsHum[0].textContent = esDato(d.h_min)  ? d.h_min  + '%' : '--%';
    statsHum[1].textContent = esDato(d.h_prom) ? d.h_prom + '%' : '--%';
    statsHum[2].textContent = esDato(d.h_max)  ? d.h_max  + '%' : '--%';
  }

  // ── NIVEL DE RIESGO ────────────────────────────────────
  const recomendacionMap = {
  'Sin Riesgo':      { emoji: '✅', texto: 'Sin precauciones necesarias'              },
  'Riesgo Minimo':   { emoji: '🟡', texto: 'Grupos sensibles tomen precauciones'      },
  'Riesgo Moderado': { emoji: '⚠️', texto: 'Evitar exposición prolongada'             },
  'Riesgo Alto':     { emoji: '🔶', texto: 'Reducir exposición al mínimo'             },
  'Riesgo Muy Alto': { emoji: '🔴', texto: 'Exposición riesgosa para todos'           },
  'Peligroso':       { emoji: '☠️', texto: 'Niveles peligrosos, minimizar exposición' },
};
const rec = recomendacionMap[d.recomendacion] || { emoji: '❓', texto: 'Sin Datos' };
document.querySelector('.cont-emoji').textContent = rec.emoji;
document.querySelector('.cont-label').textContent = rec.texto;

  // ── ESTADO (Detección de Humo) ─────────────────────────────────
  // El panel "Estado" solo indica si hay humo o no.
  // Normal → escudo verde | Humo Detectado → fuego rojo
  if (!d.estado_humo) {
  document.querySelector('.shield-icon').textContent  = '❓';
  document.querySelector('.status-label').textContent = 'Sin Datos';
  document.querySelector('.status-label').style.color = 'rgba(255,255,255,0.3)';
  document.querySelector('.shield-wrap').style.boxShadow = '0 0 0 2px rgba(255,255,255,0.1)';
  } else if (d.estado_humo === 'Humo Detectado') {
  document.querySelector('.shield-icon').textContent  = '🔥';
  document.querySelector('.status-label').textContent = 'Humo Detectado';
  document.querySelector('.status-label').style.color = '#FF4B4B';
  document.querySelector('.shield-wrap').style.boxShadow = '0 0 0 2px rgba(255,75,75,.35)';
  } else {
  document.querySelector('.shield-icon').textContent  = '🛡️';
  document.querySelector('.status-label').textContent = 'Normal';
  document.querySelector('.status-label').style.color = '#3DD17A';
  document.querySelector('.shield-wrap').style.boxShadow = '0 0 0 2px rgba(61,209,122,.25)';
  }

  // ── DONUT (% de contaminación) ─────────────────────────────────
  const arc  = document.getElementById('donutArc');
  const circ = 2 * Math.PI * 78;

  if (!esDato(d.aqi) || parseFloat(d.aqi) === 0) {
    arc.setAttribute('stroke', 'rgba(255,255,255,0.1)');
    arc.style.transition = 'stroke-dasharray 1s ease';
    arc.setAttribute('stroke-dasharray', `0 ${circ}`);
    document.querySelector('.donut-pct').textContent = '--';
    document.querySelector('.donut-pct').style.color = 'rgba(255,255,255,0.25)';
  } else {
    const pct  = Math.min((parseFloat(d.aqi) / 500) * 100, 100);
    const dash = (pct / 100) * circ;
    const aqi  = parseFloat(d.aqi);
    let color;
    if (aqi <= 50)       color = '#3DD17A';
    else if (aqi <= 100) color = '#FFC83C';
    else if (aqi <= 150) color = '#FF8C00';
    else if (aqi <= 200) color = '#FF4B4B';
    else if (aqi <= 300) color = '#A855F7';
    else                 color = '#7B0000';

    arc.setAttribute('stroke', color);
    arc.style.transition = 'stroke-dasharray 1s ease';
    arc.setAttribute('stroke-dasharray', `${dash} ${circ}`);
    document.querySelector('.donut-pct').textContent = d.aqi;
    document.querySelector('.donut-pct').style.color = color;
  }

  // ── BARRAS DE PM (PM1, PM2.5, PM10) ───────────────────────────
  const colorMap = { 'Bueno': '#3DD17A', 'Moderado': '#FFC83C', 'Malo': '#FF4B4B' };
  const gradientMap = {
    'Bueno':    'linear-gradient(90deg, #28A860, #3DD17A)',
    'Moderado': 'linear-gradient(90deg, #CC8800, #FFC83C)',
    'Malo':     'linear-gradient(90deg, #CC1010, #FF4B4B)',
  };

  const pmData = [
    { val: d.pm1,  estado: d.estado_pm1,  pct: Math.min((d.pm1  / 30)  * 100, 100) },
    { val: d.pm25, estado: d.estado_pm25, pct: Math.min((d.pm25 / 65)  * 100, 100) },
    { val: d.pm10, estado: d.estado_pm10, pct: Math.min((d.pm10 / 110) * 100, 100) },
  ];

  document.querySelectorAll('.pm-item').forEach((item, i) => {
    if (!esDato(pmData[i].val)) {
      // Estado sin datos — todo en gris
      item.querySelector('.pm-val').textContent        = 'Sin Datos';
      item.querySelector('.pm-val').style.color        = 'rgba(255,255,255,0.3)';
      item.querySelector('.pm-status').textContent     = '--';
      item.querySelector('.pm-status').style.color     = 'rgba(255,255,255,0.25)';
      item.querySelector('.pm-dot').style.background   = 'rgba(255,255,255,0.12)';
      item.querySelector('.pm-fill').style.width       = '0%';
      item.querySelector('.pm-fill').style.background  = 'rgba(255,255,255,0.08)';
    } else {
      const color    = colorMap[pmData[i].estado] || '#FFC83C';
      const gradient = gradientMap[pmData[i].estado] || gradientMap['Moderado'];
      item.querySelector('.pm-val').textContent        = pmData[i].val + ' µg/m³';
      item.querySelector('.pm-val').style.color        = '';
      item.querySelector('.pm-status').textContent     = pmData[i].estado;
      item.querySelector('.pm-status').style.color     = color;
      item.querySelector('.pm-dot').style.background   = color;
      item.querySelector('.pm-fill').style.width       = pmData[i].pct + '%';
      item.querySelector('.pm-fill').style.background  = gradient;
    }
  });

  // ── INDICADOR LIVE ─────────────────────────────────────────
const dot = document.querySelector('.live-dot');
if (dot && d.timestamp) {
  const segundos = Math.floor(Date.now() / 1000) - d.timestamp;
  dot.style.background = segundos < 60 ? '#3DD17A' : '#FF4B4B';
}
}


// ================================================================
//  SECCIÓN 9 — CARGAR HISTORIAL DE FIREBASE PARA LA GRÁFICA
// ================================================================
async function cargarHistorial() {
  try {
    const desde = new Date(Date.now() - 12 * 3600 * 1000).toISOString();

    const { data, error } = await db
      .from('historial')
      .select('temperatura, humedad, pm1, pm25, pm10, created_at')
      .gte('created_at', desde)
      .order('created_at', { ascending: true });

    if (error) { console.warn('Error cargando historial:', error); return; }
    if (!data || data.length === 0) return;

    function subsample(arr, max) {
      if (arr.length <= max) return arr;
      const step = Math.ceil(arr.length / max);
      return arr.filter((_, i) => i % step === 0);
    }

    function formatLabel(iso) {
      return new Date(iso).toTimeString().slice(0, 5);
    }

    function aplicar(entries, sufijo, labelsArr, max) {
      const muestra = subsample(entries, max);
      labelsArr.length = 0;
      DATASETS.temp[`data${sufijo}`]  = muestra.map(e => parseFloat(e.temperatura).toFixed(1));
      DATASETS.hum[`data${sufijo}`]   = muestra.map(e => parseFloat(e.humedad).toFixed(1));
      DATASETS.pm1[`data${sufijo}`]   = muestra.map(e => parseFloat(e.pm1));
      DATASETS.pm25[`data${sufijo}`]  = muestra.map(e => parseFloat(e.pm25));
      DATASETS.pm10[`data${sufijo}`]  = muestra.map(e => parseFloat(e.pm10));
      muestra.forEach(e => labelsArr.push(formatLabel(e.created_at)));
    }

    const ahora = Date.now();
    aplicar(data.filter(e => Date.now() - new Date(e.created_at) <= 3600000),  '1h', LABELS_1H, 20);
    aplicar(data.filter(e => Date.now() - new Date(e.created_at) <= 21600000), '2h', LABELS_2H, 36);
    aplicar(data,                                                               '3h', LABELS_3H, 48);

    // Actualizar statsCache con datos de las 12h
    const temps = data.map(e => parseFloat(e.temperatura)).filter(v => !isNaN(v));
    const hums  = data.map(e => parseFloat(e.humedad)).filter(v => !isNaN(v));

    if (temps.length > 0) {
      statsCache.t_min  = Math.min(...temps).toFixed(1);
      statsCache.t_max  = Math.max(...temps).toFixed(1);
      statsCache.t_prom = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);
    }
    if (hums.length > 0) {
      statsCache.h_min  = Math.min(...hums).toFixed(0);
      statsCache.h_max  = Math.max(...hums).toFixed(0);
      statsCache.h_prom = (hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(0);
    }

    // Reflejar stats en el DOM inmediatamente
    const statsTemp = document.querySelectorAll('.stats-row:not(.dark) .s-value');
    if (statsTemp.length >= 3) {
      statsTemp[0].textContent = statsCache.t_min  + '°C';
      statsTemp[1].textContent = statsCache.t_prom + '°C';
      statsTemp[2].textContent = statsCache.t_max  + '°C';
    }
    const statsHum = document.querySelectorAll('.stats-row.dark .s-value');
    if (statsHum.length >= 3) {
      statsHum[0].textContent = statsCache.h_min  + '%';
      statsHum[1].textContent = statsCache.h_prom + '%';
      statsHum[2].textContent = statsCache.h_max  + '%';
    }

    updateChart();

  } catch (e) {
    console.warn('Error cargando historial:', e);
  }
}


// ================================================================
//  SECCIÓN 10 — FETCH DE DATOS ACTUALES DE SUPABASE
// ================================================================
async function fetchActual() {
  const { data, error } = await db
    .from('lectura_actual')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) { console.warn('Error al leer lectura_actual:', error); return; }
  if (data) actualizarDashboard(esFresco(data) ? calcular(data) : {});

  const el = document.getElementById('liveTime');
  if (el) el.textContent = new Date().toTimeString().slice(0, 8);
}


function iniciarRealtime() {
  db
    .channel('lectura_actual_changes')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'lectura_actual', filter: 'id=eq.1' },
      (payload) => {
        actualizarDashboard(calcular(payload.new));
        const el = document.getElementById('liveTime');
        if (el) el.textContent = new Date().toTimeString().slice(0, 8);
      }
    )
    .subscribe();
}


// ================================================================
//  SECCIÓN 11 — EVENT LISTENERS
// ================================================================

// Pestañas de métricas
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeMetric = btn.dataset.metric;
    updateTabColors();
    updateChart();
  });
});

// Selector de rango temporal
const rangoSelect = document.getElementById('rangoSelect');
if (rangoSelect) {
  rangoSelect.addEventListener('change', e => {
    activeRango = e.target.value;
    updateChart();
  });
}


// ================================================================
//  SECCIÓN 12 — INICIALIZACIÓN
// ================================================================
window.addEventListener('load', () => {
  updateChart();
  animateDonut(0);      // Anima el donut desde 0 (se actualiza con Firebase)
  updateTabColors();    // Colorea la pestaña activa inicial

  // Primera carga de datos
  fetchActual();
  cargarHistorial();

  // Polling automático:
  // · Datos actuales  → cada 1 segundo
  // · Historial       → cada 5 segundos
  iniciarRealtime();
  setInterval(cargarHistorial,  5_000);

  setInterval(() => {
    const el = document.getElementById('liveTime');
    if (el) el.textContent = new Date().toTimeString().slice(0, 8);
  }, 1000);
});

// ================================================================
//  SECCIÓN 13 — NOTIFICACIONES PUSH
// ================================================================
const VAPID_PUBLIC_KEY = 'BF-sE5y2XZHasGEKXbVIUrzZHLxO1T0_Y0_DJga8-A5DBRsBH2YqbF8TN-_cGx3zOfcmNKI75GGqL_zqUUIKnpo';

// Convierte la clave VAPID de Base64 a Uint8Array
// (formato que requiere la API de suscripción del browser)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function suscribirNotificaciones() {
  // Verificar soporte del browser
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Este browser no soporta notificaciones push.');
    return;
  }

  // Pedir permiso al usuario
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') {
    console.log('Permiso de notificaciones denegado.');
    return;
  }

  // Esperar a que el Service Worker esté listo
  const registro = await navigator.serviceWorker.ready;

  // Suscribirse al servicio push del browser (Google, Apple, etc.)
  const suscripcion = await registro.pushManager.subscribe({
    userVisibleOnly:      true,   // Requerido: toda notif push debe mostrarse al usuario
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // Mandar la suscripción a Netlify para guardarla en Supabase
  await fetch('/.netlify/functions/push-subscribe', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(suscripcion),
  });

  console.log('Suscripción push registrada.');
}
