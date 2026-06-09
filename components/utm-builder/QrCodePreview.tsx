"use client";

import { useEffect, useState } from "react";

type QrCodePreviewProps = {
  url: string;
  label?: string;
};

export function QrCodePreview({ url, label = "QR code" }: QrCodePreviewProps) {
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!url) {
      setDataUrl("");
      setError("");
      return;
    }

    let cancelled = false;

    import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(url, {
          width: 220,
          margin: 2,
          color: { dark: "#1a1a1a", light: "#ffffff" },
        }),
      )
      .then((result) => {
        if (!cancelled) {
          setDataUrl(result);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDataUrl("");
          setError("Could not generate QR code.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url) return null;

  return (
    <div className="utm-qr-preview">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="m-0 text-sm font-semibold">{label}</h3>
        {dataUrl ? (
          <a href={dataUrl} download="creative-waco-utm-qr.png" className="secondary-btn no-underline">
            Download PNG
          </a>
        ) : null}
      </div>
      {error ? (
        <p className="utm-builder-hint text-red-700">{error}</p>
      ) : dataUrl ? (
        <img src={dataUrl} alt={`QR code for ${url}`} className="utm-qr-image" />
      ) : (
        <p className="utm-builder-hint">Generating QR code…</p>
      )}
    </div>
  );
}
