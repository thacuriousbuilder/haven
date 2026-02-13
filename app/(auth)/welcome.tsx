
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ViewToken, Image } from 'react-native';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import WelcomeSlide from '@/components/welcomeSlide';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

const welcomeImages = {
  slide1: require('@/assets/images/welcome/welcome1.png'),
  slide2: require('@/assets/images/welcome/welcome2.png'),
  slide3: require('@/assets/images/welcome/welcome3.png'),
};

const WELCOME_SLIDES = [
  {
    id: '1',
    title: 'Ready to plan your calories by the week?',
    image: welcomeImages.slide1,
  },
  {
    id: '2',
    title: 'Plan "cheat" days into your week — on purpose.',
    image: welcomeImages.slide2,
  },
  {
    id: '3',
    title: 'Weekly accountability to help you stay consistent — without pressure.',
    image: welcomeImages.slide3,
  },
];

export default function Welcome() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderSlide = ({ item }: { item: typeof WELCOME_SLIDES[0] }) => {
    return <WelcomeSlide title={item.title} image={item.image} />;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom']}>
     
      <View style={styles.logoContainer}>
        <Text style={styles.welcomeText}>Welcome to</Text>
        <Image 
          source={require('@/assets/Logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      
      <FlatList
        ref={flatListRef}
        data={WELCOME_SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.carousel}
      />

      
      <View style={styles.pagination}>
        {WELCOME_SLIDES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentIndex === index ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/signup')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.6}
        >
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInLink}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFF',
    paddingTop: 80, 
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48, 
    paddingHorizontal: 24,
    marginTop: 20, 
  },
  welcomeText: {
    fontSize: 20,
    color: Colors.steelBlue,
    marginBottom: 8,
    fontWeight: '400',
  },
  logo: {
    width: 200,
    height: 60,
  },
  carousel: {
    flex: 1,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 32,
    backgroundColor: '#206E6B',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#D0D0D0',
  },
  footer: {
    gap: 16,
    paddingHorizontal: 24,
  },
  primaryButton: {
    backgroundColor: '#206E6B',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  signInText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  signInLink: {
    fontWeight: '600',
    color: '#3D5A5C',
  },
});