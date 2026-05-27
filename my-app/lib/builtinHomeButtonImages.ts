/**
 * Curated construction-trade home button artwork shipped in the app.
 * Files live under `assets/button-picker/` (synced from the project `images` folder).
 */
export type BuiltinHomeButtonImage = {
  id: string;
  label: string;
  image: number;
};

export const BUILTIN_HOME_BUTTON_IMAGES: readonly BuiltinHomeButtonImage[] = [
  { id: "saved_material_list", label: "Saved Material List", image: require("../assets/button-picker/saved_material_list.png") },
  { id: "voltage_check", label: "Voltage Check", image: require("../assets/button-picker/voltage_check.png") },
  { id: "current_test", label: "Current Test", image: require("../assets/button-picker/current_test.png") },
  { id: "circuit_breakers", label: "Circuit Breakers", image: require("../assets/button-picker/circuit_breakers.png") },
  { id: "wire_testing", label: "Wire Testing", image: require("../assets/button-picker/wire_testing.png") },
  { id: "energy_usage", label: "Energy Usage", image: require("../assets/button-picker/energy_usage.png") },
  { id: "lighting_jobs", label: "Lighting Jobs", image: require("../assets/button-picker/lighting_jobs.png") },
  { id: "receptacles", label: "Receptacles", image: require("../assets/button-picker/receptacles.png") },
  { id: "panel_service", label: "Panel Service", image: require("../assets/button-picker/panel_service.png") },
  { id: "cable_pull", label: "Cable Pull", image: require("../assets/button-picker/cable_pull.png") },
  { id: "conduit_work", label: "Conduit Work", image: require("../assets/button-picker/conduit_work.png") },
  { id: "grounding", label: "Grounding", image: require("../assets/button-picker/grounding.png") },
  { id: "lockout_tagout", label: "Lockout Tagout", image: require("../assets/button-picker/lockout_tagout.png") },
  { id: "plans_prints", label: "Plans & Prints", image: require("../assets/button-picker/plans_prints.png") },
  { id: "generator_power", label: "Generator Power", image: require("../assets/button-picker/generator_power.png") },
  { id: "solar_install", label: "Solar Install", image: require("../assets/button-picker/solar_install.png") },
  { id: "ev_charging", label: "EV Charging", image: require("../assets/button-picker/ev_charging.png") },
  { id: "transformers", label: "Transformers", image: require("../assets/button-picker/transformers.png") },
  { id: "safety_first", label: "Safety First", image: require("../assets/button-picker/safety_first.png") },
  { id: "job_settings", label: "Job Settings", image: require("../assets/button-picker/job_settings.png") },
];
