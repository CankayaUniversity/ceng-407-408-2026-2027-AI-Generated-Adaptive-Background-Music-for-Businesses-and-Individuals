'use client';

import {useEffect, useRef, useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {AspectRatio} from '@astryxdesign/core/AspectRatio';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {Text} from '@astryxdesign/core/Text';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Banner} from '@astryxdesign/core/Banner';
import {CameraIcon, VideoCameraIcon, VideoCameraSlashIcon} from '@heroicons/react/24/outline';

/**
 * Webcam preview and single-frame capture (getUserMedia + canvas). The camera
 * only starts when the user asks, and stops when they leave this tab.
 */
export function CameraCapture({onCapture}: {onCapture: (dataUrl: string) => void}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isOn, setIsOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsOn(false);
  };

  useEffect(() => stop, []);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {width: {ideal: 1280}, height: {ideal: 720}},
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsOn(true);
    } catch (e) {
      const denied = e instanceof DOMException && e.name === 'NotAllowedError';
      setError(
        denied
          ? 'Camera access was blocked. Allow it in the browser’s address bar, or upload a photo instead.'
          : 'No camera could be started on this device. Upload a photo or describe the room instead.',
      );
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    onCapture(canvas.toDataURL('image/jpeg', 0.85));
  };

  return (
    <VStack gap={3}>
      <AspectRatio ratio={16 / 9} fit="cover">
        <video ref={videoRef} muted playsInline aria-label="Camera preview" />
      </AspectRatio>
      {!isOn && !error && (
        <Text type="supporting">
          The camera is off. Start it to take a single snapshot of the room.
        </Text>
      )}
      {error && <Banner status="warning" title="Camera unavailable" description={error} />}
      <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
        {isOn ? (
          <HStack gap={2} vAlign="center">
            <StatusDot variant="success" label="Camera on" isPulsing />
            <Text weight="medium">Camera on</Text>
          </HStack>
        ) : (
          <Button
            label="Start camera"
            variant="secondary"
            icon={<Icon icon={VideoCameraIcon} />}
            onClick={start}
          />
        )}
        {isOn && (
          <HStack gap={2}>
            <Button
              label="Stop"
              variant="ghost"
              icon={<Icon icon={VideoCameraSlashIcon} />}
              onClick={stop}
            />
            <Button
              label="Take snapshot"
              variant="primary"
              icon={<Icon icon={CameraIcon} />}
              onClick={() => {
                capture();
                stop();
              }}
            />
          </HStack>
        )}
      </HStack>
    </VStack>
  );
}
