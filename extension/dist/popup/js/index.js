import { db } from "./utils/db.js";

const wordlist_item_template = document.querySelector(
  "#wordlist-item-template"
);

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

  for (const word of wordArray) {
    let node = wordlist_item_template.cloneNode(true);
    node.id = "";
    node.getElementsByClassName("word")[0].innerText = word;
    wordlist.appendChild(node);
  }
}

// navigation bar bindings
document.getElementById("inbox-nav").addEventListener("click", async (e) => {
  if (!navigate(e)) {
    return;
  }
  populateWordlist(await db.getInboxList());
});

document.getElementById("unknown-nav").addEventListener("click", async (e) => {
  if (!navigate(e)) {
    return;
  }
  populateWordlist(await db.getUnknownList());
});

document.getElementById("known-nav").addEventListener("click", async (e) => {
  if (!navigate(e)) {
    return;
  }
  populateWordlist(await db.getKnownList());
});

populateWordlist(await db.getInboxList());
