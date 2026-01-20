// Vercel Serverless Function Entry Point
let app;
try {
    app = require('../server/index.js');
} catch (e) {
    console.error("CRITICAL ERROR: Failed to load Express App:", e);
    // Return a fallback app that just reports the error
    // We assume express is available because we moved it to root deps
    const express = require('express');
    app = express();
    app.all('*', (req, res) => {
        console.error("FALLBACK HANDLER CAUGHT:", e);
        res.status(500).json({
            error: "CRITICAL SERVER STARTUP ERROR",
            message: e.message,
            stack: e.stack
        });
    });
}

module.exports = app;
