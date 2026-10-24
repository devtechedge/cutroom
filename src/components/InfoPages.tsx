import type { JSX, ReactNode } from "react";
import { Icon } from "./Icon";

const REPO = "https://github.com/devtechedge/cutroom";
const FEEDBACK = "https://github.com/devtechedge/cutroom/issues/new/choose";
const SECURITY = "https://github.com/devtechedge/cutroom/security/advisories/new";

function ThemeButton({ theme, onToggleTheme }: { theme: "dark" | "light"; onToggleTheme: () => void }): JSX.Element {
  return (
    <button type="button" className="icon-btn" onClick={onToggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
      <Icon name={theme === "dark" ? "sun" : "moon"} />
    </button>
  );
}

function SiteHeader({ theme, onToggleTheme }: { theme: "dark" | "light"; onToggleTheme: () => void }): JSX.Element {
  return (
    <header className="app-header info-header">
      <a className="wordmark" href="#/" aria-label="CUTROOM studio">
        <Icon name="logo" size={18} />
        CUTROOM
      </a>
      <span className="header-spacer" />
      <a className="btn small" href="#/welcome">
        Why CUTROOM
      </a>
      <a className="btn small primary" href="#/">
        Open studio
      </a>
      <ThemeButton theme={theme} onToggleTheme={onToggleTheme} />
    </header>
  );
}

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
        <a href={FEEDBACK} target="_blank" rel="noopener noreferrer">
          Feedback
        </a>
        <a href={REPO} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </nav>
      <p className="site-footer-note mono">MIT licensed · no account · no telemetry</p>
    </footer>
  );
}

