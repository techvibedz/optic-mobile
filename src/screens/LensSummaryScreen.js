import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, FlatList, ScrollView, StyleSheet, Alert, RefreshControl, Platform } from 'react-native';
import { Text, Card, ActivityIndicator, Button, Checkbox, useTheme, Surface, Divider, Portal, Modal, TextInput, IconButton, TouchableRipple } from 'react-native-paper';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../api/config';

// Optimized Order Item Component
  const OrderItem = memo(({ order, isSelected, onToggle, theme }) => {
    return (
      <Surface 
        style={[
          styles.card, 
          { 
              backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface,
              borderColor: isSelected ? theme.colors.primary : 'transparent',
              borderWidth: 2
          }
        ]}
        elevation={isSelected ? 4 : 1}
      >
          <TouchableRipple onPress={() => onToggle(order.id)} style={{ flex: 1 }} rippleColor={theme.colors.primary}>
              <View style={styles.cardRow}>
                  <View pointerEvents="none">
                      <Checkbox
                      status={isSelected ? 'checked' : 'unchecked'}
                      color={isSelected ? theme.colors.primary : theme.colors.onSurface}
                      />
                  </View>
                  <View style={styles.cardInfo}>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold', color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}>{order.orderNumber}</Text>
                  <Text variant="bodySmall" style={{ color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.secondary }}>
                      {order.customer?.firstName} {order.customer?.lastName}
                  </Text>
                  </View>
              </View>
          </TouchableRipple>
      </Surface>
    );
  });

// Transposition logic from web app
const transposePrescription = (sphere, cylinder) => {
  const s = parseFloat(sphere || 0);
  const c = parseFloat(cylinder || 0);
  
  if (s * c < 0) {
    return { sphere: s + c, cylinder: -c };
  }
  return { sphere: s, cylinder: c };
};

