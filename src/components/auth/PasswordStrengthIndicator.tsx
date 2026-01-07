import { Check, X } from "lucide-react";
import { useMemo } from "react";

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function usePasswordStrength(password: string) {
  return useMemo(() => {
    const requirements: PasswordRequirement[] = [
      { label: "至少8个字符", met: password.length >= 8 },
      { label: "包含大写字母", met: /[A-Z]/.test(password) },
      { label: "包含小写字母", met: /[a-z]/.test(password) },
      { label: "包含数字", met: /[0-9]/.test(password) },
      { label: "包含特殊字符 (!@#$%^&*)", met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
    ];

    const metCount = requirements.filter(r => r.met).length;
    const isStrong = metCount === requirements.length;
    
    // Calculate strength level (0-4)
    let strengthLevel = 0;
    if (password.length > 0) strengthLevel = 1;
    if (metCount >= 2) strengthLevel = 2;
    if (metCount >= 4) strengthLevel = 3;
    if (isStrong) strengthLevel = 4;

    const strengthLabels = ["", "弱", "一般", "良好", "强"];
    const strengthColors = ["", "bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-green-500"];

    return {
      requirements,
      isStrong,
      strengthLevel,
      strengthLabel: strengthLabels[strengthLevel],
      strengthColor: strengthColors[strengthLevel],
    };
  }, [password]);
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { requirements, strengthLevel, strengthLabel, strengthColor } = usePasswordStrength(password);

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex gap-0.5">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`flex-1 rounded-full transition-colors ${
                level <= strengthLevel ? strengthColor : "bg-muted"
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-medium ${
          strengthLevel >= 4 ? "text-green-500" : 
          strengthLevel >= 3 ? "text-yellow-500" : 
          strengthLevel >= 2 ? "text-orange-500" : "text-destructive"
        }`}>
          {strengthLabel}
        </span>
      </div>

      {/* Requirements list */}
      <ul className="space-y-1">
        {requirements.map((req, index) => (
          <li
            key={index}
            className={`flex items-center gap-1.5 text-xs ${
              req.met ? "text-green-500" : "text-muted-foreground"
            }`}
          >
            {req.met ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
