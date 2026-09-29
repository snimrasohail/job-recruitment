import Link from "next/link";
import "./intro.css";

export default function IntroPage() {
  return (
    <main className="intro-page">
      <nav className="intro-nav">
        <div className="intro-brand"><span>H</span> hire<span>flow</span></div>
        <Link className="intro-link" href="/">Open workspace →</Link>
      </nav>
      <section className="intro-hero">
        <div className="intro-copy">
          <p className="intro-kicker">Nowshera Digital · Recruitment platform</p>
          <h1>Hire better.<br /><em>Move faster.</em></h1>
          <p className="intro-lede">A secure recruitment workspace for managing jobs, candidates, applications, interviews, and hiring decisions in one place.</p>
          <div className="intro-actions">
            <Link className="intro-button primary" href="/">Start demonstration →</Link>
            <a className="intro-button secondary" href="#roles">View system roles</a>
          </div>
          <blockquote className="intro-quote">
            “Great teams are built one thoughtful hire at a time.”
            <cite>— Hireflow principle</cite>
          </blockquote>
        </div>
        <div className="intro-visual">
          <img src="/images/recruitment-workspace-hero.png" alt="Recruiters reviewing candidates in a digital hiring workspace" />
        </div>
      </section>
      <section id="roles" className="intro-cards">
        <article><span className="intro-icon">A</span><h2>Admin</h2><p>Creates jobs, manages openings, and assigns recruiters.</p></article>
        <article><span className="intro-icon purple">R</span><h2>Recruiter</h2><p>Reviews applicants, protected AI summaries, interviews, and stages.</p></article>
        <article><span className="intro-icon amber">C</span><h2>Candidate</h2><p>Browses jobs, uploads a CV, applies, and tracks progress.</p></article>
      </section>
      <footer className="intro-footer">Secure workflows · Private candidate data · Server-side AI protection</footer>
    </main>
  );
}
