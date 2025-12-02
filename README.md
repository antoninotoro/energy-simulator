# Energy System Simulator

Applicazione web professionale per simulare e analizzare la fattibilità economica di un impianto energetico integrato composto da:
- **Fotovoltaico** (PV)
- **Sistema di Storage** (Batteria)
- **Colonnina di Ricarica EV**

## Funzionalità Principali

### Input e Configurazione
- **Abilitazione/disabilitazione** di ogni asset (FV, Storage, Colonnine) per simulare configurazioni diverse
- Configurazione completa impianto FV (potenza, orientamento, inclinazione, località)
- **Ricerca località** con autocomplete (geocoding automatico da nome città)
- Parametri sistema di storage (capacità, efficienza, DoD)
- Caratteristiche colonnine di ricarica con **tasso di utilizzo configurabile**
- Parametri economici (prezzi energia, tasso sconto, imposte)
- Upload profili di consumo personalizzati (CSV)

### Simulazione Energetica
- Algoritmo orario (8760 ore/anno)
- Priorità energetiche per massimizzare autoconsumo
- Gestione intelligente dello storage
- Generazione profili default per stazioni EV

### KPI Tecnici
- Producibilità FV annua e specifica
- Autoconsumo e autosufficienza
- Cicli equivalenti batteria
- Energia erogata alle colonnine
- Emissioni CO2 evitate

### Analisi Economica
- Business plan completo (10-25 anni)
- Indicatori finanziari: IRR, NPV, Payback
- Scomposizione CAPEX e OPEX
- Conto economico dettagliato

### Visualizzazioni
- Grafici flussi energetici orari
- SOC batteria
- Confronto mensile
- Cash flow cumulato
- Distribuzione fonti energia

### Export
- Report Excel con tutti i dati

## Stack Tecnologico

- **Next.js 14+** (App Router)
- **React 18+**
- **TypeScript**
- **Tailwind CSS**
- **Recharts** per visualizzazioni
- **Zustand** per state management
- **PapaParse** per parsing CSV
- **XLSX** per export Excel

## Setup e Installazione

### Prerequisiti
- Node.js 18+
- npm o yarn

### Installazione

```bash
# Clona il repository
git clone <repository-url>
cd energy-simulator

# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) nel browser.

### Build per Produzione

```bash
npm run build
npm start
```

## Deploy su Vercel

Il modo più semplice per deployare l'applicazione:

```bash
# Installa Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Oppure connetti il repository GitHub a Vercel per deploy automatici.

## Struttura del Progetto

```
src/
├── app/
│   ├── api/
│   │   ├── pvgis/       # Proxy API PVGIS
│   │   ├── simulate/    # Endpoint simulazione
│   │   └── export/      # Export Excel
│   ├── layout.tsx
│   └── page.tsx         # Main application
├── components/
│   ├── Charts.tsx       # Grafici Recharts
│   ├── EconomicAnalysis.tsx
│   ├── InputPanel.tsx
│   └── TechnicalResults.tsx
├── lib/
│   ├── financial.ts     # Calcoli IRR, NPV
│   ├── pvgis.ts         # Integrazione PVGIS
│   └── simulation.ts    # Core logic
├── store/
│   └── simulation.ts    # Zustand store
└── types/
    └── index.ts         # TypeScript types
```

## Scenari di Simulazione

Puoi abilitare/disabilitare ogni componente dell'impianto usando il checkbox **"Abilita"** in ogni sezione:

### Scenari Possibili
- **FV + Storage + Colonnine**: Impianto completo con massimizzazione autoconsumo
- **Solo FV + Colonnine**: Senza storage, per valutare la convenienza della batteria
- **Solo Storage + Colonnine**: Arbitraggio energetico dalla rete (senza produzione propria)
- **Solo FV + Storage**: Sistema di accumulo senza carichi (solo vendita in rete)
- **Solo Colonnine**: Acquisto diretto dalla rete (benchmark per confronti)

## Guida all'Uso

1. **Configura l'impianto** nel pannello laterale:
   - **Abilita/Disabilita** gli asset che vuoi simulare (checkbox "Abilita" in ogni sezione)
   - Imposta potenza FV, orientamento
   - **Cerca la località** digitando il nome della città (es: Milano, Torino, Napoli)
     - L'autocomplete suggerisce città italiane in tempo reale
     - Le coordinate vengono calcolate automaticamente
   - Definisci capacità storage e parametri
   - Configura numero, potenza e **tasso di utilizzo** delle colonnine

2. **Imposta i parametri economici**:
   - Prezzi energia (acquisto/vendita)
   - Tasso di sconto, aliquota fiscale
   - Durata business plan

3. **Carica profilo consumo** (opzionale):
   - Scarica il template CSV
   - Compila con 8760 valori orari
   - Carica il file

4. **Avvia la simulazione** con il pulsante "Simula"

5. **Analizza i risultati**:
   - Tab "Risultati Tecnici": KPI e grafici energetici
   - Tab "Analisi Economica": Business plan e indicatori finanziari
   - Tab "Report": Esporta i dati in Excel

## Parametri Default

### Fotovoltaico
- Potenza: 100 kWp
- Orientamento: 180° (Sud)
- Inclinazione: 30°
- Località: Roma (41.9028°N, 12.4964°E)
- Costo: 900 €/kWp
- O&M: 1.5%/anno
- Vita utile: 25 anni

### Storage
- Capacità: 200 kWh
- Potenza: 50 kW
- Efficienza: 90%
- Costo: 400 €/kWh
- O&M: 2000 €/anno
- Vita utile: 15 anni
- DoD: 90%

### Colonnina
- Numero: 2
- Potenza: 22 kW/cad
- Costo: 8000 €/cad
- Tariffa: 0.45 €/kWh
- Vita utile: 10 anni
- Tasso di utilizzo: 10% (876 ore equivalenti/anno)

### Economici
- Prezzo acquisto: 0.12 €/kWh
- Oneri sistema: 0.08 €/kWh
- Prezzo vendita: 0.08 €/kWh
- Tasso sconto: 5%
- Aliquota fiscale: 28%

## Logica di Simulazione

L'algoritmo orario segue queste priorità:

1. **FV → Colonnina**: Autoconsumo diretto
2. **FV eccedente → Batteria**: Carica storage
3. **FV eccedente → Rete**: Immissione
4. **Batteria → Colonnina**: Se FV insufficiente
5. **Rete → Colonnina**: Ultima risorsa

## Licenza

MIT License

## Supporto

Per domande o problemi, apri una issue nel repository.
