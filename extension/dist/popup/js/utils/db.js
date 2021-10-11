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
    return (await chromeDB.get("wordlist.inbox"))["wordlist.inbox"] || [];
  }

  // await addToInboxList("a", "b", ...)
  async addToInboxList(...words) {
    this._add("wordlist.inbox", ...words);
  }

  async removeFromInboxList(...words) {
    this._remove("wordlist.inbox", ...words);
  }

  async getUnknownList() {
    return (await chromeDB.get("wordlist.unknown"))["wordlist.unknown"] || [];
  }

  async addToUnknownList(...words) {
    this._add("wordlist.unknown", ...words);
  }

  async removeFromUnknownList(...words) {
    this._remove("wordlist.unknown", ...words);
  }

  async getKnownList() {
    return (await chromeDB.get("wordlist.known"))["wordlist.known"] || [];
  }

  async addToKnownList(...words) {
    this._add("wordlist.known", ...words);
  }

  async removeFromknownList(...words) {
    this._remove("wordlist.known", ...words);
  }

  // words: Array of string
  async getWordInfo(...words) {
    result = await chromeDB.get(...words);
    let wordsInfo = [];
    for (i in result) {
      const info = result[i];
      wordsInfo.push(new Stem(i, info[0], info[1], info[2]));
    }
    return wordsInfo;
  }

  // words: Array of Stems
  async addWord(...words) {
    let wordsInfo = {};
    for (i of words) {
      wordsInfo[i.stem] = [i.word, i.source, i.timestamp];
    }
    await chromeDB.set(wordsInfo);
  }

  // words: Array of string
  async removeWord(...words) {
    await chromeDB.remove(...words);
  }
}

let db = new DB();
await db.ensureDataVersion();

export { db, Stem };
