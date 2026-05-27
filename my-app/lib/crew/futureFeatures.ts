export const FUTURE_CREW_FEATURES = [
  { key: "gps", label: "GPS tracking", subtitle: "Live crew locations on map" },
  { key: "payroll", label: "Payroll integration", subtitle: "Export hours and pay runs" },
  { key: "timesheets", label: "Timesheets", subtitle: "Review and approve time entries" },
  { key: "vehicles", label: "Fleet / vehicles", subtitle: "Assign trucks and mileage" },
  { key: "tools", label: "Tools inventory", subtitle: "Track tools by crew member" },
  { key: "safety", label: "Safety checklists", subtitle: "JSAs and tailgate meetings" },
  { key: "ai-scheduling", label: "AI scheduling", subtitle: "Smart crew suggestions" },
  { key: "eta", label: "Customer ETA", subtitle: "Auto ETA texts to customers" },
] as const;

export type FutureCrewFeatureKey = (typeof FUTURE_CREW_FEATURES)[number]["key"];
