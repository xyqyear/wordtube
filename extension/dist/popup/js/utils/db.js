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

class Word {
  constructor(word, timestamp, context, source) {
    this.word = word;
    this.timestamp = timestamp;
    this.context = context;
    this.source = source;
  }
}

class DB {
  /*
  Version 1 specification:
  "wordlist.inbox": ["word1", "word2", ...]
  "wordlist.unknown": ["word3", "word4", ...]
  "wordlist.known": ["word5", "word6", ...]
  word: [timestamp, context, source]
  */
  async ensureDataVersion() {
    if (!(await chromeDB.get("dataVersion")["dataVersion"])) {
      await chromeDB.set({ dataVersion: 1 });
    }
  }

  async _add(key, ...value) {
    let oldValue = (await chromeDB.get(key))[key] || [];
    oldValue.concat(value);
    await chromeDB.set({ key: value });
  }

  async _remove(key, ...value) {
    let oldValue = (await chromeDB.get(key))[key] || [];
    for (i of value) {
      const index = oldValue.indexOf(i);
      if (index > -1) {
        oldValue.splice(index, 1);
      }
    }
    await chromeDB.set({ key: oldValue });
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
      wordsInfo.push(new Word(i, info[0], info[1], info[2]));
    }
    return wordsInfo;
  }

  // words: Array of Word
  async addWord(...words) {
    let wordsInfo = {};
    for (i of words) {
      wordsInfo[i.word] = [i.timestamp, i.context, i.source];
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

export { db, Word };
