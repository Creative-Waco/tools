import { EMAIL_WIDTH_STYLE } from "./email-width.mjs";
import { escapeHtml, hasEventWebsite } from "./utils.mjs";

function buttonStyle({ filled, color }) {
  if (filled) {
    return `display:block;padding:7px 10px;font-size:12px;font-weight:bold;color:#fff;background:${color};text-decoration:none;border-radius:3px;text-align:center;`;
  }
  return `display:block;padding:7px 10px;font-size:12px;font-weight:bold;color:${color};background:#fff;text-decoration:none;border-radius:3px;border:1px solid ${color};text-align:center;`;
}

function renderResponsiveStyles(breakpoint = 600) {
  return `<style type="text/css">
@media only screen and (max-width: ${breakpoint}px) {
  .rss-email-grid-col {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
  }
  .rss-email-grid-pad-left,
  .rss-email-grid-pad-mid,
  .rss-email-grid-pad-right {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
  .rss-email-grid-card-wrap {
    padding-bottom: 16px !important;
  }
  .rss-email-grid-row {
    margin-bottom: 20px !important;
  }
  .rss-email-grid-row:last-child {
    margin-bottom: 0 !important;
  }
}
</style>`;
}

function gridColumns(layout) {
  if (layout === "grid-3") return 3;
  if (layout === "grid-2") return 2;
  return 0;
}

function renderImageCell(item, options) {
  if (!options.includeImages || !item.imageUrl) return "";

  return `<td valign="middle" width="76" style="padding-right:12px;">
          <a href="${escapeHtml(item.learnUrl)}">
            <img src="${escapeHtml(item.imageUrl)}" alt="" width="64" style="display:block;width:64px;height:auto;border:0;border-radius:4px;" />
          </a>
        </td>`;
}

function renderContentCell(item, options) {
  const meta = [item.eventDateLabel, item.organizer].filter(Boolean).join(" · ");

  return `<td valign="middle" style="padding-right:12px;">
          <p style="margin:0 0 2px 0;font-size:15px;line-height:20px;font-weight:bold;">
            <a href="${escapeHtml(item.learnUrl)}" style="color:${options.primaryColor};text-decoration:none;">${escapeHtml(item.title)}</a>
          </p>
          ${meta ? `<p style="margin:0;font-size:12px;line-height:17px;color:#666;">${escapeHtml(meta)}</p>` : ""}
        </td>`;
}

function renderButtons(item, options, gridColumnsCount = 0) {
  const stacked = gridColumnsCount > 0 || gridColumns(options.layout) > 0;
  const compact = gridColumnsCount === 3;
  const btnPad = compact ? "6px 8px" : "7px 10px";
  const btnSize = compact ? "11px" : "12px";
  const learnStyle = buttonStyle({ filled: true, color: options.primaryColor }).replace(
    "padding:7px 10px",
    `padding:${btnPad}`,
  ).replace("font-size:12px", `font-size:${btnSize}`);
  const learn = `<a href="${escapeHtml(item.learnUrl)}" style="${learnStyle}">${escapeHtml(options.learnLabel)}</a>`;
  const websiteStyle = buttonStyle({ filled: false, color: options.primaryColor })
    .replace("padding:7px 10px", `padding:${btnPad}`)
    .replace("font-size:12px", `font-size:${btnSize}`);
  const website = hasEventWebsite(item.websiteUrl, item.learnUrl, item)
    ? `<a href="${escapeHtml(item.websiteUrl)}" style="${websiteStyle}">${escapeHtml(options.websiteLabel)}</a>`
    : "";

  if (!stacked && options.layout === "buttons-inline") {
    return `${learn}${website ? `<span style="display:inline-block;width:6px;"></span>${website.replace("display:block;", "display:inline-block;")}` : ""}`;
  }

  return `${learn}${website ? `<span style="display:block;height:6px;line-height:6px;font-size:0;">&nbsp;</span>${website}` : ""}`;
}

function renderGridCard(item, options, columns) {
  const meta = [item.eventDateLabel, item.organizer].filter(Boolean).join(" · ");
  const innerPad = columns === 3 ? "10px 10px 12px" : "12px 14px 14px";
  const titleSize = columns === 3 ? "14px" : "15px";
  const titleLine = columns === 3 ? "18px" : "20px";
  const imageBlock =
    options.includeImages && item.imageUrl
      ? `<tr>
  <td style="padding:0;font-size:0;line-height:0;">
    <a href="${escapeHtml(item.learnUrl)}" style="text-decoration:none;">
      <img src="${escapeHtml(item.imageUrl)}" alt="" style="display:block;width:100%;max-width:100%;height:auto;border:0;" />
    </a>
  </td>
</tr>`
      : "";

  return `<table role="presentation" class="rss-email-grid-card" cellpadding="0" cellspacing="0" border="0" width="100%" style="table-layout:fixed;width:100%;font-family:Arial,Helvetica,sans-serif;border:1px solid #e5e5e5;border-radius:6px;">
${imageBlock}
<tr>
  <td style="padding:${innerPad};">
    <p style="margin:0 0 4px 0;font-size:${titleSize};line-height:${titleLine};font-weight:bold;">
      <a href="${escapeHtml(item.learnUrl)}" style="color:${options.primaryColor};text-decoration:none;">${escapeHtml(item.title)}</a>
    </p>
    ${meta ? `<p style="margin:0 0 10px 0;font-size:12px;line-height:16px;color:#666;">${escapeHtml(meta)}</p>` : ""}
    ${renderButtons(item, options, columns)}
  </td>
</tr>
</table>`;
}

