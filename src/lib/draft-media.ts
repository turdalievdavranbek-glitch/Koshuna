import { displayUrl, stashMedia } from "./media-queue";
import type { DraftListing } from "./types";

export type DraftMedia = { video?: string; voice?: string; photos?: string[] };

export function isTempMedia(url?: string): boolean {
  return Boolean(url && (url.startsWith("blob:") || url.startsWith("data:")));
}

export function draftUnfinished(d: DraftListing): boolean {
  const media = Boolean(
    d.videoUrl ||
      d.voiceUrl ||
      d.photo ||
      (d.photos && d.photos.length > 0) ||
      d.draftMedia?.video ||
      d.draftMedia?.voice ||
      (d.draftMedia?.photos && d.draftMedia.photos.length > 0),
  );
  return Boolean(media || d.title.trim() || d.price.trim() || d.priceNegotiable || d.description.trim());
}

/** Drop blob/data URLs so localStorage keeps kmedia refs and text only. */
export function durableDraft(d: DraftListing): DraftListing {
  const keep = (url?: string) => (url && !isTempMedia(url) ? url : undefined);
  const photos = (d.draftMedia?.photos ?? d.photos ?? []).map((url) => keep(url)).filter((url): url is string => Boolean(url));
  return {
    ...d,
    videoUrl: keep(d.videoUrl) ?? d.draftMedia?.video,
    voiceUrl: keep(d.voiceUrl) ?? d.draftMedia?.voice,
    photo: keep(d.photo) ?? photos[0],
    photos,
    draftMedia: d.draftMedia
      ? {
          video: keep(d.draftMedia.video),
          voice: keep(d.draftMedia.voice),
          photos,
        }
      : photos.length
        ? { photos }
        : d.draftMedia,
  };
}

/** Playback URLs for the screen. draftMedia keeps the kmedia refs. */
export async function presentDraft(draft: DraftListing): Promise<DraftListing> {
  const media = draft.draftMedia;
  if (!media) return draft;
  const video = media.video ? await displayUrl(media.video) : draft.videoUrl;
  const voice = media.voice ? await displayUrl(media.voice) : draft.voiceUrl;
  const photos = media.photos?.length ? await Promise.all(media.photos.map((url) => displayUrl(url))) : draft.photos;
  return {
    ...draft,
    videoUrl: video,
    voiceUrl: voice,
    photo: photos?.[0] ?? draft.photo,
    photos,
    draftMedia: media,
  };
}

export async function absorbMediaPatch(patch: Partial<DraftListing>): Promise<Partial<DraftListing> | null> {
  const next: Partial<DraftListing> = {};
  const media: DraftMedia = {};
  let changed = false;
  if (isTempMedia(patch.videoUrl)) {
    const ref = await stashMedia(patch.videoUrl as string, "video", patch.videoSec);
    next.videoUrl = ref;
    media.video = ref;
    changed = true;
  }
  if (isTempMedia(patch.voiceUrl)) {
    const ref = await stashMedia(patch.voiceUrl as string, "voice", patch.voiceSec);
    next.voiceUrl = ref;
    media.voice = ref;
    changed = true;
  }
  if (isTempMedia(patch.photo)) {
    const ref = await stashMedia(patch.photo as string, "photo");
    next.photo = ref;
    media.photos = [ref];
    changed = true;
  }
  if (!changed) return null;
  next.draftMedia = media;
  return next;
}
