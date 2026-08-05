import { GameEngine } from './gameEngine.js';
import { UIController } from './ui.js';
import { CONFIG } from './config.js';

class TrafficSimulator {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameEngine = new GameEngine(this.canvas, this.ctx);
        this.uiController = new UIController(this.gameEngine);
        this.isRunning = true;
        this.lastTime = 0;
        this._initializeGame();
        this._startGameLoop();
    }

    _initializeGame() {
        this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.canvas.height = CONFIG.CANVAS_HEIGHT;
        this.gameEngine.initialize();
        this.uiController.initialize();
        console.log('HIL Traffic Simulator initialized');
    }

    _startGameLoop() {
        const gameLoop = (currentTime) => {
            const deltaTime = currentTime - this.lastTime;
            this.lastTime = currentTime;
            if (this.isRunning) {
                const settings = {
                    CAR_SPAWN_RATE: Number(document.getElementById('carSpawnRate').value),
                    CAR_SPEED: Number(document.getElementById('carSpeed').value),
                    DETECTOR_DISTANCE: this.gameEngine.getSettings().DETECTOR_DISTANCE
                };
                this.gameEngine.updateSettings(settings);
                this.gameEngine.update(deltaTime);
            }
            this.gameEngine.render();
            requestAnimationFrame(gameLoop);
        };
        requestAnimationFrame(gameLoop);
    }

    togglePause() { this.isRunning = !this.isRunning; return this.isRunning; }
}

document.addEventListener('DOMContentLoaded', () => { window.trafficSimulator = new TrafficSimulator(); });
