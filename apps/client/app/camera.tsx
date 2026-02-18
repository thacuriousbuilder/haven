
import { CameraView, useCameraPermissions } from 'expo-camera'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { compressImageForUpload } from '@/utils/imageCompression'

const { width, height } = Dimensions.get('window')

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<'front' | 'back'>('back')
  const [capturing, setCapturing] = useState(false)
  const [processing, setProcessing] = useState(false)
  const cameraRef = useRef<CameraView>(null)

  // Permission not yet determined
  if (!permission) {
    return <View style={styles.container} />
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color="#206E6B" />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionSubtext}>
          HAVEN needs camera access to scan your food
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return

    try {
      setCapturing(true)

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      })

      if (!photo?.uri) throw new Error('No photo captured')
    
      setProcessing(true)

      const compressed = await compressImageForUpload(photo.uri)

      router.replace({
        pathname: '/log',
        params: { method: 'camera', imageBase64: compressed.base64 },
      })
    } catch (error) {
      console.error('❌ Capture error:', error)
      setProcessing(false)
    } finally {
      setCapturing(false)
    }
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Scan Food</Text>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
          >
            <Ionicons name="camera-reverse-outline" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Viewfinder guide */}
        <View style={styles.viewfinderContainer}>
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.viewfinderHint}>
            Center your food in the frame
          </Text>
        </View>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleCapture}
            disabled={capturing}
          >
            {capturing ? (
              <ActivityIndicator size="large" color="#206E6B" />
            ) : (
              <View style={styles.captureInner} />
            )}
          </TouchableOpacity>
        </View>
      </CameraView>
      {processing && (
        <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#206E6B" />
            <Text style={styles.processingText}>Processing...</Text>
        </View>
        )}
    </View>
  )
}

const CORNER_SIZE = 24
const CORNER_THICKNESS = 3

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinder: {
    width: width * 0.75,
    height: width * 0.75,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#206E6B',
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  viewfinderHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 16,
  },
  bottomBar: {
    paddingBottom: 50,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingTop: 24,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#206E6B',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})