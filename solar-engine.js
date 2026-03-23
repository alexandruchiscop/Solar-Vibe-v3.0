const SolarEngine = {
    /**
     * Calcola l'inclinazione ideale (Tilt) per la massima resa.
     * @param {number} sunAltitude - Altezza del sole sull'orizzonte in gradi.
     * @returns {number} - Tilt ottimale in gradi (0-90).
     */
    getOptimalTilt(sunAltitude) {
        if (sunAltitude <= 0) return 0;
        // Il tilt ideale è il complemento dell'altezza solare.
        // Se il sole è a 30°, il pannello deve essere a 60° per essere perpendicolare.
        const idealTilt = 90 - sunAltitude;
        return Math.max(0, Math.min(90, idealTilt));
    },

    /**
     * Calcola la potenza istantanea in Watt.
     * @param {number} hDec - Ora attuale decimale.
     * @param {number} sunH - Alba.
     * @param {number} setH - Tramonto.
     * @param {number} panelWp - Watt di picco.
     * @param {number} cloudCover - % nubi.
     * @param {number} tilt - Inclinazione attuale del pannello (0-90).
     * @param {number} sunAltitude - Altezza attuale del sole in gradi.
     */
calculatePower(hDec, sunH, setH, panelWp, cloudCover, tilt = 0, sunAltitude = null) {
    // Controllo di sicurezza: se è notte o il sole è sotto l'orizzonte, ritorna 0
    if (hDec < sunH || hDec > setH || (sunAltitude !== null && sunAltitude <= 0)) {
        return 0;
    }

    // 1. GESTIONE FALLBACK ALTEZZA SOLE
    // Se sunAltitude non viene passato, lo stimiamo basandoci sull'ora (curva sinusoidale)
    let effectiveAltitude = sunAltitude;
    if (effectiveAltitude === null) {
        const progress = (hDec - sunH) / (setH - sunH);
        effectiveAltitude = Math.sin(progress * Math.PI) * 65; // Assumiamo un picco di 65°
    }

    // 2. CALCOLO TILT OTTIMALE E INCIDENZA
    // Troviamo l'angolo perfetto e calcoliamo quanto siamo distanti con il nostro tilt
    const optimalTilt = this.getOptimalTilt(effectiveAltitude);
    const angularDiff = Math.abs(tilt - optimalTilt);
    const radDiff = (angularDiff * Math.PI) / 180;
    
    // Fattore di incidenza: 1.0 se siamo perpendicolari, scende man mano che l'angolo sbaglia
    let incidenceFactor = Math.max(0, Math.cos(radDiff));

    // 3. EFFETTO ATMOSFERA
    // Più il sole è alto, meno atmosfera attraversa e più energia arriva (seno dell'altezza)
    const atmosphereEffect = Math.sin((effectiveAltitude * Math.PI) / 180);

    // 4. PERDITE FISSE E METEO
    const weatherFactor = (100 - (cloudCover * 0.85)) / 100;
    const systemEfficiency = 0.82; // Efficienza hardware (cavi, calore, MPPT)

    // Calcolo finale
    const finalPower = panelWp * incidenceFactor * atmosphereEffect * weatherFactor * systemEfficiency;
    
    return Math.max(0, finalPower);
}

    /**
     * Spiegazione delle funzioni aggiunte:
     * * getOptimalTilt: 
     * Calcola l'angolo a cui dovresti inclinare fisicamente il pannello 
     * per "guardare" il sole dritto in faccia. Se il sole è basso (es. 10°), 
     * il tilt sarà alto (80°).
     * * incidenceFactor: 
     * Utilizza il coseno della differenza tra il tilt reale e quello ideale. 
     * Se hai i pannelli piatti (0°) e il sole è a 45°, perderai circa il 30% 
     * della potenza rispetto a un'inclinazione perfetta.
     * * atmosphereEffect: 
     * Modula la potenza in base all'altezza del sole. Anche con pannelli 
     * perfettamente inclinati, il sole all'alba è più debole del sole a mezzogiorno.
     */
    
};
    /** Stima il tempo rimanente per caricare la batteria. */
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

    /** Converte una stringa "HH:MM" in numero decimale. */
    timeToDecimal(timeStr) {
        if (!timeStr || timeStr === "--:--") return 12;
        const [h, m] = timeStr.split(':').map(Number);
        return h + (m / 60);
    }
};
