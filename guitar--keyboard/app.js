
console.log("app.js loaded");
let ctx = null; // avoid the audio context refreshing

document.getElementById("start").addEventListener("click", () => {
if (ctx){ 
    console.log("Already started");
    return;
}
ctx = new AudioContext({ latencyHint: "interactive"}); // makes sure browser can accept smallest delay possible, as the app is live
console.log("state:", ctx.state, "sample rate", ctx.sampleRate);
});