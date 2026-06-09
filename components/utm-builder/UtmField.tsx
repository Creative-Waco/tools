import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UTM_FIELD_HINTS } from "@/lib/utm-builder/field-hints";
import type { UtmParams } from "@/lib/utm-builder/build-url";
import { CircleHelp } from "lucide-react";

type UtmFieldProps = {
  fieldKey: keyof UtmParams;
  label: string;
  required?: boolean;
  placeholder: string;
  value: string;
  warning?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
};

export function UtmField({
  fieldKey,
  label,
  required = false,
  placeholder,
  value,
  warning,
  onChange,
  onBlur,
}: UtmFieldProps) {
  return (
    <label className="field">
      <span className="utm-field-label">
        {label}
        {required ? " *" : ""}
        <Tooltip>
          <TooltipTrigger
            type="button"
            className="utm-field-help-trigger"
            aria-label={`Help for ${label}`}
          >
            <CircleHelp size={14} aria-hidden />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {UTM_FIELD_HINTS[fieldKey]}
          </TooltipContent>
        </Tooltip>
      </span>
      <input
        name={fieldKey}
        type="text"
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      {warning ? <span className="utm-field-warning">{warning}</span> : null}
    </label>
  );
}
