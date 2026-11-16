// =========================================================
// VIRTUAL CHEMISTRY LAB ENGINE (Freestyle + MIT-WPU CHM10011)
// =========================================================

const canvas = document.getElementById('lab-canvas');
const ctx = canvas.getContext('2d');

// --- STATE ---
const state = {
  mode: 'freestyle', // 'freestyle' | 'curriculum'
  selectedExp: 1,
  // Freestyle Beaker State
  contents: [],
  volume: 0,
  temp: 25,
  ph: 7.0,
  liquidColor: 'rgba(148, 163, 184, 0.25)',
  precipitate: null, // { color, label }
  bubbles: false,
  indicator: null,
  // Exp 1: Ostwald Viscometer State
  visc: {
    conc: '0.0', // '0.0' = pure water, '0.1'..'1.0' = PVA %
    meniscusY: 165, // 95 = Upper Mark A, 165 = Lower Mark B
    flowing: false,
    timer: 0,
    lastTime: null,
    t0: 18.4 // pure water reference seconds
  },
  // Exp 2: Nylon 6,10 State
  nylon: {
    organicAdded: false,
    aqueousAdded: false,
    threadLength: 0, // 0 to 100
    drawing: false
  },
  // Exp 6: pH Metric Titration State
  titration: {
    naohAdded: 0, // mL (0 to 40)
    points: [{ v: 0, ph: 2.88 }]
  }
};

// --- CHEMICALS CATALOG (Grades 9-12) ---
const FREESTYLE_CHEMICALS = [
  { id: 'HCl', name: 'HCl (1M)', group: 'acidbase', type: 'acid', vol: 20, color: 'rgba(226,232,240,0.3)' },
  { id: 'H2SO4', name: 'H₂SO₄ (1M)', group: 'acidbase', type: 'acid', vol: 20, color: 'rgba(226,232,240,0.35)' },
  { id: 'NaOH', name: 'NaOH (1M)', group: 'acidbase', type: 'base', vol: 10, color: 'rgba(226,232,240,0.3)' },
  { id: 'NH4OH', name: 'NH₄OH', group: 'acidbase', type: 'base', vol: 10, color: 'rgba(226,232,240,0.3)' },
  { id: 'CuSO4', name: 'CuSO₄ (aq)', group: 'salts', type: 'salt', vol: 25, color: 'rgba(14, 165, 233, 0.65)' },
  { id: 'PbNO3', name: 'Pb(NO₃)₂', group: 'salts', type: 'salt', vol: 20, color: 'rgba(241, 245, 249, 0.35)' },
  { id: 'KI', name: 'KI (aq)', group: 'salts', type: 'salt', vol: 20, color: 'rgba(241, 245, 249, 0.35)' },
  { id: 'Zn', name: 'Zn Granules', group: 'salts', type: 'metal', vol: 5, color: null },
  { id: 'Fe', name: 'Iron Nail (Fe)', group: 'salts', type: 'metal', vol: 5, color: null },
  { id: 'Phenol', name: 'Phenolphthalein', group: 'salts', type: 'indicator', vol: 2, color: null }
];

