import { showBuildingDetail } from "./building-detail.js";

// building-detail.html?building=<id>: one building's detail on a page of its own.
showBuildingDetail({
  root: document,
  id: new URLSearchParams(location.search).get("building"),
  frame: document.querySelector<HTMLElement>(".detail-root")!,
  signal: new AbortController().signal,
});
