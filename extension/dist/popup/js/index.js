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
function populateWordlist(StemArray, knownHander, unknownHander) {
  let wordlist = document.getElementById("wordlist");
  wordlist.innerHTML = "";

  for (const stemObj of StemArray) {
    let node = wordlist_item_template.cloneNode(true);
    node.removeAttribute("id");
    node.getElementsByClassName("word")[0].innerText = stemObj.word;
    wordlist.appendChild(node);

    node.addEventListener("click", () => {
      document.getElementById("overlay").classList.remove("hidden");
      // ! TODO: Add word info
    });

    const knownButton = node.getElementsByClassName("known-button")[0];
    if (!knownHander) {
      knownButton.remove();
    } else {
      knownButton.addEventListener("click", (e) => {
        e.stopPropagation();
        knownHander(node, stemObj);
      });
    }

    const unknownButton = node.getElementsByClassName("unknown-button")[0];
    if (!unknownHander) {
      unknownButton.remove();
    } else {
      unknownButton.addEventListener("click", (e) => {
        e.stopPropagation();
        unknownHander(node, stemObj);
      });
    }
  }
}

// navigation bar bindings

async function populateInbox() {
  populateWordlist(
    await db.getInboxList(),
    (node, stemObj) => {
      node.remove();
      db.removeFromInboxList(stemObj.stem);
      db.addToKnownList(stemObj.stem);
    },
    (node, stemObj) => {
      node.remove();
      db.removeFromInboxList(stemObj.stem);
      db.addToUnknownList(stemObj.stem);
    }
  );
}

async function populateUnknown() {
  populateWordlist(await db.getUnknownList(), (node, stemObj) => {
    node.remove();
    db.removeFromInboxList(stemObj.stem);
    db.addToKnownList(stemObj.stem);
  });
}

async function populateKnown() {
  populateWordlist(await db.getKnownList(), null, (node, stemObj) => {
    node.remove();
    db.removeFromInboxList(stemObj.stem);
    db.addToUnknownList(stemObj.stem);
  });
}

document.getElementById("inbox-nav").addEventListener("click", async (e) => {
  if (!navigate(e)) {
    return;
  }
  await populateInbox();
});

document.getElementById("unknown-nav").addEventListener("click", async (e) => {
  if (!navigate(e)) {
    return;
  }
  await populateUnknown();
});

document.getElementById("known-nav").addEventListener("click", async (e) => {
  if (!navigate(e)) {
    return;
  }
  await populateKnown();
});

populateInbox();

// overlay stuff

document.getElementById("overlay").addEventListener("click", (e) => {
  e.target.classList.add("hidden");
});

document.getElementById("word-info").addEventListener("click", (e) => {
  e.stopPropagation();
});
