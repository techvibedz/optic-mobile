import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Card, Divider, useTheme, Button, Chip, Surface } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import { format } from 'date-fns';
import api from '../api/config';

export default function OrderDetailsScreen() {
  const route = useRoute();
  const { order: initialOrder, orderId } = route.params;
  const [order, setOrder] = useState(initialOrder);
  const missingQuantities = initialOrder?.vlRightEyeLensQuantity === undefined;
  const [loading, setLoading] = useState(!initialOrder?.prescription || missingQuantities);
  const theme = useTheme();

  const fmt = (val, isAxis = false) => {
    if (val === undefined || val === null) return '-';
    const num = Number(val);
    if (isNaN(num)) return val;
    
    if (isAxis) {
        return Math.round(num).toString();
    }
    return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
  };

  useEffect(() => {
    if (orderId && (!order?.prescription || order?.vlRightEyeLensQuantity === undefined)) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      if (response.data && response.data.order) {
        setOrder(response.data.order);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const p = order?.prescription || {};

  const getLensText = (lensType, quantity) => {
      if (!lensType) return '-';
      const name = lensType.name;
      const qty = Number(quantity); 
      if (!isNaN(qty) && qty > 1) {
          return `${qty}x ${name}`;
      }
      return name;
  };

  const gridHeaderStyle = [styles.gridHeader, { color: theme.colors.secondary }];
  const gridCellStyle = [styles.gridCell, { color: theme.colors.onSurface }];
  const gridRowStyle = [styles.gridRow, { borderBottomColor: theme.colors.outline }];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View>
              <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>{order.orderNumber}</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>
                Created: {format(new Date(order.createdAt), 'MMM dd, yyyy')}
              </Text>
              {order.expectedCompletionDate && (
                <Text variant="bodyMedium" style={{ color: theme.colors.primary, marginTop: 2, fontWeight: '500' }}>
                  Ready: {format(new Date(order.expectedCompletionDate), 'MMM dd, yyyy')}
                </Text>
              )}
            </View>
            <Chip mode="outlined" style={{ borderColor: theme.colors.primary }} textStyle={{ color: theme.colors.primary }}>{order.status}</Chip>
          </View>
          
          <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
          
          <Text variant="titleMedium" style={[styles.sectionHeader, { color: theme.colors.onSurfaceVariant }]}>Customer</Text>
          <Text variant="bodyLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>{order.customer.firstName} {order.customer.lastName}</Text>
          {order.customer.phone ? (
            <Text variant="bodyMedium" style={{color: theme.colors.secondary, marginTop: 2}}>Phone: {order.customer.phone}</Text>
          ) : (
            <Text variant="bodyMedium" style={{color: theme.colors.outline, marginTop: 2, fontStyle: 'italic'}}>No phone number</Text>
          )}
          
          <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
          
          <Text variant="titleMedium" style={[styles.sectionHeader, { color: theme.colors.onSurfaceVariant }]}>Prescription</Text>
          
          <View style={[styles.prescriptionGrid, { borderColor: theme.colors.outline }]}>
            <View style={[styles.gridRow, { backgroundColor: theme.colors.surfaceVariant, borderBottomColor: theme.colors.outline }]}>
              <Text style={[gridHeaderStyle, { flex: 0.8 }]}>Type</Text>
              <Text style={[gridHeaderStyle, { flex: 1 }]}>SPH</Text>
              <Text style={[gridHeaderStyle, { flex: 1 }]}>CYL</Text>
              <Text style={[gridHeaderStyle, { flex: 1 }]}>AXIS</Text>
              <Text style={[gridHeaderStyle, { flex: 1 }]}>ADD</Text>
            </View>
            
            <View style={gridRowStyle}>
              <Text style={[gridCellStyle, { flex: 0.8, fontWeight: 'bold' }]}>VL OD</Text>
              <Text style={[gridCellStyle, { flex: 1 }]}>{fmt(p.vlRightEyeSphere)}</Text>
              <Text style={[gridCellStyle, { flex: 1 }]}>{fmt(p.vlRightEyeCylinder)}</Text>
              <Text style={[gridCellStyle, { flex: 1 }]}>{fmt(p.vlRightEyeAxis, true)}</Text>
              <Text style={[gridCellStyle, { flex: 1 }]}>{fmt(p.vlRightEyeAdd)}</Text>
            </View>
            <View style={gridRowStyle}>
              <Text style={[gridCellStyle, { flex: 0.8, fontWeight: 'bold' }]}>VL OG</Text>
              <Text style={[gridCellStyle, { flex: 1 }]}>{fmt(p.vlLeftEyeSphere)}</Text>
              <Text style={[gridCellStyle, { flex: 1 }]}>{fmt(p.vlLeftEyeCylinder)}</Text>
              <Text style={[gridCellStyle, { flex: 1 }]}>{fmt(p.vlLeftEyeAxis, true)}</Text>
              <Text style={[gridCellStyle, { flex: 1 }]}>{fmt(p.vlLeftEyeAdd)}</Text>
            </View>

            {(p.vpRightEyeSphere || p.vpLeftEyeSphere || p.vpRightEyeAdd || p.vpLeftEyeAdd) && (
                <>
                    <View style={gridRowStyle}>
                    <Text style={[gridCellStyle, { flex: 0.8, fontWeight: 'bold' }]}>VP OD</Text>
                    <Text style={[gridCellStyle, { flex: 1 }]}>{fmt(p.vpRightEyeSphere)}</Text>
                    <Text style={[gridCellStyle, { flex: 1 }]}>{fmt(p.vpRightEyeCylinder)}</Text>
                    <Text style={[gridCellStyle, { flex: 1 }]}>{fmt(p.vpRightEyeAxis, true)}</Text>
                    <Text style={[gridCellStyle, { flex: 1 }]}>{fmt(p.vpRightEyeAdd)}</Text>
                    </View>
                    <View style={gridRowStyle}>
                    <Text style={[gridCellStyle, { flex: 0.8, fontWeight: 'bold' }]}>VP OG</Text>
                    <Text style={[gridCellStyle, { flex: 1 }]}>{fmt(p.vpLeftEyeSphere)}</Text>
                    <Text style={[gridCellStyle, { flex: 1 }]}>{fmt(p.vpLeftEyeCylinder)}</Text>
                    <Text style={[gridCellStyle, { flex: 1 }]}>{fmt(p.vpLeftEyeAxis, true)}</Text>
                    <Text style={[gridCellStyle, { flex: 1 }]}>{fmt(p.vpLeftEyeAdd)}</Text>
                    </View>
                </>
            )}
          </View>

          <View style={{ marginTop: 16 }}>
            <Text variant="titleMedium" style={[styles.sectionHeader, { marginBottom: 8, color: theme.colors.onSurfaceVariant }]}>Lens Types</Text>
            
            <View style={styles.lensContainer}>
                <View style={[styles.lensSection, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text style={[styles.lensSectionTitle, { color: theme.colors.secondary }]}>Distance (VL)</Text>
                    <View style={styles.lensRow}>
                        <Text style={[styles.lensLabel, { color: theme.colors.secondary }]}>Right (OD):</Text>
                        <Text style={[styles.lensValue, { color: theme.colors.onSurface }]}>
                            {getLensText(order.vlRightEyeLensType || order.lensType, order.vlRightEyeLensQuantity)}
                        </Text>
                    </View>
                    <View style={styles.lensRow}>
                        <Text style={[styles.lensLabel, { color: theme.colors.secondary }]}>Left (OG):</Text>
                        <Text style={[styles.lensValue, { color: theme.colors.onSurface }]}>
                            {getLensText(order.vlLeftEyeLensType || order.lensType, order.vlLeftEyeLensQuantity)}
                        </Text>
                    </View>
                </View>

                {(order.vpRightEyeLensType || order.vpLeftEyeLensType) && (
                    <View style={[styles.lensSection, { marginTop: 8, backgroundColor: theme.colors.surfaceVariant }]}>
                        <Text style={[styles.lensSectionTitle, { color: theme.colors.secondary }]}>Near (VP)</Text>
                        <View style={styles.lensRow}>
                            <Text style={[styles.lensLabel, { color: theme.colors.secondary }]}>Right (OD):</Text>
                            <Text style={[styles.lensValue, { color: theme.colors.onSurface }]}>
                                {getLensText(order.vpRightEyeLensType, order.vpRightEyeLensQuantity)}
                            </Text>
                        </View>
                        <View style={styles.lensRow}>
                            <Text style={[styles.lensLabel, { color: theme.colors.secondary }]}>Left (OG):</Text>
                            <Text style={[styles.lensValue, { color: theme.colors.onSurface }]}>
                                {getLensText(order.vpLeftEyeLensType, order.vpLeftEyeLensQuantity)}
                            </Text>
                        </View>
                    </View>
                )}
            </View>
          </View>

          <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

          <Text variant="titleMedium" style={[styles.sectionHeader, { color: theme.colors.onSurfaceVariant }]}>Financials</Text>
          <View style={styles.row}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>Total Amount</Text>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>{order.totalPrice?.toLocaleString()} DA</Text>
          </View>
          <View style={styles.row}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>Deposit</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{order.depositAmount?.toLocaleString()} DA</Text>
          </View>
          <View style={[styles.row, { marginTop: 8 }]}>
            <Text variant="bodyLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>Balance Due</Text>
            <Text variant="titleMedium" style={{ color: order.balanceDue > 0 ? theme.colors.error : theme.colors.primary, fontWeight: 'bold' }}>
              {order.balanceDue?.toLocaleString()} DA
            </Text>
          </View>

        </Card.Content>
      </Surface>

      <Button mode="contained" style={styles.button} icon="printer" disabled>
        Print Receipt (Coming Soon)
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 24, // Ultimate rounded
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 16,
    height: 1,
  },
  sectionHeader: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  prescriptionGrid: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  gridHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gridCell: {
    fontSize: 14,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lensContainer: {
      gap: 8,
  },
  lensSection: {
      padding: 12,
      borderRadius: 12,
  },
  lensSectionTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      marginBottom: 4,
      textTransform: 'uppercase',
  },
  lensRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
  },
  lensLabel: {
      fontSize: 14,
  },
  lensValue: {
      fontSize: 14,
      fontWeight: '500',
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
  }
});
