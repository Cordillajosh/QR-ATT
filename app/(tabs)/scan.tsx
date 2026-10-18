
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { registerAttendance } from '@/lib/attendance';

export default function ScanScreen() {
  const { user, loading: authLoading } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      // Ignore additional camera callbacks while processing a scan.
      if (scanned || processing) return;

      setScanned(true);
      setProcessing(true);
      setMessage(null);
      setSuccess(false);

      if (authLoading) {
        setMessage('Please wait while your account is loading.');
        setProcessing(false);
        return;
      }

      if (!user) {
        setMessage('You need to sign in before recording attendance.');
        setProcessing(false);
        return;
      }

      try {
        const result = await registerAttendance(data, user.id);
        setMessage(result.message);
        setSuccess(result.success);
      } catch (error) {
        console.error('Attendance registration failed:', error);
        setMessage(
          'Something went wrong while recording attendance. Please try again.'
        );
        setSuccess(false);
      } finally {
        setProcessing(false);
      }
    },
    [authLoading, user, scanned, processing]
  );

  const handleScanAgain = () => {
    setScanned(false);
    setProcessing(false);
    setMessage(null);
    setSuccess(false);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.subtitle}>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionIcon}>
          <Text style={styles.largeIcon}>▣</Text>
        </View>

        <Text style={styles.title}>Camera Permission Needed</Text>

        <Text style={styles.subtitle}>
          Allow camera access so you can scan the QR code for your event.
        </Text>

        <AppButton
          theme="primary"
          title="Grant Permission"
          icon="camera"
          onPress={requestPermission}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!scanned && (
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      )}

      {!scanned && (
        <View style={styles.scanGuide}>
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />

          <Text style={styles.guideText}>Place the QR code inside the frame</Text>
        </View>
      )}

      <View style={[styles.overlay, scanned && styles.resultOverlay]}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>QR</Text>
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Scan Attendance</Text>
            <Text style={styles.subtitle}>
              {scanned
                ? 'Scan result'
                : 'Scan the official event QR code'}
            </Text>
          </View>
        </View>

        {processing && (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.processingText}>
              Recording your attendance...
            </Text>
          </View>
        )}

        {scanned && !processing && message && (
          <View
            style={[
              styles.resultBox,
              success ? styles.successBox : styles.errorBox,
            ]}
          >
            <Text style={styles.resultIcon}>
              {success ? '✓' : '!'}
            </Text>

            <View style={styles.resultTextContainer}>
              <Text
                style={[
                  styles.resultTitle,
                  success ? styles.successText : styles.errorText,
                ]}
              >
                {success ? 'Attendance Recorded' : 'Unable to Record'}
              </Text>

              <Text style={styles.resultMessage}>{message}</Text>
            </View>
          </View>
        )}

        {scanned && !processing && (
          <AppButton
            theme="primary"
            title="Scan Again"
            icon="refresh"
            onPress={handleScanAgain}
          />
        )}

        {!scanned && (
          <Text style={styles.privacyNote}>
            Your attendance will be linked to your signed-in account.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scanGuide: {
    position: 'absolute',
    top: '23%',
    width: 245,
    height: 245,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 36,
    height: 36,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FFFFFF',
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 36,
    height: 36,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FFFFFF',
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 36,
    height: 36,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FFFFFF',
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FFFFFF',
    borderBottomRightRadius: 12,
  },
  guideText: {
    position: 'absolute',
    top: '110%',
    width: 280,
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: '#000000',
    textShadowRadius: 5,
  },
  overlay: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 35,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultOverlay: {
    bottom: 35,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerIconText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    textAlign: 'center',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
  },
  processingText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 13,
    marginBottom: 16,
    gap: 10,
  },
  successBox: {
    backgroundColor: '#E5F4E8',
  },
  errorBox: {
    backgroundColor: '#FBE9E7',
  },
  resultIcon: {
    fontSize: 21,
    fontWeight: '900',
    color: '#333333',
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 5,
  },
  successText: {
    color: '#246B35',
  },
  errorText: {
    color: '#A52B25',
  },
  resultMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: '#333333',
  },
  permissionIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginBottom: 18,
  },
  largeIcon: {
    fontSize: 35,
    color: COLORS.primary,
    fontWeight: '800',
  },
  privacyNote: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textSecondary,
    marginTop: 13,
  },
});
