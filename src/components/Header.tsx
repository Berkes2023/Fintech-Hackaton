"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NAV } from "@/lib/nav";
import { Icon } from "./Icon";

export function Header() {
  const [open, setOpen] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});

  const schedule = (key: string | null, delay: number) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(key), delay);
  };
  const close = () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); setOpen(null); setDrawer(false); };

  useEffect(() => {
    if (!open && !drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (open) triggers.current[open]?.focus();
      setOpen(null);
      setDrawer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, drawer]);

  const group = NAV.find((g) => g.key === open);

  return (
    <>
      <header className="header" onMouseLeave={() => schedule(null, 160)}>
        <div className="container header-inner">
          <Link href="/" className="wordmark" onClick={close}>Before You <span>Sign</span></Link>

          <nav className="nav" aria-label="Main">
            {NAV.map((g) => (
              <button
                key={g.key}
                ref={(el) => { triggers.current[g.key] = el; }}
                type="button"
                className="nav-trigger"
                aria-expanded={open === g.key}
                aria-controls={`mega-${g.key}`}
                onMouseEnter={() => schedule(g.key, open ? 0 : 90)}
                onClick={() => setOpen(open === g.key ? null : g.key)}
              >
                {g.label}
                <Icon name="chevron" size={16} />
              </button>
            ))}
          </nav>

          <div className="header-actions">
            <Link href="/compare" className="text-link" onClick={close}>Compare</Link>
            <Link href="/check" className="btn btn-on-dark btn-sm" onClick={close}>Check a cost</Link>
          </div>

          <button type="button" className="menu-btn" aria-expanded={drawer} aria-controls="drawer" aria-label={drawer ? "Close menu" : "Open menu"} onClick={() => setDrawer(!drawer)}>
            <Icon name={drawer ? "close" : "menu"} size={24} />
          </button>
        </div>

        {group && (
          <div className="mega" id={`mega-${group.key}`} role="region" aria-label={`${group.label} menu`} onMouseEnter={() => schedule(group.key, 0)}>
            <div className="container mega-inner">
              <div className="mega-intro">
                <p className="h3">{group.label}</p>
                <p className="small muted">{group.intro}</p>
              </div>
              <ul className="mega-links">
                {group.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="mega-link" onClick={close}>
                      <span className="icon"><Icon name={l.icon} /></span>
                      <b>{l.title}</b>
                      <small>{l.desc}</small>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={group.feature.href} className="mega-feature" onClick={close}>
                <span className="caption">{group.feature.eyebrow}</span>
                <span className="h3">{group.feature.title}</span>
                <span className="small" style={{ color: "var(--color-graphite)" }}>{group.feature.body}</span>
                <span className="row" style={{ fontWeight: 600 }}>{group.feature.cta} <Icon name="arrow" size={18} /></span>
              </Link>
            </div>
          </div>
        )}

        {drawer && (
          <div className="drawer" id="drawer">
            <div className="container">
              {NAV.map((g) => (
                <details key={g.key}>
                  <summary>{g.label} <Icon name="chevron" /></summary>
                  <ul>
                    {g.links.map((l) => (
                      <li key={l.href}><Link href={l.href} onClick={close}>{l.title}<small>{l.desc}</small></Link></li>
                    ))}
                  </ul>
                </details>
              ))}
              <div className="drawer-actions">
                <Link href="/check" className="btn btn-dark" onClick={close}>Check a cost</Link>
                <Link href="/compare" className="btn btn-light" onClick={close}>Compare options</Link>
              </div>
            </div>
          </div>
        )}
      </header>
      {group && <div className="mega-backdrop" style={{ top: 0 }} aria-hidden="true" onClick={close} onMouseEnter={() => schedule(null, 120)} />}
    </>
  );
}
