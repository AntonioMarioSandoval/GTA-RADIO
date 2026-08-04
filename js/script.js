let stations = []; 

const audioPlayer = document.getElementById('audio-player');
audioPlayer.loop = true; 

// Audios globales
const staticAudio = new Audio('audio/estatica.mp3'); 
staticAudio.loop = true; 
const clickAudio = new Audio('audio/click.mp3'); 

const toggleBtn = document.getElementById('toggle-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const stationNameTop = document.getElementById('station-name-top');
const carouselContainer = document.getElementById('carousel-container');
const visualizerBars = document.querySelectorAll('.visualizer-bar');
const themeSelector = document.getElementById('theme-selector');

// Elementos del Volumen
const volToggleBtn = document.getElementById('volume-toggle-btn');
const volPopup = document.getElementById('volume-popup');
const volSlider = document.getElementById('volume-slider');
const muteBtn = document.getElementById('mute-btn');
const volIconMain = document.getElementById('vol-icon-main');
const volIconPopup = document.getElementById('vol-icon-popup');

let currentStationIndex = 0;
let isPlaying = false;
let isTuning = false; 
let radioTimeout; 

let audioCtx;
let analyser;
let dataArray;
let isVisualizerInitialized = false;

// Estado del Volumen
let currentVolume = 0.5;
let isMuted = false;

audioPlayer.volume = currentVolume;
staticAudio.volume = 0;

// ==========================================
// CONFIGURACIÓN DE TEMAS POR JUEGO
// ==========================================
const gameThemes = {
    'vc.json': { 
        primary: '#ffabf3',    
        secondary: '#00fbfb',  
        bg: '#131313',
        surface: '#523F4C',
        footer: '#20201f'
    },
    'gta3.json': { 
        primary: '#ffd700',    
        secondary: '#9ca3af',  
        bg: '#1a1f24',
        surface: '#2a3239',
        footer: '#11161b'
    },
    'gtasa.json': {
        primary: '#c5cee9',    
        secondary: '#ffffff',  
        bg: '#010000',
        surface: '#111111',
        footer: '#0a0a0a'
    },
    'vcs.json': {
        primary: '#14f0d8',    
        secondary: '#f9fa99',  
        bg: '#320049',
        surface: '#4a006e',
        footer: '#220033'
    },
    'gta4.json': { 
        primary: '#d1d5db',    
        secondary: '#8b8b83',  
        bg: '#292524',
        surface: '#3e3835',
        footer: '#1f1c1a'
    },
    'gtav.json': { 
        primary: '#5c9e31',    
        secondary: '#ffffff',  
        bg: '#0d0f0b',
        surface: '#1c2417',
        footer: '#0f140d'
    }
};

function applyVisualTheme(jsonFile) {
    const theme = gameThemes[jsonFile] || gameThemes['vc.json'];

    let styleTag = document.getElementById('dynamic-theme');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-theme';
        document.head.appendChild(styleTag);
    }
    
    styleTag.innerHTML = `
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

        .app-footer { 
            background-color: var(--theme-footer) !important; 
            border-top-color: var(--theme-primary) !important; 
        }
        
        .interactive-btn { cursor: pointer; }
        .interactive-btn:hover { filter: brightness(1.2); }
        
        .power-on-btn { 
            background-color: var(--theme-secondary) !important; 
            color: var(--theme-surface) !important; 
            border-color: var(--theme-secondary) !important; 
            box-shadow: 0 0 20px var(--theme-secondary), inset 0 0 10px var(--theme-secondary) !important; 
        }
        .power-off-btn { 
            background-color: var(--theme-surface) !important; 
            color: var(--theme-primary) !important; 
            border-color: var(--theme-primary) !important; 
        }

        .glow-neon { box-shadow: 0 0 20px var(--theme-primary), inset 0 0 10px var(--theme-primary) !important; }
        .glow-neon-cyan { box-shadow: 0 0 20px var(--theme-secondary), inset 0 0 10px var(--theme-secondary) !important; }
        
        .header-glow { filter: drop-shadow(0 0 10px var(--theme-primary)) !important; }
        .arrow-glow { filter: drop-shadow(0 0 8px var(--theme-primary)) !important; }
        
        .bg-background, body { background-color: var(--theme-bg) !important; }
        
        input[type=range][orient=vertical] { accent-color: var(--theme-secondary) !important; }
    `;
    
    if (!isPlaying) {
        toggleBtn.className = "interactive-btn flex flex-col items-center justify-center -skew-x-3 p-1.5 md:p-3 min-w-[65px] md:min-w-[80px] text-xs md:text-base shadow-[4px_4px_0px_#000000] transition-all power-off-btn";
    }
}

