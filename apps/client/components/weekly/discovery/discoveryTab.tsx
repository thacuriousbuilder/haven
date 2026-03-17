
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/colors';
import { useDiscoveryArticles, Article } from '@/hooks/useDiscoveryArticles';
import ArticleDetailView from '../discovery/articleDetailView';

type Category = 'All' | 'Science' | 'Tips' | 'Lifestyle';
const CATEGORIES: Category[] = ['All', 'Science', 'Tips', 'Lifestyle'];

export default function DiscoveryTab() {
  const { articles, loading, error } = useDiscoveryArticles();
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const filtered = activeCategory === 'All'
    ? articles
    : articles.filter((a) => a.category === activeCategory);

  if (selectedArticle) {
    return (
      <ArticleDetailView
        article={selectedArticle}
        onBack={() => setSelectedArticle(null)}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.vividTeal} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load articles.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Article list */}
      {filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No articles in this category yet.</Text>
        </View>
      ) : (
        <View style={styles.articleList}>
          {filtered.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={styles.articleCard}
              onPress={() => setSelectedArticle(article)}
              activeOpacity={0.7}
            >
              {/* Thumbnail */}
              {article.image_url ? (
                <Image
                  source={{ uri: article.image_url }}
                  style={styles.thumbnail}
                />
              ) : (
                <View style={styles.thumbnailPlaceholder} />
              )}

              {/* Info */}
              <View style={styles.articleInfo}>
                <Text style={styles.categoryLabel}>{article.category}</Text>
                <Text style={styles.articleTitle}>{article.title}</Text>
                <Text style={styles.readTime}>{article.read_time} min read</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightCream },
  content:   { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  pillRow:   { gap: Spacing.sm, paddingBottom: Spacing.xs },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.vividTeal,
    borderColor: Colors.vividTeal,
  },
  pillText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.graphite,
  },
  pillTextActive: { color: Colors.white },
  articleList:    { gap: Spacing.md },
  articleCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.small,
  },
  thumbnail: {
    width: 100,
    height: 100,
  },
  thumbnailPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: Colors.lightCream,
  },
  articleInfo: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  categoryLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.energyOrange,
    letterSpacing: 0.5,
  },
  articleTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.graphite,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
  readTime: {
    fontSize: Typography.fontSize.xs,
    color: Colors.steelBlue,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
});