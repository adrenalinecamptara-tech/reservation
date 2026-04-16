"use client";

import { useEffect } from "react";
import { useRegistrationStore } from "@/lib/store/registrationStore";
import { PersonalInfoStep } from "./steps/PersonalInfoStep";
import { GroupDetailsStep } from "./steps/GroupDetailsStep";
import { PaymentStep } from "./steps/PaymentStep";

interface Props {
  token: string;
}

const STEPS = ["Lični podaci", "Detalji dolaska", "Uplata"];

export function RegistrationForm({ token }: Props) {
  const { step, setToken } = useRegistrationStore();

  useEffect(() => {
    setToken(token);
  }, [token, setToken]);

  return (
    <div className="act-form-root">
      {/* Background */}
      <div className="act-bg" aria-hidden />

      {/* Card */}
      <div className="act-card">
        {/* Header */}
        <div className="act-header">
          <div className="act-logo-row">
            <span className="act-logo-wave">〰</span>
            <span className="act-logo-text">Adrenaline Camp Tara</span>
            <span className="act-logo-wave">〰</span>
          </div>
          <h1 className="act-title">Potvrdi rezervaciju</h1>
          <p className="act-subtitle">
            Korak {step} od {STEPS.length} — {STEPS[step - 1]}
          </p>
        </div>

        {/* Step indicator */}
        <div className="act-steps" role="progressbar" aria-valuenow={step} aria-valuemax={3}>
          {STEPS.map((label, i) => {
            const num = i + 1;
            const state = num < step ? "done" : num === step ? "active" : "idle";
            return (
              <div key={label} className={`act-step act-step--${state}`}>
                <div className="act-step-dot">
                  {state === "done" ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <span>{num}</span>
                  )}
                </div>
                <span className="act-step-label">{label}</span>
                {i < STEPS.length - 1 && <div className={`act-step-line ${state === "done" ? "act-step-line--done" : ""}`} />}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="act-body">
          {step === 1 && <PersonalInfoStep />}
          {step === 2 && <GroupDetailsStep />}
          {step === 3 && <PaymentStep token={token} />}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .act-form-root {
          min-height: 100vh;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 32px 16px 80px;
          position: relative;
          font-family: 'DM Sans', sans-serif;
          background: #0a1f1f;
        }

        .act-bg {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 20% 0%, rgba(30,77,77,0.6) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 80% 100%, rgba(14,45,45,0.8) 0%, transparent 60%),
            linear-gradient(160deg, #0a1f1f 0%, #0f2e2e 40%, #0a1f1f 100%);
          z-index: 0;
        }
        .act-bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          opacity: 0.4;
        }

        .act-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 540px;
          background: rgba(12, 32, 32, 0.85);
          border: 1px solid rgba(62, 140, 140, 0.2);
          border-radius: 20px;
          overflow: hidden;
          backdrop-filter: blur(20px);
          box-shadow:
            0 0 0 1px rgba(62,140,140,0.05),
            0 24px 64px rgba(0,0,0,0.5),
            0 4px 16px rgba(0,0,0,0.3);
          animation: cardIn 0.5s ease forwards;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .act-header {
          padding: 36px 36px 24px;
          border-bottom: 1px solid rgba(62,140,140,0.12);
          text-align: center;
        }

        .act-logo-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        .act-logo-wave {
          color: rgba(62,140,140,0.5);
          font-size: 18px;
          letter-spacing: -4px;
        }
        .act-logo-text {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(168, 213, 213, 0.7);
        }

        .act-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 32px;
          font-weight: 700;
          color: #e8f5f5;
          line-height: 1.2;
          letter-spacing: 0.01em;
          margin-bottom: 6px;
        }

        .act-subtitle {
          font-size: 13px;
          color: rgba(168,213,213,0.6);
          font-weight: 300;
          letter-spacing: 0.03em;
        }

        /* Step indicator */
        .act-steps {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 0;
          padding: 20px 36px;
          border-bottom: 1px solid rgba(62,140,140,0.12);
        }

        .act-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex: 1;
        }

        .act-step-dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          border: 1.5px solid rgba(62,140,140,0.3);
          color: rgba(168,213,213,0.4);
          background: rgba(12,32,32,0.8);
          transition: all 0.3s ease;
          z-index: 1;
        }
        .act-step--active .act-step-dot {
          border-color: #3a9090;
          color: #3a9090;
          background: rgba(58,144,144,0.12);
          box-shadow: 0 0 12px rgba(58,144,144,0.3);
        }
        .act-step--done .act-step-dot {
          border-color: #2a7070;
          background: rgba(42,112,112,0.3);
          color: #7dcfcf;
        }

        .act-step-label {
          font-size: 10px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-top: 6px;
          color: rgba(168,213,213,0.4);
          font-weight: 500;
          white-space: nowrap;
        }
        .act-step--active .act-step-label { color: rgba(168,213,213,0.85); }
        .act-step--done .act-step-label { color: rgba(125,207,207,0.6); }

        .act-step-line {
          position: absolute;
          top: 14px;
          left: calc(50% + 14px);
          right: calc(-50% + 14px);
          height: 1.5px;
          background: rgba(62,140,140,0.15);
          z-index: 0;
        }
        .act-step-line--done { background: rgba(42,112,112,0.5); }

        /* Body */
        .act-body { padding: 32px 36px 36px; }

        /* Form fields shared styles */
        .act-field { margin-bottom: 20px; }
        .act-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(168,213,213,0.6);
          margin-bottom: 7px;
        }
        .act-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(62,140,140,0.2);
          border-radius: 10px;
          color: #e8f5f5;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 400;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .act-input::placeholder { color: rgba(168,213,213,0.25); }
        .act-input:focus {
          border-color: rgba(58,144,144,0.6);
          background: rgba(58,144,144,0.06);
          box-shadow: 0 0 0 3px rgba(58,144,144,0.12);
        }
        .act-input.act-input--error {
          border-color: rgba(196,30,58,0.5);
          background: rgba(196,30,58,0.05);
        }
        .act-error {
          font-size: 12px;
          color: #e87a8a;
          margin-top: 5px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .act-error::before { content: '⚠'; font-size: 10px; }

        .act-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 420px) { .act-row-2 { grid-template-columns: 1fr; } }

        /* Buttons */
        .act-btn-row {
          display: flex;
          gap: 12px;
          margin-top: 28px;
        }
        .act-btn {
          flex: 1;
          padding: 14px 24px;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.03em;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }
        .act-btn--primary {
          background: linear-gradient(135deg, #1e5c5c 0%, #2a8080 100%);
          color: #e8f5f5;
          box-shadow: 0 4px 16px rgba(30,92,92,0.4);
        }
        .act-btn--primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #246868 0%, #339090 100%);
          box-shadow: 0 6px 20px rgba(30,92,92,0.5);
          transform: translateY(-1px);
        }
        .act-btn--primary:active { transform: translateY(0); }
        .act-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .act-btn--secondary {
          background: rgba(255,255,255,0.04);
          color: rgba(168,213,213,0.7);
          border: 1px solid rgba(62,140,140,0.2);
        }
        .act-btn--secondary:hover { background: rgba(255,255,255,0.07); }

        /* Select */
        .act-input.act-select { appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%233a9090' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 40px; }
        .act-input.act-select option { background: #0f2e2e; color: #e8f5f5; }

        /* Section hint */
        .act-hint {
          font-size: 13px;
          color: rgba(168,213,213,0.45);
          margin-bottom: 24px;
          line-height: 1.6;
          padding: 12px 16px;
          background: rgba(58,144,144,0.06);
          border-left: 2px solid rgba(58,144,144,0.3);
          border-radius: 0 8px 8px 0;
        }
      `}</style>
    </div>
  );
}