// --- MIT-WPU CURRICULUM EXPERIMENTS (CHM10011) ---
const MITWPU_EXPERIMENTS = [
  {
    id: 1,
    title: "Exp 1: Polymer MW via Ostwald's Viscometer",
    steps: [
      "Select Pure Solvent (Water) or PVA solution (0.1% to 1.0%) from the bench bar.",
      "Click 'Suck via Rubber Bulb' to raise meniscus above Upper Mark (A).",
      "Click 'Release & Time Flow' to measure time (t) between Mark A and Mark B.",
      "Calculate ηr = t/t₀, intrinsic viscosity [η], and MW using K = 2.0×10⁻⁴, α = 0.76."
    ]
  },
  {
    id: 2,
    title: "Exp 2: Preparation of Nylon 6,10 Thread",
    steps: [
      "Add 50 mL Sebacoyl Chloride in CCl₄ (dense lower organic phase).",
      "Slowly pour 50 mL aqueous Hexamethylene Diamine (upper aqueous phase).",
      "Click 'Draw Nylon 6,10 Thread' to pull interfacial polyamide film onto the glass rod."
    ]
  },
  {
    id: 3,
    title: "Exp 3: Iron Estimation via Colorimeter",
    steps: [
      "Calibrate colorimeter at λmax = 450–460 nm using blank (NH₄SCN + 2N HNO₃).",
      "Prepare standard Fe flasks (0.01 mg/mL) and measure absorbance of blood-red [Fe(SCN)₃].",
      "Determine unknown Fe concentration from Beer-Lambert calibration curve (A = εcl)."
    ]
  },
  {
    id: 4,
    title: "Exp 4: Environmental Effect on Metal Corrosion",
    steps: [
      "Immerse 4/5th of weighed mild steel/Zn strips in 1N, 2N, and 4N H₂SO₄ for 1 hour.",
      "Observe H₂ gas evolution (Fe + 2H⁺ → Fe²⁺ + H₂↑) and weigh dried strips.",
      "Compare corrosion rate (weight loss/g/hr) across acid concentrations."
    ]
  },
  {
    id: 5,
    title: "Exp 5: Proximate Analysis of Coal",
    steps: [
      "Heat 1 g coal at 110 °C for 1 hr in electric oven; cool in desiccator for % Moisture.",
      "Combust residual coal at 750 °C for 30 min in muffle furnace for % Ash content."
    ]
  },
  {
    id: 6,
    title: "Exp 6: pH-Metric Titration (CH₃COOH vs NaOH)",
    steps: [
      "Pipette 25 mL of 0.1N CH₃COOH into beaker with standardized glass-calomel electrode.",
      "Add NaOH in 2 mL increments using the titration slider below the canvas.",
      "Locate the equivalence point at the steepest inflection of the sigmoidal curve."
    ]
  },
  {
    id: 7,
    title: "Exp 7: Thin Layer Chromatography (TLC)",
    steps: [
      "Spot organic mixture 2–3 cm above base of silica-gel coated plate.",
      "Develop in solvent chamber until front moves 10–12 cm; stain with iodine.",
      "Compute Rf = (Distance moved by solute) / (Distance moved by solvent)."
    ]
  },
  {
    id: 8,
    title: "Exp 8: Kinetics of Ester Hydrolysis",
    steps: [
      "Mix 100 mL 0.4N HCl + 10 mL ethyl acetate at 25 °C in thermostat.",
      "Titrate 10 mL aliquots at 10-min intervals with 0.2N NaOH; calculate K = (2.303/t)log[(V∞-V₀)/(V∞-Vt)]."
    ]
  },
  {
    id: 9,
    title: "Exp 9: Electrochemical Equivalent (ECE) of Cu",
    steps: [
      "Dip weighed Cu cathode between double anodes in 15% CuSO₄ + 5% H₂SO₄.",
      "Pass steady current I for 45 min (2700 s); weigh deposit W and compute Z = W / (I·t)."
    ]
  }
];

// --- INITIALIZATION ---
function init() {
  renderShelves();
  bindEvents();
  updateUI();
  requestAnimationFrame(animationLoop);
}

function renderShelves() {
  const abGrid = document.getElementById('shelf-acidbase');
  const saltGrid = document.getElementById('shelf-salts');
  FREESTYLE_CHEMICALS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'chem-btn';
    btn.innerHTML = `${c.name}<small>+${c.vol} mL</small>`;
    btn.onclick = () => addFreestyleChemical(c);
    (c.group === 'acidbase' ? abGrid : saltGrid).appendChild(btn);
  });

  const expList = document.getElementById('exp-list');
  MITWPU_EXPERIMENTS.forEach(exp => {
    const btn = document.createElement('button');
    btn.className = `exp-item ${exp.id === 1 ? 'active' : ''}`;
    btn.textContent = exp.title;
    btn.onclick = () => selectExperiment(exp.id);
    expList.appendChild(btn);
  });
}