const LensSummaryScreen = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [summaryData, setSummaryData] = useState([]);
  const [step, setStep] = useState('selection'); // 'selection' | 'summary'
  const [refreshing, setRefreshing] = useState(false);
  
  // Manual Lens State
  const [manualLenses, setManualLenses] = useState([]);
  const [adjustments, setAdjustments] = useState({});
  const [showManualModal, setShowManualModal] = useState(false);
  const [newManualLens, setNewManualLens] = useState({
    type: '',
    sphere: '',
    cylinder: '',
    qty: '1'
  });

  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchOrders = async (pageNum = 1, shouldRefresh = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const response = await api.get(`/orders?status=IN_PROGRESS,PENDING&includeLensDetails=true&limit=20&page=${pageNum}`);
      const data = response.data;
      
      let fetchedOrders = [];
      if (Array.isArray(data)) {
        fetchedOrders = data;
      } else if (data.orders && Array.isArray(data.orders)) {
        fetchedOrders = data.orders;
      }
      
      if (shouldRefresh || pageNum === 1) {
        setOrders(fetchedOrders);
        if (step === 'selection') {
            setSelectedOrderIds(new Set());
        }
      } else {
        setOrders(prev => {
            const existingIds = new Set(prev.map(o => o.id));
            const newUnique = fetchedOrders.filter(o => !existingIds.has(o.id));
            return [...prev, ...newUnique];
        });
      }

      if (data.pagination) {
        setHasMore(data.pagination.page < data.pagination.pages);
      } else {
        setHasMore(fetchedOrders.length === 20);
      }

    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to fetch orders. Please check your connection.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchOrders(1, true);
  }, []);

  const loadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchOrders(nextPage);
    }
  };

  const toggleSelection = useCallback((id) => {
    setSelectedOrderIds(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return newSelection;
    });
  }, []);

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === orders.length) {
      setSelectedOrderIds(new Set());
    } else {
      const allIds = new Set(orders.map(o => o.id));
      setSelectedOrderIds(allIds);
    }
  };

  const generateSummaryData = useCallback(() => {
    const aggregated = {};
    const selectedOrdersList = orders.filter(o => selectedOrderIds.has(o.id));

    selectedOrdersList.forEach(order => {
      if (!order.prescription) return;
      const p = order.prescription;
      
      const lenses = [
        {
          sphere: p.vlRightEyeSphere,
          cylinder: p.vlRightEyeCylinder,
          lensType: order.vlRightEyeLensType?.name,
          qty: order.vlRightEyeLensQuantity || 1,
          eye: 'R'
        },
        {
          sphere: p.vlLeftEyeSphere,
          cylinder: p.vlLeftEyeCylinder,
          lensType: order.vlLeftEyeLensType?.name,
          qty: order.vlLeftEyeLensQuantity || 1,
          eye: 'L'
        },
        {
          sphere: p.vpRightEyeSphere,
          cylinder: p.vpRightEyeCylinder,
          lensType: order.vpRightEyeLensType?.name,
          qty: order.vpRightEyeLensQuantity || 1,
          eye: 'R'
        },
        {
          sphere: p.vpLeftEyeSphere,
          cylinder: p.vpLeftEyeCylinder,
          lensType: order.vpLeftEyeLensType?.name,
          qty: order.vpLeftEyeLensQuantity || 1,
          eye: 'L'
        }
      ];

      lenses.forEach(lens => {
        if (!lens.lensType) return;
        const { sphere, cylinder } = transposePrescription(lens.sphere, lens.cylinder);
        
        const formatNum = (n) => {
            const num = parseFloat(n);
            if (isNaN(num)) return "0.00";
            return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
        };

        const sphKey = formatNum(sphere);
        const cylKey = formatNum(cylinder);
        const key = `${sphKey}_${cylKey}_${lens.lensType}`;
        
        if (!aggregated[key]) {
          aggregated[key] = {
            id: key,
            sphere: sphKey,
            cylinder: cylKey,
            type: lens.lensType,
            count: 0,
            isManual: false
          };
        }
        aggregated[key].count += lens.qty;
      });
    });

    manualLenses.forEach(lens => {
        const isTypeOnly = !lens.sphere && !lens.cylinder;
        const { sphere, cylinder } = transposePrescription(lens.sphere, lens.cylinder);
        
        const formatNum = (n) => {
            const num = parseFloat(n);
            if (isNaN(num)) return "0.00";
            return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
        };

        const sphKey = formatNum(sphere);
        const cylKey = formatNum(cylinder);
        const key = isTypeOnly ? `typeonly_${lens.type}` : `${sphKey}_${cylKey}_${lens.type}`;
        
        if (!aggregated[key]) {
          aggregated[key] = {
            id: key,
            sphere: sphKey,
            cylinder: cylKey,
            type: lens.type,
            count: 0,
            isTypeOnly: isTypeOnly,
            isManual: true
          };
        }
        aggregated[key].isManual = true;
        aggregated[key].count += parseInt(lens.qty || 1);
    });

    Object.keys(adjustments).forEach(key => {
        if (aggregated[key]) {
            aggregated[key].count += adjustments[key];
            if (aggregated[key].count <= 0) {
                delete aggregated[key];
            }
        }
    });

    return Object.values(aggregated).sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return parseFloat(a.sphere) - parseFloat(b.sphere);
    });
  }, [orders, selectedOrderIds, manualLenses, adjustments]);

  const calculateSummary = () => {
    if (selectedOrderIds.size === 0 && manualLenses.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one order or add a manual lens to generate a summary.');
      return;
    }
    setAdjustments({});
    setStep('summary');
  };

  useEffect(() => {
    if (step === 'summary') {
        const data = generateSummaryData();
        setSummaryData(data);
    }
  }, [manualLenses, adjustments, step, generateSummaryData]);

  const updateQuantity = (id, delta) => {
    setAdjustments(prev => ({
        ...prev,
        [id]: (prev[id] || 0) + delta
    }));
  };

  const addManualLens = () => {
    if (!newManualLens.type) {
        Alert.alert('Error', 'Lens Type is required');
        return;
    }
    setManualLenses(prev => [...prev, { ...newManualLens, id: Date.now().toString() }]);
    setNewManualLens({ type: '', sphere: '', cylinder: '', qty: '1' });
    setShowManualModal(false);
  };

  const generatePdfUri = async () => {
    if (!summaryData) return null;

    const formattedLines = summaryData.map(item => {
        const typeHtml = `<span class="lens-type">${item.type}</span>`;
        if (item.isTypeOnly) {
            return `${item.count} ${typeHtml}`;
        }
        const sph = parseFloat(item.sphere);
        const cyl = parseFloat(item.cylinder);
        const sphDisplay = sph === 0 ? 'pl' : item.sphere;
        const cylDisplay = item.cylinder;

        if (cyl === 0) {
            return `${item.count}v ${sphDisplay} ${typeHtml}`;
        } else {
            return `${item.count}v (${cylDisplay}) ${sphDisplay} ${typeHtml}`;
        }
    });

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; font-size: 18px; font-weight: bold; }
            h1 { text-align: left; color: #000; margin-bottom: 10px; font-size: 32px; font-weight: bold; }
            .meta { text-align: left; margin-bottom: 30px; color: #000; font-size: 20px; }
            .content { font-size: 20px; line-height: 1.6; color: #000; }
            .line-item { margin-bottom: 8px; }
            .lens-type { color: #D32F2F; }
            .total { margin-top: 30px; text-align: left; font-weight: bold; font-size: 22px; }
          </style>
        </head>
        <body>
          <h1>Lens Summary Report</h1>
          <div class="meta">
            Generated on: ${new Date().toLocaleDateString()}
          </div>
          <div class="content">
            ${formattedLines.map(line => `
                <div class="line-item">${line}</div>
            `).join('')}
          </div>
          <div class="total">
            Total Lenses: ${summaryData.reduce((acc, item) => acc + item.count, 0)}
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      return uri;
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF');
      return null;
    }
  };

  const sharePdf = async () => {
      const uri = await generatePdfUri();
      if (uri) {
          await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
  };

  const sharePdfWhatsApp = async () => {
      const uri = await generatePdfUri();
      if (uri) {
          await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Share via WhatsApp' });
      }
  };

  const renderSelectionStep = () => (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline }]}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>Select Orders</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Select orders to include in the lens summary calculation.
        </Text>
      </View>

      <Surface style={[styles.actionHeader, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={styles.checkRow}>
          <Checkbox
            status={selectedOrderIds.size === orders.length && orders.length > 0 ? 'checked' : 'unchecked'}
            onPress={toggleSelectAll}
            color={theme.colors.primary}
          />
          <Text style={{ marginLeft: 8, color: theme.colors.onSurface }}>Select All ({orders.length})</Text>
        </View>
        <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>
          {selectedOrderIds.size} Selected
        </Text>
      </Surface>

      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => loadingMore ? <ActivityIndicator size="small" style={{ marginVertical: 20 }} /> : <View style={{ height: 20 }} />}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
                <Text style={{ color: theme.colors.secondary }}>No active orders found.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <OrderItem 
            order={item} 
            isSelected={selectedOrderIds.has(item.id)} 
            onToggle={toggleSelection}
            theme={theme}
          />
        )}
      />

      <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline }]}>
        <Button 
          mode="contained" 
          onPress={calculateSummary}
          disabled={selectedOrderIds.size === 0}
          style={styles.button}
          icon="calculator"
        >
          Calculate Summary ({selectedOrderIds.size})
        </Button>
      </View>
    </View>
  );

  const renderSummaryStep = () => (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline }]}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>Lens Summary</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Aggregated list of required lenses.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Lenses List</Text>
                <Button mode="outlined" onPress={() => setShowManualModal(true)} compact>
                    + Add Manual
                </Button>
            </View>
            <DataTableHeader theme={theme} />
            {summaryData && summaryData.map((item, index) => (
              <View key={item.id}>
                <View style={styles.tableRow}>
                  <View style={[styles.col, { flex: 2, flexDirection: 'row', alignItems: 'center' }]}>
                    <Text style={[styles.typeText, { color: theme.colors.onSurface }]}>{item.type}</Text>
                    {item.isManual && (
                      <Text style={[styles.manualBadge, { backgroundColor: theme.colors.primary, color: theme.colors.onPrimary }]}>
                        Manual
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.col, { color: theme.colors.onSurface }]}>{item.sphere}</Text>
                  <Text style={[styles.col, { color: theme.colors.onSurface }]}>{item.cylinder}</Text>
                  <View style={[styles.col, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
                    <IconButton 
                        icon="minus" 
                        size={16} 
                        onPress={() => updateQuantity(item.id, -1)}
                        style={{ margin: 0 }}
                    />
                    <Text style={{ fontWeight: 'bold', color: theme.colors.primary, marginHorizontal: 4 }}>
                        {item.count}
                    </Text>
                    <IconButton 
                        icon="plus" 
                        size={16} 
                        onPress={() => updateQuantity(item.id, 1)}
                        style={{ margin: 0 }}
                    />
                  </View>
                </View>
                {index < (summaryData ? summaryData.length : 0) - 1 && <Divider style={{ backgroundColor: theme.colors.outline }} />}
              </View>
            ))}
            <Divider style={{ marginVertical: 10, height: 2, backgroundColor: theme.colors.outline }} />
            <View style={styles.tableRow}>
                <Text style={[styles.col, { flex: 2, textAlign: 'right', paddingRight: 20, color: theme.colors.onSurface }]}>Total Lenses:</Text>
                <Text style={[styles.col, { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary }]}>
                    {summaryData ? summaryData.reduce((acc, i) => acc + i.count, 0) : 0}
                </Text>
            </View>
        </Surface>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline }]}>
        <Button 
          mode="outlined" 
          onPress={() => setStep('selection')}
          style={[styles.button, { marginRight: 8, flex: 1 }]}
          compact
        >
          Back
        </Button>
        <Button 
          mode="contained" 
          onPress={sharePdfWhatsApp}
          style={[styles.button, { marginRight: 8, flex: 1, backgroundColor: '#25D366' }]}
          icon="whatsapp"
          compact
        >
          WhatsApp
        </Button>
        <Button 
          mode="contained" 
          onPress={sharePdf}
          style={[styles.button, { flex: 1 }]}
          icon="file-pdf-box"
          compact
        >
          PDF
        </Button>
      </View>

      <Portal>
        <Modal visible={showManualModal} onDismiss={() => setShowManualModal(false)} contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
            <Text variant="headlineSmall" style={{marginBottom: 20, color: theme.colors.onSurface}}>Add Manual Lens</Text>
            <TextInput
                label="Lens Type"
                value={newManualLens.type}
                onChangeText={text => setNewManualLens(prev => ({ ...prev, type: text }))}
                style={[styles.input, { backgroundColor: theme.colors.surfaceVariant }]}
                textColor={theme.colors.onSurface}
            />
            <View style={styles.row}>
                <TextInput
                    label="Sphere (SPH)"
                    value={newManualLens.sphere}
                    onChangeText={text => setNewManualLens(prev => ({ ...prev, sphere: text }))}
                    style={[styles.input, { flex: 1, marginRight: 10, backgroundColor: theme.colors.surfaceVariant }]}
                    keyboardType="numeric"
                    textColor={theme.colors.onSurface}
                />
                <TextInput
                    label="Cylinder (CYL)"
                    value={newManualLens.cylinder}
                    onChangeText={text => setNewManualLens(prev => ({ ...prev, cylinder: text }))}
                    style={[styles.input, { flex: 1, backgroundColor: theme.colors.surfaceVariant }]}
                    keyboardType="numeric"
                    textColor={theme.colors.onSurface}
                />
            </View>
            <TextInput
                label="Quantity"
                value={newManualLens.qty}
                onChangeText={text => setNewManualLens(prev => ({ ...prev, qty: text }))}
                style={[styles.input, { backgroundColor: theme.colors.surfaceVariant }]}
                keyboardType="numeric"
                textColor={theme.colors.onSurface}
            />
            <Button mode="contained" onPress={addManualLens} style={{marginTop: 10}}>
                Add Lens
            </Button>
        </Modal>
      </Portal>
    </View>
  );

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.colors.background }]}>
      {loading && step === 'selection' && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 20, color: theme.colors.secondary }}>Loading Orders...</Text>
        </View>
      ) : (
        step === 'selection' ? renderSelectionStep() : renderSummaryStep()
      )}
    </View>
  );
};

const DataTableHeader = ({ theme }) => (
    <View style={[styles.tableHeader, { borderBottomColor: theme.colors.outline }]}>
        <Text style={[styles.col, { flex: 2, color: theme.colors.secondary }]}>Type</Text>
        <Text style={[styles.col, { color: theme.colors.secondary }]}>SPH</Text>
        <Text style={[styles.col, { color: theme.colors.secondary }]}>CYL</Text>
        <Text style={[styles.col, { color: theme.colors.secondary }]}>Qty</Text>
    </View>
);

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 4,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginBottom: 1,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 10,
    borderRadius: 24, // Ultimate rounded
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    borderTopWidth: 1,
    flexDirection: 'row',
    elevation: 8,
  },
  button: {
    borderRadius: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  summaryCard: {
    padding: 15,
    borderRadius: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'center',
  },
  col: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
  },
  typeText: {
    fontWeight: 'bold',
  },
  manualBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 10,
    overflow: 'hidden',
  },
  modalContainer: {
    padding: 20,
    margin: 20,
    borderRadius: 24,
  },
  input: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
  }
});

export default LensSummaryScreen;
