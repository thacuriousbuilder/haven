
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WelcomeSlideProps {
  title: string;
  image: any; 
}

export default function WelcomeSlide({ title, image }: WelcomeSlideProps) {
  return (
    <View style={styles.slide}>
     
      <View style={styles.imageContainer}>
        {image ? (
          <Image 
            source={image} 
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          
          <View style={styles.imagePlaceholder} />
        )}
      </View>

     
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40, 
  },
  imageContainer: {
    width: '100%',
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '90%',
    height: '85%',
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    lineHeight: 30,
    paddingHorizontal: 8,
  },
});