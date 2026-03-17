
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/colors';

type Props = {
  url: string;
  onBack: () => void;
};

export default function ArticleWebView({ url, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={Colors.graphite} />
        </TouchableOpacity>
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.vividTeal} size="large" />
        </View>
      )}

      {/* Error state */}
      {error ? (
        <View style={styles.errorState}>
          <Ionicons name="wifi-outline" size={40} color={Colors.steelBlue} />
          <Text style={styles.errorTitle}>Couldn't load article</Text>
          <Text style={styles.errorSubtitle}>Check your connection and try again</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => setError(false)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          source={{ uri: url }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightCream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.lightCream,
  },
  backBtn: {
    width: 36, height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightCream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview:     { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    zIndex: 10,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  errorTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
  },
  errorSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: Colors.vividTeal,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  retryBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});