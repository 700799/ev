import { Section, FactGrid } from '@/components/Section';
import HeroSceneClient from '@/components/babylon/HeroSceneClient';
import BatteryScienceClient from '@/components/babylon/BatteryScienceClient';
import ScienceLabClient from '@/components/babylon/ScienceLabClient';
import StationFinderClient from '@/components/StationFinderClient';
import TripPlannerClient from '@/components/TripPlannerClient';
import Calculators from '@/components/Calculators';
import ArticleList from '@/components/ArticleList';
import BatteryFacts from '@/components/BatteryFacts';
import BatteryQuiz from '@/components/BatteryQuiz';
import ModelYearCompare from '@/components/ModelYearCompare';
import BadgeShelf from '@/components/BadgeShelf';
import ReadTracker from '@/components/ReadTracker';
import Carousel from '@/components/Carousel';
import PowerScenarios from '@/components/PowerScenarios';
import WhatGoesWrong from '@/components/WhatGoesWrong';
import ConfiguratorClient from '@/components/babylon/ConfiguratorClient';
import DriveGameClient from '@/components/babylon/DriveGameClient';
import { withBase, SITE } from '@/lib/site';
import {
  batteryFacts,
  batteryFactsIntermediate,
  batteryFactsAdvanced,
  sciencePoints,
  performanceTips,
  drivingPoints,
  evVsRest,
  thingsToAvoid,
  whatCanGoWrong,
  whatCanGoWrongAdvanced,
  biggestComplaints,
  dealTips,
  nightmareScenarios,
  chargingTypes,
  solarPoints,
  teensAndAutopilot,
  latestFeatures,
  foreignVsUs,
  newModels,
  faq,
} from '@/data/content';
import { evModels } from '@/data/evModels';
import { popularArticles, freshArticles } from '@/data/articles';
const proTechniques = [
  { title: 'Hypermiling the EV way', body: 'Anticipate stops far ahead and coast into regen rather than braking late. Smooth inputs beat fast ones for both range and tire life.' },
  { title: 'Master the charge curve', body: 'On road trips, arrive low (~10%) and leave at ~60–80% where charging is fastest. Multiple short stops beat one long top-up.' },
  { title: 'Battery preconditioning', body: 'Always route to a fast charger through the nav so the car warms the pack. A cold battery can halve your charging speed.' },
  { title: 'Weight-aware cornering', body: 'EVs carry mass low but heavy. Brake earlier, trust the planted mid-corner grip, and feed power out smoothly to avoid wheelspin.' },
  { title: 'Wet-road torque control', body: 'Instant torque can light up the tires in the rain. Ease into the pedal off the line and let traction control settle.' },
  { title: 'Trip staging', body: 'Pre-plan chargers with a primary and backup at each stop, and check live status before leaving the previous one.' },
];

const tutorialSteps = [
  { h: 'Confirm you can charge where you live', p: 'Before anything, verify reliable charging: a 240V outlet or Level 2 charger at home, or dependable Level 2 within your daily routine. This single factor decides whether EV ownership is effortless or a chore.' },
  { h: 'Pick the right EV for your real life', p: 'Match range to your longest regular drive (plus a buffer), seats/cargo to your family, and charging standard (NACS access is now the norm). Use the comparison table below to shortlist.' },
  { h: 'Stack every incentive', p: 'Check the federal clean-vehicle credit, your state rebate, and utility programs. Leasing can unlock the credit on more cars. Apply at point of sale when possible.' },
  { h: 'Install Level 2 charging', p: 'Get an electrician to assess your panel, pull a permit, and install a 240V circuit and charger. Claim the federal home-charger credit and any utility rebate. Set the car to charge overnight on a cheap EV rate.' },
  { h: 'Set smart charging habits', p: 'Set a daily charge limit of 80% (100% only before long trips). Plug in whenever you park. Use scheduled charging to hit cheap off-peak windows.' },
  { h: 'Learn one-pedal driving', p: 'Enable high regen, practice modulating with the accelerator, and you will rarely touch the brake in town — smoother and more efficient.' },
  { h: 'Plan your first road trip', p: 'Use the Trip Planner to map chargers, plan to arrive low and leave at 60–80%, precondition before each fast charge, and always pin a backup charger.' },
  { h: 'Maintain the basics', p: 'Rotate tires on schedule, keep pressures correct, change cabin filter and brake fluid per the manual, and keep software updated. Replace the 12V battery proactively around years 3–4.' },
];

