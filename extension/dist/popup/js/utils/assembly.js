function assembleYoutube(videoID, timestamp) {
  const startTime = timestamp / 1000 - 4;
  return `https://www.youtube.com/watch?v=${videoID}&t=${Math.floor(
    startTime > 0 ? startTime : 0
  )}s`;
}

function assembleContext(context, timestamp) {
  let contextHTML = "...";
  for (const t in context) {
    const word = context[t];
    if (t == timestamp) {
      contextHTML += ` <span class="context-highlight">${word}</span>`;
    } else {
      if (!word.startsWith("'")) {
        contextHTML += " ";
      }
      contextHTML += word;
    }
  }
  contextHTML += " ...";
  return contextHTML;
}

export { assembleYoutube, assembleContext };
