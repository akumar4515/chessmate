// app/PrivacyPolicy.jsx
import React from 'react';
import { SafeAreaView, StatusBar, ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { playClick } from './utils/ClickSound';

export default function PrivacyPolicy() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() =>{playClick(), navigation.goBack()}} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#EDEDED" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Privacy Policy for Chessmate</Text>
        <Text style={styles.paragraph}>
          This Privacy Policy explains how Skynetix (“we”, “us”, “our”) collects, uses, shares, and protects information when the chessmate mobile app is used (“Service”). 
        </Text>

        <Text style={styles.section}>1) Information We Collect</Text>
        <Text style={styles.paragraph}>
          - Account data: username, email and identifiers created during account setup.{"\n"}
          - Device and app data: device model, OS version, app version, and push notification tokens.{"\n"}
          - Usage data: actions within the app, game interactions, feature engagement, and crash/diagnostic logs.{"\n"}
          - Content data: profile avatars/photos provided, chat messages, and friend relationships.{"\n"}
          - Permissions data: microphone access for voice/recording features, notifications for invites/updates, and photos/media for picking/saving images.{"\n"}
        </Text>

        <Text style={styles.section}>2) How We Use Information</Text>
        <Text style={styles.paragraph}>
          - Provide and operate the Service (login, friends, invites, gameplay, chat).{"\n"}
          - Deliver notifications such as friend requests, invitations, and important updates.{"\n"}
          - Personalize and improve features, troubleshoot, secure the Service, and analyze performance.{"\n"}
          - Enforce community standards and terms, prevent fraud/abuse, and comply with legal requirements.{"\n"}
        </Text>

        <Text style={styles.section}>3) Sharing and Disclosure</Text>
        <Text style={styles.paragraph}>
          - Service providers: hosting, analytics, error monitoring, and push notification delivery.{"\n"}
          - Social/game interactions: usernames and gameplay states are visible to friends as designed.{"\n"}
          - Legal compliance: to satisfy legal obligations or respond to lawful requests.{"\n"}
          - Business transfers: if ownership/control of the Service changes in a merger, acquisition, or sale.{"\n"}
        </Text>

        <Text style={styles.section}>4) Data Retention</Text>
        <Text style={styles.paragraph}>
          We retain information as long as needed to provide the Service, meet legal obligations, resolve disputes, and enforce agreements, after which data is deleted or anonymized according to our policies. 
        </Text>

        <Text style={styles.section}>5) User Controls and Rights</Text>
        <Text style={styles.paragraph}>
          Depending on region, rights may include access, correction, deletion, portability, objection/withdrawal of consent, and complaint to a supervisory authority; requests can be sent to [Contact Email]. 
        </Text>

        <Text style={styles.section}>6) Children’s Privacy</Text>
        <Text style={styles.paragraph}>
          The Service is not directed to children under the age where parental consent is required; if a child’s data was collected in error, contact us to delete it. 
        </Text>

        <Text style={styles.section}>7) International Transfers</Text>
        <Text style={styles.paragraph}>
          Data may be processed in countries other than the user’s own; we implement appropriate safeguards where required by law. 
        </Text>

        <Text style={styles.section}>8) Security</Text>
        <Text style={styles.paragraph}>
          We use administrative, technical, and organizational safeguards to protect information, recognizing that no method of transmission or storage is completely secure. 
        </Text>

        <Text style={styles.section}>9) Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Policy to reflect changes to practices or legal requirements; material changes will be communicated within the app or by other appropriate means. 
        </Text>

        <Text style={styles.section}>10) Contact</Text>
        <Text style={styles.paragraph}>
          For questions or requests, contact: Skynetix, Patna,Bihar, contact@skynetix.in. 
        </Text>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 45, backgroundColor: '#0F0F0F' },
  header: { paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#1C1C1C', borderWidth: 1, borderColor: '#333' },
  headerTitle: { color: '#EDEDED', fontSize: 22, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  title: { color: '#EDEDED', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  section: { color: '#EDEDED', fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  paragraph: { color: '#CFCFCF', fontSize: 13, lineHeight: 20 },
});
