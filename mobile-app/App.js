import { StatusBar } from 'expo-status-bar';
import { useState, useMemo, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    ActivityIndicator,
    Modal,
    FlatList
} from 'react-native';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration (Syncs with Web System)
const DEFAULT_SUPABASE_URL = 'https://qxxtlytyjkwqyumlxvvv.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eHRseXR5amt3cXl1bWx4dnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMjkxOTQsImV4cCI6MjA4MzYwNTE5NH0.TzsKPG-HGHwHzlrGOsdQWC3lcksYAg85e8rcWVdujeM';

export default function App() {
    const [activeTab, setActiveTab] = useState('calc'); // 'calc', 'floor', 'certs', 'settings'

    // --- SUPABASE CLIENT ---
    const [supabaseUrl, setSupabaseUrl] = useState(DEFAULT_SUPABASE_URL);
    const [supabaseKey, setSupabaseKey] = useState(DEFAULT_SUPABASE_KEY);
    const [supabaseClient, setSupabaseClient] = useState(null);

    useEffect(() => {
        if (supabaseUrl && supabaseKey) {
            try {
                const client = createClient(supabaseUrl, supabaseKey);
                setSupabaseClient(client);
            } catch (e) {
                console.log('Supabase Init Error:', e);
            }
        }
    }, [supabaseUrl, supabaseKey]);

    // --- TAB 1: FIELD ROI CALCULATOR STATE ---
    const [purchasePrice, setPurchasePrice] = useState('150000'); // LKR
    const [initialWeight, setInitialWeight] = useState('12'); // raw weight
    const [weightUnit, setWeightUnit] = useState('g'); // 'g' or 'ct'
    const [cleanStonePct, setCleanStonePct] = useState('35');
    const [wastePct, setWastePct] = useState('60');
    const [processingBudget, setProcessingBudget] = useState('25000'); // LKR
    const [targetPricePerCarat, setTargetPricePerCarat] = useState('45000'); // LKR per carat

    // ROI Calculations
    const results = useMemo(() => {
        const price = parseFloat(purchasePrice) || 0;
        const weightRaw = parseFloat(initialWeight) || 0;
        const budget = parseFloat(processingBudget) || 0;
        const targetPerCt = parseFloat(targetPricePerCarat) || 0;
        const cleanPct = parseFloat(cleanStonePct) || 0;
        const wasteP = parseFloat(wastePct) || 0;

        // 1. Convert weight (1g = 5ct)
        const initialCt = weightUnit === 'g' ? weightRaw * 5 : weightRaw;

        // 2. Usable weight after cleaning/rough trimming
        const usableCt = initialCt * (cleanPct / 100);

        // 3. Finished polished weight after cutting & polishing loss
        const finishedCt = usableCt * (1 - (wasteP / 100));

        // 4. Financials in LKR
        const totalInvestment = price + budget;
        const projectedRevenue = finishedCt * targetPerCt;
        const profit = projectedRevenue - totalInvestment;
        const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0;

        // 5. Break-Even Price per Carat
        const breakEvenPerCt = finishedCt > 0 ? totalInvestment / finishedCt : 0;

        return {
            initialCt,
            finishedCt,
            totalInvestment,
            projectedRevenue,
            profit,
            roi,
            breakEvenPerCt
        };
    }, [purchasePrice, initialWeight, weightUnit, cleanStonePct, wastePct, processingBudget, targetPricePerCarat]);

    // Decision Logic
    let decision = 'PASS / LOSS';
    let decisionColor = '#ef4444'; // Red
    let decisionBg = 'rgba(239, 68, 68, 0.15)';
    if (results.profit > 0) {
        if (results.roi >= 20) {
            decision = 'HIGH BUY';
            decisionColor = '#10b981'; // Emerald Green
            decisionBg = 'rgba(16, 185, 129, 0.18)';
        } else if (results.roi >= 10) {
            decision = 'MODERATE BUY';
            decisionColor = '#3b82f6'; // Blue
            decisionBg = 'rgba(59, 130, 246, 0.18)';
        } else {
            decision = 'RISKY';
            decisionColor = '#f59e0b'; // Amber
            decisionBg = 'rgba(245, 158, 11, 0.18)';
        }
    }

    // --- TAB 2: PRODUCTION FLOOR & LOT TRACKER STATE ---
    const [lots, setLots] = useState([]);
    const [loadingLots, setLoadingLots] = useState(false);
    const [lotSearch, setLotSearch] = useState('');
    const [selectedLot, setSelectedLot] = useState(null);

    const fetchLots = async () => {
        if (!supabaseClient) return;
        setLoadingLots(true);
        try {
            const { data, error } = await supabaseClient
                .from('lots')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLots(data || []);
        } catch (e) {
            console.log('Fetch Lots Error:', e.message);
        } finally {
            setLoadingLots(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'floor') {
            fetchLots();
        }
    }, [activeTab, supabaseClient]);

    const filteredLots = useMemo(() => {
        return lots.filter(l => l.lot_code?.toLowerCase().includes(lotSearch.toLowerCase()));
    }, [lots, lotSearch]);

    // Formatters
    const formatLKR = (val) => {
        return `LKR ${(val || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    };

    const getStageBadgeColor = (stage) => {
        switch (stage?.toUpperCase()) {
            case 'PROCUREMENT': return '#6366f1';
            case 'PERFORMING': return '#8b5cf6';
            case 'GAS_BURN': return '#ec4899';
            case 'CUT_POLISH': return '#06b6d4';
            case 'ELECTRIC_BURN': return '#f97316';
            case 'CERTIFICATION': return '#f59e0b';
            case 'SELL_READY': return '#10b981';
            case 'SOLD': return '#64748b';
            default: return '#3b82f6';
        }
    };

    // --- RENDER SCREEN MODULES ---

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            {/* TOP BRAND HEADER */}
            <View style={styles.brandHeader}>
                <Text style={styles.brandTitle}>GEMSTONE LIFECYCLE</Text>
                <Text style={styles.brandSubtitle}>Mobile Field Console • LKR Primary</Text>
            </View>

            {/* MAIN CONTENT AREA */}
            <View style={styles.content}>
                {/* --- TAB 1: FIELD ROI CALCULATOR --- */}
                {activeTab === 'calc' && (
                    <ScrollView contentContainerStyle={styles.scroll}>
                        <Text style={styles.screenTitle}>Market Buying Decision Calculator</Text>

                        {/* DECISION SUMMARY BANNER */}
                        <View style={[styles.decisionCard, { backgroundColor: decisionBg, borderColor: decisionColor }]}>
                            <Text style={styles.decisionSub}>RECOMMENDED ACTION</Text>
                            <Text style={[styles.decisionText, { color: decisionColor }]}>{decision}</Text>
                            <Text style={styles.decisionRoi}>
                                Expected ROI: <Text style={{ color: decisionColor, fontWeight: 'bold' }}>{results.roi.toFixed(1)}%</Text>
                            </Text>

                            <View style={styles.bannerGrid}>
                                <View style={styles.bannerItem}>
                                    <Text style={styles.bannerLabel}>EST. PROFIT</Text>
                                    <Text style={[styles.bannerValue, { color: results.profit >= 0 ? '#10b981' : '#ef4444' }]}>
                                        {formatLKR(results.profit)}
                                    </Text>
                                </View>
                                <View style={styles.bannerItem}>
                                    <Text style={styles.bannerLabel}>BREAK-EVEN / CT</Text>
                                    <Text style={styles.bannerValue}>{formatLKR(results.breakEvenPerCt)}</Text>
                                </View>
                            </View>
                        </View>

                        {/* INPUT SECTION */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>1. Rough Stone & Purchase Price</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Purchase Price (LKR)</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    placeholder="e.g. 150000"
                                    placeholderTextColor="#64748b"
                                    value={purchasePrice}
                                    onChangeText={setPurchasePrice}
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
                                    <Text style={styles.label}>Initial Weight</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        placeholder="0.00"
                                        placeholderTextColor="#64748b"
                                        value={initialWeight}
                                        onChangeText={setInitialWeight}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Unit</Text>
                                    <View style={styles.toggleRow}>
                                        <TouchableOpacity
                                            style={[styles.toggleBtn, weightUnit === 'g' && styles.toggleBtnActive]}
                                            onClick={() => setWeightUnit('g')}
                                            onPress={() => setWeightUnit('g')}
                                        >
                                            <Text style={weightUnit === 'g' ? styles.toggleTextActive : styles.toggleText}>Grams</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.toggleBtn, weightUnit === 'ct' && styles.toggleBtnActive]}
                                            onClick={() => setWeightUnit('ct')}
                                            onPress={() => setWeightUnit('ct')}
                                        >
                                            <Text style={weightUnit === 'ct' ? styles.toggleTextActive : styles.toggleText}>Ct</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            <Text style={styles.infoNote}>
                                Converted Weight: <Text style={{ color: '#e2e8f0', fontWeight: 'bold' }}>{results.initialCt.toFixed(2)} ct</Text>
                            </Text>
                        </View>

                        {/* ESTIMATION PARAMETERS */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>2. Processing & Yield Parameters</Text>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.label}>Clean Stone %</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={cleanStonePct}
                                        onChangeText={setCleanStonePct}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Cutting Loss %</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={wastePct}
                                        onChangeText={setWastePct}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Cutting & Heating Budget (LKR)</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={processingBudget}
                                    onChangeText={setProcessingBudget}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Target Sale Price per Carat (LKR)</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={targetPricePerCarat}
                                    onChangeText={setTargetPricePerCarat}
                                />
                            </View>
                        </View>

                        {/* DETAILED RESULTS SUMMARY */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>3. Financial Projection Breakdown</Text>

                            <View style={styles.resultRow}>
                                <Text style={styles.resLabel}>Est. Finished Carats:</Text>
                                <Text style={styles.resVal}>{results.finishedCt.toFixed(2)} ct</Text>
                            </View>
                            <View style={styles.resultRow}>
                                <Text style={styles.resLabel}>Total Investment (Price + Cost):</Text>
                                <Text style={styles.resVal}>{formatLKR(results.totalInvestment)}</Text>
                            </View>
                            <View style={styles.resultRow}>
                                <Text style={styles.resLabel}>Projected Revenue:</Text>
                                <Text style={styles.resVal}>{formatLKR(results.projectedRevenue)}</Text>
                            </View>
                        </View>
                    </ScrollView>
                )}

                {/* --- TAB 2: PRODUCTION FLOOR LOT TRACKER --- */}
                {activeTab === 'floor' && (
                    <View style={styles.floorContainer}>
                        <View style={styles.floorSearchRow}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                                placeholder="Search Lots by Code..."
                                placeholderTextColor="#64748b"
                                value={lotSearch}
                                onChangeText={setLotSearch}
                            />
                            <TouchableOpacity style={styles.refreshBtn} onPress={fetchLots}>
                                <Text style={styles.refreshBtnText}>Refresh</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingLots ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#3b82f6" />
                                <Text style={{ color: '#94a3b8', marginTop: 8 }}>Fetching Cloud Lots...</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredLots}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.lotCard} onPress={() => setSelectedLot(item)}>
                                        <View style={styles.lotHeader}>
                                            <Text style={styles.lotCode}>{item.lot_code}</Text>
                                            <View style={[styles.stageBadge, { backgroundColor: getStageBadgeColor(item.current_stage) }]}>
                                                <Text style={styles.stageText}>{item.current_stage || 'PROCUREMENT'}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.lotDetailsGrid}>
                                            <View>
                                                <Text style={styles.lotDetailLabel}>INITIAL WEIGHT</Text>
                                                <Text style={styles.lotDetailVal}>{item.initial_weight || 0} ct</Text>
                                            </View>
                                            <View>
                                                <Text style={styles.lotDetailLabel}>CURRENT WEIGHT</Text>
                                                <Text style={styles.lotDetailVal}>{item.current_weight || item.initial_weight || 0} ct</Text>
                                            </View>
                                            <View>
                                                <Text style={styles.lotDetailLabel}>PURCHASE PRICE</Text>
                                                <Text style={styles.lotDetailVal}>{formatLKR(item.purchase_price)}</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={() => (
                                    <View style={styles.emptyContainer}>
                                        <Text style={{ color: '#64748b' }}>No lots found in Supabase database.</Text>
                                    </View>
                                )}
                            />
                        )}
                    </View>
                )}

                {/* --- TAB 3: LAB CERTIFICATE VIEWER --- */}
                {activeTab === 'certs' && (
                    <ScrollView contentContainerStyle={styles.scroll}>
                        <Text style={styles.screenTitle}>Gemological Lab Certificates</Text>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Supported Gemological Labs</Text>
                            <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
                                The system records & verifies laboratory reports from top international and Sri Lankan labs:
                            </Text>

                            <View style={styles.labBadgeRow}>
                                {['GIA', 'GRS', 'IGI', 'Lotus Gemology', 'SSEF', 'CGL Ceylon', 'AIGS', 'GIC'].map(lab => (
                                    <View key={lab} style={styles.labBadge}>
                                        <Text style={styles.labBadgeText}>{lab}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Sample Verified Report</Text>
                            <View style={styles.sampleCert}>
                                <Text style={styles.certLabTitle}>GRS Swisslab Certificate</Text>
                                <Text style={styles.certRepNum}>Report # GRS-2024-884912</Text>

                                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 8 }} />

                                <View style={styles.resultRow}>
                                    <Text style={styles.resLabel}>Verified Weight:</Text>
                                    <Text style={styles.resVal}>4.25 ct</Text>
                                </View>
                                <View style={styles.resultRow}>
                                    <Text style={styles.resLabel}>Color Grade:</Text>
                                    <Text style={{ color: '#60a5fa', fontWeight: 'bold' }}>Royal Blue</Text>
                                </View>
                                <View style={styles.resultRow}>
                                    <Text style={styles.resLabel}>Clarity Grade:</Text>
                                    <Text style={styles.resVal}>VVS1 (Eye Clean)</Text>
                                </View>
                                <View style={styles.resultRow}>
                                    <Text style={styles.resLabel}>Treatment Comment:</Text>
                                    <Text style={{ color: '#10b981', fontWeight: 'bold' }}>No Indications of Heating (Natural)</Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                )}

                {/* --- TAB 4: SETTINGS --- */}
                {activeTab === 'settings' && (
                    <ScrollView contentContainerStyle={styles.scroll}>
                        <Text style={styles.screenTitle}>Cloud Connection & Settings</Text>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Supabase Cloud API</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Supabase URL</Text>
                                <TextInput
                                    style={[styles.input, { fontSize: 11 }]}
                                    value={supabaseUrl}
                                    onChangeText={setSupabaseUrl}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Anon Key</Text>
                                <TextInput
                                    style={[styles.input, { fontSize: 10 }]}
                                    value={supabaseKey}
                                    secureTextEntry
                                    onChangeText={setSupabaseKey}
                                />
                            </View>

                            <View style={styles.statusRow}>
                                <Text style={styles.statusLabel}>Connection Status:</Text>
                                <Text style={[styles.statusVal, { color: supabaseClient ? '#10b981' : '#ef4444' }]}>
                                    {supabaseClient ? '● CONNECTED' : '○ DISCONNECTED'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Application Specs</Text>
                            <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Framework: React Native Expo 50</Text>
                            <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Accounting Currency: LKR (Sri Lankan Rupee)</Text>
                            <Text style={{ color: '#94a3b8', fontSize: 12 }}>Platform Target: iOS & Android</Text>
                        </View>
                    </ScrollView>
                )}
            </View>

            {/* BOTTOM NAVIGATION TAB BAR */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'calc' && styles.tabItemActive]}
                    onPress={() => setActiveTab('calc')}
                >
                    <Text style={activeTab === 'calc' ? styles.tabTextActive : styles.tabText}>🧮 ROI Calc</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'floor' && styles.tabItemActive]}
                    onPress={() => setActiveTab('floor')}
                >
                    <Text style={activeTab === 'floor' ? styles.tabTextActive : styles.tabText}>💎 Lots</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'certs' && styles.tabItemActive]}
                    onPress={() => setActiveTab('certs')}
                >
                    <Text style={activeTab === 'certs' ? styles.tabTextActive : styles.tabText}>📜 Certs</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'settings' && styles.tabItemActive]}
                    onPress={() => setActiveTab('settings')}
                >
                    <Text style={activeTab === 'settings' ? styles.tabTextActive : styles.tabText}>⚙️ Settings</Text>
                </TouchableOpacity>
            </View>

            {/* LOT DETAIL MODAL */}
            {selectedLot && (
                <Modal visible transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Lot #{selectedLot.lot_code}</Text>

                            <View style={[styles.stageBadge, { backgroundColor: getStageBadgeColor(selectedLot.current_stage), alignSelf: 'flex-start', marginBottom: 16 }]}>
                                <Text style={styles.stageText}>{selectedLot.current_stage || 'PROCUREMENT'}</Text>
                            </View>

                            <View style={styles.resultRow}>
                                <Text style={styles.resLabel}>Initial Rough Weight:</Text>
                                <Text style={styles.resVal}>{selectedLot.initial_weight || 0} ct</Text>
                            </View>
                            <View style={styles.resultRow}>
                                <Text style={styles.resLabel}>Current Weight:</Text>
                                <Text style={styles.resVal}>{selectedLot.current_weight || 0} ct</Text>
                            </View>
                            <View style={styles.resultRow}>
                                <Text style={styles.resLabel}>Purchase Price:</Text>
                                <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{formatLKR(selectedLot.purchase_price)}</Text>
                            </View>
                            <View style={styles.resultRow}>
                                <Text style={styles.resLabel}>Supplier / Origin:</Text>
                                <Text style={styles.resVal}>{selectedLot.supplier || 'Unspecified'}</Text>
                            </View>

                            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedLot(null)}>
                                <Text style={styles.closeModalText}>Close Details</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0b0f19',
        paddingTop: Platform.OS === 'android' ? 35 : 0,
    },
    brandHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        backgroundColor: '#0f172a',
    },
    brandTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#f8fafc',
        letterSpacing: 1.5,
    },
    brandSubtitle: {
        fontSize: 10,
        color: '#3b82f6',
        fontWeight: '600',
        marginTop: 2,
    },
    content: {
        flex: 1,
    },
    scroll: {
        padding: 16,
        paddingBottom: 32,
    },
    screenTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 16,
    },
    decisionCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1.5,
        marginBottom: 16,
    },
    decisionSub: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#94a3b8',
        letterSpacing: 1,
    },
    decisionText: {
        fontSize: 28,
        fontWeight: '900',
        marginVertical: 4,
    },
    decisionRoi: {
        fontSize: 13,
        color: '#cbd5e1',
        marginBottom: 12,
    },
    bannerGrid: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 10,
    },
    bannerItem: {
        flex: 1,
    },
    bannerLabel: {
        fontSize: 9,
        color: '#94a3b8',
        fontWeight: 'bold',
    },
    bannerValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginTop: 2,
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#38bdf8',
        marginBottom: 14,
    },
    inputGroup: {
        marginBottom: 12,
    },
    label: {
        fontSize: 11,
        color: '#94a3b8',
        marginBottom: 6,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#f8fafc',
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    row: {
        flexDirection: 'row',
    },
    toggleRow: {
        flexDirection: 'row',
        backgroundColor: '#0f172a',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        overflow: 'hidden',
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
    },
    toggleBtnActive: {
        backgroundColor: '#3b82f6',
    },
    toggleText: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: 'bold',
    },
    toggleTextActive: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    infoNote: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 4,
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    resLabel: {
        fontSize: 12,
        color: '#94a3b8',
    },
    resVal: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#f8fafc',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#0f172a',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        paddingVertical: 8,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    tabItemActive: {
        borderTopWidth: 2,
        borderTopColor: '#3b82f6',
    },
    tabText: {
        fontSize: 12,
        color: '#64748b',
    },
    tabTextActive: {
        fontSize: 12,
        color: '#38bdf8',
        fontWeight: 'bold',
    },
    floorContainer: {
        flex: 1,
        padding: 16,
    },
    floorSearchRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    refreshBtn: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    refreshBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lotCard: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    lotHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    lotCode: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    stageBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    stageText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    lotDetailsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
        paddingTop: 8,
    },
    lotDetailLabel: {
        fontSize: 8,
        color: '#94a3b8',
        fontWeight: 'bold',
    },
    lotDetailVal: {
        fontSize: 12,
        color: '#e2e8f0',
        fontWeight: 'bold',
        marginTop: 2,
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },
    labBadgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    labBadge: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    labBadgeText: {
        color: '#f59e0b',
        fontSize: 11,
        fontWeight: 'bold',
    },
    sampleCert: {
        backgroundColor: '#0f172a',
        borderRadius: 10,
        padding: 14,
        borderWidth: 1,
        borderColor: '#f59e0b',
    },
    certLabTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#f59e0b',
    },
    certRepNum: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 2,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    statusLabel: {
        fontSize: 12,
        color: '#94a3b8',
    },
    statusVal: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 8,
    },
    closeModalBtn: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    closeModalText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
