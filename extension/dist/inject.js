async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function getTranscriptJson() {
  if (!("captions" in window.ytplayer.config.args.raw_player_response)) {
    return {};
  }

  let captionTracks =
    window.ytplayer.config.args.raw_player_response.captions
      .playerCaptionsTracklistRenderer.captionTracks;

  // filter out those are not english
  captionTracks = captionTracks.filter((i) => i.languageCode === "en");

  // prefer not auto-generated
  // asr means auto-generated
  tracksWithoutASR = captionTracks.filter(
    (i) => !("kind" in i && i.kind === "asr")
  );
  captionTracks =
    tracksWithoutASR.length > 0 ? tracksWithoutASR : captionTracks;

  if (captionTracks.length > 0) {
    console.log(captionTracks[0].baseUrl);
    response = await fetch(captionTracks[0].baseUrl + "&fmt=json3");
    return await response.json();
  }

  return {};
}

getTranscriptJson().then((transcriptJson) => {
  document.dispatchEvent(
    new CustomEvent("gotTranscript", {
      detail: {
        caption: transcriptJson,
        title:
          window.ytplayer.config.args.raw_player_response.videoDetails.title,
        author:
          window.ytplayer.config.args.raw_player_response.videoDetails.author,
        videoID:
          window.ytplayer.config.args.raw_player_response.videoDetails.videoId,
      },
    })
  );
});
