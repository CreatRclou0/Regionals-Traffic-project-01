import { CONFIG } from './config.js';

export class TrafficLightController {
    constructor() {
        this.lights = {};
        this.currentCommand = 'ALL_RED';
        this._initializeLights();
    }

    _initializeLights() {
        Object.values(CONFIG.DIRECTIONS).forEach(direction => {
            this.lights[direction] = { state: CONFIG.LIGHT_STATES.RED, timer: 0 };
        });
    }

    initialize() { this._initializeLights(); this.applyCommand('ALL_RED'); }

    applyCommand(command) {
        this.currentCommand = command;
        switch (command) {
            case 'NS_GREEN':  this._setPair('NS', CONFIG.LIGHT_STATES.GREEN);  break;
            case 'NS_YELLOW': this._setPair('NS', CONFIG.LIGHT_STATES.YELLOW); break;
            case 'EW_GREEN':  this._setPair('EW', CONFIG.LIGHT_STATES.GREEN);  break;
            case 'EW_YELLOW': this._setPair('EW', CONFIG.LIGHT_STATES.YELLOW); break;
            case 'ALL_RED':
            default:          this._setAllRed(); break;
        }
    }

    _setPair(pair, state) {
        this._setAllRed();
        if (pair === 'NS') { this.lights[CONFIG.DIRECTIONS.NORTH].state = state; this.lights[CONFIG.DIRECTIONS.SOUTH].state = state; }
        else if (pair === 'EW') { this.lights[CONFIG.DIRECTIONS.EAST].state = state; this.lights[CONFIG.DIRECTIONS.WEST].state = state; }
    }

    _setAllRed() { Object.values(CONFIG.DIRECTIONS).forEach(d => { this.lights[d].state = CONFIG.LIGHT_STATES.RED; }); }

    update(deltaTime) { Object.values(this.lights).forEach(l => { l.timer += deltaTime; }); }

    render(ctx, intersection) {
        ['north', 'south', 'east', 'west'].forEach(direction => {
            const state = this.lights[CONFIG.DIRECTIONS[direction.toUpperCase()]].state;
            this._renderTrafficLight(ctx, direction, state, intersection);
        });
    }

    _renderTrafficLight(ctx, direction, state, intersection) {
        const position = intersection.getLightPosition(direction);
        if (!position) return;
        const lightSize = CONFIG.LIGHT_SIZE || 12;
        const spacing = lightSize + 2;
        ctx.fillStyle = '#333';
        ctx.fillRect(position.x - lightSize - 1, position.y - spacing * 1.5 - 1, (lightSize + 1) * 2, spacing * 3 + 2);
        ['red', 'yellow', 'green'].forEach((color, index) => {
            const lightY = position.y - spacing + (index * spacing);
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.arc(position.x, lightY, lightSize, 0, Math.PI * 2); ctx.fill();
            if (state === color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(position.x, lightY, lightSize - 2, 0, Math.PI * 2); ctx.fill(); }
        });
    }

    getLightStates() {
        const states = {};
        Object.entries(this.lights).forEach(([direction, light]) => { states[direction] = light.state; });
        return states;
    }

    getCurrentCommand() { return this.currentCommand; }
    reset() { this._initializeLights(); this.currentCommand = 'ALL_RED'; }
}
