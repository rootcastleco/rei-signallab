export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }
  return '';
};

export const safeFetchJson = async (endpoint, options = {}) => {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error('API returned HTML page instead of JSON. Ensure FastAPI server is running on port 8000.');
      }
      try {
        return JSON.parse(text);
      } catch {
        throw new Error('Server returned non-JSON response.');
      }
    }

    return await res.json();
  } catch (err) {
    throw err;
  }
};
