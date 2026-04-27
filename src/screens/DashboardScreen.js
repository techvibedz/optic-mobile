import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Text, Button, ActivityIndicator, useTheme, Avatar, Surface, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import api from '../api/config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeContext } from '../context/ThemeContext';

import { useAuth } from '../context/AuthContext';

export default function DashboardScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const navigation = useNavigation();
  const { toggleTheme, isDark } = useThemeContext();
  const { userInfo, refreshUser } = useAuth();

  const fetchStats = async () => {
    try {
      // Add extra logging
      console.log('Fetching dashboard stats...');
      const [todayRes, monthRes] = await Promise.all([
        api.get('/dashboard/stats?filter=today'),
        api.get('/dashboard/stats?filter=month')
      ]);

      console.log('Stats received:', { today: todayRes.data, month: monthRes.data });

      setStats({
        revenue: { 
          today: todayRes.data.totalRevenue,
          month: monthRes.data.totalRevenue,
          growth: monthRes.data.revenueGrowth 
        },
        orders: { 
          today: todayRes.data.ordersThisMonth, 
          month: monthRes.data.ordersThisMonth
        }
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Detailed error logging
      const errorMsg = error.response 
        ? `Status: ${error.response.status}\nData: ${JSON.stringify(error.response.data)}` 
        : error.message;
        
      Alert.alert('Error', `Failed to load dashboard data:\n${errorMsg}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Dashboard mounted. Auth info:', { 
        hasToken: !!userInfo, 
        name: userInfo?.name 
    });
    
    // Always try to refresh user data on mount to ensure we have latest from server
    // This fixes issues where switching servers leaves stale data
    if (refreshUser) {
        refreshUser();
    }
    
    fetchStats();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Refresh stats and user data
    const promises = [fetchStats()];
    if (refreshUser) promises.push(refreshUser());
    
    Promise.all(promises).then(() => setRefreshing(false));
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount || 0);
  };

  if (loading && !stats) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              Overview
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>
              Hello, {userInfo?.name || userInfo?.email || 'User'}
            </Text>
          </View>
          <IconButton 
            icon={isDark ? "weather-sunny" : "weather-night"} 
            mode="contained-tonal"
            onPress={toggleTheme}
            size={24}
          />
        </View>

        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <View style={styles.cardHeader}>
            <Avatar.Icon size={48} icon="cash" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.onPrimaryContainer} />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>Total Revenue (Today)</Text>
              <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                {stats ? formatCurrency(stats.revenue.today) : '...'}
              </Text>
            </View>
          </View>
          <View style={[styles.cardFooter, { borderTopColor: theme.colors.outline }]}>
             <View>
                <Text variant="labelSmall" style={{ color: theme.colors.secondary }}>Month</Text>
                <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                  {stats ? formatCurrency(stats.revenue.month) : '...'}
                </Text>
             </View>
             <View>
                <Text variant="labelSmall" style={{ color: stats?.revenue.growth >= 0 ? theme.colors.primary : theme.colors.error }}>
                    {stats?.revenue.growth > 0 ? '+' : ''}{stats?.revenue.growth}%
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.secondary }}>Growth</Text>
             </View>
          </View>
        </Surface>

        <View style={styles.row}>
            <Surface style={[styles.miniCard, { marginRight: 8, backgroundColor: theme.colors.surface }]} elevation={2}>
                <Avatar.Icon size={40} icon="shopping" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.onPrimaryContainer} />
                <Text variant="titleLarge" style={{ marginTop: 12, fontWeight: 'bold', color: theme.colors.onSurface }}>
                    {stats?.orders.today || 0}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>Orders (Today)</Text>
            </Surface>
            
            <Surface style={[styles.miniCard, { marginLeft: 8, backgroundColor: theme.colors.surface }]} elevation={2}>
                <Avatar.Icon size={40} icon="shopping-outline" style={{ backgroundColor: theme.colors.secondaryContainer }} color={theme.colors.onSecondaryContainer} />
                <Text variant="titleLarge" style={{ marginTop: 12, fontWeight: 'bold', color: theme.colors.onSurface }}>
                    {stats?.orders.month || 0}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>Orders (Month)</Text>
            </Surface>
        </View>

        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Quick Actions</Text>
        
        <Surface style={[styles.actionCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Button 
                mode="contained-tonal" 
                icon="clipboard-list" 
                onPress={() => navigation.navigate('Orders')}
                style={styles.actionButton}
                contentStyle={{ justifyContent: 'flex-start', height: 50 }}
                labelStyle={{ fontSize: 16 }}
            >
                View All Orders
            </Button>
            <View style={{ height: 12 }} />
            <Button 
                mode="contained-tonal" 
                icon="glasses" 
                onPress={() => navigation.navigate('LensSummary')}
                style={styles.actionButton}
                contentStyle={{ justifyContent: 'flex-start', height: 50 }}
                labelStyle={{ fontSize: 16 }}
            >
                Lens Summary
            </Button>
        </Surface>

        <View style={{ marginTop: 30, padding: 10, opacity: 0.5 }}>
            <Text variant="bodySmall" style={{ textAlign: 'center', color: theme.colors.secondary }}>
                Version: 1.0.4
            </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  card: {
    borderRadius: 24, // Ultimate style - more rounded
    padding: 24,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  miniCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    marginLeft: 4,
  },
  actionCard: {
    borderRadius: 24,
    padding: 16,
  },
  actionButton: {
    borderRadius: 12,
  }
});
