import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRoutes } from '../../hooks/useApi';
import { setDriverRouteId } from '../../lib/auth';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../theme/tokens';

export default function SelectRouteScreen({ navigation }: any) {
  const { data: routes = [], isLoading } = useRoutes();

  const routeColors = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4'];

  const handleSelect = async (route: any) => {
    await setDriverRouteId(route._id);
    navigation.replace('DriverTabs');
  };

  return (
    <LinearGradient colors={['#0F172A', '#172554', '#0F172A']} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons name="map" size={36} color="#fff" />
        </View>
        <Text style={styles.title}>Select Your Route</Text>
        <Text style={styles.subtitle}>Choose your delivery route for today</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={routes}
          keyExtractor={i => i._id}
          contentContainerStyle={{ padding: Spacing.xl }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const color = routeColors[index % routeColors.length];
            return (
              <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => handleSelect(item)}>
                <View style={[styles.cardIndex, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                  <Text style={[styles.indexText, { color }]}>{index + 1}</Text>
                </View>
                <Text style={styles.routeName} numberOfLines={2}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="map-outline" size={60} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No routes available</Text>
              <Text style={styles.emptySubtext}>Ask admin to add routes</Text>
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
  cardIndex: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md, borderWidth: 1 },
  indexText: { fontSize: FontSize.xl, fontWeight: '900' },
  routeName: { flex: 1, fontSize: FontSize.lg, fontWeight: '700', color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textSecondary, marginTop: 16 },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 6 },
});
