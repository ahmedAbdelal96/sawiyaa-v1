import React from "react";
import InputField from "@/components/form/input/InputField";
import Label from "@/components/form/Label";

interface PricingDurationRowProps {
  durationLabel: string;
  egpId: string;
  usdId: string;
  egpLabel: string;
  usdLabel: string;
  egpValue: string;
  usdValue: string;
  onEgpChange: (val: string) => void;
  onUsdChange: (val: string) => void;
  disabled?: boolean;
  locale: string;
}

export const PricingDurationRow: React.FC<PricingDurationRowProps> = ({
  durationLabel,
  egpId,
  usdId,
  egpLabel,
  usdLabel,
  egpValue,
  usdValue,
  onEgpChange,
  onUsdChange,
  disabled = false,
  locale,
}) => {
  const isRtl = locale === "ar";
  const egpSuffix = isRtl ? "ج.م" : "EGP";
  const usdSuffix = isRtl ? "$" : "USD";

  return (
    <div className="border-b border-border-light/40 pb-4 last:border-b-0 last:pb-0">
      {/* Duration Row Header */}
      <span className="text-xs font-bold text-text-primary block mb-2">{durationLabel}</span>

      {/* Inputs Grid: 2 columns on desktop, 1 column on mobile */}
      <div className="grid gap-3.5 md:grid-cols-2">
        {/* EGP Input */}
        <div>
          <Label htmlFor={egpId} className="text-[11px] font-semibold text-text-secondary mb-1">
            {egpLabel}
          </Label>
          <div className="relative flex items-center">
            <InputField
              id={egpId}
              inputMode="decimal"
              value={egpValue}
              onChange={(e) => onEgpChange(e.target.value)}
              placeholder="0.00"
              disabled={disabled}
              className="pe-12 app-control h-10 text-xs text-text-primary"
            />
            <span className="absolute end-3 text-[10px] font-bold text-text-muted pointer-events-none select-none">
              {egpSuffix}
            </span>
          </div>
        </div>

        {/* USD Input */}
        <div>
          <Label htmlFor={usdId} className="text-[11px] font-semibold text-text-secondary mb-1">
            {usdLabel}
          </Label>
          <div className="relative flex items-center">
            <InputField
              id={usdId}
              inputMode="decimal"
              value={usdValue}
              onChange={(e) => onUsdChange(e.target.value)}
              placeholder="0.00"
              disabled={disabled}
              className="pe-12 app-control h-10 text-xs text-text-primary"
            />
            <span className="absolute end-3 text-[10px] font-bold text-text-muted pointer-events-none select-none">
              {usdSuffix}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
