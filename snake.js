// Snake Game - Complete Version

// Initialisierung
const canvas = document.getElementById("gameCanvas");
if (!canvas) {
    console.error("Canvas element with id 'gameCanvas' not found.");
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
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(sfxGain);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function playGameOverSound() {
    if (!sfxEnabled) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(sfxGain);
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

function startBackgroundMusic() {
    if (!musicEnabled || bgMusicNode) return;
    const notes = [262, 294, 330, 349, 392, 349, 330, 294];
    let noteIndex = 0;

    function playNote() {
        if (!musicEnabled) return;
        const oscillator = audioContext.createOscillator();
        const noteGain = audioContext.createGain();
        oscillator.connect(noteGain);
        noteGain.connect(bgMusicGain);
        oscillator.frequency.value = notes[noteIndex];
        oscillator.type = 'sine';
        noteGain.gain.setValueAtTime(0, audioContext.currentTime);
        noteGain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05);
        noteGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
        noteIndex = (noteIndex + 1) % notes.length;
        if (musicEnabled) {
            bgMusicNode = setTimeout(playNote, 500);
        }
    }
    playNote();
}

function stopBackgroundMusic() {
    if (bgMusicNode) {
        clearTimeout(bgMusicNode);
        bgMusicNode = null;
    }
}

// Game state
let currentGameMode = parseInt(localStorage.getItem('gameMode')) || 3; // Default to mode 3
let fieldSize = canvasSize; // For mode 1 shrinking
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
let food = null;
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

// Animation System
let particles = [];
let scorePopups = [];
let screenFlashes = [];
let ripples = [];
let foodPulse = 0;
let animationFrame = 0;

class Particle {
    constructor(x, y, color, vx, vy, size = 5, life = 60) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        this.gravity = 0.3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life--;
        this.vx *= 0.98;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

class ScorePopup {
    constructor(x, y, points, color) {
        this.x = x;
        this.y = y;
        this.points = points;
        this.color = color;
        this.life = 60;
        this.maxLife = 60;
    }

    update() {
        this.y -= 2;
        this.life--;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        const scale = 1 + (1 - alpha) * 0.5;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${24 * scale}px Arial`;
        ctx.fillStyle = this.color;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.strokeText(`+${this.points}`, this.x, this.y);
        ctx.fillText(`+${this.points}`, this.x, this.y);
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

class ScreenFlash {
    constructor(color, intensity = 0.3) {
        this.color = color;
        this.intensity = intensity;
        this.life = 15;
        this.maxLife = 15;
    }

    update() {
        this.life--;
    }

    draw(ctx) {
        const alpha = (this.life / this.maxLife) * this.intensity;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

class Ripple {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 0;
        this.maxRadius = 60;
        this.life = 30;
        this.maxLife = 30;
    }

    update() {
        this.radius += 2;
        this.life--;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

function createFoodParticles(x, y, color) {
    // Main explosion ring
    for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30;
        const speed = 3 + Math.random() * 4;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 2;
        particles.push(new Particle(x + box / 2, y + box / 2, color, vx, vy, 4 + Math.random() * 4, 50 + Math.random() * 30));
    }

    // Inner burst
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 1;
        particles.push(new Particle(x + box / 2, y + box / 2, '#ffffff', vx, vy, 2 + Math.random() * 2, 30 + Math.random() * 20));
    }

    // Sparks
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 5 + Math.random() * 6;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 4;
        particles.push(new Particle(x + box / 2, y + box / 2, '#ffff00', vx, vy, 2 + Math.random() * 2, 40 + Math.random() * 20));
    }
}

function createDeathExplosion(x, y, color) {
    // Massive main explosion
    for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 7;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 4;
        particles.push(new Particle(x, y, color, vx, vy, 5 + Math.random() * 5, 70 + Math.random() * 40));
    }

    // White flash particles
    for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 5;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 3;
        particles.push(new Particle(x, y, '#ffffff', vx, vy, 4 + Math.random() * 4, 50 + Math.random() * 30));
    }

    // Red explosion particles
    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 2;
        particles.push(new Particle(x, y, '#ff0000', vx, vy, 6 + Math.random() * 4, 60 + Math.random() * 30));
    }

    // Sparks shooting out
    for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 6 + Math.random() * 8;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 5;
        particles.push(new Particle(x, y, '#ffaa00', vx, vy, 3 + Math.random() * 3, 50 + Math.random() * 25));
    }
}

function createConfetti(x, y) {
    const colors = ['#ff0080', '#ff8c00', '#40ff00', '#00d4ff', '#8000ff', '#ffd700'];
    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(x, y, color, vx, vy, 4 + Math.random() * 3, 80 + Math.random() * 40));
    }
}

// Background ambient particles
let backgroundParticles = [];

class BackgroundParticle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = 1 + Math.random() * 2;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.life = 100 + Math.random() * 100;
        this.maxLife = this.life;
        this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;

        // Wrap around
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }

    draw(ctx) {
        const alpha = (this.life / this.maxLife) * 0.3;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

function updateAnimations() {
    animationFrame++;
    foodPulse = Math.sin(animationFrame * 0.1) * 0.2 + 1;

    particles = particles.filter(p => {
        p.update();
        return !p.isDead();
    });

    scorePopups = scorePopups.filter(s => {
        s.update();
        return !s.isDead();
    });

    screenFlashes = screenFlashes.filter(f => {
        f.update();
        return !f.isDead();
    });

    ripples = ripples.filter(r => {
        r.update();
        return !r.isDead();
    });

    snakeTrails = snakeTrails.filter(t => {
        t.update();
        return !t.isDead();
    });

    backgroundParticles = backgroundParticles.filter(bp => {
        bp.update();
        return !bp.isDead();
    });

    // Spawn background particles
    if (animationFrame % 10 === 0 && backgroundParticles.length < 30) {
        backgroundParticles.push(new BackgroundParticle());
    }
}

function drawAnimations() {
    backgroundParticles.forEach(bp => bp.draw(ctx)); // Draw background particles first
    particles.forEach(p => p.draw(ctx));
    ripples.forEach(r => r.draw(ctx));
    snakeTrails.forEach(t => t.draw(ctx)); // Draw trails after ripples
    scorePopups.forEach(s => s.draw(ctx));
    screenFlashes.forEach(f => f.draw(ctx));
}

// UI Elements
const modeScreen = document.getElementById('modeScreen');
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
const modeButtons = document.querySelectorAll('.select-mode-btn');

// Mode Selection Event Handlers
modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        currentGameMode = parseInt(btn.dataset.mode);
        localStorage.setItem('gameMode', currentGameMode);

        // Show/hide player 2 settings based on mode
        const player2Elements = document.querySelectorAll('[id*="player2"], [id*="Player2"]');
        if (currentGameMode === 1) {
            // Mode 1: Hide player 2 settings
            player2Elements.forEach(el => {
                if (el.closest('.name-input-group') || el.closest('.skins-section h3') || el.closest('.skin-grid')) {
                    el.style.display = 'none';
                }
            });
        } else {
            // Mode 2 & 3: Show player 2 settings
            player2Elements.forEach(el => {
                el.style.display = '';
            });
        }

        // Switch to settings screen
        modeScreen.style.display = 'none';
        settingsScreen.style.display = 'flex';
    });
});

const backToModeBtn = document.getElementById('backToModeBtn');
backToModeBtn.addEventListener('click', () => {
    settingsScreen.style.display = 'none';
    modeScreen.style.display = 'flex';
});

// Initialize
player1NameInput.value = player1Name;
player2NameInput.value = player2Name;
musicVolumeSlider.value = musicVolume * 100;
sfxVolumeSlider.value = sfxVolume * 100;
updatePlayerNames();
updateActiveSkin();
updateAudioUI();

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
    if (musicEnabled && gameScreen.style.display !== 'none') {
        startBackgroundMusic();
    } else {
        stopBackgroundMusic();
    }
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
    if (musicEnabled) {
        startBackgroundMusic();
    } else {
        stopBackgroundMusic();
    }
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
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
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
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    if (musicEnabled) {
        startBackgroundMusic();
    }
    resetGame();
}

document.addEventListener("keydown", changeDirection);
pauseBtn.addEventListener('click', togglePause);
resumeBtn.addEventListener('click', togglePause);
player1NameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') startGameBtn.click();
});
player2NameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') startGameBtn.click();
});

function changeDirection(event) {
    const key = event.key;
    if (key === ' ') {
        event.preventDefault();
        if (gameScreen.style.display !== 'none') {
            togglePause();
        }
        return;
    }
    if (isPaused || settingsScreen.style.display !== 'none') return;
    if (key === "w" || key === "W") {
        if (direction1 !== "DOWN") nextDirection1 = "UP";
    } else if (key === "s" || key === "S") {
        if (direction1 !== "UP") nextDirection1 = "DOWN";
    } else if (key === "a" || key === "A") {
        if (direction1 !== "RIGHT") nextDirection1 = "LEFT";
    } else if (key === "d" || key === "D") {
        if (direction1 !== "LEFT") nextDirection1 = "RIGHT";
    }
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

// Food spawn animation
let foodSpawnTime = 0;

function generateFood() {
    let newFood;
    let limit = currentGameMode === 1 ? fieldSize : canvasSize;
    do {
        newFood = {
            x: Math.floor(Math.random() * limit) * box,
            y: Math.floor(Math.random() * limit) * box,
        };
    } while (collision(newFood, snake1) || (currentGameMode !== 1 && collision(newFood, snake2)));

    foodSpawnTime = animationFrame;

    // Spawn particles
    const spawnColors = ['#ff6b6b', '#ffaa00', '#ffff00'];
    for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 * i) / 15;
        const speed = 2 + Math.random() * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const color = spawnColors[Math.floor(Math.random() * spawnColors.length)];
        particles.push(new Particle(newFood.x + box / 2, newFood.y + box / 2, color, vx, vy, 2 + Math.random() * 2, 30));
    }

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
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

function collision(pos, snake) {
    return snake.some(segment => segment.x === pos.x && segment.y === pos.y);
}

// Trail system
let snakeTrails = [];

class Trail {
    constructor(x, y, color, size) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.life = 20;
        this.maxLife = 20;
    }

    update() {
        this.life--;
    }

    draw(ctx) {
        const alpha = (this.life / this.maxLife) * 0.4;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x + box / 2, this.y + box / 2, this.size * (this.life / this.maxLife), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

function drawSnake(snake, skinName) {
    const skin = skins[skinName];

    // Add trail for head
    if (snake.length > 0) {
        const head = snake[0];
        snakeTrails.push(new Trail(head.x, head.y, skin.glow, box / 3));
    }

    snake.forEach((segment, index) => {
        const isHead = index === 0;
        const isTail = index === snake.length - 1;
        const colors = isHead ? skin.head : skin.body;

        // Calculate segment size with smooth scaling
        const sizeMultiplier = isHead ? 1.15 : (isTail ? 0.8 : 1.0);
        const segmentSize = (box - 1) * sizeMultiplier;
        const offset = (box - segmentSize) / 2;

        // Draw Outer Glow / Shell
        ctx.save();
        ctx.shadowBlur = isHead ? 35 : 15;
        ctx.shadowColor = skin.glow;

        // Animated rainbow gradient for rainbow skin
        if (skinName === 'rainbow') {
            const rainbowOffset = (animationFrame + index * 10) % 360;
            const gradient = ctx.createLinearGradient(segment.x, segment.y, segment.x + box, segment.y + box);
            gradient.addColorStop(0, `hsl(${rainbowOffset}, 100%, 50%)`);
            gradient.addColorStop(1, `hsl(${(rainbowOffset + 60) % 360}, 100%, 50%)`);
            ctx.fillStyle = gradient;
        } else {
            const gradient = ctx.createLinearGradient(segment.x, segment.y, segment.x + box, segment.y + box);
            gradient.addColorStop(0, colors[0]);
            gradient.addColorStop(1, colors[1]);
            ctx.fillStyle = gradient;
        }

        drawRoundedRect(ctx, segment.x + offset, segment.y + offset, segmentSize, segmentSize, 8);

        // Draw Inner Core (Bright light center)
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        const coreSize = segmentSize * 0.4;
        const coreOffset = (box - coreSize) / 2;
        drawRoundedRect(ctx, segment.x + coreOffset, segment.y + coreOffset, coreSize, coreSize, 4);
        ctx.restore();

        // Extra details for head
        if (isHead) {
            // High-detail eyes
            ctx.save();
            // Eye sockets
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.arc(segment.x + box * 0.3, segment.y + box * 0.35, 6, 0, Math.PI * 2);
            ctx.arc(segment.x + box * 0.7, segment.y + box * 0.35, 6, 0, Math.PI * 2);
            ctx.fill();

            // Sclera
            ctx.fillStyle = 'white';
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'white';
            ctx.beginPath();
            ctx.arc(segment.x + box * 0.3, segment.y + box * 0.35, 4.5, 0, Math.PI * 2);
            ctx.arc(segment.x + box * 0.7, segment.y + box * 0.35, 4.5, 0, Math.PI * 2);
            ctx.fill();

            // Animating pupils
            const pupilX = Math.sin(animationFrame * 0.08) * 1;
            const pupilY = Math.cos(animationFrame * 0.08) * 0.5;
            ctx.fillStyle = '#000';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(segment.x + box * 0.3 + pupilX, segment.y + box * 0.35 + pupilY, 2.5, 0, Math.PI * 2);
            ctx.arc(segment.x + box * 0.7 + pupilX, segment.y + box * 0.35 + pupilY, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Shine
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(segment.x + box * 0.3 - 1.5, segment.y + box * 0.35 - 1.5, 1, 0, Math.PI * 2);
            ctx.arc(segment.x + box * 0.7 - 1.5, segment.y + box * 0.35 - 1.5, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Scale-like highlights for body
        if (!isHead && index % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.ellipse(segment.x + box / 2, segment.y + box / 3, segmentSize / 4, segmentSize / 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawFood() {
    // Spawn animation (bounce effect)
    const timeSinceSpawn = animationFrame - foodSpawnTime;
    let spawnScale = 1;
    if (timeSinceSpawn < 20) {
        const bounceProgress = timeSinceSpawn / 20;
        spawnScale = 0.3 + Math.abs(Math.sin(bounceProgress * Math.PI * 3)) * 0.7;
    }

    // Floating effect
    const floatY = Math.sin(animationFrame * 0.1) * 3;
    const pulseSize = (box / 2.2) * foodPulse * spawnScale;
    const centerX = food.x + box / 2;
    const centerY = food.y + box / 2 + floatY;

    ctx.save();
    // Outer Glow
    ctx.shadowBlur = 25 * foodPulse * spawnScale;
    ctx.shadowColor = '#ff3e3e';

    // Crystal Body (Hexagon-ish shape)
    ctx.fillStyle = '#ff3e3e';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6 + (animationFrame * 0.02);
        const px = centerX + Math.cos(angle) * pulseSize;
        const py = centerY + Math.sin(angle) * pulseSize;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Internal Light (Facets)
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + pulseSize * 0.5, centerY - pulseSize * 0.5);
    ctx.lineTo(centerX - pulseSize * 0.5, centerY - pulseSize * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ff8a8a';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + pulseSize * 0.8, centerY + pulseSize * 0.3);
    ctx.lineTo(centerX + pulseSize * 0.3, centerY + pulseSize * 0.8);
    ctx.closePath();
    ctx.fill();

    // Core Shine
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(centerX - 2, centerY - 2, 3 * spawnScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Rotating sparkles
    const sparkleCount = 4;
    for (let i = 0; i < sparkleCount; i++) {
        const angle = (animationFrame * 0.08) + (i * Math.PI * 2 / sparkleCount);
        const distance = pulseSize + 8;
        const sparkleX = centerX + Math.cos(angle) * distance;
        const sparkleY = centerY + Math.sin(angle) * distance;

        const sparkleAlpha = (Math.sin(animationFrame * 0.15 + i) + 1) / 2;
        ctx.fillStyle = `rgba(255, 255, 255, ${sparkleAlpha})`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#fff';
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function draw() {
    if (isPaused || isGameOver) return;

    // Apply camera shake
    applyCameraShake();

    // Apply direction changes
    direction1 = nextDirection1;
    if (currentGameMode !== 1) direction2 = nextDirection2;

    // Calculate new head positions
    let newHead1 = { ...snake1[0] };
    let newHead2 = currentGameMode !== 1 ? { ...snake2[0] } : null;

    if (direction1 === "LEFT") newHead1.x -= box;
    if (direction1 === "UP") newHead1.y -= box;
    if (direction1 === "RIGHT") newHead1.x += box;
    if (direction1 === "DOWN") newHead1.y += box;

    if (newHead2) {
        if (direction2 === "LEFT") newHead2.x -= box;
        if (direction2 === "UP") newHead2.y -= box;
        if (direction2 === "RIGHT") newHead2.x += box;
        if (direction2 === "DOWN") newHead2.y += box;
    }

    // Wrap around walls / Wall Death
    if (currentGameMode === 3) {
        // Mode 3: Wrap around
        if (newHead1.x < 0) newHead1.x = canvas.width - box;
        if (newHead1.x >= canvas.width) newHead1.x = 0;
        if (newHead1.y < 0) newHead1.y = canvas.height - box;
        if (newHead1.y >= canvas.height) newHead1.y = 0;

        if (newHead2) {
            if (newHead2.x < 0) newHead2.x = canvas.width - box;
            if (newHead2.x >= canvas.width) newHead2.x = 0;
            if (newHead2.y < 0) newHead2.y = canvas.height - box;
            if (newHead2.y >= canvas.height) newHead2.y = 0;
        }
    } else {
        // Mode 1 & 2: Death at walls
        const wallLimit = currentGameMode === 1 ? fieldSize * box : canvas.width;
        let p1WallHit = newHead1.x < 0 || newHead1.x >= wallLimit || newHead1.y < 0 || newHead1.y >= wallLimit;
        let p2WallHit = false;
        if (newHead2) {
            p2WallHit = newHead2.x < 0 || newHead2.x >= canvas.width || newHead2.y < 0 || newHead2.y >= canvas.width;
        }

        if (p1WallHit || p2WallHit) {
            gameOver(p1WallHit, p2WallHit);
            return;
        }
    }

    // Check collisions with bodies
    let player1Dead = collision(newHead1, snake1) || (currentGameMode !== 1 && collision(newHead1, snake2));
    let player2Dead = false;
    if (newHead2) {
        player2Dead = collision(newHead2, snake2) || collision(newHead2, snake1);
    }

    if (player1Dead || player2Dead) {
        gameOver(player1Dead, player2Dead);
        return;
    }

    // Add new heads
    snake1.unshift(newHead1);
    if (newHead2) snake2.unshift(newHead2);

    // Check food collision for snake1
    if (newHead1.x === food.x && newHead1.y === food.y) {
        score1++;
        gamePlayer1Score.textContent = score1;

        // Mode 1: Shrink field
        if (currentGameMode === 1 && fieldSize > 10) {
            fieldSize--;
            ripples.push(new Ripple(canvas.width / 2, canvas.height / 2, '#ffffff'));
        }

        // Animations
        const skin1 = skins[currentSkin1];
        createFoodParticles(food.x, food.y, skin1.glow);
        scorePopups.push(new ScorePopup(food.x + box / 2, food.y, 1, skin1.glow));
        screenFlashes.push(new ScreenFlash(skin1.glow, 0.2));
        ripples.push(new Ripple(food.x + box / 2, food.y + box / 2, skin1.glow));

        // Confetti for milestones
        if (score1 % 5 === 0) {
            createConfetti(food.x + box / 2, food.y + box / 2);
        }

        playEatSound();
        food = generateFood();
    } else {
        snake1.pop();
    }

    // Check food collision for snake2
    if (newHead2) {
        if (newHead2.x === food.x && newHead2.y === food.y) {
            score2++;
            gamePlayer2Score.textContent = score2;

            // Animations
            const skin2 = skins[currentSkin2];
            createFoodParticles(food.x, food.y, skin2.glow);
            scorePopups.push(new ScorePopup(food.x + box / 2, food.y, 1, skin2.glow));
            screenFlashes.push(new ScreenFlash(skin2.glow, 0.2));
            ripples.push(new Ripple(food.x + box / 2, food.y + box / 2, skin2.glow));

            // Confetti for milestones
            if (score2 % 5 === 0) {
                createConfetti(food.x + box / 2, food.y + box / 2);
            }

            playEatSound();
            food = generateFood();
        } else {
            snake2.pop();
        }
    }

    // Clear canvas
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw boundary for Mode 1
    if (currentGameMode === 1) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, fieldSize * box, fieldSize * box);
    }

    // Apply camera shake transform ONLY if shake is active
    if (cameraShake.intensity > 0) {
        ctx.save();
        ctx.translate(cameraShake.x, cameraShake.y);
    }

    // Update animations
    updateAnimations();

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    let gridLimit = currentGameMode === 1 ? fieldSize : canvasSize;
    for (let i = 0; i <= gridLimit; i++) {
        ctx.beginPath();
        ctx.moveTo(i * box, 0);
        ctx.lineTo(i * box, gridLimit * box);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * box);
        ctx.lineTo(gridLimit * box, i * box);
        ctx.stroke();
    }

    // Draw food
    drawFood();

    // Draw snakes
    drawSnake(snake1, currentSkin1);
    if (currentGameMode !== 1) drawSnake(snake2, currentSkin2);

    // Restore transform if shake was applied
    if (cameraShake.intensity > 0) {
        ctx.restore();
    }

    // Draw animations on top (not affected by shake)
    drawAnimations();

    // Draw Vignette (Premium Overlay)
    const vignetteGradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width * 0.4, canvas.width / 2, canvas.height / 2, canvas.width * 0.8);
    vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Camera shake system
let cameraShake = { x: 0, y: 0, intensity: 0 };

function applyCameraShake() {
    if (cameraShake.intensity > 0) {
        cameraShake.x = (Math.random() - 0.5) * cameraShake.intensity;
        cameraShake.y = (Math.random() - 0.5) * cameraShake.intensity;
        cameraShake.intensity *= 0.9;

        if (cameraShake.intensity < 0.1) {
            cameraShake.intensity = 0;
            cameraShake.x = 0;
            cameraShake.y = 0;
        }
    }
}

function createLightningBolt(x, y, color) {
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const length = 40 + Math.random() * 60;
        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;

        // Create particles along the lightning path
        const steps = 10;
        for (let j = 0; j < steps; j++) {
            const t = j / steps;
            const px = x + (endX - x) * t;
            const py = y + (endY - y) * t;
            particles.push(new Particle(px, py, color, 0, 0, 3, 20));
        }
    }
}

function gameOver(player1Dead, player2Dead) {
    isGameOver = true;
    clearInterval(game);
    game = null;
    playGameOverSound();

    // MASSIVE camera shake
    cameraShake.intensity = 20;

    // Death explosions with enhanced effects
    if (player1Dead) {
        const skin1 = skins[currentSkin1];
        const head1 = snake1[0];
        const deathX = head1.x + box / 2;
        const deathY = head1.y + box / 2;

        // Multiple explosion waves
        createDeathExplosion(deathX, deathY, skin1.glow);
        setTimeout(() => createDeathExplosion(deathX, deathY, '#ffffff'), 100);
        setTimeout(() => createDeathExplosion(deathX, deathY, '#ff0000'), 200);

        // Lightning bolts
        createLightningBolt(deathX, deathY, skin1.glow);
        setTimeout(() => createLightningBolt(deathX, deathY, '#ffff00'), 150);

        // Screen effects
        screenFlashes.push(new ScreenFlash('#ff0000', 0.5));
        setTimeout(() => screenFlashes.push(new ScreenFlash('#ffffff', 0.3)), 100);
        setTimeout(() => screenFlashes.push(new ScreenFlash('#ff0000', 0.4)), 200);

        // Ripple waves
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                ripples.push(new Ripple(deathX, deathY, i % 2 === 0 ? skin1.glow : '#ff0000'));
            }, i * 80);
        }

        // Explosion particles in all directions
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const angle = Math.random() * Math.PI * 2;
                const speed = 5 + Math.random() * 10;
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;
                particles.push(new Particle(deathX, deathY, '#ff0000', vx, vy, 5, 60));
            }, i * 10);
        }
    }

    if (player2Dead) {
        const skin2 = skins[currentSkin2];
        const head2 = snake2[0];
        const deathX = head2.x + box / 2;
        const deathY = head2.y + box / 2;

        // Multiple explosion waves
        createDeathExplosion(deathX, deathY, skin2.glow);
        setTimeout(() => createDeathExplosion(deathX, deathY, '#ffffff'), 100);
        setTimeout(() => createDeathExplosion(deathX, deathY, '#ff0000'), 200);

        // Lightning bolts
        createLightningBolt(deathX, deathY, skin2.glow);
        setTimeout(() => createLightningBolt(deathX, deathY, '#ffff00'), 150);

        // Screen effects
        screenFlashes.push(new ScreenFlash('#ff0000', 0.5));
        setTimeout(() => screenFlashes.push(new ScreenFlash('#ffffff', 0.3)), 100);
        setTimeout(() => screenFlashes.push(new ScreenFlash('#ff0000', 0.4)), 200);

        // Ripple waves
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                ripples.push(new Ripple(deathX, deathY, i % 2 === 0 ? skin2.glow : '#ff0000'));
            }, i * 80);
        }

        // Explosion particles in all directions
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const angle = Math.random() * Math.PI * 2;
                const speed = 5 + Math.random() * 10;
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;
                particles.push(new Particle(deathX, deathY, '#ff0000', vx, vy, 5, 60));
            }, i * 10);
        }
    }

    let winner = '';
    if (currentGameMode === 1) {
        winner = 'Game Over!';
        overlayMessage.textContent = 'You crashed!\n\nFinal Score: ' + score1;
        // No victory confetti for solo death, but let's add some anyway if they did well!
        if (score1 >= 10) {
            setTimeout(() => {
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        createConfetti(canvas.width / 2, canvas.height / 2);
                    }, i * 200);
                }
            }, 500);
        }
    } else if (player1Dead && player2Dead) {
        winner = 'Draw!';
        overlayMessage.textContent = 'Both players crashed!\n\nFinal Scores:\n' + player1Name + ': ' + score1 + '\n' + player2Name + ': ' + score2;
    } else if (player1Dead) {
        winner = player2Name + ' Wins!';
        overlayMessage.textContent = player1Name + ' crashed!\n\nFinal Scores:\n' + player1Name + ': ' + score1 + '\n' + player2Name + ': ' + score2;
        // Victory confetti
        setTimeout(() => {
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    createConfetti(canvas.width / 2, canvas.height / 2);
                }, i * 200);
            }
        }, 500);
    } else {
        winner = player1Name + ' Wins!';
        overlayMessage.textContent = player2Name + ' crashed!\n\nFinal Scores:\n' + player1Name + ': ' + score1 + '\n' + player2Name + ': ' + score2;
        // Victory confetti
        setTimeout(() => {
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    createConfetti(canvas.width / 2, canvas.height / 2);
                }, i * 200);
            }
        }, 500);
    }

    overlayTitle.textContent = winner;
    gameOverlay.classList.remove('hidden');

    resumeBtn.textContent = 'Play Again';
    resumeBtn.onclick = () => {
        resumeBtn.textContent = 'Resume Game';
        resumeBtn.onclick = togglePause;
        resetGame();
    };
}

function resetGame() {
    fieldSize = canvasSize; // Reset field size for Mode 1

    snake1 = [{ x: 10 * box, y: 20 * box }, { x: 9 * box, y: 20 * box }, { x: 8 * box, y: 20 * box }];
    direction1 = "RIGHT";
    nextDirection1 = "RIGHT";
    score1 = 0;

    snake2 = [{ x: 29 * box, y: 20 * box }, { x: 30 * box, y: 20 * box }, { x: 31 * box, y: 20 * box }];
    direction2 = "LEFT";
    nextDirection2 = "LEFT";
    score2 = 0;

    food = generateFood();
    isPaused = false;
    isGameOver = false;

    // Clear all animations
    particles = [];
    scorePopups = [];
    screenFlashes = [];
    ripples = [];
    snakeTrails = [];
    backgroundParticles = [];
    animationFrame = 0;

    gamePlayer1Score.textContent = score1;
    gamePlayer2Score.textContent = score2;
    gameOverlay.classList.add('hidden');

    // Handle UI visibility based on mode
    const p2UI = document.querySelectorAll('.player-info.player2, .score-item.player2');
    if (currentGameMode === 1) {
        p2UI.forEach(el => el.style.display = 'none');
    } else {
        p2UI.forEach(el => el.style.display = '');
    }

    if (game) clearInterval(game);
    game = setInterval(draw, 100);
}

console.log("Snake game loaded successfully with PREMIUM ANIMATIONS!");