function InfoShell({
  theme,
  onToggleTheme,
  eyebrow,
  title,
  lede,
  children,
}: {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="info-shell scroll-hover">
      <SiteHeader theme={theme} onToggleTheme={onToggleTheme} />
      <main className="info-main" id="main">
        <p className="info-eyebrow mono">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="info-lede">{lede}</p>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function Welcome({ theme, onToggleTheme, onOpenDemo }: { theme: "dark" | "light"; onToggleTheme: () => void; onOpenDemo: () => void }): JSX.Element {
  return (
    <div className="info-shell scroll-hover">
      <SiteHeader theme={theme} onToggleTheme={onToggleTheme} />
      <main className="info-main welcome" id="main">
        <section className="welcome-hero">
          <p className="info-eyebrow mono">Storyboard and visual narrative studio</p>
          <h1>Storyboard the cut before you shoot it.</h1>
          <p className="info-lede">
            CUTROOM is a browser-based studio for planning shots: compose each frame, set the rhythm on a timeline, play the sequence, and hand over a
            contact sheet your team can read.
          </p>
          <div className="welcome-ctas">
            <a className="btn primary" href="#/">
              <Icon name="logo" size={15} />
              Open the studio
            </a>
            <button type="button" className="btn" onClick={onOpenDemo}>
              <Icon name="play" size={14} />
              Open a demo board
            </button>
          </div>
          <p className="welcome-note mono">Free and open source · no account · boards stay in this browser</p>
        </section>

        <section className="welcome-section" aria-labelledby="audience-heading">
          <h2 id="audience-heading">Made for the people who plan the frame</h2>
          <div className="welcome-grid">
            <article className="welcome-card">
              <h3>Filmmakers and directors</h3>
              <p>Block a scene before the location scout, then share shot type, hold time and framing notes with the crew.</p>
            </article>
            <article className="welcome-card">
              <h3>Product and marketing teams</h3>
              <p>Turn a launch brief into a five-beat social cut. Export the board as a PNG, SVG, PDF or JSON file.</p>
            </article>
            <article className="welcome-card">
              <h3>Teachers and explainers</h3>
              <p>Plan a lesson as a sequence of frames, with captions that double as the spoken script.</p>
            </article>
            <article className="welcome-card">
              <h3>Game and motion teams</h3>
              <p>Pitch a cinematic or a UI beat with the same board language the rest of the team already reads.</p>
            </article>
          </div>
        </section>

        <section className="welcome-section" aria-labelledby="how-heading">
          <h2 id="how-heading">From brief to board in four moves</h2>
          <ol className="welcome-steps">
            <li>
              <strong>Start from a board or a template.</strong> Pick a blank frame, a short film, a product launch, a lesson or a game cinematic.
            </li>
            <li>
              <strong>Compose the frame.</strong> Add images, shapes, text and vector artwork. Drag, resize, nudge and use marquee selection for groups.
            </li>
            <li>
              <strong>Set the rhythm.</strong> Give each frame a hold, a shot type and a transition. Reorder on the timeline until the sequence reads.
            </li>
            <li>
              <strong>Preview and export.</strong> Play the cut, then download a contact sheet or open the print view to save a PDF.
            </li>
          </ol>
        </section>

        <section className="welcome-section welcome-local" aria-labelledby="local-heading">
          <div>
            <h2 id="local-heading">Local by default, portable on purpose</h2>
            <p>
              Boards and uploaded images live in this browser's IndexedDB. There is no account, no sync server and no telemetry. Project JSON includes the images,
              so a board can move to another machine. The backup action packages every active board into one file.
            </p>
          </div>
          <ul className="welcome-checks">
            <li>Works offline after the first load</li>
            <li>Project JSON and backups restore images</li>
            <li>Print view saves a PDF through the browser</li>
            <li>Recently deleted boards are kept for 30 days</li>
          </ul>
        </section>

        <section className="welcome-section" aria-labelledby="faq-heading">
          <h2 id="faq-heading">Questions people ask first</h2>
          <div className="welcome-faq">
            <details>
              <summary>Does it work offline?</summary>
              <p>Yes, once the page has loaded. Fonts are bundled with the app and there are no runtime network calls.</p>
            </details>
            <details>
              <summary>Where are my boards stored?</summary>
              <p>In this browser's IndexedDB on this device. Clearing site data removes them, so download a backup before you clear storage.</p>
            </details>
            <details>
              <summary>Are my images uploaded anywhere?</summary>
              <p>No. Images are read locally and stored as data URLs in the same browser database. The app has no server to upload them to.</p>
            </details>
            <details>
              <summary>Can I share a board with someone else?</summary>
              <p>Not with a live link yet. Today you can share the exported contact sheet, PDF or project JSON file. Share links and version history are on the roadmap.</p>
            </details>
            <details>
              <summary>What does it cost?</summary>
              <p>CUTROOM is free and open source under the MIT license. There is no paid plan and no account to create.</p>
            </details>
          </div>
        </section>

        <section className="welcome-cta">
          <h2>Plan the next sequence here.</h2>
          <p>No sign-up. Open a template, make it yours, export the board.</p>
          <a className="btn primary" href="#/">
            Open the studio
          </a>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export function PrivacyPage({ theme, onToggleTheme }: { theme: "dark" | "light"; onToggleTheme: () => void }): JSX.Element {
  return (
    <InfoShell
      theme={theme}
      onToggleTheme={onToggleTheme}
      eyebrow="Privacy"
      title="Your boards stay in your browser."
      lede="CUTROOM is a static, client-only app. This page explains what that means for your data, in plain language."
    >
      <div className="legal-copy">
        <p className="legal-date mono">Last updated 24 October 2026</p>
        <h2>What CUTROOM stores</h2>
        <p>
          Boards, frame notes and uploaded images are stored in IndexedDB on your device. Theme and backup preferences are stored in localStorage. None of this is
          sent to a CUTROOM server because there is no CUTROOM server.
        </p>
        <h2>What leaves your device</h2>
        <p>
          Nothing you create is transmitted. Export files are generated in the browser and saved through your normal download flow. The only network request is
          loading the app itself from its host, which may keep standard request logs such as IP address, user agent and timestamp under the host's own policy.
        </p>
        <h2>No accounts, analytics or advertising</h2>
        <p>
          There is no sign-up, no cookie-based tracking, no third-party analytics and no advertising script. The app makes no external requests after it loads.
        </p>
        <h2>Clearing your data</h2>
        <p>
          Clearing site data, using a private window, or deleting boards in the app removes them from that browser. Recently deleted boards and their images are kept
          for up to 30 days so you can restore them, then cleaned up at startup. Use Back up all and keep the file somewhere safe if you want a copy.
        </p>
        <h2>Security reports</h2>
        <p>
          Please report vulnerabilities through the private advisory form at{" "}
          <a href={SECURITY} target="_blank" rel="noopener noreferrer">
            GitHub Security Advisories
          </a>
          , not a public issue.
        </p>
        <h2>Changes</h2>
        <p>If this policy changes, the updated date on this page changes with it. The source history is public in the repository.</p>
      </div>
    </InfoShell>
  );
}

export function TermsPage({ theme, onToggleTheme }: { theme: "dark" | "light"; onToggleTheme: () => void }): JSX.Element {
  return (
    <InfoShell
      theme={theme}
      onToggleTheme={onToggleTheme}
      eyebrow="Terms"
      title="A free tool, used at your own judgement."
      lede="These terms cover the hosted copy of CUTROOM. The source is available under the MIT license."
    >
      <div className="legal-copy">
        <p className="legal-date mono">Last updated 24 October 2026</p>
        <h2>Using CUTROOM</h2>
        <p>
          You may use CUTROOM for personal and commercial storyboarding. You are responsible for the images, text and other material you add, and for making sure you
          have the rights to use it.
        </p>
        <h2>Your data is your responsibility</h2>
        <p>
          Boards live in your browser. CUTROOM cannot recover a board after site data is cleared, a browser profile is lost, or a device fails. Download backups of
          work you need to keep.
        </p>
        <h2>No warranty</h2>
        <p>
          The app is provided as is, without warranties of any kind. Exports and playback are offered as creative aids, not as a guaranteed production pipeline. To
          the extent permitted by law, the project maintainers are not liable for lost work or indirect damages.
        </p>
        <h2>Availability</h2>
        <p>The hosted copy may change, move or go offline. The MIT-licensed source can be self-hosted if you need a durable copy.</p>
        <h2>Acceptable use</h2>
        <p>Do not use the hosted app to break the law or to process material you do not have permission to use.</p>
        <h2>License</h2>
        <p>
          The source is released under the MIT license. See the repository's LICENSE file for the exact terms. These page-level terms do not replace that license.
        </p>
        <h2>Contact</h2>
        <p>
          Questions about these terms can go through the{" "}
          <a href="#/contact">contact page</a>.
        </p>
      </div>
    </InfoShell>
  );
}

export function ContactPage({ theme, onToggleTheme }: { theme: "dark" | "light"; onToggleTheme: () => void }): JSX.Element {
  return (
    <InfoShell
      theme={theme}
      onToggleTheme={onToggleTheme}
      eyebrow="Contact and feedback"
      title="Tell us what broke, or what would make the cut."
      lede="CUTROOM is maintained in the open. GitHub is the fastest route for bugs, ideas and security reports."
    >
      <div className="contact-grid">
        <section className="contact-card">
          <h2>Report a bug</h2>
          <p>Include the board you were editing, what you expected, what happened, and your browser. A screenshot helps.</p>
          <a className="btn" href={FEEDBACK} target="_blank" rel="noopener noreferrer">
            Open an issue
          </a>
        </section>
        <section className="contact-card">
          <h2>Request a feature</h2>
          <p>Say which part of the workflow it improves: composing, timing, reviewing or exporting.</p>
          <a className="btn" href={FEEDBACK} target="_blank" rel="noopener noreferrer">
            Share an idea
          </a>
        </section>
        <section className="contact-card">
          <h2>Report a security issue</h2>
          <p>Use a private advisory so the report is not public while it is being fixed.</p>
          <a className="btn" href={SECURITY} target="_blank" rel="noopener noreferrer">
            Private advisory
          </a>
        </section>
        <section className="contact-card">
          <h2>Read the source</h2>
          <p>Licensed under MIT. Issues, pull requests and the release history live in the repository.</p>
          <a className="btn" href={REPO} target="_blank" rel="noopener noreferrer">
            Open GitHub
          </a>
        </section>
      </div>
      <p className="contact-note">
        CUTROOM does not collect board data, so a support report should include the exported project JSON or a screenshot if you can share one.
      </p>
    </InfoShell>
  );
}
