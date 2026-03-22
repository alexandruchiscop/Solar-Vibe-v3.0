const SolarEngine = {
    /**
     * Calcola la potenza istantanea in Watt.
     * @param {number} hDec - Ora attuale in formato decimale (es. 14.5 per le 14:30).
     * @param {number} sunH - Ora dell'alba (decimale).
     * @param {number} setH - Ora del tramonto (decimale).
     * @param {number} panelWp - Watt di picco del pannello.
     * @param {number} cloudCover - Percentuale di nubi (0-100).
     */
    calculatePower(hDec, sunH, setH, panelWp, cloudCover) {
        // Se è prima dell'alba o dopo il tramonto, la produzione è zero.
        if (hDec < sunH || hDec > setH) return 0;
      
        // 1. Calcoliamo il progresso del sole nel cielo (da 0 a 1)
        const progress = (hDec - sunH) / (setH - sunH);
        
        // 2. CURVA RICALIBRATA PER PANNELLO PIATTO
        // Usiamo l'esponente 2.0 (invece di 1.5). 
        // Questo rende la curva più "stretta": il pannello produce molto solo quando 
        // il sole è vicino allo zenit (mezzogiorno) e cala più drasticamente ai lati.
        const sineWave = Math.sin(progress * Math.PI);
        const flatPanelFactor = Math.pow(sineWave, 2.0); 
        
        // 3. Fattore meteo: le nubi riducono l'efficienza.
        const weatherFactor = (100 - (cloudCover * 0.85)) / 100;
        
        // 4. Efficienza reale: tiene conto di calore, sporco e perdite dei cavi (82%).
        const efficiencyFactor = 0.82;
        
        return panelWp * flatPanelFactor * weatherFactor * efficiencyFactor;
    },

    /**
     * Stima il tempo rimanente per caricare la batteria.
     */
    estimateChargeTime(currentSoc, targetSoc, currentPower, battAh) {
        if (currentPower <= 5 || battAh <= 0) return "--";
        if (parseFloat(currentSoc) >= targetSoc) return "OK";

        const voltage = 12.8; // Tensione nominale LiFePO4
        const lossFactor = 0.85; // Perdite del regolatore MPPT
        const totalWh = battAh * voltage;
        const energyNeeded = totalWh * ((targetSoc - currentSoc) / 100);
        
        // Sottraiamo un consumo fisso del camper (es. 10W) per un calcolo più onesto
        const netPower = (currentPower * lossFactor) - 10; 
        
        if (netPower <= 0) return "∞";
        const hoursDecimal = energyNeeded / netPower;
        
        if (hoursDecimal > 48) return ">48h";

        const h = Math.floor(hoursDecimal);
        const m = Math.round((hoursDecimal - h) * 60);
        return `${h}h ${m}m`;
    },

    /**
     * Converte una stringa "HH:MM" in numero decimale.
     */
    timeToDecimal(timeStr) {
        if (!timeStr || timeStr === "--:--") return 12;
        const [h, m] = timeStr.split(':').map(Number);
        return h + (m / 60);
    }
};