function bindEvents() {
  document.getElementById('tab-freestyle').onclick = () => switchMode('freestyle');
  document.getElementById('tab-curriculum').onclick = () => switchMode('curriculum');
  document.getElementById('btn-reset').onclick = resetBench;
  document.getElementById('btn-clear-log').onclick = () => {
    document.getElementById('reaction-log').innerHTML = '';
  };

  const tempSlider = document.getElementById('temp-slider');
  tempSlider.oninput = (e) => {
    state.temp = Number(e.target.value);
    document.getElementById('temp-display').textContent = `${state.temp} °C`;
    evaluateThermalReactions();
    updateTelemetry();
  };

  document.getElementById('btn-stir').onclick = () => {
    logMessage('Stirred reaction mixture thoroughly.');
    evaluateFreestyleReactions();
  };
}

function switchMode(newMode) {
  state.mode = newMode;
  document.getElementById('tab-freestyle').classList.toggle('active', newMode === 'freestyle');
  document.getElementById('tab-curriculum').classList.toggle('active', newMode === 'curriculum');
  document.getElementById('freestyle-shelf').classList.toggle('hidden', newMode !== 'freestyle');
  document.getElementById('curriculum-shelf').classList.toggle('hidden', newMode !== 'curriculum');
  updateUI();
}

function selectExperiment(id) {
  state.selectedExp = id;
  document.querySelectorAll('.exp-item').forEach((el, idx) => {
    el.classList.toggle('active', idx + 1 === id);
  });
  updateUI();
}

function resetBench() {
  state.contents = [];
  state.volume = 0;
  state.temp = 25;
  state.ph = 7.0;
  state.liquidColor = 'rgba(148, 163, 184, 0.25)';
  state.precipitate = null;
  state.bubbles = false;
  state.indicator = null;
  state.visc = { conc: '0.0', meniscusY: 165, flowing: false, timer: 0, lastTime: null, t0: 18.4 };
  state.nylon = { organicAdded: false, aqueousAdded: false, threadLength: 0, drawing: false };
  state.titration = { naohAdded: 0, points: [{ v: 0, ph: 2.88 }] };
  document.getElementById('temp-slider').value = 25;
  document.getElementById('temp-display').textContent = '25 °C';
  logMessage('Apparatus cleaned and bench reset.');
  updateUI();
}

// --- FREESTYLE REACTION ENGINE ---
function addFreestyleChemical(chem) {
  if (state.volume + chem.vol > 250) {
    logMessage('Beaker capacity (250 mL) reached! Reset bench to continue.');
    return;
  }
  state.contents.push(chem.id);
  state.volume += chem.vol;

  if (chem.type === 'indicator') {
    state.indicator = chem.id;
    logMessage(`Added 2 drops of ${chem.name}.`);
  } else {
    logMessage(`Added ${chem.name} (+${chem.vol} mL).`);
  }

  // Update pH
  const acids = state.contents.filter(x => x === 'HCl' || x === 'H2SO4').length;
  const bases = state.contents.filter(x => x === 'NaOH' || x === 'NH4OH').length;
  if (acids > bases) state.ph = Math.max(1.0, 7.0 - (acids - bases) * 2.2);
  else if (bases > acids) state.ph = Math.min(13.5, 7.0 + (bases - acids) * 2.2);
  else state.ph = 7.0;

  if (chem.color && !state.precipitate) state.liquidColor = chem.color;
  evaluateFreestyleReactions();
  updateTelemetry();
}

