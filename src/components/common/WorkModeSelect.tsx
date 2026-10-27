import React from "react";
import { SearchableSelect } from "./SearchableSelect";
import { workModeOptionsForJob } from "../../lib/workMode";

interface WorkModeSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** The job's own work mode (Remote / Hybrid / On-site). It decides which choices are offered. */
  jobWorkMode?: string | null;
  className?: string;
  disabled?: boolean;
  id?: string;
}

/**
 * The Work Mode dropdown used by every candidate form: Add Candidate (manual and CV upload), the public
 * job application form and the candidate edit form. Choices follow the job's work mode.
 */
export function WorkModeSelect({ value, onChange, jobWorkMode, className = "", disabled = false, id }: WorkModeSelectProps) {
  const options = workModeOptionsForJob(jobWorkMode);
  return (
    <SearchableSelect
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      disabled={disabled}
      aria-label="Work Mode"
      searchPlaceholder="Search work mode..."
    >
      <option value="" disabled>Select work mode</option>
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </SearchableSelect>
  );
}

export default WorkModeSelect;
