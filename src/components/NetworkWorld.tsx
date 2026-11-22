import { useMemo, useState } from 'react';
import { CN_CONCEPTS } from '../cn/concepts';
import { ConceptCards } from './ConceptCards';
import { useStepper } from './OSWorld';
import { DEMO_TOPOLOGY, Drop, Link, bin32, crc, crcRemainder, distanceVector, dnsResolve, nodesOf, packetJourney, parseIP, prefixForHosts, shortestPaths, subnet, tcpClose, tcpHandshake } from '../cn/engines';

function Subnetting() {
  const [ip, setIp] = useState('192.168.1.130'); const [prefix, setPrefix] = useState(26); const [hosts, setHosts] = useState(50);
  let s: ReturnType<typeof subnet> | null = null, err: string | null = null;
  try { s = subnet(ip, prefix); } catch (e: any) { err = e.message; }
  const maskBits = (n: number) => Array.from({ length: 32 }, (_, i) => (i < n ? 'n' : 'h'));
  const ipBits = (() => { try { return parseIP(ip).toString(2).padStart(32, '0'); } catch { return ''; } })();
  return (
    <div>
      <div className="controls"><label>IP address <input value={ip} onChange={e => setIp(e.target.value)} style={{ width: 150 }} /></label>
        <label>Prefix /{prefix} <input type="range" min={0} max={32} value={prefix} onChange={e => setPrefix(+e.target.value)} /></label></div>
      {err && <div className="err compile">{err}</div>}
      {s && (<>
        <div className="viz-label">The 32 bits: the first {prefix} are the network part, the rest identify the host</div>
        <div className="bits">{ipBits.split('').map((b, i) => <span key={i} className={`bit ${maskBits(prefix)[i]}`}>{b}{(i + 1) % 8 === 0 && i < 31 ? <i>.</i> : ''}</span>)}</div>
        <table className="sqlt"><tbody>
          {([['Subnet mask', s.mask], ['Mask (binary)', s.maskBin], ['Wildcard mask', s.wildcard], ['IP (binary)', s.ipBin], ['Network address', s.network], ['Network (binary)', s.netBin], ['Broadcast address', s.broadcast], ['First usable host', s.firstHost], ['Last usable host', s.lastHost], ['Total addresses', s.total.toLocaleString()], ['Usable hosts', s.usable.toLocaleString()], ['Class (historical)', s.cls], ['Private range (RFC 1918)', s.isPrivate ? 'yes' : 'no']] as const).map(([k, v]) => <tr key={k}><th>{k}</th><td className="mono">{v}</td></tr>)}</tbody></table>
        <div className="dim small">Usable = total − 2 (network and broadcast addresses are reserved), except /31 (point-to-point, both usable, RFC 3021) and /32 (a single host).</div></>)}
      <h4>VLSM helper</h4>
      <div className="controls"><label>Hosts needed <input type="number" min={1} value={hosts} onChange={e => setHosts(Math.max(1, +e.target.value || 1))} style={{ width: 90 }} /></label><b>→ smallest subnet: /{prefixForHosts(hosts)} ({(2 ** (32 - prefixForHosts(hosts)) - 2).toLocaleString()} usable hosts)</b></div>
    </div>
  );
}

