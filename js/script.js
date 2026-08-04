'use strict';

// ==========================================
// 1. ESTADO GLOBAL (STATE)
// ==========================================
const state = {
    stations: [],
    currentIndex: 0,
    isPlaying: false,
    isTuning: false,
    volume: 0.5,
    isMuted: false,
    timeout: null,
    isVisualizerInit: false
};

// ==========================================
// 2. ELEMENTOS DEL DOM Y AUDIO
// ==========================================
const dom = {
    audio: document.getElementById('audio-player'),
    staticAudio: new Audio('audio/estatica.mp3'),
    clickAudio: new Audio('audio/click.mp3'),
    toggleBtn: document.getElementById('toggle-btn'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    stationName: document.getElementById('station-name-top'),
    carousel: document.getElementById('carousel-container'),
    visualizerBars: document.querySelectorAll('.visualizer-bar'),
    themeSelector: document.getElementById('theme-selector'),
    // FIX: Corregido el nombre de la variable a volToggleBtn
    volToggleBtn: document.getElementById('volume-toggle-btn'), 
    volPopup: document.getElementById('volume-popup'),
    volSlider: document.getElementById('volume-slider'),
    muteBtn: document.getElementById('mute-btn'),
    volIconMain: document.getElementById('vol-icon-main'),
    volIconPopup: document.getElementById('vol-icon-popup'),
    styleTag: document.getElementById('dynamic-theme') || document.createElement('style')
};

dom.audio.loop = true;
dom.staticAudio.loop = true;
dom.audio.volume = state.volume;
dom.staticAudio.volume = 0;

if (!document.getElementById('dynamic-theme')) {
    dom.styleTag.id = 'dynamic-theme';
    document.head.appendChild(dom.styleTag);
}

let audioCtx, analyser, dataArray;

// ==========================================
// 3. CONFIGURACIÓN DE TEMAS
// ==========================================
const gameThemes = {
    'vc.json': { primary: '#ffabf3', secondary: '#00fbfb', bg: '#131313', surface: '#523F4C', footer: '#20201f' },
    'gta3.json': { primary: '#ffd700', secondary: '#9ca3af', bg: '#1a1f24', surface: '#2a3239', footer: '#11161b' },
    'gtasa.json': { primary: '#c5cee9', secondary: '#ffffff', bg: '#010000', surface: '#111111', footer: '#0a0a0a' },
    'vcs.json': { primary: '#14f0d8', secondary: '#f9fa99', bg: '#320049', surface: '#4a006e', footer: '#220033' },
    'gta4.json': { primary: '#d1d5db', secondary: '#8b8b83', bg: '#292524', surface: '#3e3835', footer: '#1f1c1a' },
    'gtav.json': { primary: '#5c9e31', secondary: '#ffffff', bg: '#0d0f0b', surface: '#1c2417', footer: '#0f140d' }
};

function applyVisualTheme(jsonFile) {
    const theme = gameThemes[jsonFile] || gameThemes['vc.json'];

    dom.styleTag.innerHTML = `
        :root {
            --theme-primary: ${theme.primary};
            --theme-secondary: ${theme.secondary};
            --theme-bg: ${theme.bg};
            --theme-surface: ${theme.surface};
            --theme-footer: ${theme.footer};
        }
        .text-primary { color: var(--theme-primary) !important; }
        .bg-primary { background-color: var(--theme-primary) !important; }
        .border-primary { border-color: var(--theme-primary) !important; }
        .text-secondary-container { color: var(--theme-secondary) !important; }
        .border-secondary-container { border-color: var(--theme-secondary) !important; }
        .bg-secondary-container { background-color: var(--theme-secondary) !important; }
        .bg-surface-dim { background-color: var(--theme-surface) !important; }
        .text-surface-dim { color: var(--theme-surface) !important; }
        .border-surface-variant { border-color: var(--theme-surface) !important; }
        .app-footer { background-color: var(--theme-footer) !important; border-top-color: var(--theme-primary) !important; }
        .interactive-btn { cursor: pointer; }
        .interactive-btn:hover { filter: brightness(1.2); }
        .power-on-btn { background-color: var(--theme-secondary) !important; color: var(--theme-surface) !important; border-color: var(--theme-secondary) !important; box-shadow: 0 0 20px var(--theme-secondary), inset 0 0 10px var(--theme-secondary) !important; }
        .power-off-btn { background-color: var(--theme-surface) !important; color: var(--theme-primary) !important; border-color: var(--theme-primary) !important; }
        .glow-neon { box-shadow: 0 0 15px var(--theme-primary), inset 0 0 5px var(--theme-primary) !important; }
        .glow-neon-cyan { box-shadow: 0 0 15px var(--theme-secondary), inset 0 0 5px var(--theme-secondary) !important; }
        .header-glow { filter: drop-shadow(0 0 10px var(--theme-primary)) !important; }
        .arrow-glow { filter: drop-shadow(0 0 8px var(--theme-primary)) !important; }
        .bg-background, body { background-color: var(--theme-bg) !important; }
        input[type=range][orient=vertical] { accent-color: var(--theme-secondary) !important; }
    `;
    
    if (!state.isPlaying) {
        dom.toggleBtn.className = "interactive-btn flex flex-col items-center justify-center -skew-x-3 p-1.5 md:p-3 min-w-[65px] md:min-w-[80px] text-xs md:text-base shadow-[4px_4px_0px_#000000] transition-all power-off-btn";
    }
}

// ==========================================
// 4. CONTROL DE VOLUMEN
// ==========================================
function updateVolumeIcons(vol) {
    const icon = (vol === 0 || state.isMuted) ? 'volume_off' : (vol < 0.5 ? 'volume_down' : 'volume_up');
    dom.volIconMain.innerText = icon;
    dom.volIconPopup.innerText = icon;
}

function applyVolume() {
    const effectiveVol = state.isMuted ? 0 : state.volume;
    dom.staticAudio.volume = state.isTuning ? (effectiveVol * 0.8) : 0;
    dom.audio.volume = effectiveVol; 
    updateVolumeIcons(effectiveVol);
}

function toggleVolumePopup(forceClose = false) {
    const isHidden = dom.volPopup.classList.contains('hidden');
    if (forceClose || !isHidden) {
        dom.volPopup.classList.add('hidden');
        dom.volPopup.classList.remove('flex');
    } else {
        dom.volPopup.classList.remove('hidden');
        dom.volPopup.classList.add('flex');
    }
}

// ==========================================
// 5. ECUALIZADOR (VISUALIZER) - ALTO RENDIMIENTO
// ==========================================
function initVisualizer() {
    if (state.isVisualizerInit) return;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    
    const source = audioCtx.createMediaElementSource(dom.audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    analyser.fftSize = 512; 
    analyser.smoothingTimeConstant = 0.8; 
    analyser.minDecibels = -85;
    analyser.maxDecibels = -15; 

    dataArray = new Uint8Array(analyser.frequencyBinCount);
    state.isVisualizerInit = true;
    
    renderFrame();
}

function renderFrame() {
    requestAnimationFrame(renderFrame);
    
    const barsCount = dom.visualizerBars.length; 

    if (!state.isPlaying || state.isTuning) {
        for (let i = 0; i < barsCount; i++) {
            dom.visualizerBars[i].style.height = '4%';
        }
        return;
    }

    analyser.getByteFrequencyData(dataArray);
    const dataLen = dataArray.length;

    for (let i = 0; i < barsCount; i++) {
        let binIndex = Math.floor(i * 1.4) + 1; 
        if (binIndex >= dataLen) binIndex = dataLen - 1;

        let value = dataArray[binIndex] || 0; 
        
        // Fallback MP3 para agudos recortados
        if (i > 20 && value < 15) {
            let fallbackBin = Math.floor(20 + ((i - 20) * 0.5));
            value = (dataArray[fallbackBin] || 0) * 0.7; 
        }

        let percent = (value / 255) * 100; 
        let boost = 0.75 + (i * 0.025); 
        percent *= boost; 
        
        if (percent < 4) percent = 4; 
        else if (percent > 100) percent = 100;
        
        dom.visualizerBars[i].style.height = percent + '%';
    }
}

// ==========================================
// 6. LÓGICA DE INTERFAZ Y REPRODUCTOR
// ==========================================
function updateUI(direction = 'none') {
    const fmContainer = document.querySelector('.fm-text-container');

    if (state.stations.length === 0) {
        dom.stationName.classList.add('tuning-mode');
        fmContainer.classList.add('tuning-mode');
        dom.stationName.innerHTML = `<span class="block md:inline mobile-break">NO SE ENCONTRARON</span> <span class="block md:inline mobile-break">ESTACIONES</span>`;
        dom.carousel.innerHTML = `
            <div class="scale-100 md:scale-110 z-10 relative opacity-60 filter grayscale transition-all duration-300">
                <div class="cover-active relative z-10 w-52 h-52 md:w-80 md:h-80 border-4 border-surface-variant bg-surface-dim -skew-x-3 flex items-center justify-center p-4 md:p-8 shadow-[8px_8px_0px_#000000] transition-colors duration-300">
                    <span class="text-surface-variant font-headline-md text-xl md:text-2xl text-center">PRÓXIMAMENTE</span>
                </div>
            </div>`;
        return;
    }

    const currentStation = state.stations[state.currentIndex];
    const total = state.stations.length;
    
    if (state.isPlaying && state.isTuning) {
        dom.stationName.classList.add('tuning-mode');
        fmContainer.classList.add('tuning-mode');
        dom.stationName.innerHTML = `<span class="block md:inline mobile-break">SINTONIZANDO...</span> <span class="block md:inline mobile-break">${currentStation.name}</span>`;
    } else if (state.isPlaying && !state.isTuning) {
        dom.stationName.classList.remove('tuning-mode');
        fmContainer.classList.remove('tuning-mode');
        dom.stationName.innerHTML = `<span class="block md:inline mobile-break">ESTÁS ESCUCHANDO:</span> <span class="block md:inline mobile-break">${currentStation.name}</span>`;
    } else {
        dom.stationName.classList.remove('tuning-mode');
        fmContainer.classList.remove('tuning-mode');
        dom.stationName.innerHTML = `<span class="block md:inline mobile-break">APAGADO:</span> <span class="block md:inline mobile-break">${currentStation.name}</span>`;
    }

    const prevIndex = (state.currentIndex - 1 + total) % total;
    const nextIndex = (state.currentIndex + 1) % total;

    let centralHTML = '';
    
    if (state.isPlaying && !state.isTuning) {
        centralHTML = `
        <div class="scale-100 md:scale-110 z-10 relative transition-all duration-300">
            <div class="arrow-glow absolute -left-4 md:-left-8 top-1/2 -translate-y-1/2 text-primary blink text-2xl md:text-3xl z-20">▶</div>
            <div class="arrow-glow absolute -right-4 md:-right-8 top-1/2 -translate-y-1/2 text-primary blink text-2xl md:text-3xl z-20">◀</div>
            <div class="cover-active relative z-10 w-52 h-52 md:w-80 md:h-80 border-4 border-primary bg-surface-dim -skew-x-3 flex items-center justify-center p-4 md:p-8 shadow-[8px_8px_0px_#000000] glow-neon transition-colors duration-300">
                <img src="${state.stations[state.currentIndex].logo}" class="w-full h-full object-contain drop-shadow-md">
            </div>
        </div>`;
    } else if (state.isPlaying && state.isTuning) {
        centralHTML = `
        <div class="scale-100 md:scale-110 z-10 relative transition-all duration-300">
            <div class="absolute -left-4 md:-left-8 top-1/2 -translate-y-1/2 text-white/40 animate-pulse text-2xl md:text-3xl z-20">▶</div>
            <div class="absolute -right-4 md:-right-8 top-1/2 -translate-y-1/2 text-white/40 animate-pulse text-2xl md:text-3xl z-20">◀</div>
            <div class="cover-active relative z-10 w-52 h-52 md:w-80 md:h-80 border-4 border-gray-400 bg-surface-dim -skew-x-3 flex items-center justify-center p-4 md:p-8 shadow-[8px_8px_0px_#000000] drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] grayscale animate-pulse transition-colors duration-300">
                <img src="${state.stations[state.currentIndex].logo}" class="w-full h-full object-contain drop-shadow-md opacity-60">
            </div>
        </div>`;
    } else {
        centralHTML = `
        <div class="scale-100 md:scale-110 z-10 relative opacity-60 filter grayscale transition-all duration-300">
            <div class="cover-active relative z-10 w-52 h-52 md:w-80 md:h-80 border-4 border-surface-variant bg-surface-dim -skew-x-3 flex items-center justify-center p-4 md:p-8 shadow-[8px_8px_0px_#000000] transition-colors duration-300">
                <img src="${state.stations[state.currentIndex].logo}" class="w-full h-full object-contain drop-shadow-md opacity-70">
            </div>
        </div>`;
    }

    dom.carousel.innerHTML = `
        <div class="opacity-40 scale-75 filter grayscale">
            <div class="cover-inactive w-40 h-40 md:w-64 md:h-64 border-4 border-surface-variant bg-surface-dim -skew-x-3 flex items-center justify-center p-3 md:p-6 shadow-[8px_8px_0px_#000000]">
                <img src="${state.stations[prevIndex].logo}" class="w-full h-full object-contain drop-shadow-md">
            </div>
        </div>
        ${centralHTML}
        <div class="opacity-40 scale-75 filter grayscale">
            <div class="cover-inactive w-40 h-40 md:w-64 md:h-64 border-4 border-surface-variant bg-surface-dim -skew-x-3 flex items-center justify-center p-3 md:p-6 shadow-[8px_8px_0px_#000000]">
                <img src="${state.stations[nextIndex].logo}" class="w-full h-full object-contain drop-shadow-md">
            </div>
        </div>
    `;

    dom.carousel.classList.remove('slide-next', 'slide-prev');
    void dom.carousel.offsetWidth; 
    if (direction !== 'none') {
        dom.carousel.classList.add(`slide-${direction}`);
    }
}

function playRadio() {
    if (!state.isPlaying) return; 
    clearTimeout(state.timeout);

    state.isTuning = true;
    applyVolume(); 
    
    dom.audio.pause();
    
    if (dom.staticAudio.paused) {
        dom.staticAudio.play().catch(e => console.log("Auto-play bloqueado:", e));
    }

    state.timeout = setTimeout(() => {
        if (!state.isPlaying) return; 

        const station = state.stations[state.currentIndex];
        dom.audio.src = station.url;
        dom.audio.volume = 0; 

        dom.audio.onloadedmetadata = () => {
            const now = Math.floor(Date.now() / 1000);
            dom.audio.currentTime = now % station.duration;
            dom.audio.play().catch(e => console.error("Error al reproducir:", e));
        };
    }, 800); 
}

function togglePower() {
    if (state.stations.length === 0) return; 

    initVisualizer();
    state.isPlaying = !state.isPlaying;

    if (state.isPlaying) {
        state.isTuning = true; 
        dom.toggleBtn.className = "interactive-btn flex flex-col items-center justify-center -skew-x-3 p-1.5 md:p-3 min-w-[65px] md:min-w-[80px] text-xs md:text-base shadow-[4px_4px_0px_#000000] transition-all power-on-btn";
        
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        updateUI('none');
        playRadio();
    } else {
        state.isTuning = false;
        dom.toggleBtn.className = "interactive-btn flex flex-col items-center justify-center -skew-x-3 p-1.5 md:p-3 min-w-[65px] md:min-w-[80px] text-xs md:text-base shadow-[4px_4px_0px_#000000] transition-all power-off-btn";
        clearTimeout(state.timeout);
        dom.audio.pause();
        dom.audio.src = ""; 
        dom.staticAudio.pause();
        updateUI('none');
    }
}

function changeStation(direction) {
    if (state.stations.length === 0) return;

    dom.clickAudio.currentTime = 0; 
    dom.clickAudio.play().catch(e => console.log("Sonido bloqueado", e));

    const total = state.stations.length;
    state.currentIndex = direction === 'next' 
        ? (state.currentIndex + 1) % total 
        : (state.currentIndex - 1 + total) % total;
    
    if (state.isPlaying) state.isTuning = true; 
    
    updateUI(direction); 
    if (state.isPlaying) playRadio(); 
}

async function loadStations(jsonFile) {
    try {
        applyVisualTheme(jsonFile);
        const response = await fetch(`data/${jsonFile}`);
        if (!response.ok) throw new Error(`Archivo no existe o falla en red.`);
        
        const fetchedData = await response.json();
        if (fetchedData.length === 0) throw new Error(`El archivo JSON está vacío.`);

        state.stations = fetchedData;
        state.currentIndex = 0;
        
        if (state.isPlaying) {
            state.isTuning = true; 
            updateUI('none');
            playRadio();
        } else {
            updateUI('none');
        }

    } catch (error) {
        console.warn(`Aviso: ${jsonFile} no cargó. Detalle:`, error);
        if (state.isPlaying) {
            state.isPlaying = false;
            state.isTuning = false;
            dom.toggleBtn.className = "interactive-btn flex flex-col items-center justify-center -skew-x-3 p-1.5 md:p-3 min-w-[65px] md:min-w-[80px] text-xs md:text-base shadow-[4px_4px_0px_#000000] transition-all power-off-btn";
            clearTimeout(state.timeout);
            dom.audio.pause();
            dom.audio.src = ""; 
            dom.staticAudio.pause();
        }
        state.stations = [];
        updateUI('none');
    }
}

// ==========================================
// 7. LISTENERS DE EVENTOS
// ==========================================
dom.audio.addEventListener('playing', () => {
    state.isTuning = false;
    dom.staticAudio.pause();
    dom.staticAudio.volume = 0; 
    applyVolume();
    updateUI('none');
});

dom.volToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleVolumePopup(); });
dom.volPopup.addEventListener('click', (e) => e.stopPropagation());
document.addEventListener('click', (e) => {
    if (!dom.volPopup.contains(e.target) && !dom.volToggleBtn.contains(e.target)) toggleVolumePopup(true);
});

dom.volSlider.addEventListener('input', (e) => {
    state.volume = parseFloat(e.target.value);
    if (state.volume > 0) state.isMuted = false;
    applyVolume();
});

dom.muteBtn.addEventListener('click', () => {
    state.isMuted = !state.isMuted;
    dom.volSlider.value = state.isMuted ? 0 : (state.volume === 0 ? 0.5 : state.volume);
    state.volume = parseFloat(dom.volSlider.value);
    applyVolume();
});

dom.themeSelector.addEventListener('change', (e) => loadStations(e.target.value));
dom.toggleBtn.addEventListener('click', togglePower);
dom.nextBtn.addEventListener('click', () => changeStation('next'));
dom.prevBtn.addEventListener('click', () => changeStation('prev'));

// Inicialización de arranque
loadStations(dom.themeSelector.value);