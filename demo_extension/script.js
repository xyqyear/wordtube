let script = document.createElement("script");
script.setAttribute("src", chrome.runtime.getURL("inject.js"));
document.documentElement.appendChild(script);

document.addEventListener("gotTranscript", (e) => {
  console.log(e.detail);
});

console.log(window.location.href.split("=")[1]);
