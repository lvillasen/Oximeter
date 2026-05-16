var imagenes = [];

var textR = "";
const resultadosR = document.getElementById("reporte");

var tFoot = [];

var tMaxSlope2 = [];
var tFootTang2 = [];
var inicioVFC = 0;
let FS = 360;

let trend;
let detrended;
let detener = 0;
let inicio = 0;
let lastT = 0;

let port, reader;
let isPortOpen = false;
let bufferSerial = "";
let timestamps = new Set();
let bufferY1 = []; // Buffer para almacenar valores anteriores de y1Value

let dataBuffer = [];
const delaySize = 10; // Cantidad de lecturas de desfase
let calib = 0;
let xPoints = [];
let xPoints_all = [];
let y1Points = [];
let y2Points = [];
let y2Points_all = [];

let y1PointsSMA = [];
let y2PointsSMA = [];

var ts;
var trace1;
var trace2;
var layout1;
var layout2;
var layout;
var maxValues = 0;

var update = 1;

// Parámetros del filtro
const sampleRate = 200; // Frecuencia de muestreo (Hz), ajusta según tu caso
const lowcut = 0.5; // Frecuencia de corte baja (Hz)
const highcut = 3.5; // Frecuencia de corte alta (Hz)
const order = 3; // Orden del filtro

var maxPoints = parseInt(document.getElementById("points_max").value);
const connectButton = document.getElementById("SerialConnect");
connectButton.style.backgroundColor = "green";
const sensor1Button = document.getElementById("sensor1");
sensor1Button.style.backgroundColor = "Aquamarine";
sensor1Button.addEventListener("click", toggleSensor1);

const borrarButton = document.getElementById("borrar");

document.getElementById("aboutBlock").style.display = "none";
document.getElementById("disclaimerBlock").style.display = "none";

document.getElementById("buildBlock").style.display = "none";
document.getElementById("codeBlock").style.display = "none";

document.getElementById("connectBlock").style.display = "block";

