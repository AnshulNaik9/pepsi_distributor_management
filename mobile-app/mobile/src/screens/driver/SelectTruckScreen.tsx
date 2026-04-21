import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTrucks } from '../../hooks/useApi';
import { setDriverTruckId } from '../../lib/auth';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../theme/tokens';

export default function SelectTruckScreen({ navigation }: any) {
  const { data: trucks = [], isLoading } = useTrucks();

  const handleSelect = async (truck: any) => {
    await setDriverTruckId(truck._id);
    navigation.replace('SelectRoute');
  };

  return (
    <LinearGradient colors={['#0F172A', '#172554', '#0F172A']} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons name="car" size={36} color="#fff" />
        </View>
        <Text style={styles.title}>Select Your Truck</Text>
        <Text style={styles.subtitle}>Choose the vehicle you're driving today</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={trucks}
          keyExtractor={i => i._id}
          contentContainerStyle={{ padding: Spacing.xl }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => handleSelect(item)}>
              <View style={styles.cardIcon}>
                <Ionicons name="car" size={28} color={Colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.vehicleNo}>{item.vehicleNumber}</Text>
                <Text style={styles.driverName}>{item.driverName}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="car-outline" size={60} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No trucks available</Text>
              <Text style={styles.emptySubtext}>Ask admin to add trucks</Text>
            </View>
          }
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: Spacing.xl },
  iconBox: { width: 80, height: 80, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg, ...Shadows.primary },
  title: { fontSize: FontSize['3xl'], fontWeight: '900', color: '#fff' },
  subtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 6 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  cardIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  cardInfo: { flex: 1 },
  vehicleNo: { fontSize: FontSize.xl, fontWeight: '800', color: '#fff' },
  driverName: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textSecondary, marginTop: 16 },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 6 },
});
