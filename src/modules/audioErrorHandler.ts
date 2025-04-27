import { title, audio, playButton } from '../lib/dom.ts';
import { store } from '../lib/store.ts';
import { getDownloadLink, notify } from '../lib/utils.ts';

export default function() {
  audio.pause();
  const message = 'Error 403 : Unauthenticated Stream';
  const id = store.stream.id;
  const { customAPI, hls } = store.player;

  if (hls.on) return notify(message);

  if (audio.src.endsWith('&fallback')) {
    notify(message);
    playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
    return;
  }

  // Always retry with our custom API
  fetch(`${customAPI}/streams/${id}`)
    .then(res => res.json())
    .then(data => {
      if (data && data.streamingData && data.streamingData.adaptiveFormats) {
        const audioStreams = data.streamingData.adaptiveFormats
          .filter((f: any) => f.mimeType?.startsWith('audio'))
          .map((a: any) => ({
            url: a.url,
            bitrate: a.bitrate || 0,
            codec: a.mimeType?.split('codecs="')[1]?.split('"')[0] || "",
            mimeType: a.mimeType || "",
            contentLength: a.contentLength || "0",
            quality: `${Math.floor((a.bitrate || 0) / 1000)} kbps`
          }));
        
        import('./setAudioStreams.ts')
          .then(mod => mod.default(audioStreams));
      } else {
        throw new Error("Custom API failed");
      }
    })
    .catch(() => {
      // Last resort fallback to Cobalt
      notify(message);
      title.textContent = store.stream.title;
      useCobalt();
    });

  function useCobalt() {
    getDownloadLink(id)
      .then(_ => {
        if (_)
          audio.src = _;
        else throw new Error();
      })
      .catch(() => {
        playButton.classList.replace(playButton.className, 'ri-stop-circle-fill');
      });
  }
}
