const held = new Map<string, string>();

export function keepBlob(key: "video" | "voice" | "photo", blob: Blob): string {
  const prev = held.get(key);
  if (prev) URL.revokeObjectURL(prev);
  const url = URL.createObjectURL(blob);
  held.set(key, url);
  return url;
}

export function dropBlob(key: "video" | "voice" | "photo") {
  const prev = held.get(key);
  if (prev) URL.revokeObjectURL(prev);
  held.delete(key);
}

export function persistableUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("blob:")) return undefined;
  return url;
}

export function captureVideoPoster(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = src;
    const fail = () => resolve(null);
    video.onerror = fail;
    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.3, (video.duration || 1) * 0.1);
      } catch {
        fail();
      }
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          fail();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      } catch {
        fail();
      }
    };
    window.setTimeout(fail, 4000);
  });
}

type SpeechCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null;
  onerror: (() => void) | null;
};

export function startSpeech(lang: "ru" | "ky" | "en", onText: (text: string) => void): () => void {
  const Ctor = ((window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor })
    .SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: SpeechCtor }).webkitSpeechRecognition) as SpeechCtor | undefined;
  if (!Ctor) return () => undefined;
  const rec = new Ctor();
  rec.lang = lang === "en" ? "en-US" : "ru-RU";
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (ev) => {
    let text = "";
    for (let i = 0; i < ev.results.length; i++) {
      text += `${ev.results[i][0]?.transcript ?? ""} `;
    }
    onText(text.replace(/\s+/g, " ").trim());
  };
  rec.onerror = () => undefined;
  try {
    rec.start();
  } catch {
    return () => undefined;
  }
  return () => {
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
  };
}

export function recorderMime(kind: "video" | "audio"): string | undefined {
  const candidates =
    kind === "video"
      ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
      : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  if (typeof MediaRecorder === "undefined") return undefined;
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}
