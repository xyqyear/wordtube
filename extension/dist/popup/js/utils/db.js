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

class Stem {
  constructor(stem, word, source, timestamp) {
    this.stem = stem;
    this.word = word;
    this.source = source;
    this.timestamp = timestamp;
  }
}

class DB {
  /*
  Version 1 specification:
  "wordlist.inbox": ["stem1", "stem2", ...]
  "wordlist.unknown": ["stem3", "stem4", ...]
  "wordlist.known": ["stem5", "stem6", ...]
  stem: [word, source, timestamp]
    source is youtube video id for now
  source: [title, author, caption]
  */
  async ensureDataVersion() {
    if (!(await chromeDB.getSingle("dataVersion"))) {
      await chromeDB.set({ dataVersion: 1 });
    }
  }

  // stems: Array of string
  async _getStemInfo(...stems) {
    const result = await chromeDB.get(...stems);
    let wordsInfo = [];
    for (const i of stems) {
      const info = result[i];
      wordsInfo.push(new Stem(i, info[0], info[1], info[2]));
    }
    return wordsInfo;
  }

  async _getWordList(key) {
    const stemList = (await chromeDB.get(key))[key] || [];
    return await this._getStemInfo(...stemList);
  }

  // StemObjs: Array of Stem objects
  async addStem(...StemObjs) {
    let wordsInfo = {};
    for (i of StemObjs) {
      wordsInfo[i.stem] = [i.word, i.source, i.timestamp];
    }
    await chromeDB.set(wordsInfo);
  }

  // stems: Array of string
  async removeStem(...stems) {
    await chromeDB.remove(...stems);
  }

  async _append(key, ...value) {
    let oldValue = (await chromeDB.getSingle(key)) || [];
    await chromeDB.set({ [key]: oldValue.concat(value) });
  }

  async _prepend(key, ...value) {
    let oldValue = (await chromeDB.getSingle(key)) || [];
    await chromeDB.set({ [key]: value.concat(oldValue) });
  }

  async _remove(key, ...value) {
    let oldValue = (await chromeDB.getSingle(key)) || [];
    for (const i of value) {
      const index = oldValue.indexOf(i);
      if (index > -1) {
        oldValue.splice(index, 1);
      }
    }
    await chromeDB.set({ [key]: oldValue });
  }

  async getIncomingVideos() {
    return await chromeDB.getSingle("incoming.videos");
  }

  async rejectIncomingVideo(videoID) {
    // remove from incoming list
    let incomingVideos = await chromeDB.getSingle("incoming.videos");
    delete incomingVideos[videoID];
    await chromeDB.set({ "incoming.videos": incomingVideos });

    // remove video info from database
    await chromeDB.remove(videoID);
  }

  async approveIncomingVideo(videoID) {
    // * get and remove video stems from list
    let incomingVideos = await chromeDB.getSingle("incoming.videos");
    // ! using raw database specification
    let stemInfo = incomingVideos[videoID];
    delete incomingVideos[videoID];
    await chromeDB.set({ "incoming.videos": incomingVideos });

    // * remove words that are already in database nad not in trash can
    const existingStems = await chromeDB.get(...stemInfo.stems);
    const inTrashStems = (await chromeDB.getSingle("wordlist.trash")) || [];
    let newTrashcan = [];
    for (const trashStem of inTrashStems) {
      if (trashStem in existingStems) {
        delete existingStems[trashStem];
      } else {
        newTrashcan.push(trashStem);
      }
    }
    await chromeDB.set({ "wordlist.trash": newTrashcan });

    let nonExistingStemInfo = {};
    for (const stem of stemInfo.stems) {
      if (!(stem in existingStems)) {
        nonExistingStemInfo[stem] = stemInfo.info[stem];
      }
    }

    // * add non existing stem info to database
    await chromeDB.set(nonExistingStemInfo);

    // * send the stems to inbox
    const inbox = (await chromeDB.getSingle("wordlist.inbox")) || [];
    await chromeDB.set({
      "wordlist.inbox": inbox.concat(Object.keys(nonExistingStemInfo)),
    });
  }

  // await getInboxList() => ["a", "b", ...]
  async getInboxList() {
    return await this._getWordList("wordlist.inbox");
  }

  // await addToInboxList("a", "b", ...)
  async addToInboxList(...stems) {
    await this._append("wordlist.inbox", ...stems);
  }

  async removeFromInboxList(...stems) {
    await this._remove("wordlist.inbox", ...stems);
  }

  async getUnknownList() {
    return await this._getWordList("wordlist.unknown");
  }

  async addToUnknownList(...stems) {
    await this._prepend("wordlist.unknown", ...stems);
  }

  async removeFromUnknownList(...stems) {
    await this._remove("wordlist.unknown", ...stems);
  }

  async getKnownList() {
    return await this._getWordList("wordlist.known");
  }

  async addToKnownList(...stems) {
    await this._prepend("wordlist.known", ...stems);
  }

  async removeFromknownList(...stems) {
    await this._remove("wordlist.known", ...stems);
  }

  async getTrashList() {
    return await this._getWordList("wordlist.trash");
  }

  async addToTrashList(...stems) {
    await this._prepend("wordlist.trash", ...stems);
  }

  async removeFromTrashList(...stems) {
    await this._remove("wordlist.trash", ...stems);
  }

  async getExportedList() {
    return await this._getWordList("wordlist.exported");
  }

  async addToExportedList(...stems) {
    await this._prepend("wordlist.exported", ...stems);
  }

  async removeFromExportedList(...stems) {
    await this._remove("wordlist.exported", ...stems);
  }

  async getVideoInfo(videoID) {
    const rawVideoInfo = await chromeDB.getSingle(videoID);
    return {
      title: rawVideoInfo[0],
      author: rawVideoInfo[1],
      caption: rawVideoInfo[2],
    };
  }

  async getContext(videoID, timestamp, radius) {
    const videoInfo = await this.getVideoInfo(videoID);

    const index = Object.keys(videoInfo.caption).indexOf(timestamp);
    const captionLength = Object.keys(videoInfo.caption).length;
    const context = Object.fromEntries(
      Object.entries(videoInfo.caption).slice(
        index - radius > 0 ? index - radius : 0,
        index + radius < captionLength ? index + radius : captionLength
      )
    );

    return {
      context: context,
      title: videoInfo.title,
      author: videoInfo.author,
    };
  }
}

let db = new DB();
await db.ensureDataVersion();

export { db, Stem };
