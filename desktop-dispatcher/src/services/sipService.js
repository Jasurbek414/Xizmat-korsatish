// SIP / VoIP Softphone Simulation Service with Web Audio DTMF & Tone Generation
class SipService {
  constructor() {
    this.audioCtx = null;
    this.config = null;
    this.status = 'DISCONNECTED'; // DISCONNECTED, CONNECTING, CONNECTED (for active line)
    this.callState = 'IDLE'; // IDLE, DIALING, RINGING, ACTIVE, HOLD
    this.callNumber = '';
    this.callClientName = '';
    this.callStartTime = null;
    this.isMuted = false;
    this.isHeld = false;
    
    // Tones and sounds refs
    this.activeOscillators = [];
    this.ringInterval = null;
    
    // Listeners
    this.listeners = {
      statusChange: [],
      callStateChange: [],
      incomingCall: [],
      callEnded: [],
      linesStatusChange: []
    };

    // Multi-line specific state
    this.lineStatuses = {};
    this.activeLineId = null;
    this.lines = [];
  }

  // Initialize Audio Context on demand (user interaction)
  initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // Listeners registration
  addEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  removeEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  trigger(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  // Load lines from local storage and sync statuses
  loadLines() {
    const storedLines = JSON.parse(localStorage.getItem('dispatcher_sip_lines')) || [];
    this.lines = storedLines;
    
    // Find active line
    const active = storedLines.find(l => l.isActive);
    if (active) {
      this.activeLineId = active.id;
      this.config = active;
    } else if (storedLines.length > 0) {
      this.activeLineId = storedLines[0].id;
      this.config = storedLines[0];
    } else {
      this.activeLineId = null;
      this.config = null;
    }

    // Initialize line statuses (if previously connected, restore status)
    storedLines.forEach(l => {
      if (this.lineStatuses[l.id] === undefined) {
        this.lineStatuses[l.id] = l.connected ? 'CONNECTED' : 'DISCONNECTED';
      }
    });

    // Update overall status reflecting the active line
    if (this.activeLineId) {
      this.status = this.lineStatuses[this.activeLineId] || 'DISCONNECTED';
    } else {
      this.status = 'DISCONNECTED';
    }
  }

  // Initialize service on startup
  initialize() {
    this.loadLines();
    this.trigger('linesStatusChange', { lineStatuses: this.lineStatuses, activeLineId: this.activeLineId });
    this.trigger('statusChange', this.status);
  }

  // SIP Registration Actions for a specific line
  connectLine(lineId) {
    const lines = JSON.parse(localStorage.getItem('dispatcher_sip_lines')) || [];
    const lineIndex = lines.findIndex(l => l.id === lineId);
    if (lineIndex === -1) return;

    this.lineStatuses[lineId] = 'CONNECTING';
    this.trigger('linesStatusChange', { lineStatuses: this.lineStatuses, activeLineId: this.activeLineId });
    
    if (lineId === this.activeLineId) {
      this.status = 'CONNECTING';
      this.trigger('statusChange', this.status);
    }

    setTimeout(() => {
      this.lineStatuses[lineId] = 'CONNECTED';
      
      // Update local storage
      const updatedLines = [...lines];
      updatedLines[lineIndex] = { ...updatedLines[lineIndex], connected: true };
      localStorage.setItem('dispatcher_sip_lines', JSON.stringify(updatedLines));
      window.dispatchEvent(new Event('storage'));

      this.trigger('linesStatusChange', { lineStatuses: this.lineStatuses, activeLineId: this.activeLineId });

      if (lineId === this.activeLineId) {
        this.status = 'CONNECTED';
        this.trigger('statusChange', this.status);
        this.playBeep(660, 0.08);
        setTimeout(() => this.playBeep(880, 0.12), 80);
      }
    }, 1500);
  }

  disconnectLine(lineId) {
    const lines = JSON.parse(localStorage.getItem('dispatcher_sip_lines')) || [];
    const lineIndex = lines.findIndex(l => l.id === lineId);
    if (lineIndex === -1) return;

    this.lineStatuses[lineId] = 'DISCONNECTED';
    
    // Update local storage
    const updatedLines = [...lines];
    updatedLines[lineIndex] = { ...updatedLines[lineIndex], connected: false };
    localStorage.setItem('dispatcher_sip_lines', JSON.stringify(updatedLines));
    window.dispatchEvent(new Event('storage'));

    // If this was active line and calling, end call
    if (lineId === this.activeLineId && this.callState !== 'IDLE') {
      this.hangUp();
    }

    this.trigger('linesStatusChange', { lineStatuses: this.lineStatuses, activeLineId: this.activeLineId });

    if (lineId === this.activeLineId) {
      this.status = 'DISCONNECTED';
      this.trigger('statusChange', this.status);
    }
  }

  setActiveLine(lineId) {
    const lines = JSON.parse(localStorage.getItem('dispatcher_sip_lines')) || [];
    const line = lines.find(l => l.id === lineId);
    if (!line) return;

    this.activeLineId = lineId;
    this.config = line;
    
    // Update local storage active flag
    const updatedLines = lines.map(l => ({ ...l, isActive: l.id === lineId }));
    localStorage.setItem('dispatcher_sip_lines', JSON.stringify(updatedLines));
    window.dispatchEvent(new Event('storage'));

    // Update single-line status representing the active line
    this.status = this.lineStatuses[lineId] || 'DISCONNECTED';
    this.trigger('statusChange', this.status);
    
    this.trigger('linesStatusChange', { lineStatuses: this.lineStatuses, activeLineId: this.activeLineId });
    this.playBeep(800, 0.1);
  }

  // Backward compatibility connect/disconnect triggers for active line
  connect(config) {
    this.loadLines();
    if (this.activeLineId) {
      this.connectLine(this.activeLineId);
    }
  }

  disconnect() {
    if (this.activeLineId) {
      this.disconnectLine(this.activeLineId);
    }
  }

  // Play a simple frequency beep using Web Audio
  playBeep(frequency, duration) {
    this.initAudio();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = frequency;
      
      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  // DTMF key press tone generation (Dual-Tone Multi-Frequency)
  playDtmf(digit) {
    this.initAudio();
    
    // DTMF Frequency grid
    const dtmfFreqs = {
      '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
      '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
      '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
      '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
    };

    const freqs = dtmfFreqs[digit];
    if (!freqs) return;

    try {
      // Stop any running oscillators
      this.stopActiveTones();

      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];

      gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start();
      osc2.start();

      this.activeOscillators = [osc1, osc2];

      // Auto-stop in 0.15s
      setTimeout(() => {
        this.stopActiveTones();
      }, 150);
    } catch (e) {
      console.warn(e);
    }
  }

  stopActiveTones() {
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {}
    });
    this.activeOscillators = [];
  }

  // Start outgoing ringback tone simulation (400Hz + 450Hz, 1.5s on, 3s off)
  startRingbackTone() {
    this.initAudio();
    const playRingCycle = () => {
      if (this.callState !== 'DIALING') return;
      try {
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.frequency.value = 400;
        osc2.frequency.value = 450;
        gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime + 1.5);
        gain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.audioCtx.currentTime + 1.8);
        osc2.stop(this.audioCtx.currentTime + 1.8);
      } catch (e) {}
    };

    playRingCycle();
    this.ringInterval = setInterval(playRingCycle, 4000);
  }

  // Start incoming ringtone simulation
  startRingtone() {
    this.initAudio();
    const playRingCycle = () => {
      if (this.callState !== 'RINGING') return;
      // High pitch telephone chime
      this.playBeep(880, 0.15);
      setTimeout(() => this.playBeep(880, 0.15), 180);
      setTimeout(() => this.playBeep(1100, 0.3), 360);
    };

    playRingCycle();
    this.ringInterval = setInterval(playRingCycle, 3000);
  }

  stopRinging() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  // Call Control APIs
  makeCall(number, clientName = null) {
    if (this.status !== 'CONNECTED') return false;
    this.callState = 'DIALING';
    this.callNumber = number;
    this.callClientName = clientName || '';
    this.isMuted = false;
    this.isHeld = false;
    
    // Set active line to BUSY
    if (this.activeLineId) {
      this.lineStatuses[this.activeLineId] = 'BUSY';
      this.trigger('linesStatusChange', { lineStatuses: this.lineStatuses, activeLineId: this.activeLineId });
    }

    this.trigger('callStateChange', { state: this.callState, number, clientName });
    this.startRingbackTone();

    // Auto-connect call after 3 seconds of dialing
    setTimeout(() => {
      if (this.callState === 'DIALING') {
        this.stopRinging();
        this.callState = 'ACTIVE';
        this.callStartTime = Date.now();
        this.playBeep(880, 0.1); // connected chirp
        this.trigger('callStateChange', { state: this.callState, number, clientName, startTime: this.callStartTime });
      }
    }, 3500);

    return true;
  }

  simulateIncomingCall(number, clientName = null) {
    if (this.callState !== 'IDLE') return false;
    
    // Route call to a random connected line
    const connectedLineIds = Object.keys(this.lineStatuses).filter(id => this.lineStatuses[id] === 'CONNECTED');
    if (connectedLineIds.length === 0) return false; // no connected line available

    const randomLineId = connectedLineIds[Math.floor(Math.random() * connectedLineIds.length)];
    const lines = JSON.parse(localStorage.getItem('dispatcher_sip_lines')) || [];
    const targetLine = lines.find(l => l.id === randomLineId);
    const lineLabel = targetLine ? targetLine.label : 'SIP Liniya';

    this.callState = 'RINGING';
    this.callNumber = number;
    this.callClientName = clientName || '';
    this.isMuted = false;
    this.isHeld = false;

    // Mark that specific line as BUSY/RINGING
    this.lineStatuses[randomLineId] = 'BUSY';
    this.trigger('linesStatusChange', { lineStatuses: this.lineStatuses, activeLineId: this.activeLineId });

    this.trigger('incomingCall', { 
      number, 
      clientName, 
      lineId: randomLineId, 
      lineLabel: lineLabel,
      lineExtension: targetLine ? targetLine.extension : ''
    });
    this.trigger('callStateChange', { state: this.callState, number, clientName });
    this.startRingtone();
    return true;
  }

  answerCall() {
    if (this.callState !== 'RINGING') return;
    this.stopRinging();
    this.callState = 'ACTIVE';
    this.callStartTime = Date.now();
    this.playBeep(880, 0.15);
    this.trigger('callStateChange', { state: this.callState, number: this.callNumber, clientName: this.callClientName, startTime: this.callStartTime });
  }

  rejectCall() {
    if (this.callState !== 'RINGING') return;
    this.stopRinging();
    this.playBeep(400, 0.3); // busy beep
    const oldCall = { number: this.callNumber, clientName: this.callClientName };
    this.callState = 'IDLE';
    this.callNumber = '';
    this.callClientName = '';

    // Reset lines status
    Object.keys(this.lineStatuses).forEach(id => {
      if (this.lineStatuses[id] === 'BUSY') {
        const lines = JSON.parse(localStorage.getItem('dispatcher_sip_lines')) || [];
        const line = lines.find(l => l.id === id);
        this.lineStatuses[id] = line && line.connected ? 'CONNECTED' : 'DISCONNECTED';
      }
    });
    this.trigger('linesStatusChange', { lineStatuses: this.lineStatuses, activeLineId: this.activeLineId });

    this.trigger('callStateChange', { state: this.callState });
    this.trigger('callEnded', { ...oldCall, duration: '--', status: 'MISSED' });
  }

  hangUp() {
    if (this.callState === 'IDLE') return;
    this.stopRinging();
    
    let duration = '--';
    if (this.callStartTime) {
      const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      duration = `${mins}m ${secs}s`;
    }

    const oldCall = { 
      number: this.callNumber, 
      clientName: this.callClientName,
      duration,
      status: this.callStartTime ? 'ANSWERED' : 'CANCELLED'
    };

    this.callState = 'IDLE';
    this.callNumber = '';
    this.callClientName = '';
    this.callStartTime = null;
    this.isMuted = false;
    this.isHeld = false;

    // Reset lines status
    Object.keys(this.lineStatuses).forEach(id => {
      if (this.lineStatuses[id] === 'BUSY') {
        const lines = JSON.parse(localStorage.getItem('dispatcher_sip_lines')) || [];
        const line = lines.find(l => l.id === id);
        this.lineStatuses[id] = line && line.connected ? 'CONNECTED' : 'DISCONNECTED';
      }
    });
    this.trigger('linesStatusChange', { lineStatuses: this.lineStatuses, activeLineId: this.activeLineId });

    this.playBeep(440, 0.1);
    setTimeout(() => this.playBeep(330, 0.15), 100); // disconnected beep

    this.trigger('callStateChange', { state: this.callState });
    this.trigger('callEnded', oldCall);
  }

  toggleMute() {
    if (this.callState !== 'ACTIVE' && this.callState !== 'HOLD') return;
    this.isMuted = !this.isMuted;
    this.trigger('callStateChange', { state: this.callState, number: this.callNumber, clientName: this.callClientName, startTime: this.callStartTime, isMuted: this.isMuted, isHeld: this.isHeld });
    this.playBeep(this.isMuted ? 500 : 700, 0.05);
  }

  toggleHold() {
    if (this.callState !== 'ACTIVE' && this.callState !== 'HOLD') return;
    this.isHeld = !this.isHeld;
    this.callState = this.isHeld ? 'HOLD' : 'ACTIVE';
    this.trigger('callStateChange', { state: this.callState, number: this.callNumber, clientName: this.callClientName, startTime: this.callStartTime, isMuted: this.isMuted, isHeld: this.isHeld });
    this.playBeep(this.isHeld ? 600 : 800, 0.08);
  }
}

// Export singleton instance
const sipService = new SipService();
export default sipService;
