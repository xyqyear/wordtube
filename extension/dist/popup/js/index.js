import { db } from "./utils/db.js";
import { assembleContext, assembleYoutube } from "./utils/assembly.js";
import { downloadText, exportStems } from "./utils/exporting.js";

const wordlistItemTemplate = document.querySelector("#wordlist-item-template");

// ! change the navigation bar
// not navigating to the actual page
// return false if dont need to navigate
function navigate(e) {
  // if the event target is active, then do nothing.
  if (e.currentTarget.classList.contains("nav-active")) {
    return false;
  }
  document
    .getElementsByClassName("nav-active")[0]
    .classList.remove("nav-active");
  e.currentTarget.classList.add("nav-active");
  return true;
}

async function updateNavNumber() {
  const inboxSize = (await db.getInboxList()).length || 0;
  document.getElementById("inbox-size").innerText = inboxSize;

  const unknownSize = (await db.getUnknownList()).length || 0;
  document.getElementById("unknown-size").innerText = unknownSize;

  const knownSize = (await db.getKnownList()).length || 0;
  document.getElementById("known-size").innerText = knownSize;

  const trashSize = (await db.getTrashList()).length || 0;
  document.getElementById("trash-size").innerText = trashSize;

  const exportedList = (await db.getExportedList()).length || 0;
  document.getElementById("exported-size").innerText = exportedList;
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
    let node = wordlistItemTemplate.cloneNode(true);
    node.removeAttribute("id");
    node.getElementsByClassName("list-item-word")[0].innerText = stemObj.word;
    wordlist.appendChild(node);

    // ! show context popup when click
    node.addEventListener("click", async () => {
      const context = await db.getContext(
        stemObj.source,
        stemObj.timestamp,
        30
      );

      // ! show source
      let wordSourceElement = document.getElementById("word-source");
      wordSourceElement.innerText = `${context.author} - ${context.title}`;
      wordSourceElement.href = assembleYoutube(
        stemObj.source,
        stemObj.timestamp
      );

      // ! show the google dictionary link
      let dictLink = document.getElementById("dict-link");
      dictLink.innerText = `Google search - define ${stemObj.word}`;
      dictLink.href = `https://www.google.com/search?q=define%20${stemObj.word}`;

      // ! show context text
      document.getElementById("word-context").innerHTML = assembleContext(
        context.context,
        stemObj.timestamp
      );

      document.getElementById("overlay").classList.remove("hidden");
    });

    // ! button handling
    // if knownHander is not passed in, hide the button
    // otherwise bind the click event to the handler
    const knownButton = node.getElementsByClassName("known-button")[0];
    if (!knownHander) {
      knownButton.remove();
    } else {
      knownButton.addEventListener("click", async (e) => {
        e.stopPropagation();
        await knownHander(node, stemObj);
        await updateNavNumber();
      });
    }

    const unknownButton = node.getElementsByClassName("unknown-button")[0];
    if (!unknownHander) {
      unknownButton.remove();
    } else {
      unknownButton.addEventListener("click", async (e) => {
        e.stopPropagation();
        await unknownHander(node, stemObj);
        await updateNavNumber();
      });
    }

    const trashButton = node.getElementsByClassName("trash-button")[0];
    if (!trashHandler) {
      trashButton.remove();
    } else {
      trashButton.addEventListener("click", async (e) => {
        e.stopPropagation();
        await trashHandler(node, stemObj);
        await updateNavNumber();
      });
    }
  }
}

// ! export button
function hideExportButton() {
  document.getElementById("export-button").classList.add("hidden");
}

function showExportButton() {
  document.getElementById("export-button").classList.remove("hidden");
}

// ! navigation bar bindings
async function populateInbox() {
  await populateWordlist(
    await db.getInboxList(),
    async (node, stemObj) => {
      node.remove();
      await db.removeFromInboxList(stemObj.stem);
      await db.addToKnownList(stemObj.stem);
    },
    async (node, stemObj) => {
      node.remove();
      await db.removeFromInboxList(stemObj.stem);
      await db.addToUnknownList(stemObj.stem);
    },
    async (node, stemObj) => {
      node.remove();
      await db.removeFromInboxList(stemObj.stem);
      await db.addToTrashList(stemObj.stem);
    }
  );
}

async function populateUnknown() {
  await populateWordlist(
    await db.getUnknownList(),
    async (node, stemObj) => {
      node.remove();
      await db.removeFromUnknownList(stemObj.stem);
      await db.addToKnownList(stemObj.stem);
    },
    null,
    async (node, stemObj) => {
      node.remove();
      await db.removeFromUnknownList(stemObj.stem);
      await db.addToTrashList(stemObj.stem);
    }
  );
}

async function populateKnown() {
  await populateWordlist(
    await db.getKnownList(),
    null,
    async (node, stemObj) => {
      node.remove();
      await db.removeFromknownList(stemObj.stem);
      await db.addToUnknownList(stemObj.stem);
    },
    async (node, stemObj) => {
      node.remove();
      await db.removeFromknownList(stemObj.stem);
      await db.addToTrashList(stemObj.stem);
    }
  );
}

async function populateTrash() {
  await populateWordlist(
    await db.getTrashList(),
    async (node, stemObj) => {
      node.remove();
      await db.removeFromTrashList(stemObj.stem);
      await db.addToKnownList(stemObj.stem);
    },
    async (node, stemObj) => {
      node.remove();
      await db.removeFromTrashList(stemObj.stem);
      await db.addToUnknownList(stemObj.stem);
    }
  );
}

async function populateExported() {
  await populateWordlist(
    await db.getExportedList(),
    async (node, stemObj) => {
      node.remove();
      await db.removeFromExportedList(stemObj.stem);
      await db.addToKnownList(stemObj.stem);
    },
    async (node, stemObj) => {
      node.remove();
      await db.removeFromExportedList(stemObj.stem);
      await db.addToUnknownList(stemObj.stem);
    }
  );
}

// ! navigation handling
document.getElementById("inbox-nav").addEventListener("click", async (e) => {
  if (!navigate(e)) {
    return;
  }
  await populateInbox();
  hideExportButton();
});

document.getElementById("unknown-nav").addEventListener("click", async (e) => {
  if (!navigate(e)) {
    return;
  }
  await populateUnknown();
  showExportButton();
});

document.getElementById("known-nav").addEventListener("click", async (e) => {
  if (!navigate(e)) {
    return;
  }
  await populateKnown();
  hideExportButton();
});

document.getElementById("trash-nav").addEventListener("click", async (e) => {
  if (!navigate(e)) {
    return;
  }
  await populateTrash();
  hideExportButton();
});

document.getElementById("exported-nav").addEventListener("click", async (e) => {
  if (!navigate(e)) {
    return;
  }
  await populateExported();
  hideExportButton();
});

// ! export button
document.getElementById("export-button").addEventListener("click", async () => {
  const stemObjList = await db.getUnknownList();
  const exportText = await exportStems(stemObjList);
  await downloadText(exportText, "export.txt");
  // TODO: only move stems to exported list when download finishes
  const stems = stemObjList.map((i) => i.stem);
  await db.removeFromUnknownList(...stems);
  await db.addToExportedList(...stems);
  await updateNavNumber();
  await populateUnknown();
});

// ! overlay stuff
document.getElementById("overlay").addEventListener("click", (e) => {
  e.target.classList.add("hidden");
});

document.getElementById("word-info").addEventListener("click", (e) => {
  e.stopPropagation();
});

updateNavNumber();
populateInbox();
