// Vercel Serverless Function Entry Point
// We use lazy loading to ensure we can catch initialization errors within the request lifecycle
let app;

module.exports = async (req, res) => {
    try {
        if (!app) {
            console.log("🚀 Initializing Server in Vercel Context...");
            try {
                // Ensure dependencies are available
                require('express');
                require('cors');
                // Load the App
                app = require('../server/index.js');
                console.log("✅ Server Module Loaded Successfully from ../server/index.js");
            } catch (loadError) {
                console.error("❌ Failed to load server module from ../server/index.js. Checking path...");
                console.error("Current __dirname:", __dirname);
                try {
                    console.log("Attempting fallback require './server/index.js'...");
                    app = require('./server/index.js'); // Try alternate path if api/ is root
                } catch (e2) {
                    console.error("❌ Fallback failed:", e2.message);
                    throw loadError;
                }
            }
        }
        // Forward request to Express App (which is a function)
        return app(req, res);
    } catch (e) {
        console.error("CRITICAL SERVER ERROR:", e);
        // FORCE JSON RESPONSE
        res.status(500).json({
            error: "CRITICAL STARTUP ERROR",
            message: e.message,
            stack: e.stack,
            code: e.code,
            details: e.toString()
        });
    }
};
