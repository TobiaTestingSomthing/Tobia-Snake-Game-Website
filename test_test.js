// Complete Snake Game - Multiplayer Edition

const canvas = document.getElementById("gameCanvas");
if (!canvas) {
    console.error("Canvas not found!");
    throw new Error("Canvas element missing");
}
const ctx = canvas.getContext("2d");
const box = 20;
const canvasSize = 40;
canvas.width = canvasSize * box;
canvas.height = canvasSize * box;

// Audio System
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let bgMusicNode = null;
let bgMusicGain = audioContext.createGain();
let sfxGain = audioContext.createGain();
bgMusicGain.connect(audioContext.destination);
sfxGain.connect(audioContext.destination);

let musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
let sfxEnabled = localStorage.getItem('sfxEnabled') !== 'false';
let musicVolume = parseFloat(localStorage.getItem('musicVolume') || '0.5');
let sfxVolume = parseFloat(localStorage.getItem('sfxVolume') || '0.7');
bgMusicGain.gain.value = musicEnabled ? musicVolume : 0;
sfxGain.gain.value = sfxEnabled ? sfxVolume : 0;

function playEatSound() {
    if (!sfxEnabled) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.frequency.setValueAtTime(800, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.1);
}

function playGameOverSound() {
    if (!sfxEnabled) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.frequency.setValueAtTime(400, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.5);
}

function startBackgroundMusic() {
    if (!musicEnabled || bgMusicNode) return;
    const notes = [262, 294, 330, 349, 392, 349, 330, 294];
    let noteIndex = 0;
    function playNote() {
        if (!musicEnabled) return;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(bgMusicGain);
        osc.frequency.value = notes[noteIndex];
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.4);
        noteIndex = (noteIndex + 1) % notes.length;
        if (musicEnabled) bgMusicNode = setTimeout(playNote, 500);
    }
    playNote();
}

function stopBackgroundMusic() {
    if (bgMusicNode) {
        clearTimeout(bgMusicNode);
        bgMusicNode = null;
    }
}

// Game State
let player1Name = localStorage.getItem('player1Name') || 'Player 1';
let player2Name = localStorage.getItem('player2Name') || 'Player 2';
let snake1 = [{ x: 10 * box, y: 20 * box }, { x: 9 * box, y: 20 * box }, { x: 8 * box, y: 20 * box }];
let direction1 = "RIGHT";
let nextDirection1 = "RIGHT";
let score1 = 0;
let currentSkin1 = localStorage.getItem('snake1Skin') || 'classic';
let snake2 = [{ x: 29 * box, y: 20 * box }, { x: 30 * box, y: 20 * box }, { x: 31 * box, y: 20 * box }];
let direction2 = "LEFT";
let nextDirection2 = "LEFT";
let score2 = 0;
let currentSkin2 = localStorage.getItem('snake2Skin') || 'ocean';
let food;
let isPaused = false;
let game = null;
let isGameOver = false;

const skins = {
    classic: { head: ['#4cd137', '#44bd32'], body: ['#7bed9f', '#70c1b3'], glow: '#4cd137' },
    ocean: { head: ['#00d2ff', '#3a7bd5'], body: ['#89f7fe', '#66a6ff'], glow: '#00d2ff' },
    fire: { head: ['#ff6b6b', '#ee5a24'], body: ['#ff9ff3', '#feca57'], glow: '#ff6b6b' },
    purple: { head: ['#a29bfe', '#6c5ce7'], body: ['#dfe6e9', '#b2bec3'], glow: '#a29bfe' },
    gold: { head: ['#ffd700', '#ff8c00'], body: ['#ffe66d', '#ffb347'], glow: '#ffd700' },
    rainbow: { head: ['#ff0080', '#ff8c00'], body: ['#40ff00', '#00d4ff'], glow: '#ff0080', special: true }
};

