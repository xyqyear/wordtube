import { db } from "./utils/db.js";
import { assembleContext, assembleYoutube } from "./utils/assembly.js";
import { downloadText, exportStems } from "./utils/exporting.js";

const wordlistItemTemplate = document.querySelector("#wordlist-item-template");

// * change the navigation bar

// not navigating to the actual page
// return false if dont need to navigate
function navigate(e) {
  // if the event target is active, then do nothing.
  if (e.currentTarget.classList.contains("nav-active")) {
    return false;
  }
  document.querySelector(".nav-active").classList.remove("nav-active");
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

  chrome.action.setBadgeText({ text: inboxSize.toString() });
}

// * populate word list

async function populateWordlist(
  StemArray,
  knownHander,
  unknownHander,
  trashHandler
) {
  let wordlist = document.getElementById("wordlist");
  wordlist.innerHTML = "";

  for (const stemObj of StemArray) {
    // * insert list item

    let node = wordlistItemTemplate.cloneNode(true);
    node.removeAttribute("id");
    node.querySelector(".list-item-word").innerText = stemObj.word;
    wordlist.appendChild(node);

    // * show context popup when click

    node.addEventListener("click", async () => {
      const context = await db.getContext(
        stemObj.source,
        stemObj.timestamp,
        30
      );

      // * show source

      let wordSourceElement = document.getElementById("word-source");
      wordSourceElement.innerText = `${context.author} - ${context.title}`;
      wordSourceElement.href = assembleYoutube(
        stemObj.source,
        stemObj.timestamp
      );

      // * show the google dictionary link

      let dictLink = document.getElementById("dict-link");
      dictLink.innerText = `Google search - define ${stemObj.word}`;
      dictLink.href = `https://www.google.com/search?q=define%20${stemObj.word}`;

      // * show context text

      document.getElementById("word-context").innerHTML = assembleContext(
        context.context,
        stemObj.timestamp
      );

      document.getElementById("overlay").classList.remove("hidden");
    });

    // * button handling

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

// * incoming video list stuff

async function populateIncomingVideosList() {
  const incomingVideosElement = document.getElementById("incoming-videos");
  incomingVideosElement.innerHTML = "";
  const incomingVideosItemTemplate = document.getElementById(
    "incoming-videos-item-template"
  );

  const incomingVideos = await db.getIncomingVideos();
  for (const videoID in incomingVideos) {
    // only use title for now
    const videoInfo = await db.getVideoInfo(videoID);

    // * insert list item

    let node = incomingVideosItemTemplate.cloneNode(true);
    node.removeAttribute("id");
    const titleElement = node.querySelector(".incoming-vidoes-title");
    titleElement.innerText = videoInfo.title;
    titleElement.href = assembleYoutube(videoID);
    incomingVideosElement.appendChild(node);

    // * add listeners to buttons

    node.querySelector(".reject-button").addEventListener("click", async () => {
      node.remove();
      await db.rejectIncomingVideo(videoID);
    });

    node
      .querySelector(".approve-button")
      .addEventListener("click", async () => {
        node.remove();
        await db.approveIncomingVideo(videoID);
        await populateInbox();
        await updateNavNumber();
      });
  }
}

function hideElement(selector) {
  document.querySelector(selector).classList.add("hidden");
}

function showElement(selector) {
  document.querySelector(selector).classList.remove("hidden");
}

// * navigation bar bindings
// * this also affects which button appears on the list item

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
    },
    async (node, stemObj) => {
      node.remove();
      await db.removeFromExportedList(stemObj.stem);
      await db.addToTrashList(stemObj.stem);
    }
  );
}

// * navigation handling

document.getElementById("inbox-nav").addEventListener("click", async (e) => {
  if (!navigate(e)) {
    return;
  }
  await populateInbox();
  await populateIncomingVideosList();
  hideElement("#export-button");
  showElement("#incoming-videos");
});

document.getElementById("unknown-nav").addEventListener("click", async (e) => {
  if (!navigate(e)) {
    return;
  }
  await populateUnknown();
  showElement("#export-button");
  hideElement("#incoming-videos");
});

document.getElementById("known-nav").addEventListener("click", async (e) => {
  if (!navigate(e)) {
    return;
  }
  await populateKnown();
  hideElement("#export-button");
  hideElement("#incoming-videos");
});

document.getElementById("trash-nav").addEventListener("click", async (e) => {
  if (!navigate(e)) {
    return;
  }
  await populateTrash();
  hideElement("#export-button");
  hideElement("#incoming-videos");
});

document.getElementById("exported-nav").addEventListener("click", async (e) => {
  if (!navigate(e)) {
    return;
  }
  await populateExported();
  hideElement("#export-button");
  hideElement("#incoming-videos");
});

// * export button

document.getElementById("export-button").addEventListener("click", async () => {
  const stemObjList = await db.getUnknownList();
  // so that the newest is on the bottom
  const reversedStemObjList = stemObjList.slice().reverse();
  const exportText = await exportStems(reversedStemObjList);
  await downloadText(exportText, "export.txt");
  // TODO: only move stems to exported list when download finishes
  const stems = stemObjList.map((i) => i.stem);
  await db.removeFromUnknownList(...stems);
  await db.addToExportedList(...stems);
  await updateNavNumber();
  await populateUnknown();
});

// * overlay stuff

document.getElementById("overlay").addEventListener("click", (e) => {
  e.target.classList.add("hidden");
});

document.getElementById("word-info").addEventListener("click", (e) => {
  e.stopPropagation();
});

updateNavNumber();
populateInbox();
populateIncomingVideosList();
