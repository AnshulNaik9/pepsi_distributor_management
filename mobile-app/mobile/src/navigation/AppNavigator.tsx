import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, BorderRadius, Spacing, Shadows } from '../theme/tokens';
import { logout } from '../lib/auth';

// Auth
import LoginScreen from '../screens/LoginScreen';

// Driver
import SelectTruckScreen from '../screens/driver/SelectTruckScreen';
import SelectRouteScreen from '../screens/driver/SelectRouteScreen';
import BillingScreen from '../screens/driver/BillingScreen';
import InventoryScreen from '../screens/driver/InventoryScreen';
import ExpensesScreen from '../screens/driver/ExpensesScreen';
import HistoryScreen from '../screens/driver/HistoryScreen';

// Admin
import DashboardScreen from '../screens/admin/DashboardScreen';
import ProductsScreen from '../screens/admin/ProductsScreen';
import CustomersScreen from '../screens/admin/CustomersScreen';
import OrdersScreen from '../screens/admin/OrdersScreen';
import TrucksScreen from '../screens/admin/TrucksScreen';
import RoutesScreen from '../screens/admin/RoutesScreen';
import OffersScreen from '../screens/admin/OffersScreen';
import StockScreen from '../screens/admin/StockScreen';
import ProfitPulseScreen from '../screens/admin/ProfitPulseScreen';
import TopPerformersScreen from '../screens/admin/TopPerformersScreen';
import SpecialOrderScreen from '../screens/admin/SpecialOrderScreen';

const RootStack = createNativeStackNavigator();
const AdminDrawer = createDrawerNavigator();
const DriverStack = createNativeStackNavigator();
const DriverTabs = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { 
    ...DefaultTheme.colors, 
    background: '#F8FAFC', 
    card: '#FFFFFF', 
    text: '#1E293B', 
    border: '#E2E8F0', 
    primary: Colors.primary, 
    notification: Colors.danger 
  },
};

