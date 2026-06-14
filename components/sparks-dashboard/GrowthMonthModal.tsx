"use client";

import { useEffect, useRef } from "react";
import type { DashboardEvent, DashboardMember } from "./types";
import {
  formatDate,
  formatMonthHeading,
  formatNumber,
  memberTierLabel,
  membershipTypeLabel,
  monthKeyFromIso,
} from "./utils";

type GrowthMonthModalProps = {
  monthKey: string | null;
  members: DashboardMember[];
  events: DashboardEvent[];
  onClose: () => void;
};

function MemberNameCell({ member }: { member: DashboardMember }) {
  const name = member.displayName ?? "Member";
  if (!member.profileUrl) return <>{name}</>;
  return (
    <a
      href={member.profileUrl}
      className="member-profile-link"
      target="_blank"
      rel="noopener noreferrer"
    >
      {name}
    </a>
  );
}

function GrowthModalMemberItem({ member }: { member: DashboardMember }) {
  return (
    <li
      className={`growth-modal__item${member.isHonorary ? " growth-modal__item--honorary" : ""}`}
    >
      <span className="growth-modal__item-main">
        <MemberNameCell member={member} />
      </span>
      <span className="growth-modal__item-meta">
        {memberTierLabel(member.tier)} · {membershipTypeLabel(member.type)}
      </span>
    </li>
  );
}

function GrowthModalEventItem({ event }: { event: DashboardEvent }) {
  return (
    <li className="growth-modal__item">
      <span className="growth-modal__item-main">
        {event.asanaUrl ? (
          <a href={event.asanaUrl} target="_blank" rel="noopener noreferrer">
            {event.title}
          </a>
        ) : (
          event.title
        )}
      </span>
      <span className="growth-modal__item-meta">{formatDate(event.date)}</span>
    </li>
  );
}

function GrowthModalEmpty({ text }: { text: string }) {
  return <li className="growth-modal__empty">{text}</li>;
}

export function GrowthMonthModal({ monthKey, members, events, onClose }: GrowthMonthModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  const open = monthKey !== null;

  useEffect(() => {
    if (open) {
      lastFocusRef.current = document.activeElement as HTMLElement | null;
      document.body.classList.add("growth-modal-open");
      closeButtonRef.current?.focus();
    } else {
      document.body.classList.remove("growth-modal-open");
      lastFocusRef.current?.focus?.();
      lastFocusRef.current = null;
    }

    return () => {
      document.body.classList.remove("growth-modal-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !monthKey) return null;

  const paid = members.filter(
    (m) => !m.isHonorary && monthKeyFromIso(m.memberSince) === monthKey,
  );
  const honorary = members.filter(
    (m) => m.isHonorary && monthKeyFromIso(m.memberSince) === monthKey,
  );
  const monthEvents = events.filter(
    (e) => e.status === "done" && monthKeyFromIso(e.date) === monthKey,
  );

  return (
    <div id="growth-modal" className="growth-modal">
      <div className="growth-modal__backdrop" data-growth-modal-close onClick={onClose} />
      <div
        className="growth-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="growth-modal-title"
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="growth-modal__close"
          data-growth-modal-close
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        <h2 id="growth-modal-title" className="growth-modal__title">
          {formatMonthHeading(monthKey)}
        </h2>
        <p id="growth-modal-summary" className="growth-modal__summary">
          {formatNumber(paid.length)} paid · {formatNumber(honorary.length)} honorary ·{" "}
          {formatNumber(monthEvents.length)} events held
        </p>
        <div className="growth-modal__sections">
          <section className="growth-modal__section">
            <h3 className="growth-modal__section-title">New paid members</h3>
            <ul id="growth-modal-paid" className="growth-modal__list">
              {paid.length ? (
                paid.map((m) => (
                  <GrowthModalMemberItem key={`${m.displayName}-${m.memberSince}`} member={m} />
                ))
              ) : (
                <GrowthModalEmpty text="No new paid members this month" />
              )}
            </ul>
          </section>
          <section className="growth-modal__section growth-modal__section--honorary">
            <h3 className="growth-modal__section-title">New honorary members</h3>
            <ul id="growth-modal-honorary" className="growth-modal__list">
              {honorary.length ? (
                honorary.map((m) => (
                  <GrowthModalMemberItem key={`${m.displayName}-${m.memberSince}`} member={m} />
                ))
              ) : (
                <GrowthModalEmpty text="No new honorary members this month" />
              )}
            </ul>
          </section>
          <section className="growth-modal__section">
            <h3 className="growth-modal__section-title">Events held</h3>
            <ul id="growth-modal-events" className="growth-modal__list">
              {monthEvents.length ? (
                monthEvents.map((e) => (
                  <GrowthModalEventItem key={`${e.title}-${e.date}`} event={e} />
                ))
              ) : (
                <GrowthModalEmpty text="No events held this month" />
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
