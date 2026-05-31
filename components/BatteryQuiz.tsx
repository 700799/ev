'use client';

import { useState } from 'react';
import { useGame } from './GameProvider';

interface QuizQ {
  q: string;
  options: string[];
  answer: number;
  why: string;
}

const QUESTIONS: QuizQ[] = [
  {
    q: 'For most drivers, what degrades the battery more?',
    options: ['Total miles driven', 'Calendar time at high average state of charge', 'Number of times you plug in', 'Using regen braking'],
    answer: 1,
    why: 'Calendar aging at a high average SoC and temperature usually outweighs cycle (mileage) aging.',
  },
  {
    q: 'Why are LFP owners told to charge to 100% periodically?',
    options: ['LFP cells need overcharging to stay healthy', 'It makes the car faster', 'The flat voltage curve needs a top reference to recalibrate SoC', 'To prevent fires'],
    answer: 2,
    why: 'LFP’s flat discharge curve makes mid-range SoC hard to estimate; a full charge recalibrates the BMS.',
  },
  {
    q: 'Charging speed tapers at higher SoC mainly to avoid…',
    options: ['Lithium plating on the anode', 'Overheating the cabin', 'Draining the 12V battery', 'Tire wear'],
    answer: 0,
    why: 'As the anode fills, pushing more current risks plating, so the BMS throttles power.',
  },
  {
    q: 'A key real benefit of an 800V architecture is…',
    options: ['It looks better', 'Lower current for the same power, so less resistive (I²R) heat', 'It removes the need for a battery', 'Free charging'],
    answer: 1,
    why: 'Higher voltage means lower current for the same power; losses scale with current squared, so 800V runs cooler.',
  },
  {
    q: 'Why might a freshly 100%-charged EV coast instead of regen-braking?',
    options: ['Regen is broken', 'A full pack can’t absorb more charge current', 'The brakes overheated', 'It saves tires'],
    answer: 1,
    why: 'Regen is limited by SoC, temperature, and C-rate — a full or cold pack can’t accept the current.',
  },
];

const PASS = 4;

export default function BatteryQuiz() {
  const { record, earned } = useGame();
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const alreadyPassed = earned.has('quiz-whiz');

  const score = answers.reduce<number>((s, a, i) => (a === QUESTIONS[i].answer ? s + 1 : s), 0);
  const passed = score >= PASS;

  const submit = () => {
    setSubmitted(true);
    if (passed) record('quiz:battery:pass');
  };

  const reset = () => {
    setAnswers(Array(QUESTIONS.length).fill(null));
    setSubmitted(false);
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>🧠 Advanced battery quiz</h3>
        {alreadyPassed && <span className="pill" style={{ color: 'var(--accent)', borderColor: 'currentColor' }}>Quiz Whiz earned ✓</span>}
      </div>
      <p className="muted small" style={{ marginTop: 6 }}>
        Score {PASS}/{QUESTIONS.length} to earn the <strong>Quiz Whiz</strong> badge (+100 XP).
      </p>

      <div style={{ display: 'grid', gap: 16, marginTop: 12 }}>
        {QUESTIONS.map((item, qi) => (
          <div key={qi}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{qi + 1}. {item.q}</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {item.options.map((opt, oi) => {
                const chosen = answers[qi] === oi;
                const isAnswer = item.answer === oi;
                let bg = 'var(--bg-2)';
                let bc = 'var(--border)';
                if (submitted) {
                  if (isAnswer) { bg = 'rgba(90,163,146,0.18)'; bc = 'var(--accent)'; }
                  else if (chosen) { bg = 'rgba(205,106,126,0.18)'; bc = 'var(--danger)'; }
                } else if (chosen) { bc = 'var(--accent-2)'; }
                return (
                  <button
                    key={oi}
                    disabled={submitted}
                    onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                    style={{
                      textAlign: 'left',
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: `1px solid ${bc}`,
                      background: bg,
                      color: 'var(--text)',
                      cursor: submitted ? 'default' : 'pointer',
                      font: 'inherit',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {submitted && <p className="muted small" style={{ margin: '6px 2px 0' }}>{item.why}</p>}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {!submitted ? (
          <button className="btn primary" onClick={submit} disabled={answers.some((a) => a === null)}>
            Submit answers
          </button>
        ) : (
          <>
            <span className="result-strong" style={{ color: passed ? 'var(--accent)' : 'var(--warn)' }}>
              {score}/{QUESTIONS.length} {passed ? '— passed! 🎉' : '— keep studying'}
            </span>
            <button className="btn ghost" onClick={reset}>Try again</button>
          </>
        )}
      </div>
    </div>
  );
}