export default function Home() {
  return (
    <main>
      <ReadTracker />
      {/* ---------------- HERO ---------------- */}
      <div className="hero">
        <div className="hero-grid">
          <div>
            <span className="pill">Updated for {SITE.year}</span>
            <h1>
              Everything you need to <span className="grad">own an EV</span> with confidence.
            </h1>
            <p className="lead">{SITE.tagline} Find chargers near you, plan trips on free maps, crunch your savings,
              and learn the science, the tips, and the gotchas — all in one place.</p>
            <div className="hero-cta">
              <a className="btn primary" href="#stations">🔌 Find chargers near me</a>
              <a className="btn ghost" href="#battery">Start learning ↓</a>
            </div>
            <p className="muted small" style={{ marginTop: 14 }}>
              Drag the car to spin it · tap ⚡ Charge · pick a paint color.
            </p>
          </div>
          <HeroSceneClient />
        </div>
      </div>

      {/* ---------------- STATIONS (TOP TOOL) ---------------- */}
      <Section
        id="stations"
        kicker="Tool · start here"
        title="Find EV charging stations near you"
        intro="Enter your ZIP code to pull up nearby charging stations on a live map, powered by free OpenStreetMap data."
      >
        <StationFinderClient />
      </Section>

      {/* ---------------- TRIP PLANNER ---------------- */}
      <Section
        id="trip"
        kicker="Tool"
        title="Trip planner with free maps & chargers"
        intro="Map any route on free maps, see charging stations along the way, and estimate stops, energy, and cost for short and long trips."
      >
        <TripPlannerClient />
      </Section>

      {/* ---------------- CALCULATORS ---------------- */}
      <Section
        id="calculators"
        kicker="Tool"
        title="Savings, charging & solar calculators"
        intro="Run the numbers: EV-vs-gas savings, the cost of a single charge or a whole trip, and how fast rooftop solar pays for itself."
      >
        <Calculators />
      </Section>

      {/* ---------------- BADGES / GAMIFICATION ---------------- */}
      <Section
        id="badges"
        kicker="Level up"
        title="Earn learning badges as you explore"
        intro="Read sections, use the tools, customize the 3D car, and pass the quiz to unlock badges, rack up XP, and level up from Curious Driver to EV Guru. Your progress saves in this browser."
      >
        <BadgeShelf />
      </Section>

      {/* ---------------- 10 BATTERY FACTS ---------------- */}
      <Section
        id="battery"
        kicker="Learn · beginner → intermediate → advanced"
        title="10 things to know about battery & charging"
        intro="Pick your level — Beginner, Intermediate, or Advanced (calendar aging, C-rates, lithium plating, cell balancing, and more, with acronyms spelled out) — then test yourself with the quiz. Swipe the cards sideways."
      >
        <BatteryFacts beginner={batteryFacts} intermediate={batteryFactsIntermediate} advanced={batteryFactsAdvanced} />
        <div style={{ marginTop: 24 }}>
          <BatteryQuiz />
        </div>
      </Section>

      {/* ---------------- SCIENCE (with 3D) ---------------- */}
      <Section
        id="science"
        kicker="Learn"
        title="A little of the science"
        intro="Toggle the interactive cell between charging and driving to watch lithium ions move — then read the essentials."
      >
        <div className="grid cols-2" style={{ alignItems: 'start' }}>
          <BatteryScienceClient />
          <div className="grid" style={{ gap: 12 }}>
            {sciencePoints.map((s) => (
              <div className="card" key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ---------------- SCIENCE LAB (4 animations) ---------------- */}
      <Section
        id="science-lab"
        kicker="Learn · interactive lab"
        title="Science lab: six animations you can play with"
        intro="Real, physics-based demos — regenerative braking energy recovery, aerodynamic drag rising with the square of speed, the DC fast-charge taper curve, battery thermal management with coolant flow, cornering (centripetal force vs grip), and inertia/momentum braking distance. Drag the sliders and orbit each scene."
      >
        <ScienceLabClient />
      </Section>

      {/* ---------------- POWER SCENARIOS ---------------- */}
      <Section
        id="power"
        kicker="Learn · interactive"
        title="What drains — or charges — your battery"
        intro="Pick a scenario to watch the power flow animate in real time, see the kW draining or gaining, and read why it happens. From a 0–60 launch to a long downhill that puts energy back."
      >
        <PowerScenarios />
      </Section>

      {/* ---------------- PERFORMANCE TIPS ---------------- */}
      <Section
        id="performance"
        kicker="Learn"
        title="Performance & efficiency tips"
        intro="Squeeze the most range out of every charge."
      >
        <ul className="checks">
          {performanceTips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Section>

      {/* ---------------- HOW TO DRIVE ---------------- */}
      <Section
        id="driving"
        kicker="Learn"
        title="How to drive an EV"
        intro="They drive differently — mostly better — once you adjust."
      >
        <FactGrid facts={drivingPoints} carousel />
      </Section>

      {/* ---------------- PRO TECHNIQUES ---------------- */}
      <Section
        id="pro-driving"
        kicker="Learn"
        title="Professional driving techniques"
        intro="Habits that pro EV drivers and efficiency-record holders rely on."
      >
        <FactGrid facts={proTechniques} carousel />
      </Section>

      {/* ---------------- TUTORIAL ---------------- */}
      <Section
        id="tutorial"
        kicker="Learn · in depth"
        title="In-depth tutorial: from curious to confident EV owner"
        intro="A complete, ordered walkthrough of going electric — follow it top to bottom."
      >
        <ol className="steps">
          {tutorialSteps.map((s) => (
            <li key={s.h}>
              <h4>{s.h}</h4>
              <p>{s.p}</p>
            </li>
          ))}
        </ol>
        <div className="note" style={{ marginTop: 16 }}>
          Want the deep dives? See the full <a href={withBase('/tutorials/')}>tutorials hub</a> for charger
          installation, road-trip mastery, and used-EV buying checklists.
        </div>
      </Section>

      {/* ---------------- EV vs HYBRID vs GAS ---------------- */}
      <Section
        id="compare-types"
        kicker="Compare"
        title="EV vs hybrid vs gas"
        intro="There is no universally 'best' — it depends on how and where you drive."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dimension</th>
                <th>Electric (EV)</th>
                <th>Hybrid</th>
                <th>Gas</th>
              </tr>
            </thead>
            <tbody>
              {evVsRest.map((r) => (
                <tr key={r.dimension}>
                  <td><strong>{r.dimension}</strong></td>
                  <td>{r.ev}</td>
                  <td>{r.hybrid}</td>
                  <td>{r.gas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ---------------- COMPARE EVs ---------------- */}
      <Section
        id="compare-evs"
        kicker="Compare"
        title="Compare popular EVs head-to-head"
        intro="Representative 2025–2026 models. Figures are approximate estimates for orientation."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Type</th>
                <th>Origin</th>
                <th>Range</th>
                <th>0–60</th>
                <th>Fast charge</th>
                <th>Connector</th>
                <th>From</th>
                <th>Why it stands out</th>
              </tr>
            </thead>
            <tbody>
              {evModels.map((m) => (
                <tr key={m.name}>
                  <td><strong>{m.name}</strong></td>
                  <td>{m.type}</td>
                  <td><span className="pill">{m.origin}</span></td>
                  <td>{m.rangeMi} mi</td>
                  <td>{m.zeroToSixty}s</td>
                  <td>{m.fastChargeKw} kW</td>
                  <td>{m.charging}</td>
                  <td>${m.startPriceUsd.toLocaleString()}</td>
                  <td className="muted small">{m.highlight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ---------------- COMPARE MODEL YEARS ---------------- */}
      <Section
        id="model-years"
        kicker="Compare"
        title="Compare model years — same name, different car"
        intro="A Tesla Model 3 from 2022 is a very different car from a 2024 'Highland'. Pick a model to see how range, price, and features changed year to year."
      >
        <ModelYearCompare />
      </Section>

      {/* ---------------- FOREIGN vs US ---------------- */}
      <Section
        id="foreign"
        kicker="Compare"
        title="Foreign EVs vs US EVs"
        intro="The global picture, and what it means for American buyers."
      >
        <FactGrid facts={foreignVsUs} carousel />
      </Section>

      {/* ---------------- NEW MODELS ---------------- */}
      <Section
        id="new-models"
        kicker="Compare"
        title="New models: trucks, SUVs & semis"
        intro="The fast-expanding lineup, from work trucks to electric freight."
      >
        <FactGrid facts={newModels} carousel />
      </Section>

      {/* ---------------- WHAT TO AVOID ---------------- */}
      <Section id="avoid" kicker="More" title="What to avoid" intro="Habits and mistakes that cost range, money, or battery health.">
        <ul className="warns">
          {thingsToAvoid.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Section>

      {/* ---------------- WHAT CAN GO WRONG ---------------- */}
      <Section
        id="wrong"
        kicker="More · beginner → mid-advanced"
        title="What can go wrong & the biggest complaints"
        intro="Switch to Mid-Advanced for the deeper failure modes — charge-curve disappointment, network reliability, phantom drain, 12V stranding, heat-pump gaps, depreciation whiplash — plus the biggest owner complaints ranked and reality-checked."
      >
        <WhatGoesWrong basic={whatCanGoWrong} advanced={whatCanGoWrongAdvanced} complaints={biggestComplaints} />
      </Section>

      {/* ---------------- NIGHTMARE SCENARIOS ---------------- */}
      <Section
        id="nightmares"
        kicker="More"
        title="Nightmare scenarios (and how to dodge them)"
        intro="The worst-case stories you hear about — and exactly how to avoid each one."
      >
        <FactGrid facts={nightmareScenarios} carousel />
      </Section>

      {/* ---------------- DEALS ---------------- */}
      <Section
        id="deals"
        kicker="More"
        title="Where to get the best deals"
        intro="Incentives, timing, and tactics that knock thousands off the price."
      >
        <FactGrid facts={dealTips} carousel />
      </Section>

      {/* ---------------- CHARGING TYPES ---------------- */}
      <Section
        id="charging-types"
        kicker="More"
        title="Garage charging in CA vs other charging"
        intro="Home Level 2 charging is the foundation — and California's rates and solar make it especially cheap."
      >
        <FactGrid facts={chargingTypes} carousel />
      </Section>

      {/* ---------------- SOLAR ---------------- */}
      <Section
        id="solar"
        kicker="More"
        title="Solar panel setups & cost"
        intro="Pair panels with your EV to drive on sunshine. Use the Solar calculator above to model your payback."
      >
        <FactGrid facts={solarPoints} carousel />
      </Section>

      {/* ---------------- TEENS ---------------- */}
      <Section
        id="teens"
        kicker="More"
        title="Should teens learn to drive on an EV with autopilot?"
        intro="The honest answer: EVs are great learners' cars, but hands-off assist should wait."
      >
        <FactGrid facts={teensAndAutopilot} carousel />
      </Section>

      {/* ---------------- LATEST & AUTONOMY ---------------- */}
      <Section
        id="latest"
        kicker="More"
        title="Latest EV features & the autonomous rollout"
        intro="Hands-free highways, NACS everywhere, bidirectional charging — and the Waymo-led robotaxi race."
      >
        <FactGrid facts={latestFeatures} carousel />
      </Section>

      {/* ---------------- FAQ ---------------- */}
      <Section id="faq" kicker="More" title="Anything else? Quick answers" intro="The questions new owners ask most.">
        <FactGrid facts={faq} carousel />
      </Section>

      {/* ---------------- PLAY: 3D CONFIGURATOR ---------------- */}
      <Section
        id="configurator"
        kicker="Play · build your EV"
        title="Design your dream EV in 3D"
        intro="Pick a body, paint, and wheel style, then tack on up to 15 accessories. Watch the live budget and see how each add-on's weight and aerodynamic drag changes your range, 0–60, and cornering grip. Drag to spin it around your garage."
      >
        <ConfiguratorClient />
      </Section>

      {/* ---------------- PLAY: DRIVE & EXPLORE ---------------- */}
      <Section
        id="explore"
        kicker="Play · free roam"
        title="Drive & explore the EV you built"
        intro="Take the exact car from the builder above for a free-roam cruise through a city of changing landscapes — downtown, neon district, waterfront, forest, desert, and mountains."
      >
        <div style={{ textAlign: 'center' }}>
          <a className="btn primary" href={withBase('/explore/')}>🌆 Open Drive &amp; Explore →</a>
        </div>
      </Section>

      {/* ---------------- PLAY: DRIVE GAME ---------------- */}
      <Section
        id="drive-game"
        kicker="Play · mini-game"
        title="EV Dodge — drive, dodge & charge"
        intro="Take the wheel! Switch lanes to dodge cones and deer, grab charge bolts to keep your battery alive, and see how far you can go as the speed ramps up. Arrows / A–D, buttons, or swipe to steer."
      >
        <DriveGameClient />
      </Section>

      {/* ---------------- POPULAR (PAGINATED) ---------------- */}
      <Section
        id="popular"
        kicker="Trending"
        title="Top articles this week"
        intro="The most-read pieces over the last 7 days, ranked. Paginated for easy browsing."
      >
        <ArticleList articles={popularArticles} pageSize={5} ranked />
      </Section>

      {/* ---------------- FRESH ARTICLES (BOTTOM) ---------------- */}
      <Section
        id="fresh"
        kicker="Just published"
        title="Fresh articles"
        intro="Our newest stories — always at the bottom, always up to date."
      >
        <Carousel itemMinWidth={300}>
          {freshArticles.slice(0, 12).map((a) => (
            <article className="card" key={a.id}>
              <span className="pill">{a.category}</span>
              <h3 style={{ margin: '8px 0 6px', fontSize: '1.02rem' }}>
                <a href={withBase(`/articles/${a.id}/`)} style={{ color: 'inherit' }}>{a.title}</a>
              </h3>
              <p>{a.excerpt}</p>
              <div className="article-meta">
                <span>🗓️ {new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span>⏱️ {a.readMinutes} min</span>
              </div>
            </article>
          ))}
        </Carousel>
        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <a className="btn ghost" href={withBase('/articles/')}>Browse all articles →</a>
        </div>
      </Section>

      <footer>
        <div className="container">
          <strong>{SITE.name}</strong> — {SITE.tagline}
          <p className="disclaimer">
            Educational content only; not financial, legal, or professional advice. Range, price, and incentive figures
            are approximate and change frequently — verify with manufacturers, dealers, and official programs. Maps and
            charger data come from OpenStreetMap contributors, OSRM, and Overpass. © {SITE.year} {SITE.name}.
          </p>
        </div>
      </footer>
    </main>
  );
}
