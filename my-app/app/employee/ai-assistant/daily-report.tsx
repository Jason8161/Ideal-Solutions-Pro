import { useState } from "react";

import { AiFormField, AiToolFormScreen } from "@/components/aiAssistant/AiToolFormScreen";
import { buildDailyReportPrompt } from "@/lib/aiAssistant";

export default function DailyReportAiScreen() {
  const [jobName, setJobName] = useState("");
  const [workCompleted, setWorkCompleted] = useState("");
  const [problemsEncountered, setProblemsEncountered] = useState("");
  const [crewSize, setCrewSize] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");

  return (
    <AiToolFormScreen
      title="Daily Report AI"
      subtitle="Generate a professional daily report prompt"
      backHref="/employee/ai-assistant"
      onSubmit={() =>
        buildDailyReportPrompt({
          jobName,
          workCompleted,
          problemsEncountered,
          crewSize,
          hoursWorked,
        })
      }
    >
      <AiFormField label="Job name" value={jobName} onChangeText={setJobName} placeholder="e.g. Smith residence panel upgrade" />
      <AiFormField
        label="Work completed"
        value={workCompleted}
        onChangeText={setWorkCompleted}
        placeholder="What was finished today?"
        multiline
      />
      <AiFormField
        label="Problems encountered"
        value={problemsEncountered}
        onChangeText={setProblemsEncountered}
        placeholder="Delays, defects, access issues…"
        multiline
      />
      <AiFormField label="Crew size" value={crewSize} onChangeText={setCrewSize} placeholder="Number of workers" keyboardType="number-pad" />
      <AiFormField label="Hours worked" value={hoursWorked} onChangeText={setHoursWorked} placeholder="Total crew hours" keyboardType="number-pad" />
    </AiToolFormScreen>
  );
}
