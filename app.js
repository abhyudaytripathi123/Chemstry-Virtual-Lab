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
  temp: 25.0,
  ph: 7.00,
  liquidColor: 'rgba(148, 163, 184, 0.25)',
  precipitate: null, // { color, label }
  bubbles: false,
  indicator: null,
  fumeColor: null, // For gas evolution like NO2 (brown) or I2 (purple)
  // Draggable Burner State
  burner: {
    active: false,
    x: 280,
    y: 310,
    dragging: false,
    tempPower: 120 // °C when placed under beaker
  },
  // Exp 1: Ostwald Viscometer State
  visc: {
    conc: '0.0',
    meniscusY: 165,
    flowing: false,
    timer: 0,
    lastTime: null,
    t0: 18.4
  },
  // Exp 2: Nylon 6,10 State
  nylon: {
    organicAdded: false,
    aqueousAdded: false,
    threadLength: 0,
    drawing: false
  },
  // Exp 6: pH Metric Titration State
  titration: {
    naohAdded: 0,
    points: [{ v: 0, ph: 2.88 }]
  }
};

// --- CHEMICAL INVENTORY & PROPERTIES ---
const FREESTYLE_CHEMICALS = [
  { id: 'HCl', name: 'HCl (1M)', group: 'acidbase', type: 'acid', vol: 20, color: 'rgba(226,232,240,0.3)', desc: 'Strong mineral acid.' },
  { id: 'H2SO4', name: 'H₂SO₄ (1M)', group: 'acidbase', type: 'acid', vol: 20, color: 'rgba(226,232,240,0.35)', desc: 'Strong dehydrating acid.' },
  { id: 'NaOH', name: 'NaOH (1M)', group: 'acidbase', type: 'base', vol: 10, color: 'rgba(226,232,240,0.3)', desc: 'Strong alkali.' },
  { id: 'NH4OH', name: 'NH₄OH', group: 'acidbase', type: 'base', vol: 10, color: 'rgba(226,232,240,0.3)', desc: 'Weak ammonium base.' },
  { id: 'KMnO4', name: 'KMnO₄ (aq)', group: 'salts', type: 'oxidizer', vol: 15, color: 'rgba(147, 51, 234, 0.75)', desc: 'Deep purple oxidizing agent.' },
  { id: 'CuSO4', name: 'CuSO₄ (aq)', group: 'salts', type: 'salt', vol: 25, color: 'rgba(14, 165, 233, 0.65)', desc: 'Blue copper salt solution.' },
  { id: 'PbNO3', name: 'Pb(NO₃)₂', group: 'salts', type: 'salt', vol: 20, color: 'rgba(241, 245, 249, 0.35)', desc: 'Lead salt solution.' },
  { id: 'KI', name: 'KI (aq)', group: 'salts', type: 'salt', vol: 20, color: 'rgba(241, 245, 249, 0.35)', desc: 'Potassium iodide precipitant.' },
  { id: 'Oxalic', name: 'Oxalic Acid', group: 'salts', type: 'reductant', vol: 10, color: 'rgba(241, 245, 249, 0.3)', desc: 'Reducing organic acid.' },
  { id: 'Zn', name: 'Zn Granules', group: 'metals', type: 'metal', vol: 5, color: null, desc: 'Reactive metal.' },
  { id: 'Fe', name: 'Iron Nail (Fe)', group: 'metals', type: 'metal', vol: 5, color: null, desc: 'Transition metal.' },
  { id: 'Phenol', name: 'Phenolphthalein', group: 'metals', type: 'indicator', vol: 2, color: null, desc: 'Acid-base indicator.' }
];

