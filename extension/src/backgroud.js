const natural = require("natural");
const stem = natural.PorterStemmer.stem;
const tokenizer = new natural.TreebankWordTokenizer();

// since background.js and popup/index.js run in entirely different environments
// it's complicated to reuse code used by popup/index.js
class chromeDBProto {
  // await get("a", "b", ...) => {a: ..., b: ..., ...}
  async get(...keys) {
    return await new Promise((resolve, reject) =>
      chrome.storage.local.get(keys, (result) => resolve(result))
    );
  }

  async getSingle(key) {
    return (await this.get(key))[key];
  }

  // await set({"a": ..., "b":..., ...})
  async set(pairs) {
    return await new Promise((resolve, reject) =>
      chrome.storage.local.set(pairs, () => resolve())
    );
  }

  // await remove("a", "b", ...)
  async remove(...keys) {
    return await new Promise((resolve, reject) =>
      chrome.storage.local.remove(keys, () => resolve())
    );
  }
}

const chromeDB = new chromeDBProto();

function isEmptyObject(o) {
  for (i in o) {
    return false;
  }
  return true;
}

async function updateBadgeText() {
  const inbox = (await chromeDB.getSingle("wordlist.inbox")) || [];
  chrome.action.setBadgeText({ text: inbox.length.toString() });
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  // if no caption avaliable for this video
  if (isEmptyObject(request.caption)) {
    return;
  }

  const caption = request.caption;
  const title = request.title;
  const author = request.author;
  const videoID = request.videoID;

  // if video is already in the database
  if (!isEmptyObject(await chromeDB.get(videoID))) {
    return;
  }

  // * parse caption from youtube

  // basically what this massive loop does is
  // separating tokens from transdcript and timestamp them separately.
  // if the whole line has only one timestamp in the transcript (usually manual transcripts)
  // we assign the timestamp of the line to the first token,
  // and for the rest of tokens we increase the timestamp by 1 ms each time.
  let parsedCaption = {};
  for (const event of caption.events) {
    if ("segs" in event) {
      const timeBase = event.tStartMs;
      let offset = 0;
      for (const seg of event.segs) {
        let tokens = tokenizer.tokenize(seg.utf8.replace("’", "'"));

        if ("tOffsetMs" in seg) {
          offset = seg.tOffsetMs;
        } else {
          offset++;
        }

        for (const token of tokens) {
          parsedCaption[timeBase + offset] = token;
          offset++;
        }
      }
    }
  }

  // for word to timestamp lookup
  const reversedCaption = Object.fromEntries(
    Object.entries(parsedCaption).map((a) => a.reverse())
  );

  // an object whose key is stem, value is original word
  // this line also filters out tokens that are not words
  const stem2word = Object.fromEntries(
    Object.keys(reversedCaption)
      .filter((a) => /^[a-zA-Z]+$/.test(a))
      .map((a) => [stem(a), a])
  );

  // ! MOVE TO index.js for updating trash can
  // // if the exsiting stem is in trash, then update the stem info and move to inbox
  // const inTrashStems = (await chromeDB.getSingle("wordlist.trash")) || [];
  // const newTrashcan = [];
  // for (const trashStem of inTrashStems) {
  //   if (trashStem in existingStems) {
  //     delete existingStems[trashStem];
  //   } else {
  //     newTrashcan.push(trashStem);
  //   }
  // }
  // // update trashcan
  // await chromeDB.set({ "wordlist.trash": newTrashcan });

  // * save the info of stems not in database or in trash

  const existingStems = await chromeDB.get(...Object.keys(stem2word));
  const inTrashStems = (await chromeDB.getSingle("wordlist.trash")) || [];
  for (const trashStem of inTrashStems) {
    if (trashStem in existingStems) {
      delete existingStems[trashStem];
    }
  }
  let nonExistingStemInfo = {};
  for (const stem in stem2word) {
    if (!(stem in existingStems)) {
      const word = stem2word[stem];
      const timestamp = reversedCaption[word];
      nonExistingStemInfo[stem] = [word.toLowerCase(), videoID, timestamp];
    }
  }

  // ! MOVE TO index.js
  // // * save the stem info to database
  // await chromeDB.set(nonExistingStemInfo);

  // ! MOVE TO index.js
  // // * send the stems to inbox
  // const inbox = (await chromeDB.getSingle("wordlist.inbox")) || [];
  // await chromeDB.set({
  //   "wordlist.inbox": inbox.concat(Object.keys(nonExistingStemInfo)),
  // });
  // await updateBadgeText();

  // * save the source
  // stupid javascript
  await chromeDB.set({ [videoID]: [title, author, parsedCaption] });

  // * add video to incoming.videos
  let videoInbox = (await chromeDB.getSingle("incoming.videos")) || {};
  videoInbox[videoID] = nonExistingStemInfo;
  await chromeDB.set({ "incoming.videos": videoInbox });
});

chrome.action.setBadgeBackgroundColor({ color: "#bfa2db" });
updateBadgeText();
