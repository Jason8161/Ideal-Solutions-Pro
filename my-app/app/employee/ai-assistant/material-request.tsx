import { useState } from "react";

import { AiFormField, AiToolFormScreen } from "@/components/aiAssistant/AiToolFormScreen";
import { buildMaterialRequestPrompt } from "@/lib/aiAssistant";

export default function MaterialRequestAiScreen() {
  const [neededMaterials, setNeededMaterials] = useState("");
  const [jobName, setJobName] = useState("");
  const [priorityLevel, setPriorityLevel] = useState("");

  return (
    <AiToolFormScreen
      title="Material Request AI"
      subtitle="Draft a purchasing / material request"
      backHref="/employee/ai-assistant"
      onSubmit={() =>
        buildMaterialRequestPrompt({
          neededMaterials,
          jobName,
          priorityLevel,
        })
      }
    >
      <AiFormField
        label="Needed materials"
        value={neededMaterials}
        onChangeText={setNeededMaterials}
        placeholder="List parts, quantities, catalog numbers…"
        multiline
      />
      <AiFormField label="Job name" value={jobName} onChangeText={setJobName} placeholder="Job or customer name" />
      <AiFormField
        label="Priority level"
        value={priorityLevel}
        onChangeText={setPriorityLevel}
        placeholder="e.g. Rush — needed by 7 AM / Standard / Hold for approval"
      />
    </AiToolFormScreen>
  );
}
