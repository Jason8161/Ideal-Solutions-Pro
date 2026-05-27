import { Image, ScrollView, Text, View } from "react-native";

import { useScStyles } from "@/components/serviceCalls/screenChrome";
import type { ServiceCallRecord } from "@/lib/serviceCallStorage";

export function ServiceCallPhotoGallery({ record }: { record: ServiceCallRecord }) {
  const scStyles = useScStyles();
  const photos = record.photoDataUrls ?? [];
  if (photos.length === 0) return null;

  return (
    <View style={scStyles.card}>
      <Text style={scStyles.cardTitle}>Photos</Text>
      <Text style={[scStyles.cardMeta, { marginBottom: 10 }]}>
        {photos.length} from customer request
        {record.customerSubmittedAt
          ? ` · ${new Date(record.customerSubmittedAt).toLocaleString()}`
          : ""}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {photos.map((uri, i) => (
          <Image
            key={`${uri.slice(0, 24)}-${i}`}
            source={{ uri }}
            style={{ width: 120, height: 120, borderRadius: 10, marginRight: 10 }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
    </View>
  );
}
