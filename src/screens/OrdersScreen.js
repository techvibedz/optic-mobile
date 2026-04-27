import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Card, Text, Chip, Searchbar, ActivityIndicator, useTheme, Surface } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import api from '../api/config';

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const pageSize = 20;
  const isFirstLoad = useRef(true);
  const theme = useTheme();
  const navigation = useNavigation();

  const fetchOrders = async (pageNum = 1, shouldRefresh = false, search = searchQuery) => {
    try {
      if (pageNum === 1) setLoading(shouldRefresh || orders.length === 0);
      else setLoadingMore(true);

      const response = await api.get(`/orders?limit=${pageSize}&page=${pageNum}&search=${search}`);
      const data = response.data;
      
      let fetchedOrders = [];
      if (Array.isArray(data)) {
        fetchedOrders = data;
      } else if (data.orders && Array.isArray(data.orders)) {
        fetchedOrders = data.orders;
      }
      
      if (shouldRefresh || pageNum === 1) {
        setOrders(fetchedOrders);
      } else {
        setOrders(prev => [...prev, ...fetchedOrders]);
      }

      // Update pagination state
      if (data.pagination) {
        setHasMore(data.pagination.page < data.pagination.pages);
      } else {
        setHasMore(fetchedOrders.length === pageSize);
      }

      setLoading(false);
      setLoadingMore(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      const errorMsg = error.response 
        ? `Status: ${error.response.status}\nData: ${JSON.stringify(error.response.data)}` 
        : error.message;
      Alert.alert('Error', `Failed to load orders:\n${errorMsg}`);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchOrders(1, true, '');
  }, []);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setPage(1);
      fetchOrders(1, true, searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchOrders(1, true).then(() => setRefreshing(false));
  }, []);

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchOrders(nextPage);
    }
  };

  const onChangeSearch = query => setSearchQuery(query);

  // Removed client-side filtering since we now search on server
  // const filteredOrders = ...

  const getPaymentStatus = (order) => {
    if (!order.totalPrice) return 'UNKNOWN';
    if (order.balanceDue <= 0) return 'PAID';
    if (order.balanceDue >= order.totalPrice) return 'UNPAID';
    return 'PARTIAL';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID': return '#10b981'; // green
      case 'UNPAID': return '#ef4444'; // red
      case 'PARTIAL': return '#f59e0b'; // amber
      default: return '#64748b';
    }
  };

  const renderItem = ({ item }) => {
    const paymentStatus = getPaymentStatus(item);
    return (
    <TouchableOpacity onPress={() => navigation.navigate('OrderDetails', { orderId: item.id, order: item })}>
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={styles.cardHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>{item.orderNumber}</Text>
                <View style={{ marginTop: 2 }}>
                    <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
                        Created: {format(new Date(item.createdAt), 'MMM dd, yyyy')}
                    </Text>
                    {item.expectedCompletionDate && (
                        <Text variant="bodySmall" style={{ color: theme.colors.secondary, marginTop: 1 }}>
                            Ready: {format(new Date(item.expectedCompletionDate), 'MMM dd, yyyy')}
                        </Text>
                    )}
                </View>
            </View>
            <View style={{
                borderWidth: 1,
                borderColor: getStatusColor(paymentStatus),
                borderRadius: 50,
                paddingHorizontal: 10,
                paddingVertical: 4,
                justifyContent: 'center',
                alignItems: 'center',
                height: 26
            }}>
                <Text style={{ 
                    color: getStatusColor(paymentStatus), 
                    fontSize: 11, 
                    fontWeight: 'bold',
                    textTransform: 'uppercase' 
                }}>
                    {paymentStatus}
                </Text>
            </View>
        </View>
        
        <Text variant="bodyLarge" style={{ marginTop: 8, marginBottom: 4, color: theme.colors.onSurface }}>
          {item.customer.firstName} {item.customer.lastName}
        </Text>
        
        <View style={[styles.cardFooter, { borderTopColor: theme.colors.outline }]}>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
            {item.totalPrice?.toLocaleString()} DA
          </Text>
          {item.balanceDue > 0 && (
             <Text variant="labelSmall" style={{ color: theme.colors.error }}>
               Due: {item.balanceDue?.toLocaleString()} DA
             </Text>
          )}
        </View>
      </Surface>
    </TouchableOpacity>
  )};

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 20 }} />;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline }]}>
        <Searchbar
          placeholder="Search orders..."
          onChangeText={onChangeSearch}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: theme.colors.elevation.level2 }]}
          elevation={0}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text variant="bodyLarge" style={{ color: theme.colors.secondary }}>No orders found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchBar: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
  },
  listContent: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardFooter: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  }
});
