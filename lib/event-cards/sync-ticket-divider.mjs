/** Position side-notch mask cutouts at the perforation divider. */
export function syncTicketDivider(root) {
  if (!root) return;

  root.querySelectorAll(".cw-ticket").forEach((ticket) => {
    const main = ticket.querySelector(".cw-ticket__main");
    if (!main) return;

    ticket.style.setProperty("--ticket-divider-y", `${main.offsetHeight}px`);
  });
}
