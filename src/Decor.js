// Shared decorations so every tab has the same soft, friendly look.
import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { shadow } from './theme';

// Soft coloured circles in the background (same as on the Home tab).
export function Blobs() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={s.blobA} />
      <View style={s.blobB} />
    </View>
  );
}

// Round picture frame for a mascot.
export function Avatar({ source, size = 56, style }) {
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: '#fff', overflow: 'hidden', backgroundColor: '#fff' },
        shadow,
        style,
      ]}
    >
      <Image source={source} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    </View>
  );
}

// A little blue cloud.
export function Cloud({ style, color = '#CFE2F8' }) {
  return (
    <View pointerEvents="none" style={[{ width: 124, height: 72 }, style]}>
      <View style={{ position: 'absolute', left: 0, top: 28, width: 58, height: 44, borderRadius: 22, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 28, top: 0, width: 66, height: 66, borderRadius: 33, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 66, top: 22, width: 56, height: 50, borderRadius: 25, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 14, top: 38, width: 96, height: 34, borderRadius: 17, backgroundColor: color }} />
    </View>
  );
}

// A few green leaves.
export function Leaves({ style, flip }) {
  const leaf = (rot, left, top, color) => (
    <View
      key={`${rot}-${left}`}
      style={{
        position: 'absolute', left, top, width: 38, height: 20, borderRadius: 20,
        backgroundColor: color, transform: [{ rotate: `${rot}deg` }],
      }}
    />
  );
  return (
    <View pointerEvents="none" style={[{ width: 70, height: 70 }, flip && { transform: [{ scaleY: -1 }] }, style]}>
      {leaf(-50, 4, 8, '#CDE8C4')}
      {leaf(-10, 18, 24, '#B9DDB0')}
      {leaf(35, 6, 38, '#D7EECF')}
    </View>
  );
}

const s = StyleSheet.create({
  blobA: { position: 'absolute', top: -60, right: -70, width: 240, height: 240, borderRadius: 120, backgroundColor: '#FFE3D3', opacity: 0.8 },
  blobB: { position: 'absolute', top: 260, left: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: '#E5ECFF', opacity: 0.7 },
});
