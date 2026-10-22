// Start handler
console.log("app.js loaded");
let ctx = null; // avoid the audio context refreshing
let node = null;
let source = null;


document.getElementById("Demo").addEventListener("click", async () => {
if (ctx){ 
    console.log("Already started");
    return;
}
ctx = new AudioContext({ latencyHint: "interactive"}); // makes sure browser can accept smallest delay possible, as the app is live

await ctx.audioWorklet.addModule("worklet.js");

node = new audioWorkletNode(ctx, "Guitar--Keyboard", {outputChannelCount: [2]});
node.connect(ctx.destination);

node.port.onmessage = (e) => {
    console.log("from engine:", e.data.type, e.data);
};

const response = await fetch("fretorgan.wasm")
const bytes = await response.arrayBuffer
const preset = Number(document.getElementById("preset").value);
node.port.postMessage({type: "init", bytes: bytes, preset: preset, mix: 1, vol: 0});
});


document.getElementById("Demo").addEventListener("click", async() => {
    if (!node) { console.log("press start first"); return; }
    stopSource();

    const response = await fetch("audio/chords.mp3");
    const audio = await ctx.decodeAudioData(await response.arrayBuffer());

    source = ctx.createBufferSource();
    source.buffer = audio;
    source.loop = true;
    source.connect(node);
    source.start();
});

function stopSource(){
    if (source){
        source.stop();
        source.disconnect();
        source = null;
    }
    if (node) node.port.postMessage({type: "reset"});
}

document.getElementById("stop").addEventListener("click", stopSource);

// preset menu change
document.getElementById("preset").addEventListener("change", (e) => {
    const preset = Number(e.target.value);
    console.log("preset", preset);
    if (node) node.port.postMessage({ type: "preset", preset: preset});
});
