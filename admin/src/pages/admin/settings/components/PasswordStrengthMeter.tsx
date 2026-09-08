import React from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthMeterProps {
  password: string;
}

export function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  percent: number;
} {
  if (!password)
    return { score: 0, label: "None", color: "bg-slate-200", percent: 0 };

  let score = 0;
  if (password.length >= 8) score += 25;
  if (/[A-Z]/.test(password)) score += 25;
  if (/[0-9]/.test(password)) score += 25;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 25;

  if (score <= 25)
    return { score: 1, label: "Weak", color: "bg-red-600", percent: 25 };
  if (score <= 50)
    return { score: 2, label: "Fair", color: "bg-amber-500", percent: 50 };
  if (score <= 75)
    return { score: 3, label: "Good", color: "bg-yellow-500", percent: 75 };
  return { score: 4, label: "Strong", color: "bg-green-600", percent: 100 };
}

export function PasswordStrengthMeter({
  password,
}: PasswordStrengthMeterProps) {
  const { label, color, percent } = calculatePasswordStrength(password);

  const rules = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "At least 1 uppercase letter (A-Z)", met: /[A-Z]/.test(password) },
    { label: "At least 1 number (0-9)", met: /[0-9]/.test(password) },
    {
      label: "At least 1 special character (!@#$%^&*)",
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    },
  ];

  return (
    <div className="space-y-3 pt-1">
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-600">
            Password Strength
          </span>
          <span className="font-bold text-slate-800">
            {password ? label : "Enter password"}
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${color}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Rules Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {rules.map((rule, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-[11px]">
            {rule.met ? (
              <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-350 shrink-0" />
            )}
            <span
              className={
                rule.met
                  ? "text-green-700 font-semibold"
                  : "text-slate-400 font-normal"
              }
            >
              {rule.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

