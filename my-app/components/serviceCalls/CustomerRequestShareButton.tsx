import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";

import { CustomerRequestRecipientModal } from "@/components/serviceCalls/CustomerRequestRecipientModal";
import { useScStyles } from "@/components/serviceCalls/screenChrome";
import { CUSTOMER_REQUEST_SHARE_BUTTON_LABEL } from "@/lib/customerServiceRequest";
import type { SimpleCustomerContact } from "@/lib/customerContactPick";
import { recipientToRouteParams } from "@/lib/serviceRequestRecipient";

type Props = {
  variant?: "primary" | "secondary";
};

/** Opens recipient picker, then the Send Customer Service Call Link screen (text / email / copy). */
export function CustomerRequestShareButton({ variant = "secondary" }: Props) {
  const scStyles = useScStyles();
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);

  const buttonStyle = variant === "primary" ? scStyles.menuButton : [scStyles.menuButton, scStyles.menuButtonSecondary];
  const textStyle =
    variant === "primary" ? scStyles.menuButtonText : scStyles.menuButtonSecondaryText;

  const onRecipientSelected = useCallback(
    (recipient: SimpleCustomerContact) => {
      setPickerOpen(false);
      router.push({
        pathname: "/service-calls/send-link",
        params: recipientToRouteParams(recipient),
      });
    },
    [router],
  );

  return (
    <>
      <Pressable
        onPress={() => setPickerOpen(true)}
        style={({ pressed }) => [buttonStyle, pressed && { opacity: 0.9 }]}
      >
        <Text style={textStyle}>{CUSTOMER_REQUEST_SHARE_BUTTON_LABEL}</Text>
      </Pressable>
      <CustomerRequestRecipientModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onRecipientSelected={onRecipientSelected}
      />
    </>
  );
}
