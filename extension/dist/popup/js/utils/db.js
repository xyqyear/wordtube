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
  source: [title, author, transcript]
  */
  async ensureDataVersion() {
    if (!(await chromeDB.get("dataVersion")["dataVersion"])) {
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

  async _add(key, ...value) {
    let oldValue = (await chromeDB.get(key))[key] || [];
    await chromeDB.set({ [key]: oldValue.concat(value) });
  }

  async _remove(key, ...value) {
    let oldValue = (await chromeDB.get(key))[key] || [];
    for (i of value) {
      const index = oldValue.indexOf(i);
      if (index > -1) {
        oldValue.splice(index, 1);
      }
    }
    await chromeDB.set({ [key]: oldValue });
  }

  // await getInboxList() => ["a", "b", ...]
  async getInboxList() {
    return await this._getWordList("wordlist.inbox");
  }

  // await addToInboxList("a", "b", ...)
  async addToInboxList(...stems) {
    this._add("wordlist.inbox", ...stems);
  }

  async removeFromInboxList(...stems) {
    this._remove("wordlist.inbox", ...stems);
  }

  async getUnknownList() {
    return await this._getWordList("wordlist.unknown");
  }

  async addToUnknownList(...stems) {
    this._add("wordlist.unknown", ...stems);
  }

  async removeFromUnknownList(...stems) {
    this._remove("wordlist.unknown", ...stems);
  }

  async getKnownList() {
    return await this._getWordList("wordlist.known");
  }

  async addToKnownList(...stems) {
    this._add("wordlist.known", ...stems);
  }

  async removeFromknownList(...stems) {
    this._remove("wordlist.known", ...stems);
  }
}

let db = new DB();
await db.ensureDataVersion();

export { db, Stem };