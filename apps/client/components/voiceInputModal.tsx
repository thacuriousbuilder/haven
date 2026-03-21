

import React, { useEffect, useRef, useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system/legacy'
import { supabase } from '@haven/shared-utils'
import { Colors } from '@/constants/colors'

type VoiceState = 'listening' | 'transcribing' | 'review' | 'error'

interface VoiceInputModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: (transcript: string) => void
}

export function VoiceInputModal({ visible, onClose, onConfirm }: VoiceInputModalProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('listening')
  const [transcript, setTranscript] = useState('')
  const recordingRef = useRef<Audio.Recording | null>(null)
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Start recording as soon as modal opens
  useEffect(() => {
    if (visible) {
      setVoiceState('listening')
      setTranscript('')
      startRecording()
    } else {
      stopAndCleanup()
    }
  }, [visible])

  // Pulse animation while listening
  useEffect(() => {
    if (voiceState === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } else {
      pulseAnim.stopAnimation()
      pulseAnim.setValue(1)
    }
  }, [voiceState])

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync()
      if (!granted) {
        Alert.alert(
          'Microphone Access Needed',
          'Please enable microphone access in Settings.',
          [{ text: 'OK', onPress: onClose }]
        )
        return
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )
      recordingRef.current = recording
    } catch (error) {
      console.error('❌ Start recording error:', error)
      setVoiceState('error')
    }
  }

  const stopAndTranscribe = async () => {
    if (!recordingRef.current) return
  
    try {
      setVoiceState('transcribing')
  
      await recordingRef.current.stopAndUnloadAsync()
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false })
  
      const uri = recordingRef.current.getURI()
      recordingRef.current = null
  
      if (!uri) {
        setVoiceState('error')
        return
      }
  
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as FileSystem.EncodingType,
      })
  
      const { data, error } = await supabase.functions.invoke('transcribeAudio', {
        body: { audio_base64: base64Audio, mime_type: 'audio/m4a' },
      })
  
      if (error || !data?.success || !data?.transcript) {
        setVoiceState('error')
        return
      }
  
      setTranscript(data.transcript)
      setVoiceState('review')
    } catch (error) {
      console.error('❌ Transcribe error:', error)
      setVoiceState('error')
    }
  }

  const stopAndCleanup = async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync()
      } catch (_) {}
      recordingRef.current = null
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false })
  }

  const handleTryAgain = async () => {
    setVoiceState('listening')
    setTranscript('')
    await startRecording()
  }

  const handleClose = async () => {
    await stopAndCleanup()
    onClose()
  }

  const handleConfirm = () => {
    onConfirm(transcript)
    onClose()
  }

  // ── Listening state ─────────────────────────────────────────────────────────
  const renderListening = () => (
    <View style={styles.stateContainer}>
      <TouchableOpacity onPress={stopAndTranscribe} activeOpacity={0.85}>
        <Animated.View style={[styles.micCircle, styles.micCircleActive,
          { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="mic" size={40} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
      <Text style={styles.stateTitle}>Listening...</Text>
      <Text style={styles.stateSubtitle}>Describe what you ate, including portions</Text>
  
      {/* ── Stop button ── */}
      <TouchableOpacity
        style={styles.stopButton}
        onPress={stopAndTranscribe}
        activeOpacity={0.8}
      >
        <Ionicons name="stop-circle" size={20} color={Colors.vividTeal} />
        <Text style={styles.stopButtonText}>Done speaking</Text>
      </TouchableOpacity>
    </View>
  )
  // ── Transcribing state ──────────────────────────────────────────────────────
  const renderTranscribing = () => (
    <View style={styles.stateContainer}>
      <View style={[styles.micCircle, styles.micCircleIdle]}>
        <ActivityIndicator size="large" color={Colors.vividTeal} />
      </View>
      <Text style={styles.stateTitle}>Processing...</Text>
      <Text style={styles.stateSubtitle}>Just a moment</Text>
    </View>
  )

  // ── Review state ────────────────────────────────────────────────────────────
  const renderReview = () => (
    <View style={styles.stateContainer}>
      <View style={[styles.micCircle, styles.micCircleIdle]}>
        <Ionicons name="mic" size={40} color={Colors.vividTeal} />
      </View>
      <Text style={styles.stateTitle}>Got it!</Text>
      <Text style={styles.stateSubtitle}>Review and confirm your meal</Text>

      <View style={styles.transcriptCard}>
        <Text style={styles.transcriptLabel}>I heard:</Text>
        <Text style={styles.transcriptText}>{transcript}</Text>
      </View>

      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
        <Text style={styles.confirmButtonText}>Continue with this</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleTryAgain} style={styles.tryAgainButton}>
        <Text style={styles.tryAgainText}>Try again</Text>
      </TouchableOpacity>
    </View>
  )

  // ── Error state ─────────────────────────────────────────────────────────────
  const renderError = () => (
    <View style={styles.stateContainer}>
      <View style={[styles.micCircle, styles.micCircleIdle]}>
        <Ionicons name="mic-off" size={40} color={Colors.textMuted} />
      </View>
      <Text style={styles.stateTitle}>Couldn't hear that</Text>
      <Text style={styles.stateSubtitle}>Please try again or type your meal instead</Text>

      <TouchableOpacity style={styles.confirmButton} onPress={handleTryAgain}>
        <Text style={styles.confirmButtonText}>Try again</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleClose} style={styles.tryAgainButton}>
        <Text style={styles.tryAgainText}>Type instead</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={18} color={Colors.graphite} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Voice Input</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {voiceState === 'listening'    && renderListening()}
          {voiceState === 'transcribing' && renderTranscribing()}
          {voiceState === 'review'       && renderReview()}
          {voiceState === 'error'        && renderError()}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.graphite,
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  stateContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  micCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  micCircleActive: {
    backgroundColor: Colors.vividTeal,
  },
  micCircleIdle: {
    backgroundColor: 'rgba(32, 110, 107, 0.1)',
  },
  stateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.graphite,
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  transcriptCard: {
    width: '100%',
    backgroundColor: '#F5F3EF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  transcriptLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  transcriptText: {
    fontSize: 17,
    color: Colors.graphite,
    fontWeight: '500',
    lineHeight: 26,
  },
  confirmButton: {
    width: '100%',
    backgroundColor: Colors.vividTeal,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tryAgainButton: {
    paddingVertical: 12,
  },
  tryAgainText: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.vividTeal,
    backgroundColor: Colors.tealOverlay,
  },
  stopButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.vividTeal,
  },
})