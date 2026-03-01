
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/colors';


interface CurrentWeightCardProps {
    currentWeight: number;
    startWeight: number;
    goalWeight: number;
    unit: 'lbs' | 'kgs';
    onLogWeight: () => void;
    startDate?: Date;
    weeklyGoal?: number;
    hasLoggedWeight?: boolean,
  }
  
  export function CurrentWeightCard({
    currentWeight,
    startWeight,
    goalWeight,
    unit,
    onLogWeight,
    startDate,
    weeklyGoal = 1.0,
    hasLoggedWeight
  }: CurrentWeightCardProps) {
    
    const calculateProjectedDate = (): { 
      actualDate: string; 
      goalDate: string; 
      isOnTrack: boolean;
      actualRate: number;
    } => {
      if (!hasLoggedWeight) {
        return { 
          actualDate: 'Log your weight to see your projection', 
          goalDate: '', 
          isOnTrack: false,
          actualRate: 0
        };
      }
    
      if (currentWeight <= goalWeight) {
        return { 
          actualDate: 'Goal reached! 🎉', 
          goalDate: '', 
          isOnTrack: true,
          actualRate: 0
        };
      }
  
      if (currentWeight >= startWeight) {
        return { 
          actualDate: 'Keep going — progress takes time!', 
          goalDate: '',
          isOnTrack: false,
          actualRate: 0
        };
      }
  
      const weightLost = startWeight - currentWeight;
      const weightRemaining = currentWeight - goalWeight;
  
      const weeksElapsed = startDate 
        ? Math.max(1, (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7))
        : 6;
  
      const actualRate = weightLost / weeksElapsed;
  
      if (actualRate < 0.1) {
        return { 
          actualDate: 'Stay consistent to reach your goal', 
          goalDate: '',
          isOnTrack: false,
          actualRate: actualRate
        };
      }
  
      // Calculate weeks at ACTUAL pace
      const weeksToGoalActual = weightRemaining / actualRate;
      const projectedActual = new Date();
      projectedActual.setDate(projectedActual.getDate() + (weeksToGoalActual * 7));
  
      // Calculate weeks at GOAL pace
      const weeksToGoalTarget = weightRemaining / weeklyGoal;
      const projectedTarget = new Date();
      projectedTarget.setDate(projectedTarget.getDate() + (weeksToGoalTarget * 7));
  
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formatDate = (date: Date) => 
        `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  
      const isOnTrack = actualRate >= weeklyGoal * 0.9;
  
      return {
        actualDate: formatDate(projectedActual),
        goalDate: formatDate(projectedTarget),
        isOnTrack: isOnTrack,
        actualRate: actualRate
      };
    };
  
    const projection = calculateProjectedDate();
  
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>Current Weight</Text>
          <TouchableOpacity 
            style={styles.logButton}
            onPress={onLogWeight}
            activeOpacity={0.8}
          >
            <Text style={styles.logButtonText}>Log weight</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>
  
        <Text style={styles.currentWeight}>{currentWeight} {unit}</Text>
  
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { 
              width: `${Math.max(0, Math.min(100, ((startWeight - currentWeight) / (startWeight - goalWeight)) * 100))}%` 
            }]} />
          </View>
        </View>
  
        <View style={styles.labelsRow}>
          <Text style={styles.labelText}>Start: {startWeight} {unit}</Text>
          <Text style={styles.labelText}>Goal: {goalWeight} {unit}</Text>
        </View>
  
        {currentWeight <= goalWeight ? (
          <Text style={[styles.projectionText, styles.goalReachedText]}>
            {projection.actualDate}
          </Text>
        ) : projection.actualDate.includes(',') ? (
          <View>
            {projection.isOnTrack ? (
              <Text style={styles.projectionText}>
                At your pace, you'll reach your goal by{' '}
                <Text style={styles.projectionDate}>{projection.actualDate}</Text>
                {' '}(losing {projection.actualRate.toFixed(1)} lbs/week ✓)
              </Text>
            ) : (
              <>
                <Text style={[styles.projectionText, styles.behindGoalText]}>
                  At current pace ({projection.actualRate.toFixed(1)} lbs/week):{' '}
                  <Text style={styles.projectionDate}>{projection.actualDate}</Text>
                </Text>
                <Text style={[styles.projectionText, styles.goalPaceText]}>
                  At goal pace ({weeklyGoal} lbs/week):{' '}
                  <Text style={styles.projectionDateGoal}>{projection.goalDate}</Text>
                </Text>
              </>
            )}
          </View>
        ) : (
          <Text style={[styles.projectionText, styles.motivationalText]}>
            {projection.actualDate}
          </Text>
        )}
      </View>
    );
  }
  
  const styles = StyleSheet.create({
    card: {
      backgroundColor: Colors.white,
      borderRadius: BorderRadius.lg,
      padding: Spacing.xl,
      marginBottom: Spacing.lg,
      ...Shadows.small,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    headerLabel: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.medium,
      color: Colors.steelBlue,
    },
    logButton: {
      backgroundColor: Colors.graphite,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.full,
      gap: Spacing.xs,
    },
    logButtonText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      color: Colors.white,
    },
    currentWeight: {
      fontSize: 56,
      fontWeight: Typography.fontWeight.bold,
      color: Colors.graphite,
      marginBottom: Spacing.lg,
    },
    progressBarContainer: {
      marginBottom: Spacing.sm,
    },
    progressBar: {
      height: 8,
      backgroundColor: Colors.lightCream,
      borderRadius: BorderRadius.xs,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: Colors.graphite,
      borderRadius: BorderRadius.xs,
    },
    labelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: Spacing.lg,
    },
    labelText: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
      color: Colors.steelBlue,
    },
    projectionText: {
      fontSize: Typography.fontSize.xs,
      color: Colors.steelBlue,
      lineHeight: Typography.fontSize.sm * Typography.lineHeight.relaxed,
    },
    projectionDate: {
      fontWeight: Typography.fontWeight.bold,
      color: Colors.energyOrange,
    },
    goalReachedText: {
      fontWeight: Typography.fontWeight.bold,
      color: '#10B981',
      fontSize: Typography.fontSize.base,
    },
    motivationalText: {
      fontStyle: 'italic',
      color: Colors.steelBlue,
    },
    behindGoalText: {
      color: Colors.energyOrange,
      marginBottom: 4,
    },
    goalPaceText: {
      color: Colors.vividTeal,
      fontSize: Typography.fontSize.xs,
    },
    projectionDateGoal: {
      fontWeight: Typography.fontWeight.bold,
      color: Colors.vividTeal,
    },
  });