const SolarEngine = {
    /**
     * Calcola l'inclinazione ideale (Tilt) per la massima resa.
     * @param {number} sunAltitude - Altezza del sole sull'orizzonte in gradi.
     * @returns {number} - Tilt ottimale in gradi (0-90).
     */
    getOptimalTilt(sunAltitude) {
        if (sunAltitude <= 0) return 0;
        // Il tilt ideale è il complemento dell'altezza solare.
        const idealTilt = 90 - sunAltitude;
        return Math.max(0, Math.min(90, idealTilt));
    },

    /**
     * Calcola la potenza istantanea in Watt.
     */
    calculatePower(hDec, sunH, setH, panelWp, cloudCover, tilt = 0, sunAltitude = null) {
        // 1. Controllo Notte: se è prima dell'alba o dopo il tramonto
        if (hDec < sunH || hDec > setH) return 0;

        // 2. Gestione Altezza Sole
        let effectiveAltitude = sunAltitude;
        if (effectiveAltitude === null || effectiveAltitude <= 0) {
            const progress = (hDec - sunH) / (setH - sunH);
            effectiveAltitude = Math.sin(progress * Math.PI) * 65; 
        }

        // Se dopo il calcolo l'altezza è ancora zero o negativa (sole sotto orizzonte)
        if (effectiveAltitude <= 0) return 0;

        // 3. Calcolo Incidenza (Angular Difference)
        const optimalTilt = this.getOptimalTilt(effectiveAltitude);
        const angularDiff = Math.abs(tilt - optimalTilt);
        const radDiff = (angularDiff * Math.PI) / 180;
        
        // Fattore di incidenza: quanto il pannello è orientato bene verso il sole
        let incidenceFactor = Math.max(0, Math.cos(radDiff));

        // 4. Effetto Atmosfera (Air Mass)
        // Più il sole è basso, più l'aria filtra i raggi.
        const atmosphereEffect = Math.sin((effectiveAltitude * Math.PI) / 180);

        // 5. Meteo ed Efficienza Sistema
        // Riduzione per nubi (0.85 è l'intensità residua con nubi fitte)
        const weatherFactor = (100 - (cloudCover * 0.85)) / 100;
        const systemEfficiency = 0.82; // Perdite cavi, calore, MPPT

        // Calcolo finale
        const finalPower = panelWp * incidenceFactor * atmosphereEffect * weatherFactor * systemEfficiency;
        
        return Math.max(0, finalPower);
    },

    /**
     * Stima il tempo rimanente per caricare la batteria.
     */
    estimateChargeTime(currentSoc, targetSoc, currentPower, battAh) {
        if (currentPower <= 5 || battAh <= 0) return "--";
        if (parseFloat(currentSoc) >= targetSoc) return "OK";

        const voltage = 12.8; 
        const lossFactor = 0.85; 
        const totalWh = battAh * voltage;
        const energyNeeded = totalWh * ((targetSoc - currentSoc) / 100);
        
        // Sottraiamo un consumo fisso del camper (10W)
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
        if (!timeStr || timeStr === "--:--" || typeof timeStr !== 'string') return 12;
        const parts = timeStr.split(':');
        if (parts.length !== 2) return 12;
        const h = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        return h + (m / 60);
    }
};
