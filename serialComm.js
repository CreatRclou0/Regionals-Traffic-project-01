export const SERIAL_COMMANDS = {
    NS_GREEN: 'NS_GREEN',
    NS_YELLOW: 'NS_YELLOW',
    EW_GREEN: 'EW_GREEN',
    EW_YELLOW: 'EW_YELLOW',
    ALL_RED: 'ALL_RED'
};

const VALID_COMMANDS = new Set(Object.values(SERIAL_COMMANDS));
const DIRECTION_ORDER = ['north', 'south', 'east', 'west'];
const PACKET_SEND_INTERVAL_MS = 100;
const RECONNECT_DELAY_MS = 2000;

export class SerialController {
    constructor() {
        this.port = null;
        this.writer = null;
        this.reader = null;
        this.readableStream = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.rxBuffer = '';
        this.lastTxPacket = '';
        this.lastTxTimestamp = 0;
        this.lastRxCommand = '';
        this.lastRxTimestamp = 0;
        this.lastRoundTripMs = 0;
        this.serialErrors = 0;
        this.invalidPackets = 0;
        this.packetsSent = 0;
        this.packetsReceived = 0;
        this.sendTimer = null;
        this.reconnectTimer = null;
        this.readLoopRunning = false;
        this.onCommand = null;
        this.onStatusChange = null;
        this.currentSensorData = null;
    }

    isSupported() {
        return typeof navigator !== 'undefined' && 'serial' in navigator;
    }

    async connect() {
        if (this.isConnected || this.isConnecting) return true;
        if (!this.isSupported()) { this._notifyStatus('unsupported'); return false; }
        this.isConnecting = true;
        try {
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 115200 });
            this.isConnected = true;
            this.isConnecting = false;
            this.serialErrors = 0;
            this._notifyStatus('connected');
            this._startReadLoop();
            this._startSendLoop();
            return true;
        } catch (err) {
            this.isConnecting = false;
            this.serialErrors++;
            this._notifyStatus('error', err.message);
            return false;
        }
    }

    async disconnect() {
        this._stopSendLoop();
        this._stopReconnectTimer();
        await this._closePort();
        this.isConnected = false;
        this._notifyStatus('disconnected');
    }

    async _closePort() {
        try { if (this.reader) { await this.reader.cancel(); this.reader = null; } } catch (_) {}
        try { if (this.readableStream) { await this.readableStream.releaseLock(); this.readableStream = null; } } catch (_) {}
        try { if (this.writer) { await this.writer.releaseLock(); this.writer = null; } } catch (_) {}
        try { if (this.port) { await this.port.close(); } } catch (_) {}
    }

    _startReadLoop() {
        if (this.readLoopRunning) return;
        this.readLoopRunning = true;
        this._readLoop();
    }

    async _readLoop() {
        while (this.isConnected && this.port) {
            try {
                if (!this.readableStream) {
                    this.readableStream = this.port.readable;
                    if (!this.readableStream) break;
                    this.reader = this.readableStream.getReader();
                }
                const { value, done } = await this.reader.read();
                if (done) break;
                if (value) { this._processIncoming(new TextDecoder().decode(value)); }
            } catch (err) {
                this.serialErrors++;
                this._notifyStatus('error', err.message);
                break;
            }
        }
        this.readLoopRunning = false;
        if (this.isConnected) {
            this.isConnected = false;
            this._notifyStatus('disconnected');
            this._scheduleReconnect();
        }
    }

    _processIncoming(text) {
        this.rxBuffer += text;
        let idx;
        while ((idx = this.rxBuffer.indexOf('\n')) !== -1) {
            const line = this.rxBuffer.slice(0, idx).trim();
            this.rxBuffer = this.rxBuffer.slice(idx + 1);
            if (!line) continue;
            this._handleLine(line);
        }
    }

    _handleLine(line) {
        const now = performance.now();
        if (this.lastTxTimestamp) this.lastRoundTripMs = Math.round(now - this.lastTxTimestamp);
        this.lastRxTimestamp = now;
        const upper = line.toUpperCase().replace(/\s+/g, '');
        if (VALID_COMMANDS.has(upper)) {
            this.lastRxCommand = upper;
            this.packetsReceived++;
            if (this.onCommand) this.onCommand(upper);
        } else { this.invalidPackets++; }
    }

    _startSendLoop() { this._stopSendLoop(); this.sendTimer = setInterval(() => this._sendPacket(), PACKET_SEND_INTERVAL_MS); }
    _stopSendLoop() { if (this.sendTimer) { clearInterval(this.sendTimer); this.sendTimer = null; } }

    setSensorData(data) { this.currentSensorData = data; }

    _buildPacket() {
        if (!this.currentSensorData) return '';
        const parts = [];
        for (const dir of DIRECTION_ORDER) {
            const d = this.currentSensorData[dir] || {};
            parts.push(`${d.carsWaiting||0},${d.carsApproaching||0},${d.carsPassed||0},${((d.waitTime||0)/1000).toFixed(1)}`);
        }
        return parts.join(',') + '\n';
    }

    async _sendPacket() {
        if (!this.isConnected || !this.port) return;
        const packet = this._buildPacket();
        if (!packet) return;
        try {
            if (!this.writer) this.writer = this.port.writable.getWriter();
            this.lastTxPacket = packet.trim();
            this.lastTxTimestamp = performance.now();
            await this.writer.write(new TextEncoder().encode(packet));
            this.packetsSent++;
        } catch (err) { this.serialErrors++; this._notifyStatus('error', err.message); }
    }

    _scheduleReconnect() {
        this._stopReconnectTimer();
        this.reconnectTimer = setInterval(async () => {
            if (!this.isConnected && this.port) {
                try {
                    await this.port.open({ baudRate: 115200 });
                    this.isConnected = true;
                    this._stopReconnectTimer();
                    this._notifyStatus('connected');
                    this._startReadLoop();
                    this._startSendLoop();
                } catch (_) {}
            }
        }, RECONNECT_DELAY_MS);
    }

    _stopReconnectTimer() { if (this.reconnectTimer) { clearInterval(this.reconnectTimer); this.reconnectTimer = null; } }
    _notifyStatus(status, message = '') { if (this.onStatusChange) this.onStatusChange(status, message); }

    getDebugInfo() {
        return {
            isConnected: this.isConnected,
            lastTxPacket: this.lastTxPacket,
            lastRxCommand: this.lastRxCommand,
            lastRoundTripMs: this.lastRoundTripMs,
            serialErrors: this.serialErrors,
            invalidPackets: this.invalidPackets,
            packetsSent: this.packetsSent,
            packetsReceived: this.packetsReceived,
            lastRxAge: this.lastRxTimestamp ? Math.round(performance.now() - this.lastRxTimestamp) : -1
        };
    }
}