setInterval(updatePlot, 200);
async function connectSerial() {
  if (isPortOpen) {
    await disconnectSerial();
    return;
  } else {
    try {
      port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });

      reader = port.readable.getReader();
      //document.getElementById("status").innerText = "Conectado";
      connectButton.value = "Desconectar";
      connectButton.style.backgroundColor = "red";
      isPortOpen = true;
      readSerialData();
    } catch (error) {
      console.error("Error al abrir el puerto:", error);
    }
  }
}
async function readSerialData() {
  const decoder = new TextDecoder();
  let lineBuffer = "";
  clearPlot();

  while (isPortOpen) {
    try {
      const { value, done } = await reader.read();
      if (done) break;
      lineBuffer += decoder.decode(value, { stream: true });

      let lines = lineBuffer.split("\n");
      lineBuffer = lines.pop();

      for (let line of lines) {
        // Separar por espacios y convertir a números
        let cols = line.trim().split(/\s+/).map(Number);

        // Validar que haya exactamente 3 valores numéricos y que ninguno sea NaN o 0
        if (
          cols.length === 3 &&
          cols.every((v) => !isNaN(v) && v !== 0) &&
          !timestamps.has(cols[2])
        ) {
          dataBuffer.push(cols);
          timestamps.add(cols[2]);
        }
      }
    } catch (err) {
      console.error("Error al leer:", err);
      break;
    }
  }
}
function updatePlot() {
  if (update !== 1 || detener === 1) return;
  xPoints = [];
  y1Points = [];
  y2Points = [];

  maxPoints = parseInt(document.getElementById("points_max").value);
  dataBuffer = dataBuffer.slice(-maxPoints);

  if (dataBuffer.length === 0) return;

  // Extraer datos válidos (filtrando ceros y NaN)

  for (let row of dataBuffer) {
    let [y1, y2, t] = row;
    if (!isNaN(y1) && y1 !== 0 && !isNaN(t) && t !== 0) {
      xPoints.push(t / 1000);

      y1Points.push(y1);
      y2Points.push(y2);
    }
    if (t > lastT) {
      xPoints_all.push(t / 1000);
      y2Points_all.push(y2);
      lastT = t;
    }
  }

  if (y1Points.length < 2) return; // No hay suficientes datos

  // Limitar a maxPoints
  if (y1Points.length > maxPoints) {
    y1Points = y1Points.slice(-maxPoints);
    y2Points = y2Points.slice(-maxPoints);
    xPoints = xPoints.slice(-maxPoints);
  }
  const tracePulso1 = {
    x: xPoints,
    y: y1Points,
    type: "scatter",
    mode: "lines",
    name: "Rojo",
    yaxis: "y1",
    line: { color: "#f10a0ae3", width: 2.5 },
  };
  const tracePulso2 = {
    x: xPoints,
    y: y2Points,
    type: "scatter",
    mode: "lines",
    name: "IR",
    yaxis: "y2",
    line: { color: "#0b0a0a", width: 2.5 },
  };

  let texto = `Datos Crudos`;

  const layout = {
    title: {
      text: texto,
      font: { family: "Arial, sans-serif", size: 20, color: "#000" },
    },
    xaxis: {
      title: {
        text: "Tiempo (s)",
        font: {
          family: "Arial, sans-serif",
          size: 18,
          color: "#000",
        },
      },
      showgrid: true,
      gridcolor: "rgba(128,128,128,0.15)",
    },
    yaxis: {
      title: {
        text: "LED Rojo (Cuentas ADC) ",
        font: {
          family: "Arial, sans-serif",
          size: 18,
          color: "#dd3763",
        },
      },
      tickfont: { color: "#dd3742" },
      showgrid: true,
      gridcolor: "rgba(55,138,221,0.15)",
      zeroline: true,
      zerolinecolor: "rgba(55,138,221,0.3)",
      font: { family: "Arial, sans-serif", size: 10, color: "#000" },
    },
    yaxis2: {
      title: {
        text: "LED IR (Cuentas ADC)",
        font: {
          family: "Arial, sans-serif",
          size: 18,
          color: "#0f0e0e",
        },
      },
      tickfont: { color: "#0b0b0b" },
      overlaying: "y",
      side: "right",
      showgrid: false,
      font: { family: "Arial, sans-serif", size: 20, color: "#000" },
    },
    showlegend: false,
    margin: { t: 80, r: 80, b: 60, l: 70 },
    hovermode: "x unified",
    plot_bgcolor: "rgba(0,0,0,0)",
    paper_bgcolor: "rgba(0,0,0,0)",
  };

  // ── 5. Render
  if (detener === 0) {
    Plotly.newPlot("dataPlot", [tracePulso1, tracePulso2], layout, {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ["lasso2d", "select2d"],
    });
  }

  let resetTimer = null;

  const stages = butterworthLowpass4(25, 200);
  let y1PointsSMA2 = filtfiltPadCascade(stages, y1Points, 50);
  y1PointsSMA = savgol11_3(y1PointsSMA2);
  let y2PointsSMA2 = filtfiltPadCascade(stages, y2Points, 50);
  y2PointsSMA = savgol11_3(y2PointsSMA2);

  // --- Igualar longitudes para evitar Null ---
  let nMin = Math.min(xPoints.length, y1PointsSMA.length);

  xPoints = xPoints.slice(-nMin);
  y1PointsSMA = y1PointsSMA.slice(-nMin);
  y2PointsSMA = y2PointsSMA.slice(-nMin);

  const resultado = plotPulso(xPoints, y1PointsSMA, y2PointsSMA);

  const deltaT = xPoints[xPoints.length - 1] - xPoints[0];

  const samplingRate = xPoints.length / deltaT;

  document.getElementById("samplingRate").textContent =
    " Muestreo: " + samplingRate.toFixed(1) + " Hz";
}
async function disconnectSerial() {
  if (reader) {
    connectButton.value = "Connect";
    connectButton.style.backgroundColor = "green";

    await reader.cancel();
    await port.close();

    isPortOpen = false;
  }
}
function clearPlot() {
  inicioVFC = parseFloat(xPoints[xPoints.length - 1]);

  xPoints = [];
  xPoints_all = [];
  y1Points = [];
  y2Points = [];
  y2Points_all = [];
  dataBuffer = [];
  lineBuffer = "";
  ampPoints = [];
  pressurePoints = [];
  console.log("...Clearing Plot");
  updatePlot();
  detener = 0;
  inicio = 0;
  sensor1Button.style.backgroundColor = "Aquamarine";
  sensor1Button.value = "Detener";
}

