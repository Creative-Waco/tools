import { buildBottomTicketPath, buildTopTicketPath } from "./ticket-paths.mjs";

function syncHalf(ticketEl, buildPath, pathSelector) {
  if (!ticketEl) return;

  const pad = ticketEl.querySelector(".cw-ticket__pad");
  const w = ticketEl.offsetWidth;
  const h = pad?.offsetHeight ?? 0;
  if (w < 1 || h < 1 || h > 5000) return;

  const svg = ticketEl.querySelector("svg.cw-ticket__shape");
  const path = ticketEl.querySelector(pathSelector);
  if (!svg || !path) return;

  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  path.removeAttribute("mask");
  path.setAttribute("d", buildPath(w, h));
}

/** Measure each ticket half and draw smooth scallop vector paths. */
export function syncTicketShapes(root) {
  if (!root) return;

  root.querySelectorAll(".cw-card-scene").forEach((scene) => {
    syncHalf(
      scene.querySelector(".cw-ticket__top"),
      buildTopTicketPath,
      ".cw-ticket__path--top",
    );
    syncHalf(
      scene.querySelector(".cw-ticket__bottom"),
      buildBottomTicketPath,
      ".cw-ticket__path--bottom",
    );
  });
}
