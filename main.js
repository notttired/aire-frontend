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

const SERVER_URL = '/api-proxy'; // Change this to your server URL if different

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

    // Close autocomplete when clicking outside
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

// Also convert origin and destination to uppercase
originInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

destinationInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('Form submitted - starting scrape request');

    // Clear previous results
    statusDiv.innerHTML = '';
    resultsDiv.innerHTML = '';

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Scraping...';

    // Get form values
    const origin = document.getElementById('origin').value.toUpperCase();
    const destination = document.getElementById('destination').value.toUpperCase();
    const outbound = document.getElementById('outbound').value;
    const airline = document.getElementById('airline').value.toUpperCase();
    const retries = parseInt(document.getElementById('retries').value);
    const proxy = document.getElementById('proxy').value || null;

    // Format outbound date to ISO string with midnight time
    const outboundDate = new Date(outbound + 'T00:00:00').toISOString();

    // Prepare payload
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

    // Show status
    statusDiv.innerHTML = `<p class="info">Sending request to ${SERVER_URL}/scrape...</p>`;
    console.log('Sending request to:', `${SERVER_URL}/scrape`);

    try {
        const jsonPayload = JSON.stringify(payload);
        console.log('JSON payload:', jsonPayload);

        const response = await fetch(`${SERVER_URL}/scrape`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: jsonPayload
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        // Get raw response text first
        const rawResponse = await response.text();
        console.log('Raw response:', rawResponse);

        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(rawResponse);
            console.log('Parsed response data:', data);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Failed to parse response as JSON');
            statusDiv.innerHTML = `<p class="error">✗ Invalid JSON response from server</p>`;
            resultsDiv.innerHTML = `<pre>Raw response:\n${rawResponse}\n\nParse error: ${parseError.message}</pre>`;
            return;
        }

        if (response.ok) {
            statusDiv.innerHTML = `<p class="success">✓ Request completed successfully!</p>`;
        } else {
            statusDiv.innerHTML = `<p class="error">✗ Error: ${response.status} ${response.statusText}</p>`;
            console.error('API Error:', {
                status: response.status,
                statusText: response.statusText,
                data: data
            });
        }

        // Display formatted JSON response
        resultsDiv.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    } catch (error) {
        const errorDetails = {
            message: error.message,
            name: error.name,
            stack: error.stack
        };
        console.error('Network/Fetch Error:', errorDetails);
        console.error('Full error object:', error);

        // Check for CORS error
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
            statusDiv.innerHTML = `<p class="error">✗ CORS Error or Network Error: ${error.message}<br><br>Make sure your server has CORS enabled and is running at ${SERVER_URL}</p>`;
        } else {
            statusDiv.innerHTML = `<p class="error">✗ Network Error: ${error.message}</p>`;
        }

        resultsDiv.innerHTML = `<pre>${JSON.stringify(errorDetails, null, 2)}</pre>`;
    }
});