function evaluateFreestyleReactions() {
  const has = (id) => state.contents.includes(id);

  // 1. Lead Nitrate + Potassium Iodide -> Yellow PbI2 Precipitate
  if (has('PbNO3') && has('KI')) {
    state.precipitate = { color: '#facc15', label: 'PbI₂ (Yellow ppt)' };
    logMessage('REACTION: Pb(NO₃)₂ + 2KI → PbI₂↓ (Yellow precipitate) + 2KNO₃', true);
  }

  // 2. CuSO4 + Fe -> Displacement (Green FeSO4 + Cu deposit)
  if (has('CuSO4') && has('Fe')) {
    state.liquidColor = 'rgba(34, 197, 94, 0.5)';
    state.precipitate = { color: '#b45309', label: 'Cu (Reddish-brown deposit)' };
    logMessage('REACTION: Fe + CuSO₄ → FeSO₄ (pale green) + Cu↓', true);
  }

  // 3. Acid + Zinc -> H2 Gas Evolution
  if ((has('HCl') || has('H2SO4')) && has('Zn')) {
    state.bubbles = true;
    state.temp = Math.min(65, state.temp + 8);
    logMessage('REACTION: Zn + 2H⁺ → Zn²⁺ + H₂↑ (Exothermic effervescence)', true);
  }

  // 4. Neutralization + Phenolphthalein indicator
  if (state.indicator === 'Phenol') {
    if (state.ph >= 8.2) {
      state.liquidColor = 'rgba(236, 72, 153, 0.65)';
      logMessage('INDICATOR: Phenolphthalein turned pink in basic medium (pH ≥ 8.2).', true);
    } else {
      state.liquidColor = 'rgba(226, 232, 240, 0.3)';
    }
  }
}

function evaluateThermalReactions() {
  if (state.contents.includes('CuSO4') && state.temp >= 150) {
    state.liquidColor = 'rgba(248, 250, 252, 0.6)';
    logMessage('THERMAL: Hydrated CuSO₄·5H₂O dehydrated to white anhydrous CuSO₄ at ≥150 °C.', true);
  }
}

// --- UI & CONTEXTUAL CONTROLS ---
function updateUI() {
  const benchTitle = document.getElementById('bench-title');
  const procSteps = document.getElementById('proc-steps');
  const dynControls = document.getElementById('dynamic-controls');
  dynControls.innerHTML = '';

  if (state.mode === 'freestyle') {
    benchTitle.textContent = 'Freestyle Reaction Beaker (250 mL)';
    procSteps.innerHTML = `
      <li>Select acids, bases, salts, or metals from the left shelf.</li>
      <li>Use the Bunsen burner slider to test thermal reactions (up to 250 °C).</li>
      <li>Observe live pH shifts, gas bubbles, color changes, and precipitates.</li>
    `;
    dynControls.innerHTML = `<span>Active Species: <strong>${state.contents.join(' + ') || 'None'}</strong></span>`;
  } else {
    const exp = MITWPU_EXPERIMENTS.find(e => e.id === state.selectedExp);
    benchTitle.textContent = exp.title;
    procSteps.innerHTML = exp.steps.map(s => `<li>${s}</li>`).join('');
    renderCurriculumControls(exp.id, dynControls);
  }
  updateTelemetry();
}