// ─── Custom Admin Drawer ─────────────────────────────────────────────
function CustomAdminDrawer(props: any) {
  return (
    <DrawerContentScrollView {...props} style={styles.drawerContainer} contentContainerStyle={{ flex: 1 }}>
      <View style={styles.drawerHeader}>
        <View style={styles.logoRow}>
          <View style={styles.drawerLogo}>
            <Ionicons name="car" size={20} color="#fff" />
          </View>
          <Text style={styles.drawerTitle}>DistriSys</Text>
        </View>
      </View>
      
      <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
        <Text style={styles.sectionLabel}>MANAGEMENT</Text>
      </View>

      <View style={styles.drawerList}>
        <DrawerItemList {...props} />
      </View>

      <View style={styles.drawerFooter}>
        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={async () => { await logout(); props.navigation.replace('Login'); }}
        >
          <Ionicons name="log-out" size={20} color="#64748B" />
          <Text style={styles.logoutText}>Exit Admin</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

// ─── Admin Navigator (Drawer) ─────────────────────────────────────────
function AdminNavigator() {
  return (
    <AdminDrawer.Navigator
      drawerContent={(props) => <CustomAdminDrawer {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#0F172A',
        headerTitleStyle: { fontWeight: '900', fontSize: 18, letterSpacing: -0.5 },
        headerShadowVisible: false,
        drawerStyle: {
          backgroundColor: '#fff',
          width: 280,
        },
        drawerActiveTintColor: '#fff',
        drawerActiveBackgroundColor: '#4F46E5',
        drawerInactiveTintColor: '#64748B',
        drawerLabelStyle: {
          fontWeight: '800',
          fontSize: 13,
          marginLeft: -10,
          color: '#1E293B', // Ensure visible labels
        },
        drawerItemStyle: {
          borderRadius: 8,
          paddingHorizontal: 8,
          marginVertical: 0,
          height: 38,
          justifyContent: 'center',
        }
      }}
    >
      <AdminDrawer.Screen 
        name="AdminDashboard" 
        component={DashboardScreen} 
        options={{ 
          title: 'Dashboard',
          drawerIcon: ({color}) => <Ionicons name="apps-outline" size={20} color={color} />
        }} 
      />
      <AdminDrawer.Screen 
        name="AdminProfitPulse" 
        component={ProfitPulseScreen} 
        options={{ 
          title: 'Profit Pulse',
          drawerIcon: ({color}) => <Ionicons name="analytics-outline" size={20} color={color} />
        }} 
      />
      <AdminDrawer.Screen 
        name="AdminOrders" 
        component={OrdersScreen} 
        options={{ 
          title: 'Bill History',
          drawerIcon: ({color}) => <Ionicons name="receipt-outline" size={20} color={color} />
        }} 
      />
      <AdminDrawer.Screen 
        name="AdminProducts" 
        component={ProductsScreen} 
        options={{ 
          title: 'Products',
          drawerIcon: ({color}) => <Ionicons name="cube-outline" size={20} color={color} />
        }} 
      />
      <AdminDrawer.Screen 
        name="AdminStock" 
        component={StockScreen} 
        options={{ 
          title: 'Godown Stock',
          drawerIcon: ({color}) => <Ionicons name="file-tray-full-outline" size={20} color={color} />
        }} 
      />
      <AdminDrawer.Screen 
        name="AdminCustomers" 
        component={CustomersScreen} 
        options={{ 
          title: 'Customers',
          drawerIcon: ({color}) => <Ionicons name="people-outline" size={20} color={color} />
        }} 
      />
      <AdminDrawer.Screen 
        name="AdminTrucks" 
        component={TrucksScreen} 
        options={{ 
          title: 'Trucks & Loading',
          drawerIcon: ({color}) => <Ionicons name="car-outline" size={20} color={color} />
        }} 
      />
      <AdminDrawer.Screen 
        name="AdminRoutes" 
        component={RoutesScreen} 
        options={{ 
          title: 'Routes',
          drawerIcon: ({color}) => <Ionicons name="map-outline" size={20} color={color} />
        }} 
      />
      <AdminDrawer.Screen 
        name="AdminOffers" 
        component={OffersScreen} 
        options={{ 
          title: 'Offer Management',
          drawerIcon: ({color}) => <Ionicons name="pricetag-outline" size={20} color={color} />
        }} 
      />
      <AdminDrawer.Screen 
        name="AdminTopPerformers" 
        component={TopPerformersScreen} 
        options={{ 
          title: 'Top Performers',
          drawerIcon: ({color}) => <Ionicons name="trophy-outline" size={20} color={color} />
        }} 
      />
      <AdminDrawer.Screen 
        name="AdminSpecialOrder" 
        component={SpecialOrderScreen} 
        options={{ 
          title: 'Special Order',
          drawerIcon: ({color}) => <Ionicons name="sparkles-outline" size={20} color={color} />
        }} 
      />
    </AdminDrawer.Navigator>
  );
}

// ─── Driver Bottom Tabs ─────────────────────────────────────────────
function DriverTabNavigator({ navigation }: any) {
  const tabItems = [
    { name: 'Billing', component: BillingScreen, icon: 'receipt' as const, label: 'Billing' },
    { name: 'Inventory', component: InventoryScreen, icon: 'cube' as const, label: 'Inventory' },
    { name: 'Expenses', component: ExpensesScreen, icon: 'wallet' as const, label: 'Expenses' },
    { name: 'History', component: HistoryScreen, icon: 'time' as const, label: 'History' },
  ];

  return (
    <DriverTabs.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: FontSize.lg },
        headerShadowVisible: false,
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: 8, marginRight: 8 }}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => navigation.replace('SelectRoute')}
            >
              <Ionicons name="map-outline" size={16} color="#fff" />
              <Text style={styles.headerBtnText}>Route</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
              onPress={async () => { await logout(); navigation.replace('Login'); }}
            >
              <Ionicons name="log-out-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ),
        tabBarStyle: {
          backgroundColor: '#FFFFFF', // Light theme for driver panel
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 95 : 80,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 10,
        },
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: { fontSize: 13, fontWeight: '700', paddingBottom: 4 },
        tabBarIconStyle: { marginTop: 4 },
      })}
    >
      {tabItems.map(item => (
        <DriverTabs.Screen
          key={item.name}
          name={item.name}
          component={item.component}
          options={({ route }) => ({
            title: item.label,
            tabBarLabel: item.label,
            tabBarIcon: ({ color, focused, size }) => (
              <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
                <Ionicons name={focused ? item.icon : `${item.icon}-outline` as any} size={22} color={color} />
              </View>
            ),
          })}
        />
      ))}
    </DriverTabs.Navigator>
  );
}

// ─── Driver Stack ─────────────────────────────────────────────
function DriverNavigator() {
  return (
    <DriverStack.Navigator screenOptions={{ headerShown: false }}>
      <DriverStack.Screen name="SelectTruck" component={SelectTruckScreen} />
      <DriverStack.Screen name="SelectRoute" component={SelectRouteScreen} />
      <DriverStack.Screen name="DriverTabs" component={DriverTabNavigator} />
    </DriverStack.Navigator>
  );
}

// ─── Root Navigator ─────────────────────────────────────────────
export default function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Login" component={LoginScreen} />
        <RootStack.Screen name="AdminRoot" component={AdminNavigator} />
        <RootStack.Screen name="DriverRoot" component={DriverNavigator} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: { backgroundColor: '#fff' },
  drawerHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  drawerLogo: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  drawerTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#475569', letterSpacing: 1.2, marginBottom: 8, textTransform: 'uppercase' },
  drawerList: { flex: 1, paddingHorizontal: 10, marginTop: 0 },
  drawerFooter: { padding: 12, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  logoutText: { color: '#64748B', fontWeight: '800', fontSize: 12 },
  headerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.lg,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  headerBtnText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  tabIconWrap: {
    width: 38, height: 28, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: Colors.primaryBg,
  },
});