// Poll for results
async function pollResults(taskId) {
    const maxAttempts = 60; // Poll for up to 60 seconds
    let attempts = 0;

    statusDiv.innerHTML = `<p class="info">⏳ Task submitted (ID: ${taskId}). Waiting for results...</p>`;

    const pollInterval = setInterval(async () => {
        attempts++;

        try {
            console.log(`Polling attempt ${attempts} for task ${taskId}`);

            const response = await fetch(`${SERVER_URL}/results/${taskId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            const rawResponse = await response.text();
            console.log('Poll raw response:', rawResponse);

            let data;
            try {
                data = JSON.parse(rawResponse);
                console.log('Poll parsed data:', data);
            } catch (parseError) {
                console.error('JSON parse error in poll:', parseError);
                clearInterval(pollInterval);
                statusDiv.innerHTML = `<p class="error">✗ Invalid JSON response from server</p>`;
                resultsDiv.innerHTML = `<pre>Raw response:\n${rawResponse}\n\nParse error: ${parseError.message}</pre>`;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Scrape Flights';
                return;
            }

            if (data.status === 'success') {
                clearInterval(pollInterval);
                statusDiv.innerHTML = `<p class="success">✓ Scraping completed successfully!</p>`;
                resultsDiv.innerHTML = `<pre>${JSON.stringify(data.data, null, 2)}</pre>`;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Scrape Flights';
            } else if (data.status === 'failed') {
                clearInterval(pollInterval);
                statusDiv.innerHTML = `<p class="error">✗ Task failed: ${data.error || 'Unknown error'}</p>`;
                resultsDiv.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Scrape Flights';
            } else if (data.status === 'pending') {
                statusDiv.innerHTML = `<p class="info">⏳ Task in progress (${attempts}s elapsed)...</p>`;
            }

            if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                statusDiv.innerHTML = `<p class="error">✗ Timeout: Task did not complete within ${maxAttempts} seconds</p>`;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Scrape Flights';
            }
        } catch (error) {
            console.error('Polling error:', error);
            clearInterval(pollInterval);
            statusDiv.innerHTML = `<p class="error">✗ Error polling results: ${error.message}</p>`;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Scrape Flights';
        }
    }, 1000); // Poll every second
}

// Form submission - modified to handle task ID response
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('Form submitted - starting scrape request');

    // Clear previous results
    statusDiv.innerHTML = '';
    resultsDiv.innerHTML = '';

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Scraping...';

    // Get form values
    const origin = document.getElementById('origin').value.toUpperCase();
    const destination = document.getElementById('destination').value.toUpperCase();
    const outbound = document.getElementById('outbound').value;
    const airline = document.getElementById('airline').value.toUpperCase();
    const retries = parseInt(document.getElementById('retries').value);
    const proxy = document.getElementById('proxy').value || null;

    // Format outbound date to ISO string with midnight time
    const outboundDate = new Date(outbound + 'T00:00:00').toISOString();

    // Prepare payload
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

    // Show status
    statusDiv.innerHTML = `<p class="info">Sending request to ${SERVER_URL}/scrape...</p>`;
    console.log('Sending request to:', `${SERVER_URL}/scrape`);

    try {
        const jsonPayload = JSON.stringify(payload);
        console.log('JSON payload:', jsonPayload);

        const response = await fetch(`${SERVER_URL}/scrape`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            mode: 'cors',
            credentials: 'omit',
            body: jsonPayload
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        // Get raw response text first
        const rawResponse = await response.text();
        console.log('Raw response:', rawResponse);

        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(rawResponse);
            console.log('Parsed response data:', data);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Failed to parse response as JSON');
            statusDiv.innerHTML = `<p class="error">✗ Invalid JSON response from server</p>`;
            resultsDiv.innerHTML = `<pre>Raw response:\n${rawResponse}\n\nParse error: ${parseError.message}</pre>`;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Scrape Flights';
            return;
        }

        if (response.ok) {
            // Check if we got a task_id - if so, start polling
            if (data.task_id) {
                console.log('Task ID received:', data.task_id);
                await pollResults(data.task_id);
            } else {
                // Direct response
                statusDiv.innerHTML = `<p class="success">✓ Request completed successfully!</p>`;
                resultsDiv.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Scrape Flights';
            }
        } else {
            statusDiv.innerHTML = `<p class="error">✗ Error: ${response.status} ${response.statusText}</p>`;
            console.error('API Error:', {
                status: response.status,
                statusText: response.statusText,
                data: data
            });

            // Display formatted JSON response
            resultsDiv.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Scrape Flights';
        }
    } catch (error) {
        const errorDetails = {
            message: error.message,
            name: error.name,
            stack: error.stack
        };
        console.error('Network/Fetch Error:', errorDetails);
        console.error('Full error object:', error);

        // Check for CORS error
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
            statusDiv.innerHTML = `<p class="error">✗ CORS Error or Network Error: ${error.message}<br><br>Make sure your server has CORS enabled and is running at ${SERVER_URL}</p>`;
        } else {
            statusDiv.innerHTML = `<p class="error">✗ Network Error: ${error.message}</p>`;
        }

        resultsDiv.innerHTML = `<pre>${JSON.stringify(errorDetails, null, 2)}</pre>`;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Scrape Flights';
    } finally {
        // Button re-enabling is now handled in pollResults or error cases
    }
});

// Log payload for debugging (optional)
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