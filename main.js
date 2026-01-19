// Airport data for search functionality
const airports = [
    { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto' },
    { code: 'YYC', name: 'Calgary International Airport', city: 'Calgary' },
    { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver' },
    { code: 'YUL', name: 'Montreal-Pierre Elliott Trudeau International Airport', city: 'Montreal' },
    { code: 'YEG', name: 'Edmonton International Airport', city: 'Edmonton' },
    { code: 'YHZ', name: 'Halifax Stanfield International Airport', city: 'Halifax' },
    { code: 'YOW', name: 'Ottawa Macdonald-Cartier International Airport', city: 'Ottawa' },
    { code: 'YWG', name: 'Winnipeg James Armstrong Richardson International Airport', city: 'Winnipeg' },
    { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York' },
    { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles' },
    { code: 'ORD', name: "O'Hare International Airport", city: 'Chicago' },
    { code: 'LHR', name: 'London Heathrow Airport', city: 'London' },
    { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris' },
    { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai' },
    { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo' },
];

const SERVER_URL = '/api';  // Uses Vercel API routes as proxy

// DOM elements
const form = document.getElementById('scrapeForm');
const originInput = document.getElementById('origin');
const destinationInput = document.getElementById('destination');
const originResults = document.getElementById('originResults');
const destinationResults = document.getElementById('destinationResults');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');
const submitBtn = document.getElementById('submitBtn');

// Set default outbound date to tomorrow
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const year = tomorrow.getFullYear();
const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
const day = String(tomorrow.getDate()).padStart(2, '0');
document.getElementById('outbound').value = `${year}-${month}-${day}`;

// Autocomplete functionality
function setupAutocomplete(input, resultsContainer) {
    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        resultsContainer.innerHTML = '';

        if (query.length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }

        const matches = airports.filter(airport =>
            airport.code.toLowerCase().includes(query) ||
            airport.name.toLowerCase().includes(query) ||
            airport.city.toLowerCase().includes(query)
        );

        if (matches.length > 0) {
            resultsContainer.style.display = 'block';
            matches.slice(0, 8).forEach(airport => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.innerHTML = `<strong>${airport.code}</strong> - ${airport.name} (${airport.city})`;
                div.addEventListener('click', () => {
                    input.value = airport.code;
                    resultsContainer.style.display = 'none';
                });
                resultsContainer.appendChild(div);
            });
        } else {
            resultsContainer.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target !== input) {
            resultsContainer.style.display = 'none';
        }
    });
}

setupAutocomplete(originInput, originResults);
setupAutocomplete(destinationInput, destinationResults);

// Convert airline code to uppercase
document.getElementById('airline').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

originInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

destinationInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// Enhanced fetch with better error handling
async function makeRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            },
            mode: 'cors',
            credentials: 'omit'
        });

        const rawResponse = await response.text();
        console.log('Raw response:', rawResponse);

        let data;
        try {
            data = JSON.parse(rawResponse);
        } catch (parseError) {
            throw new Error(`Invalid JSON response: ${parseError.message}`);
        }

        if (!response.ok) {
            throw new Error(data.detail || data.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return { ok: true, data };
    } catch (error) {
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
            throw new Error(`CORS or Network Error: Cannot connect to ${SERVER_URL}. Make sure the server is running and CORS is enabled.`);
        }
        throw error;
    }
}

// Poll for results
async function pollResults(taskId) {
    const maxAttempts = 60;
    let attempts = 0;

    statusDiv.innerHTML = `<p class="info">⏳ Task submitted (ID: ${taskId}). Waiting for results...</p>`;

    return new Promise((resolve, reject) => {
        const pollInterval = setInterval(async () => {
            attempts++;

            try {
                console.log(`Polling attempt ${attempts} for task ${taskId}`);

                const result = await makeRequest(`${SERVER_URL}/results/${taskId}`, {
                    method: 'GET'
                });

                const data = result.data;

                if (data.status === 'success') {
                    clearInterval(pollInterval);
                    statusDiv.innerHTML = `<p class="success">✓ Scraping completed successfully!</p>`;
                    resultsDiv.innerHTML = `<pre>${JSON.stringify(data.data, null, 2)}</pre>`;
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Scrape Flights';
                    resolve(data);
                } else if (data.status === 'failed') {
                    clearInterval(pollInterval);
                    statusDiv.innerHTML = `<p class="error">✗ Task failed: ${data.error || 'Unknown error'}</p>`;
                    resultsDiv.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Scrape Flights';
                    reject(new Error(data.error || 'Task failed'));
                } else if (data.status === 'pending') {
                    statusDiv.innerHTML = `<p class="info">⏳ Task in progress (${attempts}s elapsed)...</p>`;
                }

                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    statusDiv.innerHTML = `<p class="error">✗ Timeout: Task did not complete within ${maxAttempts} seconds</p>`;
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Scrape Flights';
                    reject(new Error('Timeout'));
                }
            } catch (error) {
                console.error('Polling error:', error);
                clearInterval(pollInterval);
                statusDiv.innerHTML = `<p class="error">✗ Error polling results: ${error.message}</p>`;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Scrape Flights';
                reject(error);
            }
        }, 1000);
    });
}

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('Form submitted - starting scrape request');

    statusDiv.innerHTML = '';
    resultsDiv.innerHTML = '';

    submitBtn.disabled = true;
    submitBtn.textContent = 'Scraping...';

    const origin = document.getElementById('origin').value.toUpperCase();
    const destination = document.getElementById('destination').value.toUpperCase();
    const outbound = document.getElementById('outbound').value;
    const airline = document.getElementById('airline').value.toUpperCase();
    const retries = parseInt(document.getElementById('retries').value);
    const proxy = document.getElementById('proxy').value || null;

    const outboundDate = new Date(outbound + 'T00:00:00').toISOString();

    const payload = {
        route: {
            origin: origin,
            destination: destination
        },
        outbound: outboundDate,
        airline: airline,
        retries: retries,
        proxy: proxy
    };

    console.log('Payload prepared:', payload);

    statusDiv.innerHTML = `<p class="info">Sending request to ${SERVER_URL}/scrape...</p>`;

    try {
        const result = await makeRequest(`${SERVER_URL}/scrape`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (result.data.task_id) {
            console.log('Task ID received:', result.data.task_id);
            await pollResults(result.data.task_id);
        } else {
            statusDiv.innerHTML = `<p class="success">✓ Request completed successfully!</p>`;
            resultsDiv.innerHTML = `<pre>${JSON.stringify(result.data, null, 2)}</pre>`;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Scrape Flights';
        }
    } catch (error) {
        console.error('Error:', error);
        statusDiv.innerHTML = `<p class="error">✗ ${error.message}</p>`;
        resultsDiv.innerHTML = `<pre>${JSON.stringify({
            error: error.message,
            details: 'Check the browser console for more information'
        }, null, 2)}</pre>`;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Scrape Flights';
    }
});

// Log payload for debugging
form.addEventListener('change', () => {
    const origin = document.getElementById('origin').value.toUpperCase();
    const destination = document.getElementById('destination').value.toUpperCase();
    const outbound = document.getElementById('outbound').value;
    const airline = document.getElementById('airline').value.toUpperCase();
    const retries = parseInt(document.getElementById('retries').value);
    const proxy = document.getElementById('proxy').value || null;

    if (origin && destination && outbound && airline) {
        const outboundDate = new Date(outbound + 'T00:00:00').toISOString();
        const payload = {
            route: { origin, destination },
            outbound: outboundDate,
            airline,
            retries,
            proxy
        };
        console.log('Current payload:', payload);
    }
});