// ==========================================
// CONTROL DE VOLUMEN Y MUTE
// ==========================================
function updateVolumeIcons(vol) {
    if (vol === 0 || isMuted) {
        volIconMain.innerText = 'volume_off';
        volIconPopup.innerText = 'volume_off';
    } else if (vol < 0.5) {
        volIconMain.innerText = 'volume_down';
        volIconPopup.innerText = 'volume_down';
    } else {
        volIconMain.innerText = 'volume_up';
        volIconPopup.innerText = 'volume_up';
    }
}

function applyVolume() {
    const effectiveVol = isMuted ? 0 : currentVolume;
    
    // FIX ESTÁTICA: Si está sintonizando, aplicamos volumen a la estática. Si no, forzamos cero.
    if (isTuning) {
        staticAudio.volume = effectiveVol * 0.8;
    } else {
        staticAudio.volume = 0;
    }
    
    audioPlayer.volume = effectiveVol; 
    updateVolumeIcons(effectiveVol);
}

// Abrir/Cerrar menú flotante (Click)
volToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (volPopup.classList.contains('hidden')) {
        volPopup.classList.remove('hidden');
        volPopup.classList.add('flex');
    } else {
        volPopup.classList.add('hidden');
        volPopup.classList.remove('flex');
    }
});

// Cerrar si haces clic afuera
document.addEventListener('click', (e) => {
    if (!volPopup.contains(e.target) && !volToggleBtn.contains(e.target)) {
        volPopup.classList.add('hidden');
        volPopup.classList.remove('flex');
    }
});

volPopup.addEventListener('click', (e) => {
    e.stopPropagation();
});

volSlider.addEventListener('input', (e) => {
    currentVolume = parseFloat(e.target.value);
    if (currentVolume > 0) {
        isMuted = false;
    }
    applyVolume();
});

muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    if (isMuted) {
        volSlider.value = 0;
    } else {
        volSlider.value = currentVolume === 0 ? 0.5 : currentVolume;
        currentVolume = parseFloat(volSlider.value);
    }
    applyVolume();
});


// ==========================================
// ECUALIZADOR
// ==========================================
function initVisualizer() {
    if (isVisualizerInitialized) return;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    
    const source = audioCtx.createMediaElementSource(audioPlayer);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    analyser.fftSize = 128; 
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    isVisualizerInitialized = true;
    renderFrame();
}

function renderFrame() {
    requestAnimationFrame(renderFrame);
    
    if (!isPlaying || staticAudio.volume > 0) {
        visualizerBars.forEach(bar => bar.style.height = '10%');
        return;
    }

    analyser.getByteFrequencyData(dataArray);
    let step = Math.floor((dataArray.length * 0.7) / visualizerBars.length); 

    for (let i = 0; i < visualizerBars.length; i++) {
        let value = dataArray[i * step]; 
        let percent = (value / 255) * 100;
        if (percent < 10) percent = 10; 
        
        visualizerBars[i].style.height = percent + '%';
    }
}

