import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function AnimatedSplashOverlay() {
  return null;
}

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Text style={{ fontSize: 32 }}>🥛</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    height: 64,
  },
});
