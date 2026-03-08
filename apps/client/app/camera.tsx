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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { compressImageForUpload } from '@/utils/imageCompression'
import { supabase } from '@haven/shared-utils'

const { width } = Dimensions.get('window')

type CameraMode = 'scan' | 'barcode'

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<'front' | 'back'>('back')
  const [capturing, setCapturing] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [mode, setMode] = useState<CameraMode>('scan')

  // Post-capture state
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null)
  const [userNote, setUserNote] = useState('')

  // Barcode state
  const [barcodeScanning, setBarcodeScanning] = useState(false)
  const lastScannedRef = useRef<string | null>(null)

  const cameraRef = useRef<CameraView>(null)

  // ── Permission screens ──────────────────────────────────────────────────────
  if (!permission) {
    return <View style={styles.container} />
  }

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

  // ── Capture ─────────────────────────────────────────────────────────────────
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
      setProcessing(false)
      setCapturedBase64(compressed.base64)
    } catch (error) {
      console.error('❌ Capture error:', error)
      setProcessing(false)
    } finally {
      setCapturing(false)
    }
  }

  const handleAnalyze = () => {
    if (!capturedBase64) return
    router.replace({
      pathname: '/log',
      params: {
        method: 'camera',
        imageBase64: capturedBase64,
        userNote: userNote.trim(),
      },
    })
  }

  const handleRetake = () => {
    setCapturedBase64(null)
    setUserNote('')
  }

  // ── Barcode handler ────────────────────────────────────────────────────────
  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    // Debounce — ignore if same barcode or already processing
    if (barcodeScanning || lastScannedRef.current === data) return
    lastScannedRef.current = data
    setBarcodeScanning(true)

    try {
      const { data: result, error } = await supabase.functions.invoke('lookupBarcode', {
        body: { barcode: data },
      })

      if (error || !result?.success) {
        // Product not found — prompt user to switch to Scan Food
        Alert.alert(
          'Barcode Not Found',
          'This product is not in our database. Try scanning the food directly instead.',
          [
            { text: 'Try Scan Food', onPress: () => { setMode('scan'); lastScannedRef.current = null } },
            { text: 'Cancel', style: 'cancel', onPress: () => { lastScannedRef.current = null } },
          ]
        )
        return
      }

      // Navigate directly to log — no note screen needed for barcode
      router.replace({
        pathname: '/log',
        params: {
          method: 'barcode',
          barcodeData: JSON.stringify(result.data),
        },
      })
    } catch (err) {
      console.error('❌ Barcode lookup error:', err)
      lastScannedRef.current = null
      Alert.alert('Error', 'Failed to look up barcode. Please try again.')
    } finally {
      setBarcodeScanning(false)
    }
  }

  // ── Viewfinder dimensions ───────────────────────────────────────────────────
  const frame = mode === 'scan'
    ? { width: width * 0.75, height: width * 0.75 }
    : { width: width * 0.85, height: width * 0.38 }

  // ── Frozen photo review ─────────────────────────────────────────────────────
  if (capturedBase64) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Photo fills remaining space above the overlay */}
        <View style={styles.frozenPhotoContainer}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${capturedBase64}` }}
            style={styles.frozenPhoto}
            resizeMode="cover"
          />
          <TouchableOpacity style={styles.frozenBackButton} onPress={handleRetake}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* In normal flex flow — KeyboardAvoidingView pushes this up */}
        <View style={styles.frozenBottomOverlay}>
          <TextInput
            style={styles.frozenNoteInput}
            value={userNote}
            onChangeText={setUserNote}
            placeholder={"Add details to improve accuracy (optional)\ne.g. large portion, restaurant, homemade..."}
            placeholderTextColor="rgba(255,255,255,0.55)"
            multiline
            maxLength={150}
          />
          <Text style={styles.frozenCharCount}>{userNote.length}/150</Text>

          <View style={styles.frozenActions}>
            <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
              <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
              <Text style={styles.retakeButtonText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.analyzeButton} onPress={handleAnalyze}>
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              <Text style={styles.analyzeButtonText}>Analyze Meal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    )
  }

  // ── Live camera ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        onBarcodeScanned={mode === 'barcode' ? handleBarcodeScanned : undefined}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.replace('log')}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeOption, mode === 'scan' && styles.modeOptionActive]}
              onPress={() => setMode('scan')}
            >
              <Text style={[styles.modeOptionText, mode === 'scan' && styles.modeOptionTextActive]}>
                Scan Food
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeOption, mode === 'barcode' && styles.modeOptionActive]}
              onPress={() => setMode('barcode')}
            >
              <Text style={[styles.modeOptionText, mode === 'barcode' && styles.modeOptionTextActive]}>
                Barcode
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
          >
            <Ionicons name="camera-reverse-outline" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Viewfinder */}
        <View style={styles.viewfinderContainer}>
          <View style={[styles.viewfinder, { width: frame.width, height: frame.height }]}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.viewfinderHint}>
            {mode === 'scan' ? 'Center your food in the frame' : 'Align barcode within the frame'}
          </Text>
          {mode === 'barcode' && (
            <View style={styles.barcodeWaitRow}>
              <Ionicons name="barcode-outline" size={16} color="rgba(255,255,255,0.4)" />
              <Text style={styles.barcodeWaitText}>Auto-detects when in range</Text>
            </View>
          )}
        </View>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          {mode === 'scan' ? (
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCapture}
              disabled={capturing}
            >
              {capturing
                ? <ActivityIndicator size="large" color="#206E6B" />
                : <View style={styles.captureInner} />
              }
            </TouchableOpacity>
          ) : (
            <View style={styles.barcodeWaitingRow}>
              <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
              <Text style={styles.barcodeWaitingText}>Waiting for barcode...</Text>
            </View>
          )}
        </View>
      </CameraView>

      {processing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
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

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modeOption: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 17,
  },
  modeOptionActive: {
    backgroundColor: '#206E6B',
  },
  modeOptionText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontWeight: '600',
  },
  modeOptionTextActive: {
    color: '#FFFFFF',
  },

  // Viewfinder
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  viewfinder: {
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#206E6B',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  viewfinderHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  barcodeWaitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
  },
  barcodeWaitText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },

  // Bottom bar
  bottomBar: {
    paddingBottom: 50,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingTop: 24,
    minHeight: 120,
    justifyContent: 'center',
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
  barcodeWaitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barcodeWaitingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: '500',
  },

  // Processing overlay
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

  // Frozen photo review
  frozenPhotoContainer: {
    flex: 1,
    position: 'relative',
  },
  frozenPhoto: {
    width: '100%',
    height: '100%',
  },
  frozenBackButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 22,
  },
  frozenBottomOverlay: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 8,
  },
  frozenNoteInput: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#FFFFFF',
    minHeight: 72,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  frozenCharCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'right',
    marginTop: -4,
  },
  frozenActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  retakeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  analyzeButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#206E6B',
  },
  analyzeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Permission screen
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
})