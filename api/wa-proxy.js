const TARGET = 'http://132.145.42.123:8080';

module.exports = async function handler(req, res) {
  const path = req.query.path || '';
  const targetUrl = `${TARGET}/${path}`;

  const headers = {};
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
  if (req.headers['apikey']) headers['apikey'] = req.headers['apikey'];

  const fetchOptions = { method: req.method, headers };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => resolve(data));
    });
    if (body) fetchOptions.body = body;
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase()))
        res.setHeader(key, value);
    });
    res.end(data);
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  }
};
