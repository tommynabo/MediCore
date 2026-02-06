const axios = require('axios');
const qs = require('qs');

// Configuration
const QUIPU_AUTH_URL = 'https://getquipu.com/oauth/token';
const QUIPU_API_URL = 'https://getquipu.com'; // Base URL changed to standard getquipu.com based on docs
const APP_ID = process.env.QUIPU_APP_ID;
const APP_SECRET = process.env.QUIPU_APP_SECRET;

let cachedToken = null;
let tokenExpiry = null;

// Client Instance
const quipuClient = axios.create({
    baseURL: QUIPU_API_URL,
    headers: {
        'Accept': 'application/vnd.quipu.v1+json',
        'Content-Type': 'application/vnd.quipu.v1+json'
    },
    timeout: 15000
});

/**
 * 🔐 Authenticate and get Bearer Token
 * Automatically handles token caching and renewal.
 */
async function getAuthToken() {
    // Check if we have a valid cached token
    if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
        return cachedToken;
    }

    console.log('🔐 [Quipu] Requesting new Access Token...');

    if (!APP_ID || !APP_SECRET) {
        throw new Error("Missing QUIPU_APP_ID or QUIPU_APP_SECRET in .env");
    }

    // Basic Auth Header: Base64(AppID:AppSecret)
    const credentials = Buffer.from(`${APP_ID}:${APP_SECRET}`).toString('base64');

    try {
        const response = await axios.post(QUIPU_AUTH_URL,
            qs.stringify({
                grant_type: 'client_credentials',
                scope: 'ecommerce' // Standard scope for API
            }),
            {
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                }
            }
        );

        const { access_token, expires_in } = response.data;

        cachedToken = access_token;
        // Set expiry 60 seconds before actual expiry to be safe
        tokenExpiry = new Date(new Date().getTime() + (expires_in - 60) * 1000);

        console.log('✅ [Quipu] Token acquired successfully.');
        return access_token;

    } catch (error) {
        console.error('❌ [Quipu] Auth Error:', error.response?.data || error.message);
        throw new Error('Failed to authenticate with Quipu');
    }
}

/**
 * 🛠 Helper to make authenticated requests
 */
async function makeRequest(method, url, data = null) {
    const token = await getAuthToken();
    try {
        const config = {
            method,
            url,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
        if (data) config.data = data;

        const response = await quipuClient(config);
        return response.data;
    } catch (error) {
        console.error(`❌ [Quipu] API Error [${method} ${url}]:`, error.response?.data || error.message);
        if (error.response?.data?.errors) {
            console.error('Validation Errors:', JSON.stringify(error.response.data.errors, null, 2));
        }
        throw error;
    }
}

/**
 * 👤 Get or Create Contact (Patient)
 */
async function getOrCreateContact(patient) {
    try {
        // 1. Search (Filtering by tax_id)
        // Docs suggest filtering might be available. If not, we iterate or rely on specialized endpoint.
        // Assuming standard filter pattern: filter[tax_id_eq] or similar. 
        // If filter fails, we'll implement a rough find manually for now (listing contacts is expensive though).
        // Let's try listing with filter first.

        const searchUrl = `/contacts?filter[tax_id]=${patient.tax_id}`; // Verify exact filter syntax in usage
        // Note: Docs section 11 mentions filters. Usually `filter[field]`.

        try {
            const searchRes = await makeRequest('GET', searchUrl);
            if (searchRes.data && searchRes.data.length > 0) {
                console.log(`✅ [Quipu] Contact found: ${patient.name} (${searchRes.data[0].id})`);
                return searchRes.data[0];
            }
        } catch (e) {
            console.warn('⚠️ Search filter might be invalid, trying creation directly.');
        }

        // 2. Create
        // Docs: POST /contacts
        /*
         {
           "data": {
             "type": "contacts",
             "attributes": { ... }
           }
         }
        */
        const payload = {
            data: {
                type: 'contacts',
                attributes: {
                    name: patient.name,
                    tax_id: patient.tax_id || 'UNKNOWN',
                    email: patient.email || '',
                    address: patient.address || '',
                    town: patient.city || '',
                    zip_code: patient.zip_code || '',
                    country_code: 'ES',
                    is_client: true
                }
            }
        };

        const createRes = await makeRequest('POST', '/contacts', payload);
        console.log(`✅ [Quipu] Contact created: ${patient.name}`);
        return createRes.data;

    } catch (error) {
        // Handle "already exists" explicitly if the API returns 422
        if (error.response?.status === 422) {
            console.warn('⚠️ Contact might already exist (422), attempting to allow manual linking or retry.');
        }
        throw error;
    }
}

/**
 * 🧾 Create Invoice
 */
async function createInvoice(contactId, items, date, dueDate, paymentMethod = 'credit_card') {
    // Construct Attributes for Items (Quipu specific structure)
    // Structure: relationships => items => data => [ { type, attributes: {} } ]

    // Payment method mapping (Quipu API values)
    const methodMap = {
        'card': 'bank_card',
        'credit_card': 'bank_card', // Correct Quipu value is 'bank_card'
        'cash': 'cash',
        'transfer': 'bank_transfer',
        'bank_transfer': 'bank_transfer',
        'direct_debit': 'direct_debit',
        'paypal': 'paypal',
        'check': 'check'
    };
    const finalMethod = methodMap[paymentMethod] || 'cash'; // Fallback to cash if unknown to avoid 422

    const itemsData = items.map(item => ({
        type: 'book_entry_items',
        attributes: {
            concept: item.name,
            unitary_amount: item.price.toString(), // API expects strings often for big decimals
            quantity: (item.quantity || 1),
            vat_percent: item.tax || 0, // 0 for medical services
            retention_percent: 0
        }
    }));

    const payload = {
        data: {
            type: 'invoices',
            attributes: {
                kind: 'income',
                issue_date: date,
                due_dates: [dueDate],
                paid_at: date, // Assuming instant payment
                payment_method: finalMethod
            },
            relationships: {
                contact: {
                    data: {
                        id: contactId,
                        type: 'contacts'
                    }
                },
                items: {
                    data: itemsData
                }
            }
        }
    };

    try {
        const res = await makeRequest('POST', '/invoices', payload);
        const invoice = res.data;

        console.log(`✅ [Quipu] Invoice Created: ID ${invoice.id}`);

        // Return structured result
        return {
            success: true,
            id: invoice.id,
            number: invoice.attributes.number || 'PENDING', // Might be null until approved depending on workflow
            raw: invoice
        };

    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * 📥 Get PDF URL
 */
async function getInvoicePdf(invoiceId) {
    try {
        const res = await makeRequest('GET', `/invoices/${invoiceId}`);
        // As per documentation search: attributes.download_pdf_url
        const url = res.data.attributes.download_pdf_url;
        if (!url) console.warn('⚠️ PDF URL not found in invoice attributes.');
        return url;
    } catch (error) {
        console.error(`❌ [Quipu] Failed to get PDF for ${invoiceId}`);
        return null;
    }
}

module.exports = {
    getOrCreateContact,
    createInvoice,
    getInvoicePdf
};
