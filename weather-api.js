window.timezoneOffsetSeconds = null;

const WeatherAPI = {
    /**
     * Richiede le coordinate GPS al browser.
     */
    getUserLocation: () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject({ code: 0, message: "GPS non supportato" });
                return;
            }

            // In locale, il browser preferisce enableHighAccuracy: false
            const options = {
                enableHighAccuracy: false, 
                timeout: 10000, 
                maximumAge: 0 
            };

            navigator.geolocation.getCurrentPosition(
                pos => resolve(pos.coords),
                err => {
                    console.warn("Errore GPS locale:", err.message);
                    reject(err);
                },
                options
            );
        });
    },

    /**
     * Recupera le previsioni meteo e l'offset orario.
     */
    fetchForecast: async (lat, lng, date, updateInputs = false) => {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m&daily=sunrise,sunset&timezone=auto&start_date=${date}&end_date=${date}`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (data.utc_offset_seconds !== undefined) {
                window.timezoneOffsetSeconds = data.utc_offset_seconds;
                if (updateInputs) {
                    updateDashboardClock(true); 
                }
            }
            return data;
        } catch (err) {
            console.error("Errore API Meteo:", err);
            return null;
        }
    }
};

/**
 * Gestisce l'orologio della dashboard e sincronizza gli input.
 */
function updateDashboardClock(forza = false) {
    const clockElement = document.getElementById('display-hour-center');
    const inputTime = document.getElementById('input-time');
    const inputDate = document.getElementById('input-date');
    if (!clockElement) return;

    const oraLocale = new Date();
    let timeToUse = oraLocale;

    if (window.timezoneOffsetSeconds !== null) {
        const utcTimeMs = oraLocale.getTime() + (oraLocale.getTimezoneOffset() * 60000);
        timeToUse = new Date(utcTimeMs + (window.timezoneOffsetSeconds * 1000));
    }

    const h = timeToUse.getHours().toString().padStart(2, '0');
    const m = timeToUse.getMinutes().toString().padStart(2, '0');
    
    clockElement.innerText = `${h}:${m}`;

    if (forza || (inputTime && !inputTime.value)) {
        if (inputTime) inputTime.value = `${h}:${m}`;
    }

    if (forza || (inputDate && !inputDate.value)) {
        if (inputDate) {
            const yyyy = timeToUse.getFullYear();
            const mm = (timeToUse.getMonth() + 1).toString().padStart(2, '0');
            const dd = timeToUse.getDate().toString().padStart(2, '0');
            inputDate.value = `${yyyy}-${mm}-${dd}`;
        }
    }
}