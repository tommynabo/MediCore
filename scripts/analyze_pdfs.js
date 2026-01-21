const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse-new');

const ASSETS_DIR = path.join(__dirname, '../assets');

async function analyzePDFs() {
    const files = fs.readdirSync(ASSETS_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
    console.log(`Found ${files.length} PDFs to analyze.\n`);

    const results = [];

    for (const file of files) {
        const filePath = path.join(ASSETS_DIR, file);
        const dataBuffer = fs.readFileSync(filePath);

        try {
            const data = await pdf(dataBuffer);
            const text = data.text.trim();
            const firstLines = text.split('\n').filter(l => l.trim().length > 0).slice(0, 5).join(' | ');

            // Heuristic detection
            let lang = 'es'; // Default
            if (text.includes('Consent') || text.includes('Patient')) lang = 'en';
            if (text.includes('Consentiment') || text.includes('Pacient')) lang = 'ca'; // Catalan guesses

            // Guess Title
            // Usually the first bold line or top line. We'll take the first non-empty line as a draft.
            let title = text.split('\n').find(l => l.trim().length > 5 && l.trim().length < 100) || file;
            title = title.trim();

            results.push({
                file,
                title,
                lang,
                preview: firstLines.substring(0, 100)
            });

            console.log(`Processed ${file}:`);
            console.log(`   Title: ${title}`);
            console.log(`   Language: ${lang}`);
            console.log(`   Preview: ${firstLines.substring(0, 80)}...`);
            console.log('-------------------');

        } catch (e) {
            console.error(`Error reading ${file}:`, e.message);
        }
    }

    // Save metadata for later use
    fs.writeFileSync(path.join(__dirname, '../assets/pdf_metadata.json'), JSON.stringify(results, null, 2));
    console.log("\nSaved metadata to assets/pdf_metadata.json");
}

analyzePDFs();
