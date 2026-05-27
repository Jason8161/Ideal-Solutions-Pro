import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { VoiceTextInput } from "@/components/VoiceTextInput";

import { AppConstructionBackdrop } from "@/components/AppConstructionBackdrop";
import {
  employeePlaceholderColor,
  useEmployeeChrome,
} from "@/components/employees/employeeTheme";
import { mapContactToEmployeeInput } from "@/lib/employees/contactToEmployee";
import {
  createEmployee,
  deleteEmployee,
  employeeDisplayName,
  findEmployeeDuplicate,
  moveToPrevious,
  restoreToCurrent,
  updateEmployee,
} from "@/lib/employees/employeeStorage";
import type { Employee, EmployeeInput, PayType, EmployeeRole } from "@/lib/employees/types";
import { PAY_TYPE_LABELS, EMPLOYEE_ROLE_LABELS } from "@/lib/employees/types";
import { pickContactFromDevice } from "@/lib/customerContactPick";
import { showEmployeeAppInviteMenu } from "@/lib/employeeAppInvite";

const PAY_TYPES: PayType[] = ["hourly", "salary", "day_rate", "subcontractor"];
const EMPLOYEE_ROLES: EmployeeRole[] = ["technician", "foreman", "office", "admin"];

type Props = {
  visible: boolean;
  employee: Employee | null;
  defaultStatus: Employee["status"];
  /** Pre-fill when adding (e.g. from device contacts). */
  prefill?: Partial<EmployeeInput> | null;
  onClose: () => void;
  onSaved: () => void;
};

function emptyDraft(status: Employee["status"]): EmployeeInput {
  return {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    jobTitle: "",
    payRate: "",
    payType: "hourly",
    startDate: "",
    status,
    notes: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    role: "technician",
    certifications: "",
    licenseNumber: "",
    vehicleInfo: "",
    skillLevel: "",
  };
}

function employeeToDraft(employee: Employee): EmployeeInput {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    phone: employee.phone ?? "",
    email: employee.email ?? "",
    address: employee.address ?? "",
    jobTitle: employee.jobTitle ?? "",
    payRate: employee.payRate ?? "",
    payType: employee.payType,
    startDate: employee.startDate ?? "",
    status: employee.status,
    notes: employee.notes ?? "",
    emergencyContactName: employee.emergencyContactName ?? "",
    emergencyContactPhone: employee.emergencyContactPhone ?? "",
    role: employee.role ?? "technician",
    certifications: employee.certifications ?? "",
    licenseNumber: employee.licenseNumber ?? "",
    vehicleInfo: employee.vehicleInfo ?? "",
    skillLevel: employee.skillLevel ?? "",
  };
}

function Field({
  label,
  value,
  onChangeText,
  styles,
  keyboardType = "default",
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  styles: ReturnType<typeof useEmployeeChrome>["styles"];
  keyboardType?: "default" | "decimal-pad" | "phone-pad" | "email-address";
  multiline?: boolean;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <VoiceTextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={employeePlaceholderColor()}
        style={[styles.input, multiline && styles.inputMultiline]}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholder=""
      />
    </View>
  );
}

