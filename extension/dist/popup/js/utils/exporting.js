import { db } from "./db.js";
import { assembleContext, assembleYoutube } from "./assembly.js";

async function exportStems(stemObjList) {
  let exportText = "";
  for (const stemObj of stemObjList) {
    // database reading here can be optimized
    const context = await db.getContext(stemObj.source, stemObj.timestamp, 30);

    exportText += `${stemObj.word}\t${context.author} - ${
      context.title
    }\t${assembleYoutube(stemObj.source, stemObj.timestamp)}\t${assembleContext(
      context.context,
      stemObj.timestamp
    )}\n`;
  }
  return exportText;
}

async function downloadText(text, filename) {
  const blob = new Blob([text], {
    type: "text/plain",
  });
  const url = URL.createObjectURL(blob);
  const downloadId = await new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url: url,
        filename: filename,
        saveAs: true,
      },
      (result) => {
        resolve(result);
      }
    );
  });
  return downloadId;
}

export { exportStems, downloadText };
