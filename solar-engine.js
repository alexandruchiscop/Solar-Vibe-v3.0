const SolarEngine = {
    /**
     * Calcola la potenza istantanea in Watt.
     * @param {number} hDec - Ora attuale in formato decimale (es. 14.5 per le 14:30).
     * @param {number} sunH - Ora dell'alba (decimale).
     * @param {number} setH - Ora del tramonto (decimale).
     * @param {number} panelWp - Watt di picco del pannello.
     * @param {number} cloudCover - Percentuale di nubi (0-100).
   /**
     * Calcola la potenza istantanea in Watt considerando l'inclinazione (Tilt).
     * @param {number} tilt - Angolo di inclinazione dei pannelli (0-90).
     */
    calculatePower(hDec, sunH, setH, panelWp, cloudCover, tilt = 0) {
        // Se è prima dell'alba o dopo il tramonto, la produzione è zero.
        if (hDec < sunH || hDec > setH) return 0;
      
        // 1. Calcoliamo il progresso del sole nel cielo (da 0 a 1)
        const progress = (hDec - sunH) / (setH - sunH);
        const sineWave = Math.sin(progress * Math.PI);
        
        // 2. LOGICA TILT DINAMICA
        // Se tilt = 0 (piatto), l'esponente è 2.0 (curva stretta, produce solo a mezzogiorno).
        // Se tilt = 90 (verticale), l'esponente scende a 1.1 (curva larga, produce meglio mattina/sera).
        const exponent = 2.0 - (tilt / 90) * 0.9;
        
        let powerFactor = Math.pow(sineWave, exponent);

        // 3. BONUS EFFICIENZA TILT
        // Un pannello inclinato intercetta meglio i raggi quando il sole non è a picco.
        if (tilt > 0) {
            powerFactor *= (1 + (tilt / 250)); 
        }

        // 4. Fattore meteo: le nubi riducono l'efficienza.
        const weatherFactor = (100 - (cloudCover * 0.85)) / 100;
        
        // 5. Efficienza reale (82%).
        const efficiencyFactor = 0.82;
        
        // Limitiamo il fattore massimo a 1.0 per non superare i Watt di picco
        const finalFactor = Math.min(powerFactor, 1.0);
        
        return panelWp * finalFactor * weatherFactor * efficiencyFactor;
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
