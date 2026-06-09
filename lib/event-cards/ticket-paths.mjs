/** Ticket vector geometry (px). */
export const TICKET_CORNER_R = 32;
export const TICKET_NOTCH_R = 24;

/**
 * Top stub — rounded top corners; bottom seam uses smooth inward quarter-arcs
 * that meet the bottom stub as soft semicircular punchouts.
 */
export function buildTopTicketPath(w, h, r = TICKET_CORNER_R, n = TICKET_NOTCH_R) {
  const wr = Math.min(r, w / 2);
  const nr = Math.min(n, w / 4, h / 2);

  return [
    `M ${wr} 0`,
    `L ${w - wr} 0`,
    `A ${wr} ${wr} 0 0 1 ${w} ${wr}`,
    `L ${w} ${h - nr}`,
    `A ${nr} ${nr} 0 0 1 ${w - nr} ${h}`,
    `L ${nr} ${h}`,
    `A ${nr} ${nr} 0 0 0 0 ${h - nr}`,
    `L 0 ${wr}`,
    `A ${wr} ${wr} 0 0 1 ${wr} 0`,
    "Z",
  ].join(" ");
}

/**
 * Bottom stub — smooth inward quarter-arcs on the top seam; rounded bottom corners.
 */
export function buildBottomTicketPath(w, h, r = TICKET_CORNER_R, n = TICKET_NOTCH_R) {
  const wr = Math.min(r, w / 2);
  const nr = Math.min(n, w / 4, h / 2);

  return [
    `M 0 ${nr}`,
    `A ${nr} ${nr} 0 0 1 ${nr} 0`,
    `L ${w - nr} 0`,
    `A ${nr} ${nr} 0 0 0 ${w} ${nr}`,
    `L ${w} ${h - wr}`,
    `A ${wr} ${wr} 0 0 1 ${w - wr} ${h}`,
    `L ${wr} ${h}`,
    `A ${wr} ${wr} 0 0 1 0 ${h - wr}`,
    "Z",
  ].join(" ");
}
