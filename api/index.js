// Vercel Serverless Function Entry Point
let app;
try {
    app = require('../server/index.js');
} catch (e) {
    console.error("CRITICAL ERROR: Failed to load Express App:", e);
    // Return a fallback app that just reports the error
    const express = require('express');
    app = express();
    app.all('*', (req, res) => {
        res.status(500).json({
            error: "Server Startup Failed",
            details: e.message,
            stack: e.stack
        });
    });
}

module.exports = app;
