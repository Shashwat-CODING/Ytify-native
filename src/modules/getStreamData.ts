import { store } from "../lib/store";

export default async function(
  id: string
): Promise<Piped | Record<'error' | 'message', string>> {

  // Only use the custom API endpoint
  const customAPI = store.player.customAPI;
  
  const fetchData = () => 
    fetch(`${customAPI}/streams/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.streamingData && data.streamingData.adaptiveFormats) {
          // Transform the data to match Piped format
          return {
            title: data.videoDetails?.title || "Unknown Title",
            uploader: data.videoDetails?.author || "Unknown Channel",
            uploaderUrl: data.videoDetails?.channelId ? `/channel/${data.videoDetails.channelId}` : "",
            duration: parseInt(data.videoDetails?.lengthSeconds || "0"),
            instance: customAPI,
            livestream: data.videoDetails?.isLiveContent || false,
            hls: "", // HLS stream if available
            audioStreams: data.streamingData.adaptiveFormats
              .filter((f: any) => f.mimeType?.startsWith('audio'))
              .map((a: any) => ({
                url: a.url,
                bitrate: a.bitrate || 0,
                codec: a.mimeType?.split('codecs="')[1]?.split('"')[0] || "",
                mimeType: a.mimeType || "",
                contentLength: a.contentLength || "0",
                quality: `${Math.floor((a.bitrate || 0) / 1000)} kbps`
              })),
            videoStreams: data.streamingData.adaptiveFormats
              .filter((f: any) => f.mimeType?.startsWith('video'))
              .map((v: any) => ({
                url: v.url,
                quality: v.qualityLabel || "",
                resolution: v.qualityLabel || "",
                type: v.mimeType || ""
              })),
            relatedStreams: [],
            captions: data.captions?.playerCaptionsTracklistRenderer?.captionTracks?.map((c: any) => ({
              url: c.baseUrl,
              name: c.name?.runs?.[0]?.text || "",
              language: c.languageCode || ""
            })) || []
          };
        } else throw new Error("Could not get stream data");
      });

  try {
    return await fetchData();
  } catch (error) {
    return {
      error: "Failed to fetch data",
      message: "Could not get stream data from the custom API"
    };
  }
}

