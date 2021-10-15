const natural = require("natural");
const stem = natural.PorterStemmer.stem;
const tokenizer = new natural.TreebankWordTokenizer();

class chromeDBProto {
  // await get("a", "b", ...) => {a: ..., b: ..., ...}
  async get(...keys) {
    return await new Promise((resolve, reject) =>
      chrome.storage.local.get(keys, (result) => resolve(result))
    );
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
  const inbox = (await chromeDB.get("wordlist.inbox"))["wordlist.inbox"] || [];
  chrome.action.setBadgeText({ text: inbox.length.toString() });
}

updateBadgeText();

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
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

  // ! parse caption from youtube
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

  // if the stem doesn't exist in database or is in trash list
  const existingStems = await chromeDB.get(...Object.keys(stem2word));
  const inTrashStems =
    (await chromeDB.get("wordlist.trash"))["wordlist.trash"] || [];

  // if the exsiting stem is in trash, then update the stem info and move to inbox
  const newTrashcan = [];
  for (const trashStem of inTrashStems) {
    if (trashStem in existingStems) {
      delete existingStems[trashStem];
    } else {
      newTrashcan.push(trashStem);
    }
  }
  // update trashcan
  await chromeDB.set({ "wordlist.trash": newTrashcan });

  // ! populate non exsiting stem info
  // including stem, word, videoID and timestamp(in video)
  let nonExistingStemInfo = {};
  for (const stem in stem2word) {
    if (!(stem in existingStems)) {
      const word = stem2word[stem];
      const timestamp = reversedCaption[word];
      nonExistingStemInfo[stem] = [word.toLowerCase(), videoID, timestamp];
    }
  }

  // ! save the stem info to database
  await chromeDB.set(nonExistingStemInfo);

  // ! send the stems to inbox
  const inbox = (await chromeDB.get("wordlist.inbox"))["wordlist.inbox"] || [];
  await chromeDB.set({
    "wordlist.inbox": inbox.concat(Object.keys(nonExistingStemInfo)),
  });
  await updateBadgeText();

  // ! save the source
  // stupid javascript
  await chromeDB.set({ [videoID]: [title, author, parsedCaption] });
});