function updateUI(direction = 'none') {
    const fmTextContainer = document.querySelector('.fm-text-container');

    if (stations.length === 0) {
        stationNameTop.classList.add('tuning-mode');
        fmTextContainer.classList.add('tuning-mode');
        stationNameTop.innerHTML = `<span class="block md:inline mobile-break">NO SE ENCONTRARON</span> <span class="block md:inline mobile-break">ESTACIONES</span>`;
        
        carouselContainer.innerHTML = `
            <div class="scale-100 md:scale-110 z-10 relative opacity-60 filter grayscale transition-all duration-300">
                <div class="cover-active relative z-10 w-52 h-52 md:w-80 md:h-80 border-4 border-surface-variant bg-surface-dim -skew-x-3 flex items-center justify-center p-4 md:p-8 shadow-[8px_8px_0px_#000000] transition-colors duration-300">
                    <span class="text-surface-variant font-headline-md text-xl md:text-2xl text-center">PRÓXIMAMENTE</span>
                </div>
            </div>
        `;
        return;
    }

    const currentStation = stations[currentStationIndex];
    
    if (isPlaying && isTuning) {
        stationNameTop.classList.add('tuning-mode');
        fmTextContainer.classList.add('tuning-mode');
        stationNameTop.innerHTML = `<span class="block md:inline mobile-break">SINTONIZANDO...</span> <span class="block md:inline mobile-break">${currentStation.name}</span>`;
    } else if (isPlaying && !isTuning) {
        stationNameTop.classList.remove('tuning-mode');
        fmTextContainer.classList.remove('tuning-mode');
        stationNameTop.innerHTML = `<span class="block md:inline mobile-break">ESTÁS ESCUCHANDO:</span> <span class="block md:inline mobile-break">${currentStation.name}</span>`;
    } else {
        stationNameTop.classList.remove('tuning-mode');
        fmTextContainer.classList.remove('tuning-mode');
        stationNameTop.innerHTML = `<span class="block md:inline mobile-break">APAGADO:</span> <span class="block md:inline mobile-break">${currentStation.name}</span>`;
    }

    const prevIndex = (currentStationIndex - 1 + stations.length) % stations.length;
    const nextIndex = (currentStationIndex + 1) % stations.length;

    let centralStationHTML = '';
    
    if (isPlaying && !isTuning) {
        centralStationHTML = `
        <div class="scale-100 md:scale-110 z-10 relative transition-all duration-300">
            <div class="arrow-glow absolute -left-4 md:-left-8 top-1/2 -translate-y-1/2 text-primary blink text-2xl md:text-3xl z-20">▶</div>
            <div class="arrow-glow absolute -right-4 md:-right-8 top-1/2 -translate-y-1/2 text-primary blink text-2xl md:text-3xl z-20">◀</div>
            <div class="cover-active relative z-10 w-52 h-52 md:w-80 md:h-80 border-4 border-primary bg-surface-dim -skew-x-3 flex items-center justify-center p-4 md:p-8 shadow-[8px_8px_0px_#000000] glow-neon transition-colors duration-300">
                <img src="${stations[currentStationIndex].logo}" class="w-full h-full object-contain drop-shadow-md">
            </div>
        </div>
        `;
    } else if (isPlaying && isTuning) {
        centralStationHTML = `
        <div class="scale-100 md:scale-110 z-10 relative transition-all duration-300">
            <div class="absolute -left-4 md:-left-8 top-1/2 -translate-y-1/2 text-white/40 animate-pulse text-2xl md:text-3xl z-20">▶</div>
            <div class="absolute -right-4 md:-right-8 top-1/2 -translate-y-1/2 text-white/40 animate-pulse text-2xl md:text-3xl z-20">◀</div>
            <div class="cover-active relative z-10 w-52 h-52 md:w-80 md:h-80 border-4 border-gray-400 bg-surface-dim -skew-x-3 flex items-center justify-center p-4 md:p-8 shadow-[8px_8px_0px_#000000] drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] grayscale animate-pulse transition-colors duration-300">
                <img src="${stations[currentStationIndex].logo}" class="w-full h-full object-contain drop-shadow-md opacity-60">
            </div>
        </div>
        `;
    } else {
        centralStationHTML = `
        <div class="scale-100 md:scale-110 z-10 relative opacity-60 filter grayscale transition-all duration-300">
            <div class="cover-active relative z-10 w-52 h-52 md:w-80 md:h-80 border-4 border-surface-variant bg-surface-dim -skew-x-3 flex items-center justify-center p-4 md:p-8 shadow-[8px_8px_0px_#000000] transition-colors duration-300">
                <img src="${stations[currentStationIndex].logo}" class="w-full h-full object-contain drop-shadow-md opacity-70">
            </div>
        </div>
        `;
    }

    carouselContainer.innerHTML = `
        <div class="opacity-40 scale-75 filter grayscale">
            <div class="cover-inactive w-40 h-40 md:w-64 md:h-64 border-4 border-surface-variant bg-surface-dim -skew-x-3 flex items-center justify-center p-3 md:p-6 shadow-[8px_8px_0px_#000000]">
                <img src="${stations[prevIndex].logo}" class="w-full h-full object-contain drop-shadow-md">
            </div>
        </div>
        
        ${centralStationHTML}

        <div class="opacity-40 scale-75 filter grayscale">
            <div class="cover-inactive w-40 h-40 md:w-64 md:h-64 border-4 border-surface-variant bg-surface-dim -skew-x-3 flex items-center justify-center p-3 md:p-6 shadow-[8px_8px_0px_#000000]">
                <img src="${stations[nextIndex].logo}" class="w-full h-full object-contain drop-shadow-md">
            </div>
        </div>
    `;

    carouselContainer.classList.remove('slide-next', 'slide-prev');
    void carouselContainer.offsetWidth; 
    
    if (direction === 'next') {
        carouselContainer.classList.add('slide-next');
    } else if (direction === 'prev') {
        carouselContainer.classList.add('slide-prev');
    }
}