function cellPaddingStyle(index, columns) {
  if (columns === 2) {
    return index === 0 ? "padding:0 12px 20px 0;" : "padding:0 0 20px 12px;";
  }
  if (index === 0) return "padding:0 10px 20px 0;";
  if (index === columns - 1) return "padding:0 0 20px 10px;";
  return "padding:0 10px 20px;";
}

function cellPadClass(index, columns) {
  if (index === 0) return "rss-email-grid-pad-left";
  if (index === columns - 1) return "rss-email-grid-pad-right";
  return "rss-email-grid-pad-mid";
}

function renderGridCell(item, options, { columns, index, colPercent }) {
  return `<td class="rss-email-grid-col ${cellPadClass(index, columns)} rss-email-grid-card-wrap" valign="top" width="${colPercent}%" style="width:${colPercent}%;${cellPaddingStyle(index, columns)}">
    ${renderGridCard(item, options, columns)}
  </td>`;
}

function renderEmptyGridCell(columns, index, colPercent) {
  return `<td class="rss-email-grid-col ${cellPadClass(index, columns)} rss-email-grid-card-wrap" width="${colPercent}%" style="width:${colPercent}%;${cellPaddingStyle(index, columns)}font-size:0;line-height:0;">&nbsp;</td>`;
}

function renderGridRow(chunk, options, columns, { marginBottom = 20 } = {}) {
  const colPercent = (100 / columns).toFixed(2);
  const cells = chunk.map((item, index) =>
    renderGridCell(item, options, { columns, index, colPercent }),
  );

  while (cells.length < columns) {
    cells.push(renderEmptyGridCell(columns, cells.length, colPercent));
  }

  const rowGap = marginBottom ? `margin-bottom:${marginBottom}px;` : "";

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="rss-email-grid-row" style="${EMAIL_WIDTH_STYLE}table-layout:fixed;${rowGap}font-family:Arial,Helvetica,sans-serif;">
  <tr>
    ${cells.join("\n    ")}
  </tr>
</table>`;
}

function renderGridLayout(items, options) {
  const columns = gridColumns(options.layout);
  const chunks = [];
  for (let i = 0; i < items.length; i += columns) {
    chunks.push(items.slice(i, i + columns));
  }

  const rowTables = chunks.map((chunk, index) => {
    const isLast = index === chunks.length - 1;
    const gap = isLast ? 0 : 20;

    if (chunk.length === 1) {
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${EMAIL_WIDTH_STYLE}${gap ? `margin-bottom:${gap}px;` : ""}font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td class="rss-email-grid-col rss-email-grid-card-wrap" valign="top" style="padding-bottom:20px;">
      ${renderGridCard(chunk[0], options, columns)}
    </td>
  </tr>
</table>`;
    }

    return renderGridRow(chunk, options, columns, {
      marginBottom: gap,
    });
  });

  return `${renderResponsiveStyles()}
${rowTables.join("\n")}
`;
}

function renderRow(item, options, isLast) {
  const border = isLast ? "" : "border-bottom:1px solid #e5e5e5;";
  const meta = [item.eventDateLabel, item.organizer].filter(Boolean).join(" · ");
  const imageCell = renderImageCell(item, options);

  if (options.layout === "minimal") {
    return `<tr>
  <td style="padding:8px 0;${border}font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      ${imageCell}
      <td valign="middle">
        <a href="${escapeHtml(item.learnUrl)}" style="font-size:15px;line-height:20px;font-weight:bold;color:${options.primaryColor};text-decoration:none;">${escapeHtml(item.title)}</a>
        ${meta ? `<span style="font-size:12px;color:#666;"> — ${escapeHtml(meta)}</span>` : ""}
      </td>
    </tr></table>
  </td>
</tr>`;
  }

  const buttonColumn =
    options.layout === "buttons-inline" ? "140" : "110";

  return `<tr>
  <td style="padding:10px 0;${border}">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family:Arial,Helvetica,sans-serif;">
      <tr>
        ${imageCell}
        ${renderContentCell(item, options)}
        <td valign="middle" width="${buttonColumn}" align="right" style="white-space:nowrap;">
          ${renderButtons(item, options)}
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

function renderListLayout(items, options) {
  const rows = items
    .map((item, index) => renderRow(item, options, index === items.length - 1))
    .join("\n");

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${EMAIL_WIDTH_STYLE}font-family:Arial,Helvetica,sans-serif;">
${rows}
</table>`;
}

export function renderEmailHtml(items, options) {
  if (gridColumns(options.layout) > 0) {
    return renderGridLayout(items, options);
  }

  return renderListLayout(items, options);
}