function Tcp() {
  const [drop, setDrop] = useState<Drop>(null);
  const r = useMemo(() => tcpHandshake({ drop }), [drop]);
  const { i, ui } = useStepper(r.events.length);
  const shown = r.events.slice(0, i); const cur = shown[shown.length - 1];
  const close = tcpClose(); const [ci, setCi] = useState(0);
  return (
    <div>
      <div className="controls"><label>Interrupt a packet <select value={drop ?? ''} onChange={e => setDrop((e.target.value || null) as Drop)}><option value="">none</option><option value="SYN">drop the SYN</option><option value="SYN-ACK">drop the SYN-ACK</option><option value="ACK">drop the final ACK</option></select></label></div>
      {ui}
      <div className="tcp"><div className="host"><b>Client</b><div className="state">{cur?.clientState ?? 'CLOSED'}</div></div>
        <div className="wire">{shown.filter(e => e.flags).map((e, k) => <div key={k} className={`msg-row ${e.from === 'Client' ? 'r' : 'l'} ${e.lost ? 'lost' : ''}`}><span>{e.flags}{e.seq !== undefined ? ` seq=${e.seq}` : ''}{e.ack !== undefined ? ` ack=${e.ack}` : ''} {e.lost ? '✗ LOST' : ''} <i className="dim">t={e.t}</i></span></div>)}</div>
        <div className="host"><b>Server</b><div className="state">{cur?.serverState ?? 'LISTEN'}</div></div></div>
      <div className="card">{cur ? cur.note : 'Press Start. The client sends a SYN carrying its initial sequence number.'}</div>
      <div className="dim small">Why three messages? Each side must (1) announce its own initial sequence number and (2) hear that the other side received it. SYN-ACK combines the server's announcement with its acknowledgement, so three messages suffice. Retransmission timeout here is 3 ticks (real TCP uses an adaptive RTO, initially ≈1 s).</div>
      <h4>Connection termination (four-way)</h4>
      <div className="controls"><button onClick={() => setCi(x => Math.max(0, x - 1))} disabled={!ci}>◀ Back</button><button className="primary" onClick={() => setCi(x => Math.min(close.length, x + 1))} disabled={ci >= close.length}>Next ▶</button><button onClick={() => setCi(0)}>⏮ Reset</button></div>
      {close.slice(0, ci).map((c, k) => <div key={k} className="small"><b>{c.from} → {c.to}: {c.flags}</b> — {c.note}</div>)}
    </div>
  );
}

const DEFAULT_LINKS: Link[] = [{ a: 'A', b: 'B', cost: 1 }, { a: 'A', b: 'C', cost: 4 }, { a: 'B', b: 'C', cost: 2 }, { a: 'B', b: 'D', cost: 5 }, { a: 'C', b: 'D', cost: 1 }];
function Routing() {
  const [links, setLinks] = useState<Link[]>(DEFAULT_LINKS); const [src, setSrc] = useState('A'); const [dst, setDst] = useState('D'); const [na, setNa] = useState('A'); const [nb, setNb] = useState('D');
  const nodes = nodesOf(links); const sp = useMemo(() => shortestPaths(links, nodes.includes(src) ? src : nodes[0]), [links, src]); // eslint-disable-line
  const dv = useMemo(() => distanceVector(links), [links]);
  const { i, ui } = useStepper(dv.rounds.length - 1);
  const path = sp.pathTo(dst); const pos = (n: string) => { const k = nodes.indexOf(n); return { x: 130 + 90 * Math.cos((2 * Math.PI * k) / nodes.length - Math.PI / 2), y: 110 + 80 * Math.sin((2 * Math.PI * k) / nodes.length - Math.PI / 2) }; };
  const onPath = (a: string, b: string) => !!path && path.some((p, k) => k < path.length - 1 && ((p === a && path[k + 1] === b) || (p === b && path[k + 1] === a)));
  const round = dv.rounds[i] ?? dv.final; const fmt = (v: number) => (v === Infinity ? '∞' : v);
  return (
    <div>
      <div className="controls"><label>Source <select value={src} onChange={e => setSrc(e.target.value)}>{nodes.map(n => <option key={n}>{n}</option>)}</select></label>
        <label>Destination <select value={dst} onChange={e => setDst(e.target.value)}>{nodes.map(n => <option key={n}>{n}</option>)}</select></label></div>
      <div className="grid2"><div><svg width={260} height={220} className="chart">
        {links.map((l, k) => { const a = pos(l.a), b = pos(l.b); const hot = onPath(l.a, l.b); return <g key={k}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hot ? '#34d399' : '#8b93a0'} strokeWidth={hot ? 4 : 1.5} /><text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} className="ptr-lbl">{l.cost}</text></g>; })}
        {nodes.map(n => { const p = pos(n); return <g key={n} transform={`translate(${p.x},${p.y})`}><circle r={16} className={`tn ${path?.includes(n) ? 'visited' : ''}`} /><text y={4} textAnchor="middle" className="tl">{n}</text></g>; })}</svg>
        <div className="card">{path ? <>Shortest path {src} → {dst}: <b>{path.join(' → ')}</b> (cost <b>{sp.dist[dst]}</b>)</> : 'No route.'}</div>
        <h4>Change the network</h4>
        <table className="sqlt"><tbody>{links.map((l, k) => <tr key={k}><td>{l.a}–{l.b}</td><td><input type="number" min={1} value={l.cost} onChange={e => setLinks(ls => ls.map((x, j) => (j === k ? { ...x, cost: Math.max(1, +e.target.value || 1) } : x)))} style={{ width: 60 }} /></td><td><button onClick={() => setLinks(ls => ls.filter((_, j) => j !== k))}>remove link</button></td></tr>)}</tbody></table>
        <div className="controls"><input value={na} onChange={e => setNa(e.target.value.toUpperCase().slice(0, 2))} style={{ width: 50 }} /><input value={nb} onChange={e => setNb(e.target.value.toUpperCase().slice(0, 2))} style={{ width: 50 }} /><button onClick={() => { if (na && nb && na !== nb) setLinks(ls => [...ls.filter(l => !((l.a === na && l.b === nb) || (l.a === nb && l.b === na))), { a: na, b: nb, cost: 1 }]); }}>+ Add link</button><button onClick={() => setLinks(DEFAULT_LINKS)}>↺ Reset</button></div></div>
        <div><div className="viz-label">Routing table of {nodes.includes(src) ? src : nodes[0]} (link-state: Dijkstra)</div>
          <table className="sqlt"><thead><tr><th>Destination</th><th>Next hop</th><th>Cost</th><th>Path</th></tr></thead><tbody>{sp.table.map(t => <tr key={t.dest}><td>{t.dest}</td><td>{t.nextHop ?? '—'}</td><td>{fmt(t.cost)}</td><td>{t.path?.join('→') ?? 'unreachable'}</td></tr>)}</tbody></table>
          <div className="viz-label">Distance-vector exchange: round {i} of {dv.rounds.length - 1}</div>{ui}
          <table className="sqlt"><thead><tr><th>Router \ to</th>{nodes.map(n => <th key={n}>{n}</th>)}</tr></thead><tbody>{nodes.map(r => <tr key={r}><th>{r}</th>{nodes.map(n => <td key={n}>{fmt(round[r][n])}</td>)}</tr>)}</tbody></table>
          <div className="dim small">Each round, every router updates its estimates using its neighbours' tables. It converges to the same costs as Dijkstra.</div></div></div>
    </div>
  );
}