function renderCurriculumControls(expId, container) {
  if (expId === 1) {
    // Exp 1: Ostwald Viscometer
    container.innerHTML = `
      <label>Solution:
        <select id="visc-conc">
          <option value="0.0">Distilled Water (Pure Solvent)</option>
          <option value="0.1">0.1% PVA Solution</option>
          <option value="0.2">0.2% PVA Solution</option>
          <option value="0.3">0.3% PVA Solution</option>
          <option value="0.4">0.4% PVA Solution</option>
          <option value="0.5">0.5% PVA Solution</option>
          <option value="0.6">0.6% PVA Solution</option>
          <option value="0.8">0.8% PVA Solution</option>
          <option value="1.0">1.0% PVA Solution</option>
        </select>
      </label>
      <button id="btn-suck" class="btn-action">1. Suck via Rubber Bulb</button>
      <button id="btn-flow" class="btn-action">2. Release & Time Flow</button>
    `;
    const sel = document.getElementById('visc-conc');
    sel.value = state.visc.conc;
    sel.onchange = (e) => {
      state.visc.conc = e.target.value;
      state.visc.flowing = false;
      state.visc.timer = 0;
      logMessage(`Loaded 25 mL of ${e.target.value === '0.0' ? 'Distilled Water' : e.target.value + '% PVA'} into Ostwald Viscometer.`);
    };
    document.getElementById('btn-suck').onclick = () => {
      state.visc.meniscusY = 82; // Above Mark A (95)
      state.visc.flowing = false;
      state.visc.timer = 0;
      logMessage('Drawn liquid above Upper Mark (A) using rubber bulb.');
    };
    document.getElementById('btn-flow').onclick = () => {
      if (state.visc.meniscusY > 95) {
        logMessage('Suck liquid above Upper Mark (A) first!');
        return;
      }
      state.visc.flowing = true;
      state.visc.lastTime = performance.now();
      logMessage('Released fold: timing gravity flow from Mark A to Mark B...');
    };
  } else if (expId === 2) {
    // Exp 2: Nylon 6,10 Synthesis
    container.innerHTML = `
      <button id="btn-add-ccl4" class="btn-action">1. Pour Sebacoyl Chloride (in CCl₄)</button>
      <button id="btn-add-hmda" class="btn-action">2. Layer Aqueous HMDA</button>
      <button id="btn-draw-nylon" class="btn-action">3. Draw Nylon 6,10 Thread</button>
    `;
    document.getElementById('btn-add-ccl4').onclick = () => {
      state.nylon.organicAdded = true;
      logMessage('Added 50 mL Sebacoyl Chloride in CCl₄ (bottom organic layer).');
    };
    document.getElementById('btn-add-hmda').onclick = () => {
      if (!state.nylon.organicAdded) return logMessage('Add organic CCl₄ layer first.');
      state.nylon.aqueousAdded = true;
      logMessage('Layered 50 mL aqueous HMDA gently along beaker wall. Polyamide film formed at interface!', true);
    };
    document.getElementById('btn-draw-nylon').onclick = () => {
      if (!state.nylon.aqueousAdded) return logMessage('Form the liquid-liquid interface first.');
      state.nylon.drawing = true;
      logMessage('Drawing continuous Nylon 6,10 rope with tweezers onto glass rod...', true);
    };
  } else if (expId === 6) {
    // Exp 6: pH Metric Titration
    container.innerHTML = `
      <label>NaOH Added from Burette: <strong id="naoh-val">${state.titration.naohAdded} mL</strong>
        <input type="range" id="naoh-slider" min="0" max="40" step="1" value="${state.titration.naohAdded}" />
      </label>
    `;
    document.getElementById('naoh-slider').oninput = (e) => {
      const v = Number(e.target.value);
      state.titration.naohAdded = v;
      document.getElementById('naoh-val').textContent = `${v} mL`;
      // Sigmoidal Henderson-Hasselbalch approximation (Equivalence at 25 mL 0.1N)
      let ph;
      if (v < 25) ph = 4.76 + Math.log10((v + 0.3) / (25 - v + 0.3));
      else if (v === 25) ph = 8.72;
      else ph = 11.5 + Math.log10((v - 25 + 0.5) / 15);
      state.ph = Number(ph.toFixed(2));
      if (!state.titration.points.some(p => p.v === v)) {
        state.titration.points.push({ v, ph: state.ph });
        state.titration.points.sort((a, b) => a.v - b.v);
      }
      updateTelemetry();
      if (v === 25) logMessage('EQUIVALENCE POINT REACHED at 25.0 mL NaOH (pH = 8.72)!', true);
    };
  } else {
    container.innerHTML = `<span>Interactive apparatus blueprint loaded for <strong>Exp ${expId}</strong>. Follow steps on the right.</span>`;
  }
}

function updateTelemetry() {
  document.getElementById('metric-temp').textContent = `${state.temp.toFixed(1)} °C`;
  document.getElementById('metric-ph').textContent = state.ph.toFixed(2);
  document.getElementById('metric-vol').textContent = `${state.volume} mL`;
}

