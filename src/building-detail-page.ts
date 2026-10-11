import { showBuildingDetail } from "./building-detail.js";

// building-detail.html?building=<id>: one building's detail on a page of its own.
const life = new AbortController();
try {
  showBuildingDetail({
    root: document,
    id: new URLSearchParams(location.search).get("building"),
    frame: document.querySelector<HTMLElement>(".detail-root")!,
    signal: life.signal,
    colour: new URLSearchParams(location.search).get("colour") === "1",
  });
} catch (error) {
  // A detail that fails part way releases what it started; study-loader.js says why.
  life.abort(error);
  throw error;
}