function Journey() {
  const [nat, setNat] = useState(true); const [ttl, setTtl] = useState(64); const [name, setName] = useState('example.com'); const [cache, setCache] = useState(false);
  const dns = useMemo(() => dnsResolve(name, cache ? { [name.toLowerCase()]: '198.51.100.80' } : {}), [name, cache]);
  const frames = useMemo(() => packetJourney(DEMO_TOPOLOGY, { nat, ttl }), [nat, ttl]);
  const phases = [
    { t: '1. Browser caches', d: cache ? `Hit: ${name} → ${dns.ip}. Skip DNS.` : 'Miss in browser/OS cache; the name must be resolved.' },
    { t: '2. DNS resolution', d: dns.steps.join('\n') },
    { t: '3. Destination IP', d: dns.ip ? `The browser now knows the destination IP: ${dns.ip}` : 'Resolution failed: the page cannot load (NXDOMAIN).' },
    { t: '4. TCP handshake', d: 'SYN → SYN-ACK → ACK to port 443 (see the TCP tab). Each message below travels through the same hops.' },
    { t: '5. TLS handshake (HTTPS)', d: 'ClientHello, ServerHello + certificate, key exchange, Finished. The certificate is checked against trusted CAs; then everything is encrypted with a shared key.' },
    { t: '6. HTTP request', d: 'GET / HTTP/1.1  Host: ' + name + ' (encrypted inside TLS).' },
    { t: '7. Packet transmission & router forwarding', d: 'See the frame table: the IP addresses stay the same end to end, but the MAC addresses (and TTL) change on every link.' },
    { t: '8. Server processing', d: 'The web server maps the request to a page, may query a database, and builds a response.' },
    { t: '9. HTTP response', d: 'HTTP/1.1 200 OK + HTML, returned along the reverse path (routes can differ).' },
    { t: '10. Browser rendering', d: 'Parse HTML, fetch CSS/JS/images (more requests), build the DOM, layout, paint.' },
  ];
  const { i, ui } = useStepper(phases.length);
  return (
    <div>
      <div className="note small">Simplified model of a page load over a small demo topology (Laptop → home router → ISP router → server). Real paths have many more hops, and TCP/TLS details (options, resumption, HTTP/2/3) are omitted.</div>
      <div className="controls"><label>URL host <input value={name} onChange={e => setName(e.target.value)} style={{ width: 160 }} /></label><label><input type="checkbox" checked={cache} onChange={e => setCache(e.target.checked)} /> DNS cached</label><label><input type="checkbox" checked={nat} onChange={e => setNat(e.target.checked)} /> NAT on home router</label><label>Initial TTL <input type="number" min={1} max={255} value={ttl} onChange={e => setTtl(Math.max(1, +e.target.value || 1))} style={{ width: 60 }} /></label></div>
      {ui}
      {phases.slice(0, Math.max(1, i)).map((p, k) => <div key={k} className={`card ${k === Math.max(1, i) - 1 ? 'cur' : ''}`}><b>{p.t}</b><pre className="a">{p.d}</pre></div>)}
      {i >= 7 && (<><h4>Frames on each link (logical IP vs hop-by-hop MAC)</h4>
        <table className="sqlt"><thead><tr><th>Link</th><th>Src MAC</th><th>Dst MAC</th><th>Src IP</th><th>Dst IP</th><th>TTL</th></tr></thead><tbody>{frames.map((f, k) => <tr key={k}><td>{f.from} → {f.to}</td><td className="mono">{f.srcMac}</td><td className="mono">{f.dstMac}</td><td className="mono">{f.srcIp}</td><td className="mono">{f.dstIp}</td><td>{f.ttl}</td></tr>)}</tbody></table>
        {frames.map((f, k) => <div key={k} className="small dim">{f.note}</div>)}</>)}
    </div>
  );
}

