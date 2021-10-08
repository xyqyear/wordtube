const wordlistInbox = ["kekw", "lul", "wtf"];
const wordlistUnknown = ["really", "complicated", "words"];
const wordlistKnown = ["what", "is", "this", "shit"];

const wordlist_item_template = document.querySelector("#templates");
// change the navigation bar
// not navigating to the actual page
// return false if dont need to navigate
function navigate(e) {
  // if the event target is active, then do nothing.
  if (e.target.classList.contains("active")) {
    return false;
  }
  document.getElementsByClassName("active")[0].classList.remove("active");
  e.target.classList.add("active");
  return true;
}

function populateWordlist(wordArray) {
  let wordlist = document.getElementById("wordlist");
  wordlist.innerHTML = "";

  for (word of wordArray) {
    let node = wordlist_item_template.cloneNode(true);
    node.id = "";
    node.getElementsByClassName("word")[0].innerText = word;
    wordlist.appendChild(node);
  }
}

// navigation bar bindings
document.getElementById("inbox-nav").addEventListener("click", (e) => {
  if (!navigate(e)) {
    return;
  }
  populateWordlist(wordlistInbox);
});

document.getElementById("unknown-nav").addEventListener("click", (e) => {
  if (!navigate(e)) {
    return;
  }
  populateWordlist(wordlistUnknown);
});

document.getElementById("known-nav").addEventListener("click", (e) => {
  if (!navigate(e)) {
    return;
  }

  populateWordlist(wordlistKnown);
});

populateWordlist(wordlistInbox);
