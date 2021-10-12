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

// hander: function hander(node, stemObj)
function populateWordlist(StemArray, infoHander, knownHander, unknownHander) {
  let wordlist = document.getElementById("wordlist");
  wordlist.innerHTML = "";

  for (const stemObj of StemArray) {
    let node = wordlist_item_template.cloneNode(true);
    node.removeAttribute("id");
    node.getElementsByClassName("word")[0].innerText = stemObj.word;
    wordlist.appendChild(node);

    const infoButton = node.getElementsByClassName("info-button")[0];
    if (!infoHander) {
      infoButton.remove();
    } else {
      infoButton.addEventListener("click", () => infoHander(node, stemObj));
    }

    const knownButton = node.getElementsByClassName("known-button")[0];
    if (!knownHander) {
      knownButton.remove();
    } else {
      knownButton.addEventListener("click", () => knownHander(node, stemObj));
    }

    const unknownButton = node.getElementsByClassName("unknown-button")[0];
    if (!unknownHander) {
      unknownButton.remove();
    } else {
      unknownButton.addEventListener("click", () =>
        unknownHander(node, stemObj)
      );
    }
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
