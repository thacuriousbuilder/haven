
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/colors';
import { Article } from '@/hooks/useDiscoveryArticles';
import ArticleWebView from '../discovery/articleWebView';
import { useModal } from '@/contexts/modalContext';

type Props = {
  article: Article;
  onBack: () => void;
};

export default function ArticleDetailView({ article, onBack }: Props) {
  const [showWebView, setShowWebView] = useState(false);
  const { showModal } = useModal();

  if (showWebView) {
    return (
      <ArticleWebView
        url={article.url}
        onBack={() => setShowWebView(false)}
      />
    );
  }

  const handleContinueReading = async () => {
    await showModal({ key: 'knowledge_unlocked' });
    setShowWebView(true);
  };


  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={20} color={Colors.graphite} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Thumbnail */}
        {article.image_url ? (
          <Image source={{ uri: article.image_url }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder} />
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Meta row */}
          <View style={styles.metaRow}>
            <Text style={styles.readTime}>{article.read_time} min read</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{article.title}</Text>

          {/* Source */}
          <Text style={styles.source}>HAVEN</Text>

          <View style={styles.divider} />

          {/* Summary section */}
          <Text style={styles.sectionTitle}>Quick summary</Text>
          <Text style={styles.summary}>{article.summary}</Text>

          {/* Continue reading */}
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleContinueReading}
            activeOpacity={0.8}
          >
            <Text style={styles.continueBtnText}>Continue reading</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  backBtn: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.lg,
    zIndex: 10,
    width: 36, height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.lightCream,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.lightCream,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readTime: {
    fontSize: Typography.fontSize.sm,
    color: Colors.steelBlue,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    lineHeight: Typography.fontSize.xxl * Typography.lineHeight.tight,
  },
  source: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.energyOrange,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.graphite,
    marginTop: Spacing.sm,
  },
  summary: {
    fontSize: Typography.fontSize.sm,
    color: Colors.graphite,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.relaxed,
    marginBottom: Spacing.sm,
  },
  continueBtn: {
    backgroundColor: Colors.graphite,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  continueBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});