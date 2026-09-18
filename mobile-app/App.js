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
    FlatList,
    Image,
    Linking
} from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase Configuration (Syncs with Web System)
const DEFAULT_SUPABASE_URL = 'https://qxxtlytyjkwqyumlxvvv.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4eHRseXR5amt3cXl1bWx4dnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMjkxOTQsImV4cCI6MjA4MzYwNTE5NH0.TzsKPG-HGHwHzlrGOsdQWC3lcksYAg85e8rcWVdujeM';

const STORAGE_KEYS = {
    SUPABASE_URL: '@gem_supabase_url',
    SUPABASE_KEY: '@gem_supabase_key',
    CALC_DEFAULTS: '@gem_calc_defaults',
};

const DEFAULT_CALC_PRESETS = {
    cleanStonePct: '35',
    wastePct: '60',
    processingBudget: '25000',
    targetPricePerCarat: '45000',
    weightUnit: 'g',
};

export default function App() {
    const [activeTab, setActiveTab] = useState('calc'); // 'calc', 'floor', 'certs', 'settings'

    // --- SUPABASE CLIENT & SETTINGS STATE ---
    const [supabaseUrl, setSupabaseUrl] = useState(DEFAULT_SUPABASE_URL);
    const [supabaseKey, setSupabaseKey] = useState(DEFAULT_SUPABASE_KEY);
    const [supabaseClient, setSupabaseClient] = useState(null);
    const [showKey, setShowKey] = useState(false);
    const [hasCustomCredentials, setHasCustomCredentials] = useState(false);
    const [settingsBanner, setSettingsBanner] = useState(null);
    const [testingConnection, setTestingConnection] = useState(false);
    const [connectionHealth, setConnectionHealth] = useState(null);

    // --- TAB 1: FIELD ROI CALCULATOR STATE ---
    const [purchasePrice, setPurchasePrice] = useState('150000'); // LKR
    const [initialWeight, setInitialWeight] = useState('12'); // raw weight
    const [weightUnit, setWeightUnit] = useState(DEFAULT_CALC_PRESETS.weightUnit); // 'g' or 'ct'
    const [cleanStonePct, setCleanStonePct] = useState(DEFAULT_CALC_PRESETS.cleanStonePct);
    const [wastePct, setWastePct] = useState(DEFAULT_CALC_PRESETS.wastePct);
    const [processingBudget, setProcessingBudget] = useState(DEFAULT_CALC_PRESETS.processingBudget); // LKR
    const [targetPricePerCarat, setTargetPricePerCarat] = useState(DEFAULT_CALC_PRESETS.targetPricePerCarat); // LKR per carat
    const [calcBanner, setCalcBanner] = useState(null);

    // Load persisted settings on mount
    useEffect(() => {
        const loadPersistedSettings = async () => {
            try {
                const savedUrl = await AsyncStorage.getItem(STORAGE_KEYS.SUPABASE_URL);
                const savedKey = await AsyncStorage.getItem(STORAGE_KEYS.SUPABASE_KEY);
                const savedCalc = await AsyncStorage.getItem(STORAGE_KEYS.CALC_DEFAULTS);

                if (savedUrl) {
                    setSupabaseUrl(savedUrl);
                    setHasCustomCredentials(true);
                }
                if (savedKey) {
                    setSupabaseKey(savedKey);
                    setHasCustomCredentials(true);
                }

                if (savedCalc) {
                    const parsed = JSON.parse(savedCalc);
                    if (parsed.cleanStonePct !== undefined) setCleanStonePct(parsed.cleanStonePct);
                    if (parsed.wastePct !== undefined) setWastePct(parsed.wastePct);
                    if (parsed.processingBudget !== undefined) setProcessingBudget(parsed.processingBudget);
                    if (parsed.targetPricePerCarat !== undefined) setTargetPricePerCarat(parsed.targetPricePerCarat);
                    if (parsed.weightUnit !== undefined) setWeightUnit(parsed.weightUnit);
                }
            } catch (err) {
                console.log('Error loading saved settings:', err);
            }
        };
        loadPersistedSettings();
    }, []);

    useEffect(() => {
        if (supabaseUrl && supabaseKey) {
            try {
                const client = createClient(supabaseUrl.trim(), supabaseKey.trim());
                setSupabaseClient(client);
            } catch (e) {
                console.log('Supabase Init Error:', e);
            }
        }
    }, [supabaseUrl, supabaseKey]);

    // Settings actions
    const handleSaveSettings = async () => {
        const cleanUrl = (supabaseUrl || '').trim();
        const cleanKey = (supabaseKey || '').trim();

        if (!cleanUrl || !cleanKey) {
            setSettingsBanner({ type: 'error', text: 'Supabase URL and API Key cannot be empty.' });
            return;
        }

        try {
            await AsyncStorage.setItem(STORAGE_KEYS.SUPABASE_URL, cleanUrl);
            await AsyncStorage.setItem(STORAGE_KEYS.SUPABASE_KEY, cleanKey);
            setHasCustomCredentials(true);

            const client = createClient(cleanUrl, cleanKey);
            setSupabaseClient(client);

            setSettingsBanner({ type: 'success', text: 'Settings saved to device storage & reconnected!' });
            setTimeout(() => setSettingsBanner(null), 3500);
        } catch (e) {
            setSettingsBanner({ type: 'error', text: `Failed to save: ${e.message}` });
        }
    };

    const handleResetSettings = async () => {
        try {
            await AsyncStorage.removeItem(STORAGE_KEYS.SUPABASE_URL);
            await AsyncStorage.removeItem(STORAGE_KEYS.SUPABASE_KEY);
            setSupabaseUrl(DEFAULT_SUPABASE_URL);
            setSupabaseKey(DEFAULT_SUPABASE_KEY);
            setHasCustomCredentials(false);
            setConnectionHealth(null);

            const client = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY);
            setSupabaseClient(client);

            setSettingsBanner({ type: 'info', text: 'Reset credentials to system defaults.' });
            setTimeout(() => setSettingsBanner(null), 3500);
        } catch (e) {
            setSettingsBanner({ type: 'error', text: `Reset failed: ${e.message}` });
        }
    };

    const handleTestConnection = async () => {
        if (!supabaseClient) {
            setConnectionHealth({ status: 'error', message: 'No active Supabase client initialized.' });
            return;
        }

        setTestingConnection(true);
        setConnectionHealth(null);
        const startTime = Date.now();

        try {
            const { count, error } = await supabaseClient
                .from('lots')
                .select('id', { count: 'exact', head: true });

            const latency = Date.now() - startTime;
            if (error) throw error;

            setConnectionHealth({
                status: 'ok',
                latency,
                message: `Connection Verified! Database reachable (${latency}ms, ${count ?? 0} lots).`
            });
        } catch (e) {
            const latency = Date.now() - startTime;
            setConnectionHealth({
                status: 'error',
                latency,
                message: `Connection Failed: ${e.message || 'Network unreachable'}`
            });
        } finally {
            setTestingConnection(false);
        }
    };

    const handleSaveCalcPresets = async () => {
        try {
            const presets = {
                cleanStonePct,
                wastePct,
                processingBudget,
                targetPricePerCarat,
                weightUnit
            };
            await AsyncStorage.setItem(STORAGE_KEYS.CALC_DEFAULTS, JSON.stringify(presets));
            setCalcBanner({ type: 'success', text: 'Yield & cost assumptions saved to device storage!' });
            setTimeout(() => setCalcBanner(null), 3500);
        } catch (e) {
            setCalcBanner({ type: 'error', text: `Save failed: ${e.message}` });
        }
    };

    const handleResetCalcPresets = async () => {
        try {
            await AsyncStorage.removeItem(STORAGE_KEYS.CALC_DEFAULTS);
            setCleanStonePct(DEFAULT_CALC_PRESETS.cleanStonePct);
            setWastePct(DEFAULT_CALC_PRESETS.wastePct);
            setProcessingBudget(DEFAULT_CALC_PRESETS.processingBudget);
            setTargetPricePerCarat(DEFAULT_CALC_PRESETS.targetPricePerCarat);
            setWeightUnit(DEFAULT_CALC_PRESETS.weightUnit);
            setCalcBanner({ type: 'info', text: 'Restored system standard yield assumptions.' });
            setTimeout(() => setCalcBanner(null), 3500);
        } catch (e) {
            setCalcBanner({ type: 'error', text: `Reset failed: ${e.message}` });
        }
    };

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

    // --- TAB 3: LIVE LAB CERTIFICATES STATE ---
    const [certificates, setCertificates] = useState([]);
    const [loadingCerts, setLoadingCerts] = useState(false);
    const [certSearch, setCertSearch] = useState('');
    const [showSampleCert, setShowSampleCert] = useState(false);

    const fetchCertificates = async () => {
        if (!supabaseClient) return;
        setLoadingCerts(true);
        try {
            // 1. Fetch CERTIFICATION stage logs
            const { data: certLogs, error: logsError } = await supabaseClient
                .from('stage_logs')
                .select('*')
                .eq('stage', 'CERTIFICATION')
                .order('entered_at', { ascending: false });

            if (logsError) throw logsError;

            if (!certLogs || certLogs.length === 0) {
                setCertificates([]);
                setLoadingCerts(false);
                return;
            }

            // 2. Fetch associated lot records
            const lotIds = [...new Set(certLogs.map(l => l.lot_id).filter(Boolean))];
            let lotsMap = {};
            if (lotIds.length > 0) {
                const { data: lotsData } = await supabaseClient
                    .from('lots')
                    .select('id, lot_code, supplier, current_stage, current_weight')
                    .in('id', lotIds);

                if (lotsData) {
                    lotsData.forEach(l => {
                        lotsMap[l.id] = l;
                    });
                }
            }

            // 3. Fetch any certification stage assets (photos/scans)
            let assetsMap = {};
            if (lotIds.length > 0) {
                const { data: assetsData } = await supabaseClient
                    .from('lot_assets')
                    .select('*')
                    .in('lot_id', lotIds)
                    .ilike('file_path', '%/CERTIFICATION/%');

                if (assetsData) {
                    assetsData.forEach(a => {
                        if (!assetsMap[a.lot_id]) {
                            assetsMap[a.lot_id] = [];
                        }
                        assetsMap[a.lot_id].push(a);
                    });
                }
            }

            // 4. Combine into rich certificate items
            const certItems = certLogs.map(log => {
                const lot = lotsMap[log.lot_id] || {};
                const certAssets = assetsMap[log.lot_id] || [];
                const d = log.data || {};

                return {
                    id: log.id,
                    lot_id: log.lot_id,
                    lot_code: lot.lot_code || 'Unknown Lot',
                    lot_stage: lot.current_stage || log.stage,
                    supplier: lot.supplier,
                    current_weight: lot.current_weight,
                    entered_at: log.entered_at || log.created_at,
                    lab_name: d.lab_name || 'Gemological Lab',
                    report_number: d.report_number || 'N/A',
                    certificate_date: d.certificate_date,
                    verified_carat: d.verified_carat !== undefined ? Number(d.verified_carat) : 0,
                    color_grade: d.color_grade || 'Not Specified',
                    clarity_grade: d.clarity_grade || 'Not Specified',
                    cut_shape: d.cut_shape || 'Not Specified',
                    treatment_status: d.treatment_status || 'Not Tested',
                    report_url: d.report_url,
                    notes: d.notes,
                    assets: certAssets
                };
            });

            setCertificates(certItems);
        } catch (e) {
            console.log('Fetch Certs Error:', e.message);
        } finally {
            setLoadingCerts(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'certs') {
            fetchCertificates();
        }
    }, [activeTab, supabaseClient]);

    const filteredCerts = useMemo(() => {
        if (!certSearch.trim()) return certificates;
        const q = certSearch.toLowerCase();
        return certificates.filter(c =>
            c.lot_code?.toLowerCase().includes(q) ||
            c.report_number?.toLowerCase().includes(q) ||
            c.lab_name?.toLowerCase().includes(q) ||
            c.color_grade?.toLowerCase().includes(q) ||
            c.treatment_status?.toLowerCase().includes(q)
        );
    }, [certificates, certSearch]);

    const getAssetUrl = (filePath) => {
        if (!filePath) return null;
        return `${supabaseUrl}/storage/v1/object/public/lot-evidence/${filePath}`;
    };

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

                            {/* CALCULATOR PERSISTENCE ACTIONS */}
                            {calcBanner && (
                                <View style={[
                                    styles.feedbackBanner,
                                    calcBanner.type === 'error' ? styles.feedbackBannerError :
                                    calcBanner.type === 'success' ? styles.feedbackBannerSuccess : styles.feedbackBannerInfo
                                ]}>
                                    <Text style={styles.feedbackBannerText}>{calcBanner.text}</Text>
                                </View>
                            )}

                            <View style={[styles.actionBtnRow, { marginTop: 4 }]}>
                                <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1, marginRight: 8 }]} onPress={handleSaveCalcPresets}>
                                    <Text style={styles.actionBtnTextSecondary}>💾 Save Assumptions</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionBtnSecondary, { flex: 1 }]} onPress={handleResetCalcPresets}>
                                    <Text style={styles.actionBtnTextSecondary}>↺ Restore Defaults</Text>
                                </TouchableOpacity>
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

                {/* --- TAB 3: LIVE LAB CERTIFICATE VIEWER --- */}
                {activeTab === 'certs' && (
                    <View style={styles.floorContainer}>
                        {/* Search and Refresh Row */}
                        <View style={styles.floorSearchRow}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                                placeholder="Search Report #, Lot, Lab, Color..."
                                placeholderTextColor="#64748b"
                                value={certSearch}
                                onChangeText={setCertSearch}
                            />
                            <TouchableOpacity style={styles.refreshBtn} onPress={fetchCertificates} disabled={loadingCerts}>
                                {loadingCerts ? (
                                    <ActivityIndicator size="small" color="#ffffff" style={{ paddingHorizontal: 12 }} />
                                ) : (
                                    <Text style={styles.refreshBtnText}>Refresh</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Supported Labs Filter Chips */}
                        <View style={{ marginBottom: 12 }}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                                {['All Labs', 'GIA', 'GRS', 'Lotus', 'IGI', 'SSEF', 'CGL'].map(lab => {
                                    const isSelected = (lab === 'All Labs' && !certSearch) || (certSearch.toLowerCase() === lab.toLowerCase());
                                    return (
                                        <TouchableOpacity
                                            key={lab}
                                            style={[styles.labChip, isSelected && styles.labChipActive]}
                                            onPress={() => setCertSearch(lab === 'All Labs' ? '' : lab)}
                                        >
                                            <Text style={isSelected ? styles.labChipTextActive : styles.labChipText}>{lab}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {loadingCerts ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#f59e0b" />
                                <Text style={{ color: '#94a3b8', marginTop: 8 }}>Fetching Lab Certificates from Cloud...</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredCerts}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={{ paddingBottom: 24 }}
                                renderItem={({ item }) => (
                                    <View style={styles.certCard}>
                                        {/* Certificate Header */}
                                        <View style={styles.certHeader}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={styles.certLotCode}>{item.lot_code}</Text>
                                                <View style={[styles.stageBadge, { backgroundColor: getStageBadgeColor(item.lot_stage) }]}>
                                                    <Text style={styles.stageText}>{item.lot_stage}</Text>
                                                </View>
                                            </View>
                                            {item.certificate_date && (
                                                <Text style={styles.certDateText}>
                                                    {new Date(item.certificate_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                                </Text>
                                            )}
                                        </View>

                                        {/* Certificate Body */}
                                        <View style={styles.certBody}>
                                            <View style={styles.certLabBadge}>
                                                <Text style={styles.certLabBadgeText}>{item.lab_name}</Text>
                                            </View>
                                            <Text style={styles.certRepNum}>Report # {item.report_number}</Text>

                                            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 8 }} />

                                            <View style={styles.resultRow}>
                                                <Text style={styles.resLabel}>Verified Weight:</Text>
                                                <Text style={[styles.resVal, { color: '#f59e0b', fontSize: 14 }]}>
                                                    {item.verified_carat > 0 ? `${item.verified_carat.toFixed(2)} ct` : 'Pending Lab'}
                                                </Text>
                                            </View>

                                            <View style={styles.resultRow}>
                                                <Text style={styles.resLabel}>Color Grade:</Text>
                                                <Text style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: 13 }}>{item.color_grade}</Text>
                                            </View>

                                            <View style={styles.resultRow}>
                                                <Text style={styles.resLabel}>Clarity & Cut:</Text>
                                                <Text style={styles.resVal}>{item.clarity_grade} • {item.cut_shape}</Text>
                                            </View>

                                            <View style={styles.resultRow}>
                                                <Text style={styles.resLabel}>Treatment Status:</Text>
                                                <Text style={{
                                                    color: item.treatment_status.toLowerCase().includes('unheated') || item.treatment_status.toLowerCase().includes('natural')
                                                        ? '#10b981'
                                                        : '#f59e0b',
                                                    fontWeight: 'bold',
                                                    fontSize: 12
                                                }}>
                                                    {item.treatment_status}
                                                </Text>
                                            </View>

                                            {item.notes ? (
                                                <View style={{ marginTop: 8, padding: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
                                                    <Text style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                                                        &ldquo;{item.notes}&rdquo;
                                                    </Text>
                                                </View>
                                            ) : null}

                                            {/* Evidence Photo Thumbnails if available */}
                                            {item.assets && item.assets.length > 0 && (
                                                <View style={{ marginTop: 10 }}>
                                                    <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: 'bold', marginBottom: 6 }}>
                                                        EVIDENCE PHOTOS ({item.assets.length})
                                                    </Text>
                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                                        {item.assets.map(asset => {
                                                            const assetUrl = getAssetUrl(asset.file_path);
                                                            return (
                                                                <TouchableOpacity
                                                                    key={asset.id}
                                                                    onPress={() => assetUrl && Linking.openURL(assetUrl)}
                                                                >
                                                                    <Image
                                                                        source={{ uri: assetUrl }}
                                                                        style={styles.certThumbImage}
                                                                    />
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                    </ScrollView>
                                                </View>
                                            )}

                                            {/* External Verification Link */}
                                            {item.report_url ? (
                                                <TouchableOpacity
                                                    style={styles.verifyLinkBtn}
                                                    onPress={() => Linking.openURL(item.report_url)}
                                                >
                                                    <Text style={styles.verifyLinkText}>↗ Verify on Lab Portal</Text>
                                                </TouchableOpacity>
                                            ) : null}
                                        </View>
                                    </View>
                                )}
                                ListEmptyComponent={() => (
                                    <View style={styles.emptyContainer}>
                                        <Text style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: 15, marginBottom: 6 }}>
                                            No Certified Lots Found
                                        </Text>
                                        <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginBottom: 16 }}>
                                            {certSearch
                                                ? `No reports matching "${certSearch}". Clear search or try another laboratory.`
                                                : "Lots transitioned to the Lab Certification stage in the web console will automatically appear here with verified gemological data."}
                                        </Text>

                                        <TouchableOpacity
                                            style={styles.toggleSampleBtn}
                                            onPress={() => setShowSampleCert(!showSampleCert)}
                                        >
                                            <Text style={styles.toggleSampleBtnText}>
                                                {showSampleCert ? 'Hide Sample Reference' : 'Preview Reference Certificate'}
                                            </Text>
                                        </TouchableOpacity>

                                        {showSampleCert && (
                                            <View style={[styles.sampleCert, { marginTop: 16, width: '100%' }]}>
                                                <Text style={styles.certLabTitle}>GRS Swisslab Reference</Text>
                                                <Text style={styles.certRepNum}>Report # GRS-2024-884912 (Sample Spec)</Text>
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
                                                    <Text style={styles.resLabel}>Treatment Comment:</Text>
                                                    <Text style={{ color: '#10b981', fontWeight: 'bold' }}>No Indications of Heating (Natural)</Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )}
                            />
                        )}
                    </View>
                )}

                {/* --- TAB 4: SETTINGS --- */}
                {activeTab === 'settings' && (
                    <ScrollView contentContainerStyle={styles.scroll}>
                        <Text style={styles.screenTitle}>Cloud Connection & Settings</Text>

                        {settingsBanner && (
                            <View style={[
                                styles.feedbackBanner,
                                settingsBanner.type === 'error' ? styles.feedbackBannerError :
                                settingsBanner.type === 'success' ? styles.feedbackBannerSuccess : styles.feedbackBannerInfo
                            ]}>
                                <Text style={styles.feedbackBannerText}>{settingsBanner.text}</Text>
                            </View>
                        )}

                        {/* CLOUD API CREDENTIALS */}
                        <View style={styles.card}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text style={styles.cardTitle}>Supabase Cloud API</Text>
                                <View style={[styles.storageStatusBadge, { backgroundColor: hasCustomCredentials ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.2)' }]}>
                                    <Text style={{ color: hasCustomCredentials ? '#10b981' : '#94a3b8', fontSize: 10, fontWeight: 'bold' }}>
                                        {hasCustomCredentials ? '● SAVED ON DEVICE' : '○ SYSTEM DEFAULT'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Supabase Project URL</Text>
                                <TextInput
                                    style={[styles.input, { fontSize: 11 }]}
                                    value={supabaseUrl}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    placeholder="https://your-project.supabase.co"
                                    placeholderTextColor="#64748b"
                                    onChangeText={setSupabaseUrl}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <Text style={styles.label}>Anon Public API Key</Text>
                                    <TouchableOpacity onPress={() => setShowKey(!showKey)}>
                                        <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '600' }}>
                                            {showKey ? 'Hide Key' : 'Show Key'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <TextInput
                                    style={[styles.input, { fontSize: 10 }]}
                                    value={supabaseKey}
                                    secureTextEntry={!showKey}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX..."
                                    placeholderTextColor="#64748b"
                                    onChangeText={setSupabaseKey}
                                />
                            </View>

                            <View style={styles.statusRow}>
                                <Text style={styles.statusLabel}>Client Status:</Text>
                                <Text style={[styles.statusVal, { color: supabaseClient ? '#10b981' : '#ef4444' }]}>
                                    {supabaseClient ? '● INITIALIZED' : '○ UNINITIALIZED'}
                                </Text>
                            </View>

                            {connectionHealth && (
                                <View style={[
                                    styles.healthBanner,
                                    { backgroundColor: connectionHealth.status === 'ok' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)' }
                                ]}>
                                    <Text style={[
                                        styles.healthBannerText,
                                        { color: connectionHealth.status === 'ok' ? '#10b981' : '#ef4444' }
                                    ]}>
                                        {connectionHealth.message}
                                    </Text>
                                </View>
                            )}

                            {/* ACTION BUTTONS */}
                            <View style={[styles.actionBtnRow, { marginTop: 14 }]}>
                                <TouchableOpacity
                                    style={[styles.actionBtnPrimary, { flex: 1.2, marginRight: 8 }]}
                                    onPress={handleSaveSettings}
                                >
                                    <Text style={styles.actionBtnTextPrimary}>💾 Save & Reconnect</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionBtnSuccess, { flex: 1 }]}
                                    onPress={handleTestConnection}
                                    disabled={testingConnection}
                                >
                                    {testingConnection ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                        <Text style={styles.actionBtnTextSuccess}>⚡ Ping Cloud</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.actionBtnSecondary, { marginTop: 8 }]}
                                onPress={handleResetSettings}
                            >
                                <Text style={styles.actionBtnTextSecondary}>↺ Reset to System Defaults</Text>
                            </TouchableOpacity>
                        </View>

                        {/* FIELD CALCULATOR PRESETS */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Current Field Calculator Presets</Text>
                            <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 10 }}>
                                Appraisers can save their preferred yield & cost baselines directly on the ROI calculator tab.
                            </Text>

                            <View style={styles.calcPresetRow}>
                                <Text style={styles.calcPresetLabel}>Clean Stone Weight:</Text>
                                <Text style={styles.calcPresetVal}>{cleanStonePct}%</Text>
                            </View>
                            <View style={styles.calcPresetRow}>
                                <Text style={styles.calcPresetLabel}>Cutting & Polishing Loss:</Text>
                                <Text style={styles.calcPresetVal}>{wastePct}%</Text>
                            </View>
                            <View style={styles.calcPresetRow}>
                                <Text style={styles.calcPresetLabel}>Standard Processing Budget:</Text>
                                <Text style={styles.calcPresetVal}>{formatLKR(parseFloat(processingBudget) || 0)}</Text>
                            </View>
                            <View style={styles.calcPresetRow}>
                                <Text style={styles.calcPresetLabel}>Target Sale Price per Carat:</Text>
                                <Text style={styles.calcPresetVal}>{formatLKR(parseFloat(targetPricePerCarat) || 0)}</Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.actionBtnSecondary, { marginTop: 12 }]}
                                onPress={handleResetCalcPresets}
                            >
                                <Text style={styles.actionBtnTextSecondary}>↺ Restore Standard Assumptions</Text>
                            </TouchableOpacity>
                        </View>

                        {/* SYSTEM ARCHITECTURE */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Application Specs & Storage</Text>
                            <View style={styles.calcPresetRow}>
                                <Text style={styles.calcPresetLabel}>Persistence Engine:</Text>
                                <Text style={styles.calcPresetVal}>AsyncStorage (Native/Web)</Text>
                            </View>
                            <View style={styles.calcPresetRow}>
                                <Text style={styles.calcPresetLabel}>Framework:</Text>
                                <Text style={styles.calcPresetVal}>React Native Expo 50</Text>
                            </View>
                            <View style={styles.calcPresetRow}>
                                <Text style={styles.calcPresetLabel}>Accounting Currency:</Text>
                                <Text style={styles.calcPresetVal}>LKR (Sri Lankan Rupee)</Text>
                            </View>
                            <View style={styles.calcPresetRow}>
                                <Text style={styles.calcPresetLabel}>Platform Target:</Text>
                                <Text style={styles.calcPresetVal}>iOS, Android, Mobile Web</Text>
                            </View>
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
    labChip: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    labChipActive: {
        backgroundColor: '#f59e0b',
        borderColor: '#f59e0b',
    },
    labChipText: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: 'bold',
    },
    labChipTextActive: {
        color: '#0f172a',
        fontSize: 11,
        fontWeight: 'bold',
    },
    certCard: {
        backgroundColor: '#1e293b',
        borderRadius: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#f59e0b',
        overflow: 'hidden',
    },
    certHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    certLotCode: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    certDateText: {
        fontSize: 11,
        color: '#94a3b8',
    },
    certBody: {
        padding: 14,
    },
    certLabBadge: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 6,
    },
    certLabBadgeText: {
        color: '#f59e0b',
        fontSize: 12,
        fontWeight: 'bold',
    },
    certThumbImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        backgroundColor: '#0f172a',
    },
    verifyLinkBtn: {
        marginTop: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderWidth: 1,
        borderColor: '#3b82f6',
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
    },
    verifyLinkText: {
        color: '#60a5fa',
        fontSize: 12,
        fontWeight: 'bold',
    },
    toggleSampleBtn: {
        borderWidth: 1,
        borderColor: '#475569',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#0f172a',
    },
    toggleSampleBtnText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '500',
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
    },
    feedbackBanner: {
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
    },
    feedbackBannerSuccess: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: '#10b981',
    },
    feedbackBannerError: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: '#ef4444',
    },
    feedbackBannerInfo: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: '#3b82f6',
    },
    feedbackBannerText: {
        fontSize: 12,
        color: '#f8fafc',
        fontWeight: '600',
        textAlign: 'center',
    },
    actionBtnRow: {
        flexDirection: 'row',
    },
    actionBtnPrimary: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnTextPrimary: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    actionBtnSuccess: {
        backgroundColor: '#10b981',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnTextSuccess: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    actionBtnSecondary: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 8,
        paddingVertical: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnTextSecondary: {
        color: '#94a3b8',
        fontWeight: '600',
        fontSize: 12,
    },
    storageStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    healthBanner: {
        marginTop: 10,
        padding: 8,
        borderRadius: 6,
    },
    healthBannerText: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
    },
    calcPresetRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    calcPresetLabel: {
        fontSize: 11,
        color: '#94a3b8',
    },
    calcPresetVal: {
        fontSize: 11,
        color: '#e2e8f0',
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
});
