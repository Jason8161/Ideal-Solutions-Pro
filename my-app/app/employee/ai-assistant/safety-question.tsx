import { useState } from "react";

import { AiFormField, AiToolFormScreen } from "@/components/aiAssistant/AiToolFormScreen";
import { buildSafetyQuestionPrompt } from "@/lib/aiAssistant";

export default function SafetyQuestionAiScreen() {
  const [safetyQuestion, setSafetyQuestion] = useState("");
  const [jobsiteConditions, setJobsiteConditions] = useState("");

  return (
    <AiToolFormScreen
      title="Safety Question AI"
      subtitle="OSHA-aligned field safety guidance"
      backHref="/employee/ai-assistant"
      onSubmit={() =>
        buildSafetyQuestionPrompt({
          safetyQuestion,
          jobsiteConditions,
        })
      }
    >
      <AiFormField
        label="Safety question"
        value={safetyQuestion}
        onChangeText={setSafetyQuestion}
        placeholder="What do you need to know to work safely?"
        multiline
      />
      <AiFormField
        label="Jobsite conditions"
        value={jobsiteConditions}
        onChangeText={setJobsiteConditions}
        placeholder="Weather, live work, confined space, height, wet location…"
        multiline
      />
    </AiToolFormScreen>
  );
}
