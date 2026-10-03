const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.json({
        success: true,
        status: "online"
    });
});

app.get("/roblox-visits/:universeId", async (req, res) => {
    try {
        const universeId = req.params.universeId;

        if (!/^\d+$/.test(universeId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid Universe ID"
            });
        }

        const response = await fetch(
            `https://games.roblox.com/v1/games?universeIds=${universeId}`
        );

        if (!response.ok) {
            return res.status(502).json({
                success: false,
                error: "Roblox API request failed"
            });
        }

        const data = await response.json();

        if (!data.data || !data.data[0]) {
            return res.status(404).json({
                success: false,
                error: "Game not found"
            });
        }

        res.json({
            success: true,
            visits: Math.floor(Number(data.data[0].visits) || 0)
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            error: "Server error"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Roblox Visits API running on port ${PORT}`);
});
