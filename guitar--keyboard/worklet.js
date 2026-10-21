/* Fretorgan audio worklet: runs the WebAssembly engine on the audio thread,
   128 samples at a time, and reports the keys it is playing about 30 times a second. */
class Fretorgan extends AudioWorkletProcessor {
  constructor() {
    super();
    this.x = null; this.since = 0; this.peak = 0;
    this.port.onmessage = (e) => {
      const m = e.data;
      if (m.type === "init") {
        const inst = new WebAssembly.Instance(new WebAssembly.Module(m.bytes), {});
        this.x = inst.exports;
        this.x.wf_init(sampleRate);
        this.x.wf_preset(m.preset);
        this.x.wf_mix(m.mix, m.vol);
        this.x.wf_process(0);
        this.port.postMessage({ type: "ready" });
      } else if (this.x && m.type === "preset") this.x.wf_preset(m.preset);
      else if (this.x && m.type === "mix") this.x.wf_mix(m.mix, m.vol);
      else if (this.x && m.type === "reset") this.x.wf_reset();
    };
  }
  process(inputs, outputs) {
    const out = outputs[0];
    if (!this.x) { for (const ch of out) ch.fill(0); return true; }
    const n = out[0].length, x = this.x;
    const mem = new Float32Array(x.memory.buffer);
    const inp = inputs[0], pin = x.wf_in() >> 2;
    if (inp && inp.length) {
      const a = inp[0], b = inp.length > 1 ? inp[1] : null;
      for (let i = 0; i < n; i++) {
        const v = b ? 0.5 * (a[i] + b[i]) : a[i];
        mem[pin + i] = v;
        const av = v < 0 ? -v : v; if (av > this.peak) this.peak = av;
      }
    } else mem.fill(0, pin, pin + n);
    x.wf_process(n);
    const L = x.wf_out_l() >> 2, R = x.wf_out_r() >> 2;
    out[0].set(mem.subarray(L, L + n));
    if (out.length > 1) out[1].set(mem.subarray(R, R + n));
    this.since += n;
    if (this.since >= sampleRate / 30) {
      this.since = 0;
      const k = x.wf_read_keys(), p = x.wf_keys() >> 2;
      this.port.postMessage({ type: "keys", keys: mem.slice(p, p + 2 * k), peak: this.peak });
      this.peak = 0;
    }
    return true;
  }
}
registerProcessor("fretorgan", Fretorgan);
