import urllib.request,json,datetime,hashlib,concurrent.futures,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
start=int(datetime.datetime(2016,12,1,tzinfo=datetime.timezone.utc).timestamp())
end=int(datetime.datetime(2026,1,1,tzinfo=datetime.timezone.utc).timestamp())
def fetch(symbol):
 url=f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1={start}&period2={end}&interval=1d&events=div%2Csplits&includeAdjustedClose=true'
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
 data=urllib.request.urlopen(req,timeout=60).read()
 obj=json.loads(data);result=obj['chart']['result'][0]
 assert obj['chart']['error'] is None
 p=root/'research'/'raw'/f'{symbol}.json';p.write_bytes(data)
 return {'symbol':symbol,'url':url,'sha256':hashlib.sha256(data).hexdigest(),'observations':len(result['timestamp']),'retrieved_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'currency':result['meta']['currency']}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 records=list(pool.map(fetch,['BTC-USD','GLD','IEF','SPY','MCHI','THD']))
(root/'research'/'price-sources.json').write_text(json.dumps(records,indent=2))
for r in records: print(r['symbol'],r['observations'],r['currency'])