// FIX ESTÁTICA: Modificamos el listener 'playing'
audioPlayer.addEventListener('playing', () => {
    // 1. Declaramos que ya no está buscando señal ANTES de aplicar el volumen
    isTuning = false;
    
    // 2. Apagamos la estática por completo para ahorrar rendimiento
    staticAudio.pause();
    
    // 3. Aplicamos el volumen correcto (applyVolume detectará isTuning = false y dejará estática en 0)
    applyVolume();
    
    // 4. Actualizamos la interfaz
    updateUI('none');
});

function playRadio() {
    if (!isPlaying) return; 
    clearTimeout(radioTimeout);

    isTuning = true;
    applyVolume(); // Activa la estática según el volumen actual
    
    audioPlayer.pause();
    
    if (staticAudio.paused) {
        staticAudio.play().catch(e => console.log("Auto-play bloqueado:", e));
    }

    radioTimeout = setTimeout(() => {
        if (!isPlaying) return; 

        const station = stations[currentStationIndex];
        
        audioPlayer.src = station.url;
        audioPlayer.volume = 0; 

        audioPlayer.onloadedmetadata = () => {
            const now = Math.floor(Date.now() / 1000);
            const currentSecond = now % station.duration;
            audioPlayer.currentTime = currentSecond;
            audioPlayer.play().catch(error => console.error("Error al reproducir:", error));
        };

    }, 800); 
}

function togglePower() {
    if (stations.length === 0) return; 

    initVisualizer();
    isPlaying = !isPlaying;

    if (isPlaying) {
        isTuning = true; 
        toggleBtn.className = "interactive-btn flex flex-col items-center justify-center -skew-x-3 p-1.5 md:p-3 min-w-[65px] md:min-w-[80px] text-xs md:text-base shadow-[4px_4px_0px_#000000] transition-all power-on-btn";
        
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        updateUI('none');
        playRadio();
    } else {
        isTuning = false;
        toggleBtn.className = "interactive-btn flex flex-col items-center justify-center -skew-x-3 p-1.5 md:p-3 min-w-[65px] md:min-w-[80px] text-xs md:text-base shadow-[4px_4px_0px_#000000] transition-all power-off-btn";
        clearTimeout(radioTimeout);
        audioPlayer.pause();
        audioPlayer.src = ""; 
        staticAudio.pause();
        updateUI('none');
    }
}

function changeStation(direction) {
    if (stations.length === 0) return;

    clickAudio.currentTime = 0; 
    clickAudio.play().catch(e => console.log("Sonido bloqueado", e));

    if (direction === 'next') {
        currentStationIndex = (currentStationIndex + 1) % stations.length;
    } else {
        currentStationIndex = (currentStationIndex - 1 + stations.length) % stations.length;
    }
    
    if (isPlaying) {
        isTuning = true; 
    }
    
    updateUI(direction); 
    if (isPlaying) playRadio(); 
}

async function loadStations(jsonFile) {
    try {
        applyVisualTheme(jsonFile);

        const response = await fetch('data/' + jsonFile);
        
        if (!response.ok) {
            throw new Error(`Archivo no existe o falla en red.`);
        }
        
        const fetchedData = await response.json();
        
        if (fetchedData.length === 0) {
            throw new Error(`El archivo JSON está vacío.`);
        }

        stations = fetchedData;
        currentStationIndex = 0;
        
        if (isPlaying) {
            isTuning = true; 
            updateUI('none');
            playRadio();
        } else {
            updateUI('none');
        }

    } catch (error) {
        console.warn(`Aviso: ${jsonFile} no tiene estaciones cargadas o no existe aún.`);
        
        if (isPlaying) {
            isPlaying = false;
            isTuning = false; // Nos aseguramos de apagar el tuning si hay error
            toggleBtn.className = "interactive-btn flex flex-col items-center justify-center -skew-x-3 p-1.5 md:p-3 min-w-[65px] md:min-w-[80px] text-xs md:text-base shadow-[4px_4px_0px_#000000] transition-all power-off-btn";
            clearTimeout(radioTimeout);
            audioPlayer.pause();
            audioPlayer.src = ""; 
            staticAudio.pause();
        }
        
        stations = [];
        updateUI('none');
    }
}

themeSelector.addEventListener('change', (e) => {
    loadStations(e.target.value);
});

toggleBtn.addEventListener('click', togglePower);
nextBtn.addEventListener('click', () => changeStation('next'));
prevBtn.addEventListener('click', () => changeStation('prev'));

loadStations(themeSelector.value);