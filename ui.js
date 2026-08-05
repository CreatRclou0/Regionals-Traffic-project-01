import { CONFIG } from './config.js';

export class UIController {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.elements = {};
        this.isPlaying = true;
        this.initializeElements();
    }

    initializeElements() {
        const ids = ['playPauseBtn','resetBtn','connectBtn','disconnectBtn','carSpawnRate','carSpeed',
            'spawnValue','speedValue','yellowDuration','yellowValue','detectorDistance','detectorValue',
            'carsPassedStat','avgWaitStat','currentCarsStat',
            'northCountStat','southCountStat','eastCountStat','westCountStat',
            'north-light','east-light','south-light','west-light',
            'connStatus','lastTxPacket','lastRxCommand','currentSignal','roundTripMs',
            'serialErrors','invalidPackets','packetsSent','packetsReceived'];
        ids.forEach(id => { this.elements[id] = document.getElementById(id); });
    }

    initialize() { this.setupEventListeners(); this.startStatsUpdate(); }

    setupEventListeners() {
        this.elements.playPauseBtn.addEventListener('click', () => {
            this.isPlaying = window.trafficSimulator.togglePause();
            this.elements.playPauseBtn.textContent = this.isPlaying ? 'Pause' : 'Play';
        });
        this.elements.resetBtn.addEventListener('click', () => { this.gameEngine.reset(); });
        this.elements.connectBtn.addEventListener('click', async () => { await this.gameEngine.getSerialController().connect(); });
        this.elements.disconnectBtn.addEventListener('click', async () => { await this.gameEngine.getSerialController().disconnect(); });
        this._setupSlider('carSpawnRate', 'spawnValue', 'CAR_SPAWN_RATE');
        this._setupSlider('carSpeed', 'speedValue', 'CAR_SPEED');
        this._setupSlider('yellowDuration', 'yellowValue', 'YELLOW_LIGHT_DURATION');
        this._setupSlider('detectorDistance', 'detectorValue', 'DETECTOR_DISTANCE');
        const serial = this.gameEngine.getSerialController();
        serial.onStatusChange = (status, message) => { this._updateConnStatus(status, message); };
        this._updateConnStatus(serial.isConnected ? 'connected' : 'disconnected');
    }

    _setupSlider(sliderId, valueId, settingKey) {
        const slider = this.elements[sliderId];
        const valueDisplay = this.elements[valueId];
        if (!slider || !valueDisplay) return;
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            valueDisplay.textContent = value;
            this.gameEngine.updateSettings({ [settingKey]: value });
        });
        valueDisplay.textContent = slider.value;
    }

    startStatsUpdate() {
        setInterval(() => { this._updateStatistics(); this._updateLightStatus(); this._updateSerialDebug(); }, 100);
    }

    _updateStatistics() {
        const stats = this.gameEngine.getStatistics();
        const totalCarsDetected = this.gameEngine.getSensorSystem().getTotalCarsDetected();
        this.elements.carsPassedStat.textContent = stats.totalCarsPassed;
        this.elements.avgWaitStat.textContent = stats.averageWaitTime.toFixed(1) + 's';
        this.elements.currentCarsStat.textContent = stats.currentCars;
        this.elements.northCountStat.textContent = totalCarsDetected.north || 0;
        this.elements.southCountStat.textContent = totalCarsDetected.south || 0;
        this.elements.eastCountStat.textContent = totalCarsDetected.east || 0;
        this.elements.westCountStat.textContent = totalCarsDetected.west || 0;
    }

    _updateLightStatus() {
        const lightStates = this.gameEngine.getLightStates();
        const lightElements = {
            [CONFIG.DIRECTIONS.NORTH]: this.elements['north-light'],
            [CONFIG.DIRECTIONS.EAST]: this.elements['east-light'],
            [CONFIG.DIRECTIONS.SOUTH]: this.elements['south-light'],
            [CONFIG.DIRECTIONS.WEST]: this.elements['west-light']
        };
        Object.entries(lightStates).forEach(([direction, state]) => {
            const element = lightElements[direction];
            if (element) { element.classList.remove('red', 'yellow', 'green'); element.classList.add(state); }
        });
    }

    _updateSerialDebug() {
        const info = this.gameEngine.getSerialController().getDebugInfo();
        if (this.elements.lastTxPacket) this.elements.lastTxPacket.textContent = info.lastTxPacket || '-';
        if (this.elements.lastRxCommand) this.elements.lastRxCommand.textContent = info.lastRxCommand || '-';
        if (this.elements.currentSignal) this.elements.currentSignal.textContent = this.gameEngine.getCurrentCommand();
        if (this.elements.roundTripMs) this.elements.roundTripMs.textContent = info.lastRoundTripMs + ' ms';
        if (this.elements.serialErrors) this.elements.serialErrors.textContent = info.serialErrors;
        if (this.elements.invalidPackets) this.elements.invalidPackets.textContent = info.invalidPackets;
        if (this.elements.packetsSent) this.elements.packetsSent.textContent = info.packetsSent;
        if (this.elements.packetsReceived) this.elements.packetsReceived.textContent = info.packetsReceived;
    }

    _updateConnStatus(status, message = '') {
        const el = this.elements.connStatus;
        if (!el) return;
        let text = '', color = '#888';
        switch (status) {
            case 'connected':    text = 'CONNECTED'; color = '#1a7f37'; break;
            case 'disconnected':  text = 'DISCONNECTED'; color = '#888'; break;
            case 'unsupported':   text = 'UNSUPPORTED (Web Serial not available)'; color = '#b00020'; break;
            case 'error':         text = 'ERROR' + (message ? ': ' + message : ''); color = '#b00020'; break;
            default:              text = status;
        }
        el.textContent = text;
        el.style.color = color;
    }
}