export function EmployeeForm({
  visible,
  employee,
  defaultStatus,
  prefill,
  onClose,
  onSaved,
}: Props) {
  const { styles } = useEmployeeChrome();
  const [draft, setDraft] = useState<EmployeeInput>(() => emptyDraft(defaultStatus));
  const [saving, setSaving] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (employee) {
      setDraft(employeeToDraft(employee));
      return;
    }
    setDraft({ ...emptyDraft(defaultStatus), ...(prefill ?? {}) });
  }, [visible, employee, defaultStatus, prefill]);

  const applyContactPrefill = useCallback(
    (partial: Partial<EmployeeInput>) => {
      setDraft((prev) => ({
        ...prev,
        ...partial,
        status: prev.status,
        payType: prev.payType,
      }));
    },
    [],
  );

  const warnDuplicateAndApply = useCallback(
    async (partial: Partial<EmployeeInput>) => {
      const dup = await findEmployeeDuplicate({
        phone: partial.phone,
        email: partial.email,
        excludeId: employee?.id,
      });
      if (!dup) {
        applyContactPrefill(partial);
        return;
      }
      Alert.alert(
        "Already on file",
        `${employeeDisplayName(dup)} may be the same person (matching phone or email).`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Use anyway", onPress: () => applyContactPrefill(partial) },
        ],
      );
    },
    [applyContactPrefill, employee?.id],
  );

  const importFromContacts = useCallback(async () => {
    setContactBusy(true);
    try {
      const picked = await pickContactFromDevice();
      if (!picked) return;
      const partial = mapContactToEmployeeInput(picked, defaultStatus);
      await warnDuplicateAndApply(partial);
    } catch (e) {
      Alert.alert("Contacts", e instanceof Error ? e.message : "Could not open the contact picker.");
    } finally {
      setContactBusy(false);
    }
  }, [defaultStatus, warnDuplicateAndApply]);

  const patch = useCallback(<K extends keyof EmployeeInput>(key: K, value: EmployeeInput[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      const dup = await findEmployeeDuplicate({
        phone: draft.phone,
        email: draft.email,
        excludeId: employee?.id,
      });
      if (dup) {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            "Possible duplicate",
            `${employeeDisplayName(dup)} has the same phone or email. Save anyway?`,
            [
              { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
              { text: "Save anyway", onPress: () => resolve(true) },
            ],
          );
        });
        if (!proceed) {
          setSaving(false);
          return;
        }
      }
      if (employee) {
        await updateEmployee(employee.id, draft);
      } else {
        await createEmployee(draft);
      }
      onSaved();
      onClose();
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }, [draft, employee, onClose, onSaved]);

  const onMoveStatus = useCallback(async () => {
    if (!employee) return;
    setSaving(true);
    try {
      if (employee.status === "current") {
        await moveToPrevious(employee.id);
      } else {
        await restoreToCurrent(employee.id);
      }
      onSaved();
      onClose();
    } catch (e) {
      Alert.alert("Could not update", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }, [employee, onClose, onSaved]);

  const onDelete = useCallback(() => {
    if (!employee) return;
    Alert.alert("Delete employee?", `${employee.firstName} ${employee.lastName}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setSaving(true);
            try {
              await deleteEmployee(employee.id);
              onSaved();
              onClose();
            } catch {
              Alert.alert("Error", "Could not delete employee.");
            } finally {
              setSaving(false);
            }
          })();
        },
      },
    ]);
  }, [employee, onClose, onSaved]);

  const isEdit = !!employee;
  const statusActionLabel =
    employee?.status === "current" ? "Move to Previous" : "Restore to Current";

  const inviteRecipient = useMemo(
    () => ({
      firstName: draft.firstName,
      lastName: draft.lastName,
      phone: draft.phone,
      email: draft.email,
    }),
    [draft.firstName, draft.lastName, draft.phone, draft.email],
  );

  const onInviteToEmployeeApp = useCallback(() => {
    showEmployeeAppInviteMenu(inviteRecipient);
  }, [inviteRecipient]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <AppConstructionBackdrop />
        <KeyboardAvoidingView
          style={styles.modalKeyboard}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{isEdit ? "Edit employee" : "Add employee"}</Text>

            {!isEdit ? (
              <>
                <Pressable
                  onPress={() => void importFromContacts()}
                  disabled={contactBusy || saving}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    pressed && styles.pressed,
                    (contactBusy || saving) && styles.disabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add from contacts"
                >
                  <Text style={styles.actionBtnText}>
                    {contactBusy ? "Opening contacts…" : "Add from contacts"}
                  </Text>
                </Pressable>
                {Platform.OS === "web" ? (
                  <Text style={styles.hint}>
                    Contact picker works on iOS or Android. On web, enter details below.
                  </Text>
                ) : null}
              </>
            ) : null}

            <Field label="First name" value={draft.firstName} onChangeText={(t) => patch("firstName", t)} styles={styles} />
            <Field label="Last name" value={draft.lastName} onChangeText={(t) => patch("lastName", t)} styles={styles} />
            <Field label="Phone" value={draft.phone ?? ""} onChangeText={(t) => patch("phone", t)} styles={styles} keyboardType="phone-pad" />
            <Field label="Email" value={draft.email ?? ""} onChangeText={(t) => patch("email", t)} styles={styles} keyboardType="email-address" />
            <Field label="Address" value={draft.address ?? ""} onChangeText={(t) => patch("address", t)} styles={styles} />
            <Field label="Job title" value={draft.jobTitle ?? ""} onChangeText={(t) => patch("jobTitle", t)} styles={styles} />

            <Text style={styles.label}>App role</Text>
            <View style={local.chipRow}>
              {EMPLOYEE_ROLES.map((role) => {
                const active = (draft.role ?? "technician") === role;
                return (
                  <Pressable
                    key={role}
                    onPress={() => patch("role", role)}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.chipText}>{EMPLOYEE_ROLE_LABELS[role]}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Field label="Pay rate" value={draft.payRate ?? ""} onChangeText={(t) => patch("payRate", t)} styles={styles} keyboardType="decimal-pad" />

            <Text style={styles.label}>Pay type</Text>
            <View style={local.chipRow}>
              {PAY_TYPES.map((pt) => {
                const active = draft.payType === pt;
                return (
                  <Pressable
                    key={pt}
                    onPress={() => patch("payType", pt)}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.chipText}>{PAY_TYPE_LABELS[pt]}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Field label="Start date" value={draft.startDate ?? ""} onChangeText={(t) => patch("startDate", t)} styles={styles} />
            <Field label="Certifications" value={draft.certifications ?? ""} onChangeText={(t) => patch("certifications", t)} styles={styles} multiline />
            <Field label="License" value={draft.licenseNumber ?? ""} onChangeText={(t) => patch("licenseNumber", t)} styles={styles} />
            <Field label="Vehicle" value={draft.vehicleInfo ?? ""} onChangeText={(t) => patch("vehicleInfo", t)} styles={styles} />
            <Field label="Skill level" value={draft.skillLevel ?? ""} onChangeText={(t) => patch("skillLevel", t)} styles={styles} />
            <Field label="Notes" value={draft.notes ?? ""} onChangeText={(t) => patch("notes", t)} styles={styles} multiline />
            <Field
              label="Emergency contact name"
              value={draft.emergencyContactName ?? ""}
              onChangeText={(t) => patch("emergencyContactName", t)}
              styles={styles}
            />
            <Field
              label="Emergency contact phone"
              value={draft.emergencyContactPhone ?? ""}
              onChangeText={(t) => patch("emergencyContactPhone", t)}
              styles={styles}
              keyboardType="phone-pad"
            />

            <Pressable
              onPress={onInviteToEmployeeApp}
              disabled={saving}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.pressed,
                saving && styles.disabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Invite to employee app"
            >
              <Text style={styles.actionBtnText}>Invite to employee app</Text>
            </Pressable>

            <View style={styles.modalActions}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.actionBtn, local.actionFlex, pressed && styles.pressed]}
              >
                <Text style={styles.actionBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void onSave()}
                disabled={saving}
                style={({ pressed }) => [
                  styles.actionBtn,
                  local.actionFlex,
                  pressed && styles.pressed,
                  saving && styles.disabled,
                ]}
              >
                <Text style={styles.actionBtnText}>{saving ? "Saving…" : "Save"}</Text>
              </Pressable>
            </View>

            {isEdit ? (
              <>
                <Pressable
                  onPress={() => void onMoveStatus()}
                  disabled={saving}
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed, saving && styles.disabled]}
                >
                  <Text style={styles.actionBtnText}>{statusActionLabel}</Text>
                </Pressable>
                <Pressable
                  onPress={onDelete}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.destructiveBtn,
                    pressed && styles.pressed,
                    saving && styles.disabled,
                  ]}
                >
                  <Text style={styles.destructiveText}>Delete employee</Text>
                </Pressable>
              </>
            ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const local = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  actionFlex: {
    flex: 1,
    marginBottom: 0,
  },
});