function Crc() {
  const [data, setData] = useState('1101011011'); const [gen, setGen] = useState('10011'); const [flip, setFlip] = useState<number | null>(null);
  let res: ReturnType<typeof crc> | null = null, err: string | null = null; try { res = crc(data, gen); } catch (e: any) { err = e.message; }
  const word = res ? res.codeword : ''; const recv = res && flip !== null ? word.slice(0, flip) + (word[flip] === '1' ? '0' : '1') + word.slice(flip + 1) : word;
  const rem = res ? crcRemainder(recv, gen) : '';
  return (
    <div>
      <div className="controls"><label>Data bits <input value={data} onChange={e => { setData(e.target.value.replace(/[^01]/g, '')); setFlip(null); }} style={{ width: 200 }} className="mono" /></label><label>Generator <input value={gen} onChange={e => { setGen(e.target.value.replace(/[^01]/g, '')); setFlip(null); }} style={{ width: 120 }} className="mono" /></label></div>
      {err && <div className="err compile">{err}</div>}
      {res && (<><div className="card">Append {gen.length - 1} zeros, divide (XOR long division) by {gen}. Remainder = <b className="mono">{res.remainder}</b> → transmitted codeword <b className="mono">{res.codeword}</b></div>
        <details open><summary className="small dim">Division steps</summary>{res.steps.map((s, k) => <div key={k} className="mono small">{s}</div>)}</details>
        <h4>Corrupt a bit in transit (click a bit)</h4>
        <div className="bits">{recv.split('').map((b, k) => <button key={k} className={`bit ${k === flip ? 'h' : 'n'}`} onClick={() => setFlip(flip === k ? null : k)}>{b}</button>)}</div>
        <div className={/^0*$/.test(rem) ? 'good' : 'bad'}>Receiver remainder: <b className="mono">{rem}</b> — {/^0*$/.test(rem) ? (flip === null ? '✓ accepted: no error detected.' : '✓ remainder is zero although a bit was flipped: an undetected error (possible only if the error pattern is a multiple of the generator).') : '✗ error detected: the frame is discarded.'}</div></>)}
    </div>
  );
}

export function NetworkWorld() {
  const [tab, setTab] = useState<'c' | 's' | 't' | 'r' | 'j' | 'e'>('c');
  const tabs = [['c', 'Concepts'], ['s', 'Subnetting Lab'], ['t', 'TCP Handshake'], ['r', 'Routing'], ['j', 'How the Internet Works'], ['e', 'Error Detection (CRC)']] as const;
  return (
    <div className="page"><h1>Network World</h1>
      <div className="note small">Simplified educational models backed by tested algorithms (subnet maths, TCP state machine, Dijkstra/distance-vector, CRC). They do not simulate real packets on a real network.</div>
      <div className="stage-bar">{tabs.map(([k, n]) => <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{n}</button>)}</div>
      {tab === 'c' && <ConceptCards concepts={CN_CONCEPTS} />}{tab === 's' && <Subnetting />}{tab === 't' && <Tcp />}{tab === 'r' && <Routing />}{tab === 'j' && <Journey />}{tab === 'e' && <Crc />}
    </div>
  );
}
void bin32;
