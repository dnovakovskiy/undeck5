// AudioWorkletProcessor hosting the player5 core + unified stereo RMX-1000 &
// per-voice FX DSP (ADR-0004, ADR-0010).
//
// Concatenated with host.js into one Blob module by src/engine/audio-engine.ts
// so the entire audio engine runs inside a single sample-accurate worklet.

/* global EngineHost, AudioWorkletProcessor, registerProcessor, sampleRate, currentFrame */

class Player5Processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.host = null;
    try {
      const { module } = options.processorOptions;
      const api = new WebAssembly.Instance(module, {}).exports;
      this.host = new EngineHost(api, sampleRate, (msg) => this.port.postMessage(msg));
    } catch (err) {
      this.port.postMessage({ type: "error", message: "worklet: " + (err && err.message ? err.message : err) });
    }
    this.port.onmessage = (e) => {
      if (this.host) this.host.onMessage(e.data);
    };
  }

  process(inputs, outputs) {
    const host = this.host;
    if (!host || !host.alive) return false;
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    const input = inputs && inputs[0];
    const inL = input && input[0] ? input[0] : null;
    const inR = input && input[1] ? input[1] : inL;
    const pair = host.processStereo(output[0].length, currentFrame, inL, inR);
    output[0].set(pair[0]);
    if (output.length > 1) output[1].set(pair[1]);
    return true;
  }
}

registerProcessor("player5", Player5Processor);
