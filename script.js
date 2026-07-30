let stations = []; 

const audioPlayer = document.getElementById('audio-player');
const staticAudio = new Audio('estatica.mp3'); 
staticAudio.loop = true; 

const toggleBtn = document.getElementById('toggle-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const stationNameTop = document.getElementById('station-name-top');
const volumeSlider = document.getElementById('volume-slider');
const carouselContainer = document.getElementById('carousel-container');
const visualizerBars = document.querySelectorAll('.visualizer-bar');
const themeSelector = document.getElementById('theme-selector');

const volumeContainer = document.getElementById('volume-container');
const volumePopup = document.getElementById('volume-popup');

let currentStationIndex = 0;
let isPlaying = false;
let radioTimeout; 

let audioCtx;
let analyser;
let dataArray;
let isVisualizerInitialized = false;

const gameThemes = {
    'vc.json': { 
        primary: '#ffabf3',    
        secondary: '#00fbfb',  
        bg: '#131313' 
    },
    'gta3.json': { 
        primary: '#ffd700',    
        secondary: '#9ca3af',  
        bg: '#1a1f24' 
    },
    'gta4.json': { 
        primary: '#d1d5db',    
        secondary: '#8b8b83',  
        bg: '#292524' 
    }
};

function applyVisualTheme(jsonFile) {
    const colors = gameThemes[jsonFile] || gameThemes['vc.json'];
    let styleTag = document.getElementById('dynamic-theme');
    
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-theme';
        document.head.appendChild(styleTag);
    }
    
    styleTag.innerHTML = `
        .text-primary { color: ${colors.primary} !important; }
        .bg-primary { background-color: ${colors.primary} !important; }
        .border-primary { border-color: ${colors.primary} !important; }
        
        .text-secondary-container { color: ${colors.secondary} !important; }
        .border-secondary-container { border-color: ${colors.secondary} !important; }
        .bg-secondary-container { background-color: ${colors.secondary} !important; }
        
        .glow-neon { box-shadow: 0 0 20px ${colors.primary}, inset 0 0 10px ${colors.primary} !important; }
        .glow-neon-cyan { box-shadow: 0 0 20px ${colors.secondary}, inset 0 0 10px ${colors.secondary} !important; }
        
        .header-glow { filter: drop-shadow(0 0 10px ${colors.primary}) !important; }
        .arrow-glow { filter: drop-shadow(0 0 8px ${colors.primary}) !important; }
        
        .bg-background, body { background-color: ${colors.bg} !important; }
        
        input[type=range][orient=vertical] { accent-color: ${colors.secondary} !important; }
    `;
}

// ==========================================
// ECUALIZADOR (Alta Resolución)
// ==========================================
function initVisualizer() {
    if (isVisualizerInitialized) return;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    
    const source = audioCtx.createMediaElementSource(audioPlayer);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    // Aumentamos de 64 a 128 para capturar más detalles de la música
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

    // Repartimos las frecuencias bajas y medias entre nuestras 17 barras
    // dataArray.length es 64. Usamos un paso que distribuya esto dinámicamente.
    let step = Math.floor((dataArray.length * 0.7) / visualizerBars.length); 

    for (let i = 0; i < visualizerBars.length; i++) {
        let value = dataArray[i * step]; 
        let percent = (value / 255) * 100;
        if (percent < 10) percent = 10; 
        
        visualizerBars[i].style.height = percent + '%';
    }
}

