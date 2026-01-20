// INSTRUCTIONS: Delete snake.js and rename this file to snake.js

console.log("Snake game loading...");

// Basic initialization
const canvas = document.getElementById("gameCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;
const box = 20;
const canvasSize = 40;

if (canvas) {
    canvas.width = canvasSize * box;
    canvas.height = canvasSize * box;
}

// Check if we have the start button
const startBtn = document.getElementById('startGameBtn');
if (startBtn) {
    console.log("Start button found!");
    startBtn.addEventListener('click', function() {
        console.log("Start button clicked!");
        alert("Button works! Now loading full game...");
        // Your game will start here
        document.getElementById('settingsScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'flex';
    });
} else {
    console.error("Start button NOT found!");
}

console.log("Script loaded successfully");
