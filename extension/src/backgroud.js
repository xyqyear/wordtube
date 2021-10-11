const natural = require("natural");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(sender.tab.url);
  console.log(request);

  const tokenizer = new natural.WordTokenizer();
  console.log(tokenizer.tokenize("I finally got this dog shit working."));
});