// UI Elements
const settingsScreen = document.getElementById('settingsScreen');
const gameScreen = document.getElementById('gameScreen');
const startGameBtn = document.getElementById('startGameBtn');
const settingsBtn = document.getElementById('settingsBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const gameOverlay = document.getElementById('gameOverlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const player1NameInput = document.getElementById('player1Name');
const player2NameInput = document.getElementById('player2Name');
const gamePlayer1Name = document.getElementById('gamePlayer1Name');
const gamePlayer2Name = document.getElementById('gamePlayer2Name');
const gamePlayer1Score = document.getElementById('gamePlayer1Score');
const gamePlayer2Score = document.getElementById('gamePlayer2Score');
const bottomPlayer1Name = document.getElementById('bottomPlayer1Name');
const bottomPlayer2Name = document.getElementById('bottomPlayer2Name');
const player1SkinSettingsLabel = document.getElementById('player1SkinSettingsLabel');
const player2SkinSettingsLabel = document.getElementById('player2SkinSettingsLabel');
const musicVolumeSlider = document.getElementById('musicVolume');
const sfxVolumeSlider = document.getElementById('sfxVolume');
const musicToggleBtn = document.getElementById('musicToggle');
const sfxToggleBtn = document.getElementById('sfxToggle');
const musicBtnGame = document.getElementById('musicBtnGame');
const musicStatus = document.getElementById('musicStatus');
const sfxStatus = document.getElementById('sfxStatus');
const skinButtons = document.querySelectorAll('.skin-btn');
const tabButtons = document.querySelectorAll('.tab-btn');

// Initialize
player1NameInput.value = player1Name;
player2NameInput.value = player2Name;
musicVolumeSlider.value = musicVolume * 100;
sfxVolumeSlider.value = sfxVolume * 100;
updatePlayerNames();
updateActiveSkin();
updateAudioUI();
food = generateFood();

// Event Listeners
musicVolumeSlider.addEventListener('input', (e) => {
    musicVolume = e.target.value / 100;
    bgMusicGain.gain.value = musicEnabled ? musicVolume : 0;
    localStorage.setItem('musicVolume', musicVolume);
});

sfxVolumeSlider.addEventListener('input', (e) => {
    sfxVolume = e.target.value / 100;
    sfxGain.gain.value = sfxEnabled ? sfxVolume : 0;
    localStorage.setItem('sfxVolume', sfxVolume);
    playEatSound();
});

musicToggleBtn.addEventListener('click', () => {
    musicEnabled = !musicEnabled;
    bgMusicGain.gain.value = musicEnabled ? musicVolume : 0;
    localStorage.setItem('musicEnabled', musicEnabled);
    updateAudioUI();
    if (musicEnabled && gameScreen.style.display !== 'none') startBackgroundMusic();
    else stopBackgroundMusic();
});

sfxToggleBtn.addEventListener('click', () => {
    sfxEnabled = !sfxEnabled;
    sfxGain.gain.value = sfxEnabled ? sfxVolume : 0;
    localStorage.setItem('sfxEnabled', sfxEnabled);
    updateAudioUI();
    if (sfxEnabled) playEatSound();
});

musicBtnGame.addEventListener('click', () => {
    musicEnabled = !musicEnabled;
    bgMusicGain.gain.value = musicEnabled ? musicVolume : 0;
    localStorage.setItem('musicEnabled', musicEnabled);
    updateAudioUI();
    if (musicEnabled) startBackgroundMusic();
    else stopBackgroundMusic();
});

function updateAudioUI() {
    musicToggleBtn.textContent = musicEnabled ? '🔊' : '🔇';
    musicToggleBtn.classList.toggle('muted', !musicEnabled);
    musicStatus.textContent = musicEnabled ? 'On' : 'Off';
    musicStatus.classList.toggle('off', !musicEnabled);
    sfxToggleBtn.textContent = sfxEnabled ? '🔊' : '🔇';
    sfxToggleBtn.classList.toggle('muted', !sfxEnabled);
    sfxStatus.textContent = sfxEnabled ? 'On' : 'Off';
    sfxStatus.classList.toggle('off', !sfxEnabled);
    musicBtnGame.textContent = musicEnabled ? '🎵' : '🔇';
}

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(tab + 'Tab').classList.add('active');
    });
});

skinButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const skin = btn.dataset.skin;
        const player = btn.dataset.player;
        if (player === '1') {
            currentSkin1 = skin;
            localStorage.setItem('snake1Skin', skin);
        } else {
            currentSkin2 = skin;
            localStorage.setItem('snake2Skin', skin);
        }
        updateActiveSkin();
    });
});

function updateActiveSkin() {
    skinButtons.forEach(btn => {
        const player = btn.dataset.player;
        const skin = btn.dataset.skin;
        if ((player === '1' && skin === currentSkin1) || (player === '2' && skin === currentSkin2)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function updatePlayerNames() {
    gamePlayer1Name.textContent = player1Name;
    gamePlayer2Name.textContent = player2Name;
    bottomPlayer1Name.textContent = player1Name;
    bottomPlayer2Name.textContent = player2Name;
    player1SkinSettingsLabel.textContent = player1Name;
    player2SkinSettingsLabel.textContent = player2Name;
}

startGameBtn.addEventListener('click', () => {
    console.log("Start button clicked!");
    player1Name = player1NameInput.value.trim() || 'Player 1';
    player2Name = player2NameInput.value.trim() || 'Player 2';
    localStorage.setItem('player1Name', player1Name);
    localStorage.setItem('player2Name', player2Name);
    updatePlayerNames();
    showGameScreen();
});

settingsBtn.addEventListener('click', () => {
    if (game) {
        clearInterval(game);
        game = null;
    }
    stopBackgroundMusic();
    showSettingsScreen();
});

function showSettingsScreen() {
    settingsScreen.style.display = 'flex';
    gameScreen.style.display = 'none';
    player1NameInput.value = player1Name;
    player2NameInput.value = player2Name;
    stopBackgroundMusic();
}

function showGameScreen() {
    settingsScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    if (audioContext.state === 'suspended') audioContext.resume();
    if (musicEnabled) startBackgroundMusic();
    resetGame();
}

document.addEventListener("keydown", changeDirection);
pauseBtn.addEventListener('click', togglePause);
resumeBtn.addEventListener('click', togglePause);
player1NameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') startGameBtn.click(); });
player2NameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') startGameBtn.click(); });

function changeDirection(event) {
    const key = event.key;
    if (key === ' ') {
        event.preventDefault();
        if (gameScreen.style.display !== 'none') togglePause();
        return;
    }
    if (isPaused || settingsScreen.style.display !== 'none') return;
    if (key === "w" || key === "W") { if (direction1 !== "DOWN") nextDirection1 = "UP"; }
    else if (key === "s" || key === "S") { if (direction1 !== "UP") nextDirection1 = "DOWN"; }
    else if (key === "a" || key === "A") { if (direction1 !== "RIGHT") nextDirection1 = "LEFT"; }
    else if (key === "d" || key === "D") { if (direction1 !== "LEFT") nextDirection1 = "RIGHT"; }
    if (key === "ArrowUp" && direction2 !== "DOWN") nextDirection2 = "UP";
    else if (key === "ArrowDown" && direction2 !== "UP") nextDirection2 = "DOWN";
    else if (key === "ArrowLeft" && direction2 !== "RIGHT") nextDirection2 = "LEFT";
    else if (key === "ArrowRight" && direction2 !== "LEFT") nextDirection2 = "RIGHT";
}

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        overlayTitle.textContent = 'Game Paused';
        overlayMessage.textContent = 'Press SPACE or click Resume to continue';
        gameOverlay.classList.remove('hidden');
    } else {
        gameOverlay.classList.add('hidden');
    }
}

function generateFood() {
    let newFood;
    do {
        newFood = { x: Math.floor(Math.random() * canvasSize) * box, y: Math.floor(Math.random() * canvasSize) * box };
    } while (collision(newFood, snake1) || collision(newFood, snake2));
    return newFood;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x,