// --- MIT-WPU CURRICULUM EXPERIMENTS (CHM10011) ---
const MITWPU_EXPERIMENTS = [
  {
    id: 1,
    title: "Exp 1: Polymer MW via Ostwald's Viscometer",[cite: 5, 7]
    steps: [
      "Select Pure Solvent (Water) or PVA solution (0.1% to 1.0%) from the dropdown.",[cite: 7, 8]
      "Click 'Suck via Rubber Bulb' to draw liquid above Upper Mark (A).",[cite: 8]
      "Click 'Release & Time Flow' to record capillary efflux time (t).",[cite: 8, 9]
      "Compute relative viscosity ηr = t/t₀ and viscosity-average molecular weight."[cite: 7, 9]
    ]
  },
  {
    id: 2,
    title: "Exp 2: Preparation of Nylon 6,10 Thread",[cite: 5, 13]
    steps: [
      "Add 50 mL Sebacoyl Chloride in CCl₄ (lower organic layer).",[cite: 13, 14]
      "Slowly layer 50 mL aqueous Hexamethylene Diamine on top.",[cite: 13, 14]
      "Click 'Draw Nylon Thread' to extract polyamide rope continuously."[cite: 13, 14]
    ]
  },
  {
    id: 3,
    title: "Exp 3: Iron Estimation via Colorimeter",[cite: 5, 19]
    steps: [
      "Calibrate colorimeter at λmax = 450–460 nm using blank solution.",[cite: 20, 21]
      "Measure absorbance of standard iron thiocyanate complexes [Fe(SCN)₃].",[cite: 20, 21, 23]
      "Determine unknown iron concentration from Beer-Lambert calibration curve."[cite: 19, 21, 22]
    ]
  },
  {
    id: 4,
    title: "Exp 4: Environmental Effect on Metal Corrosion",[cite: 5, 27]
    steps: [
      "Immerse mild steel/Zn plates in 1N, 2N, and 4N H₂SO₄ for 1 hour.",[cite: 27, 29]
      "Observe hydrogen evolution and measure weight loss per g/hr."[cite: 27, 28, 29]
    ]
  },
  {
    id: 5,
    title: "Exp 5: Proximate Analysis of Coal",[cite: 5, 34]
    steps: [
      "Heat 1 g coal at 110 °C in electric oven to determine % Moisture.",[cite: 34, 35]
      "Combust residual coal at 750 °C in muffle furnace for % Ash content."[cite: 34, 35]
    ]
  },
  {
    id: 6,
    title: "Exp 6: pH-Metric Titration (CH₃COOH vs NaOH)",[cite: 5, 39]
    steps: [
      "Pipette 25 mL of 0.1N CH₃COOH with glass-calomel electrode.",[cite: 39, 41, 42]
      "Titrate with NaOH using slider to record sigmoidal pH curve.",[cite: 40, 41, 42]
    ]
  },
  {
    id: 7,
    title: "Exp 7: Thin Layer Chromatography (TLC)",[cite: 5, 47]
    steps: [
      "Spot organic mixture on silica gel plate and develop in chamber.",[cite: 47, 48]
      "Visualize with iodine vapor and calculate retention factor Rf."[cite: 47, 48]
    ]
  },
  {
    id: 8,
    title: "Exp 8: Kinetics of Ester Hydrolysis",[cite: 5, 53]
    steps: [
      "Mix 0.4N HCl and ethyl acetate at 25 °C in thermostat.",[cite: 53, 54]
      "Titrate aliquots with NaOH to calculate pseudo-first-order rate constant K."[cite: 53, 54]
    ]
  },
  {
    id: 9,
    title: "Exp 9: Electrochemical Equivalent (ECE) of Cu",[cite: 5, 60]
    steps: [
      "Pass steady current through copper voltameter for 45 minutes.",[cite: 60, 61]
      "Weigh copper deposited at cathode to compute ECE value Z."[cite: 60, 61, 62]
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
  const metalGrid = document.getElementById('shelf-metals');

  FREESTYLE_CHEMICALS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'chem-btn';
    btn.innerHTML = `${c.name}<small>${c.desc}</small>`;
    btn.onclick = () => addFreestyleChemical(c);
    
    if (c.group === 'acidbase') abGrid.appendChild(btn);
    else if (c.group === 'salts') saltGrid.appendChild(btn);
    else metalGrid.appendChild(btn);
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
  document.getElementById('btn-stir').onclick = () => {
    logMessage('Stirred reaction mixture thoroughly.');
    evaluateFreestyleReactions();
  };

  // Draggable Bunsen Burner Logic
  const burnerEl = document.getElementById('draggable-burner');
  burnerEl.ondragstart = (e) => {
    e.dataTransfer.setData('text/plain', 'burner');
  };

  const dropzone = document.getElementById('canvas-dropzone');
  dropzone.ondragover = (e) => e.preventDefault();
  dropzone.ondrop = (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    state.burner.x = e.clientX - rect.left - 20;
    state.burner.y = e.clientY - rect.top - 20;
    state.burner.active = true;
    document.getElementById('burner-temp-label').textContent = 'ON (120 °C)';
    logMessage('Bunsen burner placed under beaker. Heating initiated!', true);
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
  state.temp = 25.0;
  state.ph = 7.00;
  state.liquidColor = 'rgba(148, 163, 184, 0.25)';
  state.precipitate = null;
  state.bubbles = false;
  state.indicator = null;
  state.fumeColor = null;
  state.burner.active = false;
  document.getElementById('burner-temp-label').textContent = 'Off';
  state.visc = { conc: '0.0', meniscusY: 165, flowing: false, timer: 0, lastTime: null, t0: 18.4 };
  state.nylon = { organicAdded: false, aqueousAdded: false, threadLength: 0, drawing: false };
  state.titration = { naohAdded: 0, points: [{ v: 0, ph: 2.88 }] };
  logMessage('Bench reset to initial clean state.');
  updateUI();
}

// --- FREESTYLE CHEMICAL & REACTION ENGINE ---
function addFreestyleChemical(chem) {
  if (state.volume + chem.vol > 250) {
    logMessage('Beaker volume limit (250 mL) reached!', 'warn');
    return;
  }
  state.contents.push(chem.id);
  state.volume += chem.vol;

  if (chem.type === 'indicator') {
    state.indicator = chem.id;
    logMessage(`Added indicator: ${chem.name}`);
  } else {
    logMessage(`Added ${chem.name} (+${chem.vol} mL). Properties: ${chem.desc}`);
  }

  // Update pH calculation
  updatepHAndReactions();
  updateTelemetry();
}

function updatepHAndReactions() {
  const acids = state.contents.filter(x => x === 'HCl' || x === 'H2SO4' || x === 'Oxalic').length;
  const bases = state.contents.filter(x => x === 'NaOH' || x === 'NH4OH').length;
  
  if (acids > bases) state.ph = Math.max(1.0, 7.0 - acids * 2.1);
  else if (bases > acids) state.ph = Math.min(13.5, 7.0 + bases * 2.1);
  else state.ph = 7.00;

  // Default color assignment
  const lastChem = FREESTYLE_CHEMICALS.find(c => c.id === state.contents[state.contents.length - 1]);
  if (lastChem && lastChem.color && !state.precipitate) {
    state.liquidColor = lastChem.color;
  }

  evaluateFreestyleReactions();
}

function evaluateFreestyleReactions() {
  const has = (id) => state.contents.includes(id);

  // 1. Potassium Permanganate (KMnO4) Redox Reactions
  if (has('KMnO4')) {
    if (has('Oxalic') && state.temp > 40) {
      state.liquidColor = 'rgba(226, 232, 240, 0.25)'; // Decolorized
      state.bubbles = true;
      logMessage('REACTION (Redox): 2MnO₄⁻ + 5C₂O₄²⁻ + 16H⁺ → 2Mn²⁺ (Colorless) + 10CO₂↑ + 8H₂O. Solution turns colorless with CO₂ effervescence!', true);
    } else if (has('HCl')) {
      state.liquidColor = 'rgba(226, 232, 240, 0.25)';
      state.fumeColor = 'rgba(168, 85, 247, 0.4)'; // greenish yellow chlorine fumes
      logMessage('REACTION (Redox): 2KMnO₄ + 16HCl → 2KCl + 2MnCl₂ + 8H₂O + 5Cl₂↑ (Chlorine gas evolved)', true);
    } else {
      state.liquidColor = 'rgba(147, 51, 234, 0.75)'; // Deep purple
    }
  }

  // 2. Lead Nitrate + Potassium Iodide -> Yellow Precipitate
  if (has('PbNO3') && has('KI')) {
    state.precipitate = { color: '#facc15', label: 'PbI₂ (Bright Yellow Ppt)' };
    logMessage('REACTION (Precipitation): Pb(NO₃)₂ + 2KI → PbI₂↓ (Golden yellow precipitate) + 2KNO₃', true);
  }

  // 3. Copper Sulfate + Iron -> Displacement
  if (has('CuSO4') && has('Fe')) {
    state.liquidColor = 'rgba(34, 197, 94, 0.5)'; // Pale green FeSO4
    state.precipitate = { color: '#b45309', label: 'Cu Metal Deposit' };
    logMessage('REACTION (Displacement): Fe + CuSO₄ → FeSO₄ (Greenish) + Cu↓ (Red-brown coating on iron)', true);
  }

  // 4. Acid + Zinc -> Hydrogen gas
  if ((has('HCl') || has('H2SO4')) && has('Zn')) {
    state.bubbles = true;
    logMessage('REACTION (Gas Evolution): Zn + 2H⁺ → Zn²⁺ + H₂↑ (Hydrogen effervescence)', true);
  }

  // 5. Phenolphthalein Indicator in Base
  if (state.indicator === 'Phenol') {
    if (state.ph >= 8.2) {
      state.liquidColor = 'rgba(236, 72, 153, 0.65)';
      logMessage('INDICATOR: Phenolphthalein turned magenta/pink in alkaline medium (pH ≥ 8.2).', true);
    }
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
      <li>Select chemicals from the left inventory to add them to the beaker.</li>
      <li>Drag and drop the <strong>Bunsen Burner Torch</strong> under the beaker to apply heat.</li>
      <li>Observe redox color transitions (e.g., KMnO₄ decolorization), gas bubbles, and precipitates.</li>
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
    container.innerHTML = `
      <label>Solution:
        <select id="visc-conc">
          <option value="0.0">Distilled Water (Pure Solvent)</option>
          <option value="0.1">0.1% PVA Solution</option>
          <option value="0.2">0.2% PVA Solution</option>
          <option value="0.5">0.5% PVA Solution</option>
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
      state.visc.meniscusY = 82;
      state.visc.flowing = false;
      state.visc.timer = 0;
      logMessage('Drawn liquid above Upper Mark (A)[cite: 8].');
    };
    document.getElementById('btn-flow').onclick = () => {
      if (state.visc.meniscusY > 95) {
        logMessage('Draw liquid above Upper Mark (A) first!', 'warn');
        return;
      }
      state.visc.flowing = true;
      state.visc.lastTime = performance.now();
      logMessage('Timing gravity flow between marks A and B[cite: 7, 8].');
    };
  } else if (expId === 2) {
    container.innerHTML = `
      <button id="btn-add-ccl4" class="btn-action">1. Add Sebacoyl Chloride in CCl₄</button>
      <button id="btn-add-hmda" class="btn-action">2. Layer Aqueous HMDA</button>
      <button id="btn-draw-nylon" class="btn-action">3. Draw Nylon 6,10 Thread</button>
    `;
    document.getElementById('btn-add-ccl4').onclick = () => {
      state.nylon.organicAdded = true;
      logMessage('Added lower organic layer of Sebacoyl chloride in CCl₄[cite: 13, 14].');
    };
    document.getElementById('btn-add-hmda').onclick = () => {
      if (!state.nylon.organicAdded) return logMessage('Add organic CCl₄ layer first[cite: 14].', 'warn');
      state.nylon.aqueousAdded = true;
      logMessage('Layered aqueous HMDA. Interfacial polymerization initiated[cite: 13, 14]!', true);
    };
    document.getElementById('btn-draw-nylon').onclick = () => {
      if (!state.nylon.aqueousAdded) return logMessage('Form liquid interface first[cite: 14].', 'warn');
      state.nylon.drawing = true;
      logMessage('Drawing continuous Nylon 6,10 thread onto glass rod[cite: 13, 14]!', true);
    };
  } else if (expId === 6) {
    container.innerHTML = `
      <label>NaOH Added: <strong id="naoh-val">${state.titration.naohAdded} mL</strong>
        <input type="range" id="naoh-slider" min="0" max="40" step="1" value="${state.titration.naohAdded}" />
      </label>
    `;
    document.getElementById('naoh-slider').oninput = (e) => {
      const v = Number(e.target.value);
      state.titration.naohAdded = v;
      document.getElementById('naoh-val').textContent = `${v} mL`;
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
      if (v === 25) logMessage('Equivalence point reached at 25.0 mL NaOH (pH = 8.72)[cite: 40, 42]!', true);
    };
  } else {
    container.innerHTML = `<span>Apparatus and schematic loaded for <strong>Exp ${expId}</strong>. Follow steps on the right.</span>`;
  }
}

function updateTelemetry() {
  document.getElementById('metric-temp').textContent = `${state.temp.toFixed(1)} °C`;
  document.getElementById('metric-ph').textContent = state.ph.toFixed(2);
  document.getElementById('metric-vol').textContent = `${state.volume} mL`;
}

function logMessage(msg, type = false) {
  const log = document.getElementById('reaction-log');
  const div = document.createElement('div');
  div.className = `log-entry ${type === true ? 'rxn' : type === 'warn' ? 'warn' : ''}`;
  div.textContent = `[${new Date().toLocaleTimeString([], { hour12: false })}] ${msg}`;
  log.prepend(div);
}

// --- CANVAS RENDERING & ANIMATION LOOP ---
function animationLoop(now) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.mode === 'freestyle') {
    drawFreestyleWorkspace(now);
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

function drawFreestyleWorkspace(now) {
  const bx = 190, by = 90, bw = 180, bh = 210;

  // Heating effect from draggable burner
  if (state.burner.active) {
    state.temp = Math.min(100, state.temp + 0.15);
    updateTelemetry();
    // Flame animation
    const fx = state.burner.x + 20, fy = state.burner.y;
    ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.beginPath();
    ctx.moveTo(fx - 12, fy);
    ctx.quadraticCurveTo(fx, fy - 35, fx + 12, fy);
    ctx.fill();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
    ctx.beginPath();
    ctx.moveTo(fx - 5, fy);
    ctx.quadraticCurveTo(fx, fy - 20, fx + 5, fy);
    ctx.fill();
  }

  // Beaker Liquid Fill
  if (state.volume > 0) {
    const fillH = (state.volume / 250) * (bh - 20);
    ctx.fillStyle = state.liquidColor;
    ctx.fillRect(bx + 3, by + bh - fillH - 2, bw - 6, fillH);

    // Effervescence Bubbles
    if (state.bubbles) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = 0; i < 14; i++) {
        const rx = bx + 20 + ((i * 31) % (bw - 40));
        const ry = by + bh - ((now / 18 + i * 19) % fillH);
        ctx.beginPath();
        ctx.arc(rx, ry, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Precipitate Layer
  if (state.precipitate) {
    ctx.fillStyle = state.precipitate.color;
    ctx.fillRect(bx + 4, by + bh - 16, bw - 8, 14);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '11px sans-serif';
    ctx.fillText(state.precipitate.label, bx + 16, by + bh + 22);
  }

  // Fumes / Gas Evolution
  if (state.fumeColor) {
    ctx.fillStyle = state.fumeColor;
    ctx.beginPath();
    ctx.arc(bx + 90, by - 15, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  // Beaker Outline & Graduations
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

  // Render draggable burner icon if placed
  if (state.burner.active) {
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(state.burner.x, state.burner.y, 40, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.fillText('Burner', state.burner.x + 4, state.burner.y + 14);
  }
}

function drawOstwaldViscometer(now) {
  const c = parseFloat(state.visc.conc);
  const flowFactor = 1 + c * 1.5;

  if (state.visc.flowing) {
    const dt = (now - state.visc.lastTime) / 1000;
    state.visc.lastTime = now;
    if (state.visc.meniscusY >= 95 && state.visc.meniscusY <= 165) {
      state.visc.timer += dt;
    }
    state.visc.meniscusY += (dt * 4.0) / flowFactor;
    if (state.visc.meniscusY >= 172) {
      state.visc.flowing = false;
      const t = state.visc.timer.toFixed(2);
      if (c === 0) {
        state.visc.t0 = parseFloat(t);
        logMessage(`Pure solvent (water) flow time t₀ = ${t} s.`);
      } else {
        const nr = (t / state.visc.t0).toFixed(3);
        const nsp = (nr - 1).toFixed(3);
        logMessage(`PVA ${c}%: t = ${t} s | Rel Viscosity ηr = ${nr} | Spec Viscosity ηsp = ${nsp}`, true);
      }
    }
  }

  // Ostwald U-Tube Drawing
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.strokeRect(160, 60, 26, 170);
  ctx.beginPath(); ctx.arc(173, 255, 28, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(233, 285, 60, 0, Math.PI, false); ctx.stroke();
  ctx.strokeRect(285, 60, 16, 40);
  ctx.beginPath(); ctx.arc(293, 130, 24, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeRect(289, 154, 8, 130);

  // Liquid Column
  ctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
  const topY = state.visc.meniscusY;
  if (topY < 154) ctx.fillRect(287, topY, 12, 154 - topY);
  ctx.fillRect(290, 154, 6, 130);

  // Calibration Marks A & B
  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(270, 95); ctx.lineTo(316, 95); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(270, 165); ctx.lineTo(316, 165); ctx.stroke();

  ctx.fillStyle = '#f8fafc'; ctx.font = '12px monospace';
  ctx.fillText('UPPER MARK (A)[cite: 8]', 325, 99);
  ctx.fillText('LOWER MARK (B)[cite: 8]', 325, 169);
  ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 16px monospace';
  ctx.fillText(`Stopwatch: ${state.visc.timer.toFixed(2)} s`, 40, 45);
}

function drawNylonExperiment() {
  const bx = 190, by = 130, bw = 160, bh = 200;

  if (state.nylon.organicAdded) {
    ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
    ctx.fillRect(bx + 2, by + 100, bw - 4, 98);
    ctx.fillStyle = '#cbd5e1'; ctx.font = '11px sans-serif';
    ctx.fillText('Sebacoyl chloride in CCl₄[cite: 13, 14]', bx + 12, by + 150);
  }

  if (state.nylon.aqueousAdded) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.fillRect(bx + 2, by + 30, bw - 4, 70);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx + 2, by + 98, bw - 4, 4);
    ctx.fillText('HMDA (aq) + Interface[cite: 13, 14]', bx + 12, by + 65);
  }

  if (state.nylon.drawing && state.nylon.threadLength < 100) {
    state.nylon.threadLength += 0.5;
  }
  if (state.nylon.threadLength > 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(150, 45, 240, 10);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(270, by + 100); ctx.lineTo(270, 50); ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    const coilW = (state.nylon.threadLength / 100) * 90;
    ctx.fillRect(270 - coilW / 2, 41, coilW, 18);
    ctx.fillText('Nylon 6,10 Thread Rope[cite: 13, 14]', 175, 30);
  }

  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, bw, bh);
}

function drawTitrationCurve() {
  const ox = 70, oy = 320, w = 410, h = 260;
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ox, oy - h); ctx.lineTo(ox, oy); ctx.lineTo(ox + w, oy); ctx.stroke();

  ctx.fillStyle = '#cbd5e1'; ctx.font = '12px sans-serif';
  ctx.fillText('pH (0–14)', 15, oy - h / 2);
  ctx.fillText('Volume of NaOH Added (mL)[cite: 40, 41]', ox + 100, oy + 38);

  ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3;
  ctx.beginPath();
  state.titration.points.forEach((pt, idx) => {
    const px = ox + (pt.v / 40) * w;
    const py = oy - (pt.ph / 14) * h;
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  ctx.fillStyle = '#10b981';
  state.titration.points.forEach(pt => {
    const px = ox + (pt.v / 40) * w;
    const py = oy - (pt.ph / 14) * h;
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
  });
}

function drawExperimentSchematic(expId) {
  const exp = MITWPU_EXPERIMENTS.find(e => e.id === expId);
  ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 16px sans-serif';
  ctx.fillText(exp.title, 40, 70);
  ctx.fillStyle = '#cbd5e1'; ctx.font = '13px sans-serif';
  exp.steps.forEach((step, i) => {
    ctx.fillText(`${i + 1}. ${step}`, 40, 120 + i * 35);
  });
}

init();
