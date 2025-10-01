import { ThemedText } from '@/components/themed-text';
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
export default function TodoList() {
    const router = useRouter();
     


    return (
        <View style={styles.container}>
      <ThemedText type='title'>Todo:</ThemedText>
     
      <ThemedText type='subtitle' style={{gap:30, marginBottom: 20}}>
        - Task 1: Need better UI Designs{"\n"}
        - Task 2: Need Screens and Routing Map{"\n"}
        - Task 3: Impliment Calculations{"\n"}
        - Task 4: Add Calibration{"\n"}
        - Task 5: Connect with FireStore{"\n"}
      </ThemedText>

      <ThemedView style={styles.stepContainer}>
                      <TouchableOpacity
                          style={{ alignSelf: 'center'
                          , padding: 10, borderRadius: 8
                          }}
                          onPress={() => {
                              router.replace('/(tabs)');
                          }}
                      >
                          <ThemedText type="link" style={{ fontSize: 18 }}>
                              Home
                          </ThemedText>
                      </TouchableOpacity>
                  </ThemedView>
    </View>
    
  );
}
const styles = StyleSheet.create({
  container: { flex: 1,   paddingTop: 80,left: 10,right: 10, gap: 10,  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 20,marginTop: 20 },
  
  stepContainer: {
        gap: 8,
        marginBottom: 50,
        alignItems: 'center', 
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
      },
});
