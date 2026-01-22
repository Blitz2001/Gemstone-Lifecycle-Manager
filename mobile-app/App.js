import { StatusBar } from 'expo-status-bar';
import { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';

export default function App() {
    // --- STATE ---
    const [purchasePrice, setPurchasePrice] = useState('');
    const [initialWeight, setInitialWeight] = useState('');
    const [weightUnit, setWeightUnit] = useState('g'); // 'g' or 'ct'
    const [cleanStonePct, setCleanStonePct] = useState('30');
    const [wastePct, setWastePct] = useState('65');
    const [processingBudget, setProcessingBudget] = useState('');

    const [geudaPct, setGeudaPct] = useState('70');
    const [geudaPrice, setGeudaPrice] = useState('0');
    const [otherPrice, setOtherPrice] = useState('0');

    // --- LOGIC ---
    const results = useMemo(() => {
        const price = parseFloat(purchasePrice) || 0;
        const weightRaw = parseFloat(initialWeight) || 0;
        const budget = parseFloat(processingBudget) || 0;
        const pGeuda = parseFloat(geudaPrice) || 0;
        const pOther = parseFloat(otherPrice) || 0;
        const cleanPct = parseFloat(cleanStonePct) || 0;
        const wasteP = parseFloat(wastePct) || 0;
        const gPct = parseFloat(geudaPct) || 0;

        // 1. Conversion
        const initialCt = weightUnit === 'g' ? weightRaw * 5 : weightRaw;

        // 2. Usable
        const usableCt = initialCt * (cleanPct / 100);

        // 3. Finished
        const finishedCt = usableCt * (1 - (wasteP / 100));

        // 4. Split
        const cGeuda = finishedCt * (gPct / 100);
        const cOther = finishedCt * ((100 - gPct) / 100);

        // 5. Money
        const investment = price + budget;
        const revGeuda = cGeuda * pGeuda;
        const revOther = cOther * pOther;
        const revenue = revGeuda + revOther;
        const profit = revenue - investment;
        const roi = investment > 0 ? (profit / investment) * 100 : 0;

        // 6. Break Even
        // cGeuda * BE = Inv - revOther
        let breakEvenGeuda = 0;
        if (cGeuda > 0) {
            breakEvenGeuda = (investment - revOther) / cGeuda;
        }

        return { initialCt, finishedCt, cGeuda, cOther, investment, revenue, profit, roi, breakEvenGeuda };
    }, [purchasePrice, initialWeight, weightUnit, cleanStonePct, wastePct, processingBudget, geudaPct, geudaPrice, otherPrice]);

    // Decision
    let decision = 'LOSS';
    let decisionColor = '#ef4444'; // Red
    let decisionBg = 'rgba(239, 68, 68, 0.1)';
    if (results.profit > 0) {
        if (results.roi > 15) {
            decision = 'BUY';
            decisionColor = '#4ade80'; // Green
            decisionBg = 'rgba(74, 222, 128, 0.1)';
        } else {
            decision = 'RISKY';
            decisionColor = '#facc15'; // Yellow
            decisionBg = 'rgba(250, 204, 21, 0.1)';
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.header}>Gemstone ROI Agent</Text>
                <Text style={styles.subHeader}>Buying Decision Calculator</Text>

                {/* INPUT SECTION */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>1. Investment & Weight</Text>

                    <View style={styles.row}>
                        <View style={styles.halves}>
                            <Text style={styles.label}>Purchase Price</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor="#666"
                                value={purchasePrice}
                                onChangeText={setPurchasePrice}
                            />
                        </View>
                        <View style={styles.halves}>
                            <Text style={styles.label}>Budget (Process)</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor="#666"
                                value={processingBudget}
                                onChangeText={setProcessingBudget}
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.halves, { flex: 2 }]}>
                            <Text style={styles.label}>Initial Weight</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor="#666"
                                value={initialWeight}
                                onChangeText={setInitialWeight}
                            />
                        </View>
                        <View style={styles.halves}>
                            <Text style={styles.label}>Unit</Text>
                            <View style={styles.toggleRow}>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, weightUnit === 'g' && styles.toggleActive]}
                                    onPress={() => setWeightUnit('g')}>
                                    <Text style={weightUnit === 'g' ? styles.textActive : styles.textInactive}>g</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, weightUnit === 'ct' && styles.toggleActive]}
                                    onPress={() => setWeightUnit('ct')}>
                                    <Text style={weightUnit === 'ct' ? styles.textActive : styles.textInactive}>ct</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* YIELD SECTION */}
                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, { color: '#c084fc' }]}>2. Yield Estimation</Text>

                    <View style={styles.row}>
                        <View style={styles.halves}>
                            <Text style={styles.label}>Clean Stone %</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={cleanStonePct}
                                onChangeText={setCleanStonePct}
                            />
                        </View>
                        <View style={styles.halves}>
                            <Text style={styles.label}>Waste %</Text>
                            <TextInput
                                style={[styles.input, { color: '#fca5a5', borderColor: '#fca5a5' }]}
                                keyboardType="numeric"
                                value={wastePct}
                                onChangeText={setWastePct}
                            />
                        </View>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoText}>Est. Finish: <Text style={{ fontWeight: 'bold', color: 'white' }}>{results.finishedCt.toFixed(2)} ct</Text></Text>
                    </View>
                </View>

                {/* MARKET SECTION */}
                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, { color: '#60a5fa' }]}>3. Market Forecast</Text>

                    <View style={styles.row}>
                        <View style={styles.halves}>
                            <Text style={styles.label}>Geuda %</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={geudaPct}
                                onChangeText={setGeudaPct}
                            />
                            <Text style={styles.tiny}>Est: {results.cGeuda.toFixed(1)} ct</Text>
                        </View>
                        <View style={styles.halves}>
                            <Text style={styles.label}>Other %</Text>
                            <TextInput
                                style={[styles.input, { opacity: 0.5 }]}
                                editable={false}
                                value={(100 - (parseFloat(geudaPct) || 0)).toString()}
                            />
                            <Text style={styles.tiny}>Est: {results.cOther.toFixed(1)} ct</Text>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.halves}>
                            <Text style={styles.label}>Geuda $/ct</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#666"
                                value={geudaPrice}
                                onChangeText={setGeudaPrice}
                            />
                        </View>
                        <View style={styles.halves}>
                            <Text style={styles.label}>Other $/ct</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#666"
                                value={otherPrice}
                                onChangeText={setOtherPrice}
                            />
                        </View>
                    </View>
                </View>

                {/* RESULT CARD */}
                <View style={[styles.resultCard, { borderColor: decisionColor, backgroundColor: decisionBg }]}>
                    <Text style={[styles.decisionTitle, { color: decisionColor }]}>{decision}</Text>
                    <Text style={styles.roiText}>ROI: {results.roi.toFixed(1)}%</Text>

                    <View style={styles.divider} />

                    <View style={styles.grid}>
                        <View>
                            <Text style={styles.resLabel}>Investment</Text>
                            <Text style={styles.resValue}>{results.investment.toLocaleString()}</Text>
                        </View>
                        <View>
                            <Text style={styles.resLabel}>Revenue</Text>
                            <Text style={styles.resValue}>{results.revenue.toLocaleString()}</Text>
                        </View>
                        <View style={{ marginTop: 10 }}>
                            <Text style={styles.resLabel}>Net Profit</Text>
                            <Text style={[styles.resValue, { color: results.profit >= 0 ? '#4ade80' : '#ef4444' }]}>
                                {results.profit.toLocaleString()}
                            </Text>
                        </View>
                        <View style={{ marginTop: 10 }}>
                            <Text style={styles.resLabel}>Break-Even (Geuda)</Text>
                            <Text style={[styles.resValue, { color: '#fff' }]}>
                                {results.breakEvenGeuda > 0 ? results.breakEvenGeuda.toFixed(0) : '0'} /ct
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0f',
        paddingTop: Platform.OS === 'android' ? 35 : 0,
    },
    scroll: {
        padding: 20,
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
    },
    subHeader: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginBottom: 20,
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#93c5fd', // blue-300
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    halves: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: '#ccc',
        marginBottom: 4,
    },
    input: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        color: 'white',
        padding: 10,
        fontSize: 16,
    },
    toggleRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
    },
    toggleActive: {
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
    },
    textActive: {
        color: '#60a5fa',
        fontWeight: 'bold',
    },
    textInactive: {
        color: '#666',
    },
    infoRow: {
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 8,
    },
    infoText: {
        color: '#888',
        fontSize: 12,
    },
    tiny: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
        textAlign: 'right',
    },
    resultCard: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    decisionTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    roiText: {
        color: 'white',
        fontSize: 16,
        opacity: 0.8,
    },
    divider: {
        height: 1,
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 16,
    },
    grid: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    resLabel: {
        fontSize: 11,
        color: '#aaa',
        textTransform: 'uppercase',
    },
    resValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    }
});