function aboutBlock() {
  const elementOut = document.getElementById("aboutBlock");
  if (elementOut.style.display === "none") {
    elementOut.style.display = "block";
  } else {
    elementOut.style.display = "none";
  }
}

function disclaimerBlock() {
  var codeOut = document.getElementById("disclaimerBlock");
  if (codeOut.style.display === "none") {
    codeOut.style.display = "block";
  } else {
    codeOut.style.display = "none";
  }
}

function buildBlock() {
  const elementOut = document.getElementById("buildBlock");
  if (elementOut.style.display === "none") {
    elementOut.style.display = "block";
  } else {
    elementOut.style.display = "none";
  }
}

function codeBlock() {
  const elementOut = document.getElementById("codeBlock");
  if (elementOut.style.display === "none") {
    elementOut.style.display = "block";
  } else {
    elementOut.style.display = "none";
  }
}

function connectBlock() {
  const elementOut = document.getElementById("connectBlock");
  if (elementOut.style.display === "none") {
    elementOut.style.display = "block";
  } else {
    elementOut.style.display = "none";
  }
}
function oscBlock() {
  const elementOut = document.getElementById("oscBlock");
  if (elementOut.style.display === "none") {
    elementOut.style.display = "block";
  } else {
    elementOut.style.display = "none";
  }
}

function detectMaximaMinima(y, t, umbral) {
  let maximos = [];
  let minimosAntes = [];
  let minimosDespues = [];

  let enZonaUmbral = false;
  let cruzoHaciaArriba = false;
  let valorMaximo = -Infinity;
  let tiemposMaximos = [];

  let valorMinimoAntes = Infinity;
  let tiempoMinimoAntes = null;
  let buscandoMinimoDespues = false;
  let valorMinimoDespues = Infinity;
  let tiempoMinimoDespues = null;

  for (let i = 1; i < y.length - 1; i++) {
    // Detectar mínimos locales
    if (y[i] <= y[i - 1] && y[i] < y[i + 1]) {
      if (!enZonaUmbral) {
        // Guardamos el mínimo antes de cruzar el umbral
        valorMinimoAntes = y[i];
        tiempoMinimoAntes = t[i];
      } else if (buscandoMinimoDespues) {
        // Guardamos el primer mínimo después del máximo
        valorMinimoDespues = y[i];
        tiempoMinimoDespues = t[i];
        buscandoMinimoDespues = false; // Dejar de buscar hasta el próximo máximo
      }
    }

    if (y[i] > umbral) {
      if (!enZonaUmbral && y[i - 1] <= umbral) {
        // Entramos en la zona del umbral viniendo de abajo
        enZonaUmbral = true;
        cruzoHaciaArriba = true;
        valorMaximo = y[i];
        tiemposMaximos = [t[i]];

        // Guardamos el mínimo antes del máximo
        minimosAntes.push(tiempoMinimoAntes);
      } else if (enZonaUmbral) {
        // Seguimos en la zona del umbral, verificamos si hay un nuevo máximo
        if (y[i] > valorMaximo) {
          valorMaximo = y[i];
          tiemposMaximos = [t[i]];
        } else if (y[i] === valorMaximo) {
          tiemposMaximos.push(t[i]);
        }
      }
    } else {
      if (enZonaUmbral) {
        // Salimos de la zona del umbral, almacenamos el promedio de los tiempos de los máximos
        if (cruzoHaciaArriba) {
          let promedioTiempoMaximo =
            tiemposMaximos.reduce((a, b) => a + b, 0) / tiemposMaximos.length;
          maximos.push(promedioTiempoMaximo);

          // Iniciar la búsqueda del mínimo después del máximo
          buscandoMinimoDespues = true;
          valorMinimoDespues = Infinity;
          tiempoMinimoDespues = null;
        }
        enZonaUmbral = false;
        cruzoHaciaArriba = false;
        valorMaximo = -Infinity;
        tiemposMaximos = [];
      }
    }
  }

  // Asegurar que las listas tengan la misma longitud
  while (minimosAntes.length < maximos.length) minimosAntes.push(null);
  while (minimosDespues.length < maximos.length) minimosDespues.push(null);

  return [minimosAntes, maximos, minimosDespues];
}

