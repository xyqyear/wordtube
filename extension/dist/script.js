let script = document.createElement("script");
script.setAttribute("src", chrome.runtime.getURL("inject.js"));
document.documentElement.appendChild(script);

document.addEventListener("gotTranscript", (e) => {
  chrome.runtime.sendMessage(e.detail);
});
