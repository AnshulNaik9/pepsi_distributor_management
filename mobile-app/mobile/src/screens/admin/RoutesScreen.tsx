import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoutes, useCreateRoute, useDeleteRoute } from '../../hooks/useApi';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../theme/tokens';

export default function RoutesScreen() {
  const { data: routes = [], isLoading } = useRoutes();
  const createRoute = useCreateRoute();
  const deleteRoute = useDeleteRoute();
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [deleteId, setDeleteId] = useState<any>(null);

  const handleAdd = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Route name required');
    try { await createRoute.mutateAsync({ name }); setModal(false); setName(''); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (r: any) => {
    if (Platform.OS === 'web') {
      setDeleteId(r);
      return;
    }

    Alert.alert('Delete Route', `Delete "${r.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteRoute.mutateAsync(r._id); } catch (e: any) { Alert.alert('Error', e.message); } } }
    ]);
  };

  return (
    <View style={styles.container}>
      {isLoading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={routes}
          keyExtractor={i => i._id}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <View style={styles.card}>
              <View style={[styles.routeNumber, { backgroundColor: Colors.primary + '20' }]}>
                <Text style={styles.routeNum}>{index + 1}</Text>
              </View>
              <Text style={styles.routeName} numberOfLines={2}>{item.name}</Text>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="map-outline" size={48} color={Colors.textMuted} /><Text style={styles.emptyText}>No routes added</Text></View>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.bottomSheet}>
            <Text style={styles.modalTitle}>Add New Route</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Route A - North City"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAdd}>
                {createRoute.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Add Route</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal (Web) */}
      <Modal visible={!!deleteId} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={[styles.bottomSheet, { alignSelf: 'center', width: '90%', marginBottom: 'auto', marginTop: 'auto' }]}>
            <Text style={styles.modalTitle}>Delete Route</Text>
            <Text style={{ marginTop: 10, marginBottom: 24, fontSize: 16, color: Colors.textPrimary }}>
              Are you sure you want to delete route <Text style={{fontWeight:'700'}}>{deleteId?.name}</Text>? 
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteId(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmBtn, { backgroundColor: Colors.danger }]} 
                onPress={async () => {
                  try {
                    await deleteRoute.mutateAsync(deleteId._id || deleteId.id);
                    setDeleteId(null);
                  } catch (e: any) {
                    Alert.alert('Error', e.message);
                  }
                }}
              >
                <Text style={styles.confirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgSurface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm },
  routeNumber: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  routeNum: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primary },
  routeName: { flex: 1, fontSize: FontSize.lg, fontWeight: '600', color: Colors.textPrimary },
  deleteBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: Colors.dangerBg, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, opacity: 0.5 },
  emptyText: { color: Colors.textMuted, marginTop: 12, fontSize: FontSize.md },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.primary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: Colors.bgSurface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xl },
  input: { backgroundColor: Colors.bgInput, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, paddingHorizontal: Spacing.md, height: 46, marginBottom: Spacing.xl },
  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, height: 46, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 1, height: 46, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.primary },
  confirmText: { color: '#fff', fontWeight: '700' },
});