function toggleSensor1() {
  if (detener === 1) {
    sensor1Button.style.backgroundColor = "Aquamarine";
    sensor1Button.value = "Detener";
    detener = 0;
  } else {
    sensor1Button.style.backgroundColor = "red";
    sensor1Button.value = "Continuar";
    detener = 1;
  }
}

function plotPulso(timeS, y1, y2) {
  const trend1 = localDetrend(y1);
  let detrended1 = y1.map((v, i) => v - trend1[i]);
  const trend2 = localDetrend(y2);
  let detrended2 = y2.map((v, i) => v - trend2[i]);

  // AC usando RMS
  const ACred = rms(detrended1);

  const ACir = rms(detrended2);
  const DCred = trend1.reduce((a, b) => a + b, 0) / trend1.length;

  const DCir = trend2.reduce((a, b) => a + b, 0) / trend2.length;

  // ratio
  const R = ACred / DCred / (ACir / DCir);

  // fórmula aproximada
  let SpO2 = 110 - 25 * R;

  // limitar rango
  SpO2 = Math.max(70, Math.min(100, SpO2));
  const duration = timeS[timeS.length - 1] - timeS[timeS.length - 1 - 300];

  // ── 3. Trazas Plotly
  if (document.getElementById("invertir").checked) {
    detrended1 = detrended1.map((v) => -v);
    detrended2 = detrended2.map((v) => -v);
  }

  const max2 = Math.max(...detrended2);
  const min2 = Math.min(...detrended2);
  //const umbral2 = min2 + (max2 - min2) * 0.7;
  const umbral1 = 0;
  const umbral2 = (max2 - min2) * 0.4;
  const [tMax2, tMin2] = detectMaximaMinima(
    detrended2,
    timeS,
    umbral1,
    umbral2,
  );

  let intervalos = [];

  for (let i = 1; i < tMax2.length; i++) {
    intervalos.push(tMax2[i] - tMax2[i - 1]);
  }

  const bpmInstant = intervalos.map((dt) => 60 / dt);
  const meanBPM = bpmInstant.reduce((a, b) => a + b, 0) / bpmInstant.length;

  const variance =
    bpmInstant.reduce((a, b) => a + (b - meanBPM) ** 2, 0) / bpmInstant.length;

  const BPM_RMS_VAR = Math.sqrt(variance);
  lineasMax = tMax2.map((mx) => ({
    type: "line",
    x0: mx,
    x1: mx,
    yref: "paper",
    y0: 0,
    y1: 1, // Cubre todo el gráfico en Y
    line: { color: "red", width: 1, dash: "dot" },
  }));
  lineasMin = tMin2.map((mx) => ({
    type: "line",
    x0: mx,
    x1: mx,
    yref: "paper",
    y0: 0,
    y1: 1, // Cubre todo el gráfico en Y
    line: { color: "red", width: 1, dash: "dot" },
  }));

  const acPulso1 = {
    x: timeS,
    y: detrended1,
    type: "scatter",
    mode: "lines",
    name: "Rojo",
    yaxis: "y1",
    line: { color: "#f11115e3", width: 2.5 },
  };
  const acPulso2 = {
    x: timeS,
    y: detrended2,
    type: "scatter",
    mode: "lines",
    name: "IR",
    yaxis: "y2",
    line: { color: "#090909", width: 2.5 },
  };
  lineas = tMax2.map((mx) => ({
    type: "line",
    x0: mx,
    x1: mx,
    yref: "paper",
    y0: 0,
    y1: 1, // Cubre todo el gráfico en Y
    line: { color: "red", width: 1, dash: "dot" },
  }));
  let texto = "";
  if (
    Number.isFinite(meanBPM) &&
    Number.isFinite(BPM_RMS_VAR) &&
    meanBPM !== 0 &&
    BPM_RMS_VAR !== 0 &&
    BPM_RMS_VAR / meanBPM < 0.1
  ) {
    texto =
      `Datos Procesados` +
      `<br>` +
      `<span style="font-size:18px">` +
      `SpO2: ${SpO2.toFixed(1)} %, ` +
      `FC: ${meanBPM.toFixed(1)} \u00B1 ${BPM_RMS_VAR.toFixed(1)} LPM  ` +
      `</span>`;
  } else {
    texto = `Datos Procesados`;
  }
  // ── 4. Layout con doble eje Y
  const layout = {
    shapes: [...lineasMax, ...lineasMin],
    title: {
      text: texto,
      font: { family: "Arial, sans-serif", size: 20, color: "#000" },
    },
    xaxis: {
      title: {
        text: "Tiempo (s)",
        font: {
          family: "Arial, sans-serif",
          size: 18,
          color: "#000",
        },
      },
      showgrid: true,
      gridcolor: "rgba(128,128,128,0.15)",
    },
    yaxis: {
      title: {
        text: "LED Rojo (Cuentas ADC)",
        font: {
          family: "Arial, sans-serif",
          size: 18,
          color: "#dd373a",
        },
      },
      tickfont: { color: "#dd3742" },
      showgrid: true,
      gridcolor: "rgba(55,138,221,0.15)",
      zeroline: true,
      zerolinecolor: "rgba(55,138,221,0.3)",
      font: { family: "Arial, sans-serif", size: 10, color: "#000" },
    },
    yaxis2: {
      title: {
        text: "LED IR (Cuentas ADC)",
        font: {
          family: "Arial, sans-serif",
          size: 18,
          color: "#070707",
        },
      },
      tickfont: { color: "#090909" },
      overlaying: "y",
      side: "right",
      showgrid: false,
      font: { family: "Arial, sans-serif", size: 20, color: "#000" },
    },
    showlegend: false,
    margin: { t: 80, r: 80, b: 60, l: 70 },
    hovermode: "x unified",
    plot_bgcolor: "rgba(0,0,0,0)",
    paper_bgcolor: "rgba(0,0,0,0)",
  };

  if (detener === 0) {
    Plotly.newPlot("oscPlot", [acPulso1, acPulso2], layout, {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ["lasso2d", "select2d"],
    });
  }
  // ── 6. Retornar métricas calculadas
  return;
}

