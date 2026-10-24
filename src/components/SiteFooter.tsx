import type { JSX } from "react";
import { FEEDBACK_URL, REPO_URL } from "../lib/links";
import { Icon } from "./Icon";

export function SiteFooter(): JSX.Element {
  return (
    <footer className="site-footer">
      <div className="site-footer-brand">
        <span className="wordmark">
          <Icon name="logo" size={16} />
          CUTROOM
        </span>
        <p>Storyboard the cut before you shoot it. Runs in your browser, keeps boards on your machine.</p>
      </div>
      <nav className="site-footer-links" aria-label="Product and legal">
        <a href="#/welcome">Why CUTROOM</a>
        <a href="#/">Open studio</a>
        <a href="#/privacy">Privacy</a>
        <a href="#/terms">Terms</a>
        <a href="#/contact">Contact</a>
        <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
          Feedback
        </a>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </nav>
      <p className="site-footer-note mono">MIT licensed · no account · no telemetry</p>
    </footer>
  );
}
