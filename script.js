const stations = [
    {
        name: "EMOTION 98.3",
        url: "https://archive.org/download/gtavc_radiofull/EMOTION.mp3",
        duration: 372,
        logo: "https://static.wikia.nocookie.net/esgta/images/e/e7/Emotion_98.3.png/revision/latest/scale-to-width-down/170?cb=20130701212121" 
    },
    {
        name: "Espantoso",
        url: "https://archive.org/download/gtavc_radiofull/ESPANT.mp3",
        duration: 425,
        logo: "https://static.wikia.nocookie.net/esgta/images/a/a8/Espantoso.png/revision/latest/scale-to-width-down/170?cb=20130524193454" 
    },
    {
        name: "Fever 105",
        url: "https://archive.org/download/gtavc_radiofull/FEVER.mp3",
        duration: 344,
        logo: "https://static.wikia.nocookie.net/esgta/images/1/14/Fever_105.png/revision/latest/scale-to-width-down/170?cb=20130701202821" 
    },
    {
        name: "FLASH FM",
        url: "https://archive.org/download/gtavc_radiofull/FLASH.mp3",
        duration: 372,
        logo: "https://static.wikia.nocookie.net/esgta/images/9/90/Flash_FM.png/revision/latest/scale-to-width-down/170?cb=20130701201401" 
    },
    {
        name: "KCHAT",
        url: "https://archive.org/download/gtavc_radiofull/KCHAT.mp3",
        duration: 425,
        logo: "https://static.wikia.nocookie.net/esgta/images/9/90/KCHAT.png/revision/latest/scale-to-width-down/150?cb=20230514095832" 
    },
    {
        name: "VCPR",
        url: "https://archive.org/download/gtavc_radiofull/VCPR.mp3",
        duration: 344,
        logo: "https://static.wikia.nocookie.net/esgta/images/7/79/VCPRLogoVC.PNG/revision/latest/scale-to-width-down/150?cb=20150824195147" 
    },
    {
        name: "VROCK",
        url: "https://archive.org/download/gtavc_radiofull/VROCK.mp3",
        duration: 372,
        logo: "https://static.wikia.nocookie.net/esgta/images/5/56/V-Rock.png/revision/latest/scale-to-width-down/150?cb=20240901223829" 
    },
    {
        name: "WAVE 103",
        url: "https://archive.org/download/gtavc_radiofull/WAVE.mp3",
        duration: 425,
        logo: "https://static.wikia.nocookie.net/esgta/images/2/24/Wave_103.png/revision/latest/scale-to-width-down/170?cb=20130627225002" 
    },
    {
        name: "Wildstyle",
        url: "https://archive.org/download/gtavc_radiofull/WILD.mp3",
        duration: 344,
        logo: "https://static.wikia.nocookie.net/esgta/images/2/24/Wave_103.png/revision/latest/scale-to-width-down/170?cb=20130627225002" 
    }
];

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

let currentStationIndex = 0;
let isPlaying = false;
let radioTimeout; 

let audioCtx;
let analyser;
let dataArray;
let isVisualizerInitialized = false;

function initVisualizer() {
    if (isVisualizerInitialized) return;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    
    const source = audioCtx.createMediaElementSource(audioPlayer);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    analyser.fftSize = 64; 
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

    for (let i = 0; i < visualizerBars.length; i++) {
        let value = dataArray[i * 4]; 
        let percent = (value / 255) * 100;
        if (percent < 10) percent = 10; 
        
        visualizerBars[i].style.height = percent + '%';
    }
}

