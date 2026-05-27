import { Link, Redirect, useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { useBossManChrome } from "@/components/bossMan/bossManChrome";
import { ScStickyScroll } from "@/components/serviceCalls/screenChrome";
import { useSubscription } from "@/context/SubscriptionContext";
import { loadScheduleAssignments } from "@/lib/bossMan/scheduling/scheduleStorage";
import { formatDayLabel, formatTime12h } from "@/lib/bossMan/scheduling/dateUtils";
import { loadBossJobs } from "@/lib/bossMan/jobStorage";
import type { BossJob } from "@/lib/bossMan/types";
import {
  employeeDisplayName,
  getEmployee,
} from "@/lib/employees/employeeStorage";
import {
  formatPayRate,
  roleLabel,
} from "@/lib/employees/format";
import type { Employee } from "@/lib/employees/types";
import { EMPLOYEE_INVITE_STATUS_LABELS } from "@/lib/employees/types";
import { showEmployeeAppInviteMenu } from "@/lib/employeeAppInvite";
import { isProTier } from "@/lib/subscriptionGating";

function FieldRow({ label, value }: { label: string; value: string }) {
  const { scStyles, styles } = useBossManChrome();
  return (
    <View style={[styles.navRow, { marginBottom: 8 }]}>
      <Text style={[scStyles.subtitle, { fontWeight: "700" }]}>{label}</Text>
      <Text style={scStyles.menuButtonText}>{value || "—"}</Text>
    </View>
  );
}

export default function CrewEmployeeProfileScreen() {
  const { activeTier } = useSubscription();
  const { scStyles, styles } = useBossManChrome();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [assignedJobs, setAssignedJobs] = useState<
    { job: BossJob; dates: string[] }[]
  >([]);
  const [formOpen, setFormOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!id || typeof id !== "string") return;
    const emp = await getEmployee(id);
    setEmployee(emp);
    if (!emp) return;

    const [assignments, jobs] = await Promise.all([loadScheduleAssignments(), loadBossJobs()]);
    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    const byJob = new Map<string, string[]>();
    for (const a of assignments) {
      if (!a.employeeIds.includes(emp.id) || a.status === "Cancelled") continue;
      const list = byJob.get(a.jobId) ?? [];
      list.push(`${formatDayLabel(a.date)} ${formatTime12h(a.startTime)}`);
      byJob.set(a.jobId, list);
    }
    const rows: { job: BossJob; dates: string[] }[] = [];
    for (const [jobId, dates] of byJob) {
      const job = jobMap.get(jobId);
      if (job) rows.push({ job, dates });
    }
    setAssignedJobs(rows);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (!isProTier(activeTier)) {
    return <Redirect href={"/job-folder/current-jobs" as Href} />;
  }

  if (!employee) {
    return (
      <ScStickyScroll backHref="/job-folder/crew" title="Employee profile">
        <Text style={scStyles.subtitle}>Employee not found.</Text>
      </ScStickyScroll>
    );
  }

  const name = employeeDisplayName(employee);
  const inviteLabel =
    EMPLOYEE_INVITE_STATUS_LABELS[employee.inviteStatus ?? "none"];
  const lastLogin = employee.lastLoginAt
    ? new Date(employee.lastLoginAt).toLocaleString()
    : "Not synced yet";

  return (
    <>
      <ScStickyScroll
        backHref="/job-folder/crew"
        title={name}
        subtitle={employee.jobTitle?.trim() || roleLabel(employee.role)}
      >
        <Text style={[scStyles.subtitle, { fontWeight: "900", marginBottom: 8 }]}>Personal</Text>
        <FieldRow label="Phone" value={employee.phone ?? ""} />
        <FieldRow label="Email" value={employee.email ?? ""} />
        <FieldRow label="Address" value={employee.address ?? ""} />
        <FieldRow
          label="Emergency contact"
          value={
            employee.emergencyContactName
              ? `${employee.emergencyContactName} ${employee.emergencyContactPhone ?? ""}`.trim()
              : ""
          }
        />

        <Text style={[scStyles.subtitle, { fontWeight: "900", marginTop: 8, marginBottom: 8 }]}>
          Work
        </Text>
        <FieldRow label="Role" value={roleLabel(employee.role)} />
        <FieldRow label="Hire date" value={employee.startDate ?? ""} />
        <FieldRow label="Pay" value={formatPayRate(employee.payRate, employee.payType)} />
        <FieldRow label="Certifications" value={employee.certifications ?? ""} />
        <FieldRow label="License" value={employee.licenseNumber ?? ""} />
        <FieldRow label="Vehicle" value={employee.vehicleInfo ?? ""} />
        <FieldRow label="Skill level" value={employee.skillLevel ?? ""} />
        <FieldRow label="Notes" value={employee.notes ?? ""} />

        <Text style={[scStyles.subtitle, { fontWeight: "900", marginTop: 8, marginBottom: 8 }]}>
          App access
        </Text>
        <FieldRow label="Invite status" value={inviteLabel} />
        <FieldRow label="Last login" value={lastLogin} />
        <Pressable
          style={styles.navRow}
          onPress={() =>
            showEmployeeAppInviteMenu({
              firstName: employee.firstName,
              lastName: employee.lastName,
              phone: employee.phone,
              email: employee.email,
            })
          }
        >
          <Text style={scStyles.menuButtonText}>Send app invite</Text>
        </Pressable>
        <Link href={`/job-folder/crew/invite?employeeId=${employee.id}` as Href} asChild>
          <Pressable style={styles.navRow}>
            <Text style={scStyles.menuButtonText}>QR / share link invite</Text>
          </Pressable>
        </Link>

        <Text style={[scStyles.subtitle, { fontWeight: "900", marginTop: 8, marginBottom: 8 }]}>
          Assigned jobs
        </Text>
        {assignedJobs.length === 0 ? (
          <Text style={scStyles.subtitle}>No schedule assignments yet.</Text>
        ) : (
          assignedJobs.map(({ job, dates }) => (
            <Pressable
              key={job.id}
              style={styles.navRow}
              onPress={() => router.push(`/job-folder/job/${job.id}` as Href)}
            >
              <Text style={scStyles.menuButtonText}>
                {job.jobName.trim() || job.customerName.trim() || "Job"}
              </Text>
              <Text style={scStyles.subtitle}>{dates.join(" · ")}</Text>
            </Pressable>
          ))
        )}

        <Pressable style={styles.navRow} onPress={() => setFormOpen(true)}>
          <Text style={scStyles.menuButtonText}>Edit employee</Text>
        </Pressable>
      </ScStickyScroll>

      <EmployeeForm
        visible={formOpen}
        employee={employee}
        defaultStatus={employee.status}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          void refresh();
        }}
      />
    </>
  );
}