function butterworthLowpass4(fc, fs) {
  const stage1 = butterworthLowpass2(fc, fs);
  const stage2 = butterworthLowpass2(fc, fs);

  return [stage1, stage2];
}
function filtfiltPadCascade(stages, x, pad = 50) {
  const n = x.length;

  const front = x.slice(1, pad + 1).reverse();
  const back = x.slice(n - pad - 1, n - 1).reverse();
  let y = front.concat(x, back);

  // Forward
  for (const s of stages) {
    y = filterBiquad(s.b, s.a, y);
  }

  // Reverse
  y = y.reverse();
  for (const s of stages) {
    y = filterBiquad(s.b, s.a, y);
  }
  y = y.reverse();

  return y.slice(pad, pad + n);
}

function butterworthLowpass2(fc, fs) {
  const w0 = (2 * Math.PI * fc) / fs;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);

  // Butterworth Q = 1/√2
  const Q = Math.SQRT1_2;
  const alpha = sinw0 / (2 * Q);

  let b0 = (1 - cosw0) / 2;
  let b1 = 1 - cosw0;
  let b2 = (1 - cosw0) / 2;
  let a0 = 1 + alpha;
  let a1 = -2 * cosw0;
  let a2 = 1 - alpha;

  // Normalizar
  return {
    b: [b0 / a0, b1 / a0, b2 / a0],
    a: [1, a1 / a0, a2 / a0],
  };
}
function filterBiquad(b, a, x) {
  const y = new Array(x.length).fill(0);

  for (let n = 0; n < x.length; n++) {
    const x0 = x[n];
    const x1 = x[n - 1] ?? x0;
    const x2 = x[n - 2] ?? x1;
    const y1 = y[n - 1] ?? 0;
    const y2 = y[n - 2] ?? 0;

    y[n] = b[0] * x0 + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
  }

  return y;
}
function savgol11_3(y) {
  const n = y.length;
  if (n < 11) return y.slice(); // Muy pocos puntos

  const out = new Array(n).fill(0);

  // Coeficientes Savitzky-Golay para ventana 11, orden 3
  const c = [-36, 9, 44, 69, 84, 89, 84, 69, 44, 9, -36];
  const div = 429; // normalización

  const half = 5; // (11 - 1)/2

  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let k = -half; k <= half; k++) {
      const idx = Math.min(Math.max(i + k, 0), n - 1); // clamp en bordes
      acc += c[k + half] * y[idx];
    }
    out[i] = acc / div;
  }

  return out;
}