function updateUI(direction = 'none') {
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
            <div class="absolute -left-4 md:-left-8 top-1/2 -translate-y-1/2 text-primary blink text-2xl md:text-3xl drop-shadow-[0_0_8px_rgba(255,171,243,1)]">▶</div>
            <div class="absolute -right-4 md:-right-8 top-1/2 -translate-y-1/2 text-primary blink text-2xl md:text-3xl drop-shadow-[0_0_8px_rgba(255,171,243,1)]">◀</div>
            <div class="w-52 h-52 md:w-80 md:h-80 border-4 border-primary bg-surface-dim -skew-x-3 flex items-center justify-center p-4 md:p-8 shadow-[8px_8px_0px_#000000] glow-neon transition-colors duration-300">
                <img src="${stations[currentStationIndex].logo}" class="w-full h-full object-contain drop-shadow-md">
            </div>
        </div>
        `;
    } else {
        centralStationHTML = `
        <div class="scale-100 md:scale-110 z-10 relative opacity-60 filter grayscale transition-all duration-300">
            <div class="w-52 h-52 md:w-80 md:h-80 border-4 border-surface-variant bg-surface-dim -skew-x-3 flex items-center justify-center p-4 md:p-8 shadow-[8px_8px_0px_#000000] transition-colors duration-300">
                <img src="${stations[currentStationIndex].logo}" class="w-full h-full object-contain drop-shadow-md opacity-70">
            </div>
        </div>
        `;
    }

    carouselContainer.innerHTML = `
        <div class="opacity-40 scale-75 filter grayscale">
            <div class="w-40 h-40 md:w-64 md:h-64 border-4 border-surface-variant bg-surface-dim -skew-x-3 flex items-center justify-center p-3 md:p-6 shadow-[8px_8px_0px_#000000]">
                <img src="${stations[prevIndex].logo}" class="w-full h-full object-contain drop-shadow-md">
            </div>
        </div>
        
        ${centralStationHTML}

        <div class="opacity-40 scale-75 filter grayscale">
            <div class="w-40 h-40 md:w-64 md:h-64 border-4 border-surface-variant bg-surface-dim -skew-x-3 flex items-center justify-center p-3 md:p-6 shadow-[8px_8px_0px_#000000]">
                <img src="${stations[nextIndex].logo}" class="w-full h-full object-contain drop-shadow-md">
            </div>
        </div>
    `;

    carouselContainer.classList.remove('slide-next', 'slide-prev');
    void carouselContainer.offsetWidth; // Forzar reinicio de animación
    
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
        const now = Math.floor(Date.now() / 1000);
        const currentSecond = now % station.duration;

        audioPlayer.src = station.url;
        audioPlayer.currentTime = currentSecond;
        audioPlayer.volume = 0; 
        
        audioPlayer.play().catch(error => console.error("Error al reproducir:", error));
    }, 800); 
}

function togglePower() {
    initVisualizer();
    isPlaying = !isPlaying;

    updateUI('none');
    
    if (isPlaying) {
        toggleBtn.className = "flex flex-col items-center justify-center bg-secondary-container text-surface-dim -skew-x-3 p-3 min-w-[80px] shadow-[4px_4px_0px_#000000] border-2 border-secondary-container transition-colors glow-neon-cyan";
        
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        playRadio();
    } else {
        toggleBtn.className = "flex flex-col items-center justify-center text-secondary border-2 border-secondary bg-surface-dim -skew-x-3 p-3 min-w-[80px] shadow-[4px_4px_0px_#000000] hover:bg-secondary hover:text-black transition-colors";
        clearTimeout(radioTimeout);
        audioPlayer.pause();
        audioPlayer.src = ""; 
        staticAudio.pause();
    }
}

function changeStation(direction) {
    if (direction === 'next') {
        currentStationIndex = (currentStationIndex + 1) % stations.length;
    } else {
        currentStationIndex = (currentStationIndex - 1 + stations.length) % stations.length;
    }
    
    updateUI(direction); 
    if (isPlaying) playRadio(); 
}

volumeSlider.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value);
    if (staticAudio.volume > 0) {
        staticAudio.volume = vol * 0.8;
    } else {
        audioPlayer.volume = vol;
    }
});

toggleBtn.addEventListener('click', togglePower);
nextBtn.addEventListener('click', () => changeStation('next'));
prevBtn.addEventListener('click', () => changeStation('prev'));

audioPlayer.volume = volumeSlider.value;
updateUI('none');