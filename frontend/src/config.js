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
    const text = await res.text();

    if (!text || text.trim().startsWith('<') || text.trim().toLowerCase().startsWith('<!doctype')) {
      throw new Error('Server returned HTML instead of JSON');
    }

    return JSON.parse(text);
  } catch (err) {
    throw new Error(err.message || 'API Fetch Error');
  }
};
