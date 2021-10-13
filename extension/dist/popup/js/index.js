import { db } from "./utils/db.js";

const wordlist_item_template = document.querySelector(
  "#wordlist-item-template"
);

// ! change the navigation bar
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

// ! populate word list
async function populateWordlist(
  StemArray,
  knownHander,
  unknownHander,
  trashHandler
) {
  let wordlist = document.getElementById("wordlist");
  wordlist.innerHTML = "";

  for (const stemObj of StemArray) {
    // ! insert list item
    let node = wordlist_item_template.cloneNode(true);
    node.removeAttribute("id");
    node.getElementsByClassName("word")[0].innerText = stemObj.word;
    wordlist.appendChild(node);

    // ! show context popup when click
    node.addEventListener("click", async () => {
      const context = await db.getContext(
        stemObj.source,
        stemObj.timestamp,
        20
      );

      // ! show source
      let wordSourceElement = document.getElementById("word-source");
      wordSourceElement.innerText = `${context.author} - ${context.title}`;
      const startTime = stemObj.timestamp / 1000 - 3;
      wordSourceElement.href = `https://www.youtube.com/watch?v=${
        stemObj.source
      }&t=${startTime > 0 ? startTime : 0}s`;

      // ! show context text
      let contextHTML = "...";
      for (const t in context.context) {
        const word = context.context[t];
        if (t == stemObj.timestamp) {
          contextHTML += ` <span class="context-highlight">${word}</span>`;
        } else {
          if (!word.startsWith("'")) {
            contextHTML += " ";
          }
          contextHTML += word;
        }
      }
      contextHTML += " ...";
      document.getElementById("word-context").innerHTML = contextHTML;

      document.getElementById("overlay").classList.remove("hidden");
    });

    // ! button handling
    // if knownHander is not passed in, hide the button
    // otherwise bind the click event to the handler
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

    const trashButton = node.getElementsByClassName("trash-button")[0];
    if (!trashHandler) {
      trashButton.remove();
    } else {
      trashButton.addEventListener("click", (e) => {
        e.stopPropagation();
        trashHandler(node, stemObj);
      });
    }
  }
}

// navigation bar bindings

async function populateInbox() {
  await populateWordlist(
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
  await populateWordlist(await db.getUnknownList(), (node, stemObj) => {
    node.remove();
    db.removeFromUnknownList(stemObj.stem);
    db.addToKnownList(stemObj.stem);
  });
}

async function populateKnown() {
  await populateWordlist(await db.getKnownList(), null, (node, stemObj) => {
    node.remove();
    db.removeFromknownList(stemObj.stem);
    db.addToUnknownList(stemObj.stem);
  });
}

// ! navigation handling
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

// ! overlay stuff
document.getElementById("overlay").addEventListener("click", (e) => {
  e.target.classList.add("hidden");
});

document.getElementById("word-info").addEventListener("click", (e) => {
  e.stopPropagation();
});