function localDetrend(signal, windowSize = 200) {
  let result = [];
  let trend = [];

  for (let i = 0; i < signal.length; i++) {
    let start = Math.max(0, i - windowSize);
    let end = Math.min(signal.length, i + windowSize);

    let x = [],
      y = [];

    for (let j = start; j < end; j++) {
      x.push(j);
      y.push(signal[j]);
    }

    let n = x.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;

    for (let k = 0; k < n; k++) {
      sumX += x[k];
      sumY += y[k];
      sumXY += x[k] * y[k];
      sumX2 += x[k] * x[k];
    }

    let slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    let intercept = (sumY - slope * sumX) / n;

    trend.push(slope * i + intercept);

    //result.push(signal[i] - trend);
  }

  return trend;
}

// ─── Utilidades globales ─────────────────────────────────────────────────────
function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr) {
  if (!arr || arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
}

function savitzkyGolay(signal, ventana, orden) {
  const coef = [-36, 9, 44, 69, 84, 89, 84, 69, 44, 9, -36].map((c) => c / 429);
  const half = Math.floor(ventana / 2);
  const result = [...signal];
  for (let i = half; i < signal.length - half; i++) {
    let sum = 0;
    for (let j = 0; j < ventana; j++) sum += coef[j] * signal[i - half + j];
    result[i] = sum;
  }
  return result;
}

async function capturePlotly(divId) {
  const dataUrl = await Plotly.toImage(divId, {
    format: "png",
    width: 800,
    height: 400,
  });
  return dataUrl;
}
async function saveDataPlot() {
  imagenes.push(await capturePlotly("dataPlot"));
}
async function saveOscPlot() {
  imagenes.push(await capturePlotly("oscPlot"));
}

function getDate() {
  const ahora = new Date();
  const yy = ahora.getFullYear().toString().slice(-2); // Últimos 2 dígitos del año
  const mm = String(ahora.getMonth() + 1).padStart(2, "0"); // Mes (01-12)
  const dd = String(ahora.getDate()).padStart(2, "0"); // Día (01-31)
  const hh = String(ahora.getHours()).padStart(2, "0"); // Hora (00-23)
  const min = String(ahora.getMinutes()).padStart(2, "0"); // Minutos (00-59)

  return `PWA-${yy}-${mm}-${dd}-${hh}-${min}`;
}

function detectMaximaMinima(y, t, umbral1, umbral2) {
  const tMax = [];
  const tMin = [];

  const n = y.length;

  if (n < 3 || t.length !== n) return [tMax, tMin];

  for (let i = 1; i < n; i++) {
    // Cruce ascendente por umbral1
    if (y[i - 1] < umbral1 && y[i] >= umbral1) {
      // Primer máximo hacia adelante
      let iMax = -1;
      for (let j = i + 1; j < n - 1; j++) {
        if (y[j] >= y[j - 1] && y[j] > y[j + 1]) {
          iMax = j;
          break;
        }
      }

      // Primer mínimo hacia atrás
      let iMin = -1;
      for (let j = i - 1; j > 0; j--) {
        if (y[j] <= y[j - 1] && y[j] < y[j + 1]) {
          iMin = j;
          break;
        }
      }

      // Validación
      if (iMax !== -1 && iMin !== -1) {
        if (y[iMax] - y[iMin] > umbral2) {
          tMax.push(t[iMax]);
          tMin.push(t[iMin]);
        }
      }
    }
  }

  return [tMax, tMin];
}

function rms(x) {
  let sum = 0;

  for (let v of x) {
    sum += v * v;
  }

  return Math.sqrt(sum / x.length);
}
