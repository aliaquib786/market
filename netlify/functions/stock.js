// Netlify Function: /.netlify/functions/stock
// Fetches Yahoo Finance server-side - no CORS issues

exports.handler = async function(event) {
  const p = event.queryStringParameters || {};
  const { sym, q, type, range, interval } = p;

  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Cache-Control': 'public, max-age=15',
  };

  if(event.httpMethod === 'OPTIONS')
    return { statusCode:200, headers:cors, body:'' };

  const hdrs = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://finance.yahoo.com/',
    'Origin': 'https://finance.yahoo.com',
  };

  try {
    // ── SEARCH ──
    if(type === 'search' && q) {
      const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=15&newsCount=0`;
      const r   = await fetch(url, { headers: hdrs });
      const d   = await r.json();
      return { statusCode:200, headers:cors, body: JSON.stringify(d) };
    }

    // ── QUOTE / CHART ──
    if(!sym) return { statusCode:400, headers:cors, body: JSON.stringify({error:'Missing sym'}) };

    const iv  = interval || '1d';
    const rng = range    || '5d';

    // Try query1 then query2
    for(const host of ['query1','query2']) {
      try {
        const url = `https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${iv}&range=${rng}`;
        const r   = await fetch(url, { headers: hdrs });
        if(!r.ok) continue;
        const d = await r.json();
        if(d?.chart?.result?.[0]?.meta?.regularMarketPrice) {
          return { statusCode:200, headers:cors, body: JSON.stringify(d) };
        }
      } catch(e) {}
    }

    return { statusCode:404, headers:cors, body: JSON.stringify({error:'No data for '+sym}) };

  } catch(e) {
    return { statusCode:500, headers:cors, body: JSON.stringify({error:e.message}) };
  }
};
