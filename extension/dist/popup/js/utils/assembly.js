function assembleYoutube(videoID, timestamp) {
  let baseLink = `https://www.youtube.com/watch?v=${videoID}`;
  if (timestamp) {
    const startTime = timestamp / 1000 - 4;
    return `${baseLink}&t=${Math.floor(startTime > 0 ? startTime : 0)}s`;
  }
  return baseLink;
}

function assembleContext(context, timestamp) {
  let contextHTML = "...";
  for (const t in context) {
    const word = context[t];
    if (t == timestamp) {
      contextHTML += ` <span class="context-highlight">${word}</span>`;
    } else {
      if (!/^('.*|n't)$/.test(word)) {
        contextHTML += " ";
      }
      contextHTML += word;
    }
  }
  contextHTML += " ...";
  return contextHTML;
}

export { assembleYoutube, assembleContext };
