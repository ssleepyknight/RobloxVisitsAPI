const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

const UNIVERSE_ID = "10768864808";

let cachedVisits = null;
let lastSuccessfulFetch = 0;

const CACHE_MAX_AGE = 10 * 60 * 1000;

//==================================================
// ROOT
//==================================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        status: "online",
        universeId: UNIVERSE_ID,
        cachedVisits: cachedVisits
    });

});

//==================================================
// ROBLOX VISITS
//==================================================

app.get("/roblox-visits/:universeId", async (req, res) => {

    try {

        const universeId = req.params.universeId;

        if (!/^\d+$/.test(universeId)) {

            return res.status(400).json({
                success: false,
                error: "Invalid Universe ID"
            });

        }

        const url =
            `https://games.roblox.com/v1/games?universeIds=${universeId}`;

        let response;

        try {

            response = await fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

        } catch (error) {

            console.error(
                "[Roblox API] Network error:",
                error.message
            );

            // Return cached value if available.

            if (cachedVisits !== null) {

                return res.json({
                    success: true,
                    visits: cachedVisits,
                    cached: true
                });

            }

            return res.status(502).json({
                success: false,
                error: "Roblox API unavailable"
            });

        }

        //==================================================
        // ROBLOX API ERROR
        //==================================================

        if (!response.ok) {

            console.error(
                "[Roblox API] HTTP:",
                response.status
            );

            // If we have a previous successful value,
            // use it instead of returning an error.

            if (cachedVisits !== null) {

                return res.json({
                    success: true,
                    visits: cachedVisits,
                    cached: true,
                    upstreamStatus: response.status
                });

            }

            return res.status(502).json({
                success: false,
                error: "Roblox API request failed",
                status: response.status
            });

        }

        //==================================================
        // DECODE
        //==================================================

        let data;

        try {

            data = await response.json();

        } catch (error) {

            console.error(
                "[Roblox API] JSON decode error:",
                error.message
            );

            if (cachedVisits !== null) {

                return res.json({
                    success: true,
                    visits: cachedVisits,
                    cached: true
                });

            }

            return res.status(502).json({
                success: false,
                error: "Invalid Roblox API response"
            });

        }

        //==================================================
        // GAME NOT FOUND
        //==================================================

        if (!data.data || !data.data[0]) {

            console.error(
                "[Roblox API] Game not found:",
                universeId
            );

            return res.status(404).json({
                success: false,
                error: "Game not found"
            });

        }

        //==================================================
        // VISITS
        //==================================================

        const visits =
            Math.floor(
                Number(data.data[0].visits) || 0
            );

        //==================================================
        // PROTECT AGAINST BAD ZERO RESPONSE
        //==================================================

        if (
            visits === 0 &&
            cachedVisits !== null &&
            cachedVisits > 0
        ) {

            console.warn(
                "[Roblox API] Received 0 visits while cached value is",
                cachedVisits
            );

            return res.json({
                success: true,
                visits: cachedVisits,
                cached: true
            });

        }

        //==================================================
        // SAVE CACHE
        //==================================================

        cachedVisits = visits;

        lastSuccessfulFetch = Date.now();

        console.log(
            "[Roblox API] Visits:",
            visits
        );

        //==================================================
        // RESPONSE
        //==================================================

        return res.json({
            success: true,
            visits: visits,
            cached: false,
            lastSuccessfulFetch: lastSuccessfulFetch
        });

    } catch (error) {

        console.error(
            "[Server] Unexpected error:",
            error
        );

        //==================================================
        // FINAL CACHE FALLBACK
        //==================================================

        if (cachedVisits !== null) {

            return res.json({
                success: true,
                visits: cachedVisits,
                cached: true
            });

        }

        return res.status(500).json({
            success: false,
            error: "Server error"
        });

    }

});

//==================================================
// START SERVER
//==================================================

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Roblox Visits API running on port ${PORT}`
    );

    console.log(
        `Universe ID: ${UNIVERSE_ID}`
    );

});
