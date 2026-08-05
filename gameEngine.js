import { Intersection } from './intersection.js';
import { TrafficLightController } from './trafficLights.js';
import { CarManager } from './cars.js';
import { SensorSystem } from './sensors.js';
import { Statistics } from './statistics.js';
import { SerialController } from './serialComm.js';
import { CONFIG } from './config.js';

export class GameEngine {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.intersection = new Intersection(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
        this.trafficLights = new TrafficLightController();
        this.carManager = new CarManager(this.intersection);
        this.sensorSystem = new SensorSystem(this.intersection);
        this.statistics = new Statistics();
        this.serialController = new SerialController();
        this.settings = { ...CONFIG.DEFAULT_SETTINGS };
        this.serialController.onCommand = (command) => { this.trafficLights.applyCommand(command); };
        this.prevLightStates = null;
    }

    initialize() {
        this.intersection.setCarManager(this.carManager);
        this.trafficLights.initialize();
        this.carManager.initialize(this.settings);
        this.sensorSystem.initialize(this.settings.DETECTOR_DISTANCE);
        this.statistics.initialize();
        this.carManager.onCarCompleted = (car) => { this.statistics.recordCarCompletion(car); };
        console.log('HIL Game Engine initialized - Arduino is the traffic controller');
    }

    update(deltaTime) {
        this.trafficLights.update(deltaTime);
        this.intersection.setCarManager(this.carManager);
        const lightStates = this.trafficLights.getLightStates();
        this.carManager.update(deltaTime, lightStates);
        this.sensorSystem.update(this.carManager.getCars(), lightStates, this.prevLightStates);
        this.prevLightStates = lightStates;
        this.serialController.setSensorData(this.sensorSystem.getSensorData());
        this.statistics.update(this.carManager.getCars(), deltaTime);
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.intersection.render(this.ctx);
        this.sensorSystem.render(this.ctx);
        this.carManager.render(this.ctx);
        this.trafficLights.render(this.ctx, this.intersection);
    }

    reset() {
        this.carManager.reset(); this.trafficLights.reset(); this.sensorSystem.reset(); this.statistics.reset();
        this.prevLightStates = null;
    }

    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        this.carManager.updateSettings(this.settings);
        this.sensorSystem.updateDetectorDistance(this.settings.DETECTOR_DISTANCE);
    }

    getStatistics() { return this.statistics.getStats(); }
    getLightStates() { return this.trafficLights.getLightStates(); }
    getCurrentCommand() { return this.trafficLights.getCurrentCommand(); }
    getSensorSystem() { return this.sensorSystem; }
    getSerialController() { return this.serialController; }
    getSettings() { return { ...this.settings }; }
}