function updateUI(direction = 'none') {
    if (stations.length === 0) return; 

    const currentStation = stations[currentStationIndex];
    
    if (isPlaying) {
        stationNameTop.innerText = "ESTAS ESCUCHANDO: " + currentStation.name;
    } else {
        stationNameTop.innerText = "APAGADO: " + currentStation.name;
    }

    const prevIndex = (currentStationIndex - 1 + stations.length) % stations.length;
    const nextIndex = (currentStationIndex + 1) % stations.length;

    let centralStationHTML = '';
    
    if (isPlaying) {
        centralStationHTML = `
        <div class="scale-100 md:scale-110 z-10 relative transition-all duration-300">
            <div class="arrow-glow absolute -left-4 md:-left-8 top-1/2 -translate-y-1/2 text-primary blink text-2xl md:text-3xl z-20">▶</div>
            <div class="arrow-glow absolute -right-4 md:-right-8 top-1/2 -translate-y-1/2 text-primary blink text-2xl md:text-3xl z-20">◀</div>
            <div class="cover-active relative z-10 w-52 h-52 md:w-80 md:h-80 border-4 border-primary bg-surface-dim -skew-x-3 flex items-center justify-center p-4 md:p-8 shadow-[8px_8px_0px_#000000] glow-neon transition-colors duration-300">
                <img src="${stations[currentStationIndex].logo}" class="w-full h-full object-contain drop-shadow-md">
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

audioPlayer.addEventListener('playing', () => {
    staticAudio.volume = 0; 
    audioPlayer.volume = volumeSlider.value;
});

function playRadio() {
    if (!isPlaying) return; 
    clearTimeout(radioTimeout);

    staticAudio.volume = volumeSlider.value * 0.8;
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

    updateUI('none');
    
    if (isPlaying) {
        toggleBtn.className = "flex flex-col items-center justify-center bg-secondary-container text-surface-dim -skew-x-3 p-1.5 md:p-3 min-w-[65px] md:min-w-[80px] text-xs md:text-base shadow-[4px_4px_0px_#000000] border-2 border-secondary-container transition-colors glow-neon-cyan";
        
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        playRadio();
    } else {
        toggleBtn.className = "flex flex-col items-center justify-center text-secondary border-2 border-secondary bg-surface-dim -skew-x-3 p-1.5 md:p-3 min-w-[65px] md:min-w-[80px] text-xs md:text-base shadow-[4px_4px_0px_#000000] hover:bg-secondary hover:text-black transition-colors";
        clearTimeout(radioTimeout);
        audioPlayer.pause();
        audioPlayer.src = ""; 
        staticAudio.pause();
    }
}

function changeStation(direction) {
    if (stations.length === 0) return;

    if (direction === 'next') {
        currentStationIndex = (currentStationIndex + 1) % stations.length;
    } else {
        currentStationIndex = (currentStationIndex - 1 + stations.length) % stations.length;
    }
    
    updateUI(direction); 
    if (isPlaying) playRadio(); 
}

let volumeTimeout;

volumeContainer.addEventListener('mouseenter', () => {
    clearTimeout(volumeTimeout);
    volumePopup.classList.remove('hidden');
    volumePopup.classList.add('flex');
});

volumeContainer.addEventListener('mouseleave', () => {
    volumeTimeout = setTimeout(() => {
        volumePopup.classList.remove('flex');
        volumePopup.classList.add('hidden');
    }, 300);
});

volumeContainer.addEventListener('click', (e) => {
    if (e.target === volumeSlider) return;
    
    if (volumePopup.classList.contains('hidden')) {
        volumePopup.classList.remove('hidden');
        volumePopup.classList.add('flex');
    } else {
        volumePopup.classList.remove('flex');
        volumePopup.classList.add('hidden');
    }
});

volumeSlider.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value);
    if (staticAudio.volume > 0) {
        staticAudio.volume = vol * 0.8;
    } else {
        audioPlayer.volume = vol;
    }
});

async function loadStations(jsonFile) {
    try {
        if (isPlaying) {
            togglePower();
        }

        stationNameTop.innerText = "SINTONIZANDO...";

        applyVisualTheme(jsonFile);

        const response = await fetch(jsonFile);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        stations = await response.json();
        
        currentStationIndex = 0;
        updateUI('none');

    } catch (error) {
        console.error(`Error al cargar ${jsonFile}:`, error);
        stationNameTop.innerText = "ERROR DE SEÑAL";
    }
}

themeSelector.addEventListener('change', (e) => {
    loadStations(e.target.value);
});

toggleBtn.addEventListener('click', togglePower);
nextBtn.addEventListener('click', () => changeStation('next'));
prevBtn.addEventListener('click', () => changeStation('prev'));
audioPlayer.volume = volumeSlider.value;

loadStations(themeSelector.value);