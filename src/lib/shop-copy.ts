import type { Dict } from "./i18n";

export function shopErrorText(t: Dict, code?: string): string {
  switch (code) {
    case "auth":
      return t.shopNeedAuth;
    case "forbidden":
      return t.shopForbidden;
    case "name":
      return t.shopNeedName;
    case "category":
      return t.shopNeedCategory;
    case "city":
      return t.shopNeedCity;
    case "address":
      return t.shopNeedAddress;
    case "contact":
      return t.shopNeedContact;
    case "confirm":
      return t.shopNeedConfirm;
    case "price":
      return t.shopNeedPrice;
    case "video-size":
      return t.shopVideoSize;
    case "video-duration":
      return t.shopVideoTime;
    case "network":
      return t.shopNetwork;
    case "need-transcript":
      return t.shopAiNeedSpeech;
    default:
      return t.shopError;
  }
}
