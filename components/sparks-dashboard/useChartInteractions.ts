"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { resolveChartTooltipContent } from "./ChartTooltipContent";

type TooltipState = {
  visible: boolean;
  left: number;
  top: number;
  content: React.ReactNode | null;
};

const HIDDEN: TooltipState = {
  visible: false,
  left: 0,
  top: 0,
  content: null,
};

function positionChartTooltip(
  tipEl: HTMLElement | null,
  clientX: number,
  clientY: number,
): { left: number; top: number } {
  const pad = 14;
  const width = tipEl?.offsetWidth ?? 0;
  const height = tipEl?.offsetHeight ?? 0;
  let left = clientX + pad;
  let top = clientY - height - pad;

  if (left + width > window.innerWidth - 10) left = clientX - width - pad;
  if (top < 10) top = clientY + pad;
  if (left < 10) left = 10;

  return { left, top };
}

export function useChartInteractions(modalOpen: boolean) {
  const [tooltip, setTooltip] = useState<TooltipState>(HIDDEN);
  const activeHitRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const hideChartTooltip = useCallback(() => {
    activeHitRef.current = null;
    document.querySelectorAll(".is-chart-active").forEach((el) => {
      el.classList.remove("is-chart-active");
    });
    setTooltip(HIDDEN);
  }, []);

  const activateChartHit = useCallback(
    (hit: HTMLElement, clientX: number, clientY: number) => {
      document.querySelectorAll(".is-chart-active").forEach((el) => {
        if (el !== hit) el.classList.remove("is-chart-active");
      });
      hit.classList.add("is-chart-active");

      const content = resolveChartTooltipContent(hit);
      if (!content) return;

      activeHitRef.current = hit;
      const { left, top } = positionChartTooltip(tooltipRef.current, clientX, clientY);
      setTooltip({ visible: true, left, top, content });
    },
    [],
  );

  const reposition = useCallback((clientX: number, clientY: number) => {
    const { left, top } = positionChartTooltip(tooltipRef.current, clientX, clientY);
    setTooltip((prev) => (prev.visible ? { ...prev, left, top } : prev));
  }, []);

  const lastPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (modalOpen) hideChartTooltip();
  }, [modalOpen, hideChartTooltip]);

  useLayoutEffect(() => {
    if (!tooltip.visible) return;
    const { left, top } = positionChartTooltip(
      tooltipRef.current,
      lastPointer.current.x,
      lastPointer.current.y,
    );
    setTooltip((prev) => (prev.visible ? { ...prev, left, top } : prev));
  }, [tooltip.visible, tooltip.content]);

  useEffect(() => {
    function onMouseOver(event: MouseEvent) {
      const target = event.target as Element | null;
      const hit = target?.closest?.(".chart-hit") as HTMLElement | null;
      if (!hit) return;

      const x = event.clientX;
      const y = event.clientY;
      lastPointer.current = { x, y };
      if (hit === activeHitRef.current) {
        reposition(x, y);
        return;
      }

      activateChartHit(hit, x, y);
    }

    function onMouseMove(event: MouseEvent) {
      if (!activeHitRef.current) return;
      lastPointer.current = { x: event.clientX, y: event.clientY };
      reposition(event.clientX, event.clientY);
    }

    function onMouseOut(event: MouseEvent) {
      const target = event.target as Element | null;
      const hit = target?.closest?.(".chart-hit") as HTMLElement | null;
      if (!hit || hit !== activeHitRef.current) return;
      const related = event.relatedTarget as Node | null;
      if (related && hit.contains(related)) return;
      hideChartTooltip();
    }

    function onFocusIn(event: FocusEvent) {
      const target = event.target as Element | null;
      const hit = target?.closest?.(".chart-hit") as HTMLElement | null;
      if (!hit) return;
      const rect = hit.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top;
      lastPointer.current = { x, y };
      activateChartHit(hit, x, y);
    }

    function onFocusOut(event: FocusEvent) {
      const target = event.target as Element | null;
      const hit = target?.closest?.(".chart-hit") as HTMLElement | null;
      if (!hit || hit !== activeHitRef.current) return;
      const related = event.relatedTarget as Node | null;
      if (related && hit.contains(related)) return;
      hideChartTooltip();
    }

    function onScroll() {
      hideChartTooltip();
    }

    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("scroll", onScroll);
    };
  }, [activateChartHit, hideChartTooltip, reposition]);

  return { tooltip, tooltipRef, hideChartTooltip };
}
