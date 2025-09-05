// app/TermsOfUse.jsx
import React from 'react';
import { SafeAreaView, StatusBar, ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { playClick } from './utils/ClickSound';

export default function TermsOfUse() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() =>{playClick(), navigation.goBack()}} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#EDEDED" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Use</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Terms of Use for Chessmate</Text>
        <Text style={styles.paragraph}>
          These Terms of Use (“Terms”) govern access to and use of the Chessmate mobile app provided by Skynetix (“we”, “us”, “our”). By using the Service, the user agrees to these Terms. 
        </Text>

        <Text style={styles.section}>1) Accounts and Security</Text>
        <Text style={styles.paragraph}>
          Users are responsible for the accuracy of registration information, safeguarding credentials, and all activities under their account; notify us immediately of unauthorized use. 
        </Text>

        <Text style={styles.section}>2) Acceptable Use</Text>
        <Text style={styles.paragraph}>
          Do not engage in harassment, hate speech, cheating, exploits, reverse engineering, automated access, or other conduct that interferes with fair play, security, or others’ enjoyment of the Service. 
        </Text>

        <Text style={styles.section}>3) User Content</Text>
        <Text style={styles.paragraph}>
          Users retain rights to content submitted (e.g., chat, avatars) and grant us a non‑exclusive, worldwide license to host, process, and display it for operating the Service, subject to applicable laws. 
        </Text>

        <Text style={styles.section}>4) Intellectual Property</Text>
        <Text style={styles.paragraph}>
          The Service, game assets, trademarks, and related IP are owned by [Company Name] or licensors and are protected by law; no rights are granted except as expressly permitted by these Terms. 
        </Text>

        <Text style={styles.section}>5) Purchases and Virtual Items (If Applicable)</Text>
        <Text style={styles.paragraph}>
          Purchases may be final and non‑refundable as permitted by local law; virtual items may be licensed, not sold, and can be modified or discontinued at our discretion. 
        </Text>

        <Text style={styles.section}>6) Termination</Text>
        <Text style={styles.paragraph}>
          We may suspend or terminate access for violations of these Terms or for risks to the Service or other users; users may stop using the Service at any time and request account deletion per our Privacy Policy. 
        </Text>

        <Text style={styles.section}>7) Disclaimers</Text>
        <Text style={styles.paragraph}>
          The Service is provided “as is” and “as available” without warranties of any kind to the maximum extent permitted by law. 
        </Text>

        <Text style={styles.section}>8) Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from use of or inability to use the Service. 
        </Text>

        <Text style={styles.section}>9) Indemnification</Text>
        <Text style={styles.paragraph}>
          Users agree to indemnify and hold Chessmate harmless from claims arising out of their use of the Service or violation of these Terms, to the extent permitted by law. 
        </Text>

        {/* <Text style={styles.section}>10) Governing Law and Dispute Resolution</Text>
        <Text style={styles.paragraph}>
          These Terms are governed by the laws of [Jurisdiction], without regard to conflict‑of‑laws rules; disputes will be resolved in the courts of [Venue], unless otherwise required by law. 
        </Text> */}

        <Text style={styles.section}>10) Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We may update these Terms to reflect operational or legal changes; continued use after effective date indicates acceptance of revised Terms. 
        </Text>

        <Text style={styles.section}>11) Contact</Text>
        <Text style={styles.paragraph}>
          Questions regarding these Terms: Skynetix, Patna,Bihar, contact@skynetix.in. 
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