function logMessage(msg, isRxn = false) {
  const log = document.getElementById('reaction-log');
  const div = document.createElement('div');
  div.className = `log-entry ${isRxn ? 'rxn' : ''}`;
  div.textContent = `[${new Date().toLocaleTimeString([], { hour12: false })}] ${msg}`;
  log.prepend(div);
}

// --- CANVAS RENDERING LOOP ---
function animationLoop(now) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.mode === 'freestyle') {
    drawFreestyleBeaker(now);
  } else if (state.selectedExp === 1) {
    drawOstwaldViscometer(now);
  } else if (state.selectedExp === 2) {
    drawNylonExperiment();
  } else if (state.selectedExp === 6) {
    drawTitrationCurve();
  } else {
    drawExperimentSchematic(state.selectedExp);
  }

  requestAnimationFrame(animationLoop);
}

function drawFreestyleBeaker(now) {
  const bx = 180, by = 80, bw = 180, bh = 230;

  // Bunsen flame if heated
  if (state.temp > 30) {
    const flameH = 15 + (state.temp / 250) * 25;
    ctx.fillStyle = state.temp > 140 ? 'rgba(56, 189, 248, 0.8)' : 'rgba(245, 158, 11, 0.8)';
    ctx.beginPath();
    ctx.moveTo(255, 345);
    ctx.quadraticCurveTo(270, 345 - flameH * 1.6, 285, 345);
    ctx.fill();
  }

  // Liquid fill
  if (state.volume > 0) {
    const fillH = (state.volume / 250) * (bh - 20);
    ctx.fillStyle = state.liquidColor;
    ctx.fillRect(bx + 3, by + bh - fillH - 2, bw - 6, fillH);

    // Bubbles
    if (state.bubbles) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 12; i++) {
        const rx = bx + 20 + ((i * 37) % (bw - 40));
        const ry = by + bh - ((now / 15 + i * 23) % fillH);
        ctx.beginPath();
        ctx.arc(rx, ry, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Precipitate layer
  if (state.precipitate) {
    ctx.fillStyle = state.precipitate.color;
    ctx.fillRect(bx + 4, by + bh - 16, bw - 8, 14);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '12px sans-serif';
    ctx.fillText(state.precipitate.label, bx + 22, by + bh + 22);
  }

  // Glass Beaker Outline & Graduations
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = '#64748b';
  ctx.font = '11px monospace';
  for (let m = 50; m <= 200; m += 50) {
    const y = by + bh - (m / 250) * (bh - 20);
    ctx.fillRect(bx, y, 12, 2);
    ctx.fillText(`${m} mL`, bx + 16, y + 4);
  }
}

function drawOstwaldViscometer(now) {
  const c = parseFloat(state.visc.conc);
  // Viscosity slows flow rate exponentially
  const flowFactor = 1 + c * 1.45;

  if (state.visc.flowing) {
    const dt = (now - state.visc.lastTime) / 1000;
    state.visc.lastTime = now;
    if (state.visc.meniscusY >= 95 && state.visc.meniscusY <= 165) {
      state.visc.timer += dt;
    }
    state.visc.meniscusY += (dt * 4.2) / flowFactor;
    if (state.visc.meniscusY >= 172) {
      state.visc.flowing = false;
      const t = state.visc.timer.toFixed(2);
      if (c === 0) {
        state.visc.t0 = parseFloat(t);
        logMessage(`Recorded Pure Water flow time t₀ = ${t} s.`);
      } else {
        const nr = (t / state.visc.t0).toFixed(3);
        const nsp = (nr - 1).toFixed(3);
        const nred = (nsp / c).toFixed(3);
        logMessage(`PVA ${c}%: t = ${t} s | ηr = ${nr} | ηsp = ${nsp} | ηred = ${nred}`, true);
      }
    }
  }

  // Draw U-Tube Viscometer
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  // Left wide arm & lower reservoir bulb
  ctx.strokeRect(160, 60, 26, 170);
  ctx.beginPath();
  ctx.arc(173, 255, 28, 0, Math.PI * 2);
  ctx.stroke();
  // U-bend
  ctx.beginPath();
  ctx.arc(233, 285, 60, 0, Math.PI, false);
  ctx.stroke();
  // Right capillary arm & upper measuring bulb
  ctx.strokeRect(285, 60, 16, 40);
  ctx.beginPath();
  ctx.arc(293, 130, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(289, 154, 8, 130);

  // Liquid column inside right arm
  ctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
  const topY = state.visc.meniscusY;
  if (topY < 154) {
    ctx.fillRect(287, topY, 12, 154 - topY);
  }
  ctx.fillRect(290, 154, 6, 130);

  // Etched Marks A and B
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(270, 95); ctx.lineTo(316, 95); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(270, 165); ctx.lineTo(316, 165); ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = '12px monospace';
  ctx.fillText('UPPER MARK (A)', 325, 99);
  ctx.fillText('LOWER MARK (B)', 325, 169);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`Stopwatch: ${state.visc.timer.toFixed(2)} s`, 40, 45);
}

function drawNylonExperiment() {
  const bx = 190, by = 140, bw = 160, bh = 190;

  // Lower CCl4 + Sebacoyl Chloride Layer
  if (state.nylon.organicAdded) {
    ctx.fillStyle = 'rgba(100, 116, 139, 0.55)';
    ctx.fillRect(bx + 2, by + 100, bw - 4, 88);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px sans-serif';
    ctx.fillText('Sebacoyl chloride in CCl₄', bx + 14, by + 150);
  }

  // Upper Aqueous HMDA Layer
  if (state.nylon.aqueousAdded) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.fillRect(bx + 2, by + 35, bw - 4, 65);
    // Interfacial Polyamide Film
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx + 2, by + 98, bw - 4, 4);
    ctx.fillText('HMDA (aq) + Interfacial Film', bx + 12, by + 65);
  }

  // Glass Rod & Animated Thread Extraction
  if (state.nylon.drawing && state.nylon.threadLength < 100) {
    state.nylon.threadLength += 0.6;
  }
  if (state.nylon.threadLength > 0) {
    // Glass Rod at top
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(150, 55, 240, 10);
    // Nylon Rope from interface (by+100) to rod (60)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(270, by + 100);
    ctx.lineTo(270, 60);
    ctx.stroke();
    // Wound coil on glass rod
    ctx.fillStyle = '#f8fafc';
    const coilW = (state.nylon.threadLength / 100) * 90;
    ctx.fillRect(270 - coilW / 2, 51, coilW, 18);
    ctx.fillText('Nylon 6,10 Thread Wound on Glass Rod', 165, 38);
  }

  // Beaker
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, bw, bh);
}

function drawTitrationCurve() {
  const ox = 70, oy = 320, w = 410, h = 260;
  // Axes
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ox, oy - h); ctx.lineTo(ox, oy); ctx.lineTo(ox + w, oy);
  ctx.stroke();

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '12px sans-serif';
  ctx.fillText('pH (0–14)', 15, oy - h / 2);
  ctx.fillText('Volume of NaOH Added (0–40 mL)', ox + 110, oy + 38);

  // Plot curve
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  state.titration.points.forEach((pt, idx) => {
    const px = ox + (pt.v / 40) * w;
    const py = oy - (pt.ph / 14) * h;
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // Plot points
  ctx.fillStyle = '#10b981';
  state.titration.points.forEach(pt => {
    const px = ox + (pt.v / 40) * w;
    const py = oy - (pt.ph / 14) * h;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawExperimentSchematic(expId) {
  const exp = MITWPU_EXPERIMENTS.find(e => e.id === expId);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(exp.title, 40, 70);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '13px sans-serif';
  exp.steps.forEach((step, i) => {
    ctx.fillText(`${i + 1}. ${step}`, 40, 120 + i * 35);
  });
}

init();
