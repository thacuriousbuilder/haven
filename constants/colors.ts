

/**
 * HAVEN App Color Palette
 * Updated design system colors
 */
export const Colors = {
    // Primary Colors
    energyOrange: '#EF7828',    // CTAs, "Saturday night" accent, highlights
    vividTeal: '#206E6B',       // Primary brand color, hero background, dark sections
    
    // Text Colors
    graphite: '#504D47',        // Headlines on light backgrounds
    steelBlue: '#687C88',       // Secondary text, muted elements
    textMuted: '#999896',       // Very subtle text
    
    // Background Colors
    white: '#FFFFFF',           // Primary backgrounds, cards
    lightCream: '#F5F3EF',      // Warm secondary backgrounds (alternating sections)
    
    // UI Elements
    border: '#E5E3DF',          // Card borders, dividers
    
    // Macro-specific colors (for nutrition circles)
    proteinOrange: '#EF7828',   // Protein macro
    carbsTeal: '#206E6B',       // Carbs macro
    fatSteel: '#687C88',        // Fat macro
    
    // Status colors (for progress indicators)
    success: '#10B981',         // On track, positive states
    warning: '#F59E0B',         // Needs attention
    error: '#EF4444',           // Over budget, errors
    
    // Opacity variants (for overlays, shadows)
    blackOverlay: 'rgba(0, 0, 0, 0.1)',
    tealOverlay: 'rgba(32, 110, 107, 0.1)',
    orangeOverlay: 'rgba(239, 120, 40, 0.1)',
  };
  
  /**
   * Shadow presets for consistent elevation
   */
  export const Shadows = {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
  };
  
  /**
   * Spacing system (multiples of 4)
   */
  export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  };
  
  /**
   * Border radius presets
   */
  export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  };
  
  /**
   * Typography scale
   */
  export const Typography = {
    // Font sizes
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 28,
      huge: 36,
    },
    
    // Font weights
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
    
    // Line heights
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  };