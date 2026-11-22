// Computer-network simulation engines. Simplified educational models.

// ------------------------------------------------------------------ IPv4 / subnetting
export const parseIP = (s: string): number => {
  const p = s.trim().split('.');
  if (p.length !== 4 || p.some(x => !/^\d{1,3}$/.test(x) || +x > 255)) throw new Error(`"${s}" is not a valid IPv4 address (use four numbers 0-255, e.g. 192.168.1.130).`);
  return ((+p[0] << 24) | (+p[1] << 16) | (+p[2] << 8) | +p[3]) >>> 0;
};
export const fmtIP = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
export const bin32 = (n: number) => (n >>> 0).toString(2).padStart(32, '0').replace(/(.{8})(?!$)/g, '$1.');
export interface Subnet { ip: string; prefix: number; mask: string; wildcard: string; network: string; broadcast: string; firstHost: string; lastHost: string; total: number; usable: number; ipBin: string; maskBin: string; netBin: string; cls: string; isPrivate: boolean }
export function subnet(ipStr: string, prefix: number): Subnet {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error('Prefix length must be an integer from 0 to 32.');
  const ip = parseIP(ipStr);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const net = (ip & mask) >>> 0, bc = (net | (~mask >>> 0)) >>> 0;
  const total = 2 ** (32 - prefix);
  const usable = prefix === 32 ? 1 : prefix === 31 ? 2 : total - 2; // /31 point-to-point (RFC 3021), /32 single host
  const first = prefix >= 31 ? net : net + 1, last = prefix >= 31 ? bc : bc - 1;
  const a = ip >>> 24;
  const cls = a < 128 ? 'A' : a < 192 ? 'B' : a < 224 ? 'C' : a < 240 ? 'D (multicast)' : 'E (reserved)';
  const isPrivate = a === 10 || (a === 172 && ((ip >>> 16) & 255) >= 16 && ((ip >>> 16) & 255) <= 31) || (a === 192 && ((ip >>> 16) & 255) === 168);
  return { ip: fmtIP(ip), prefix, mask: fmtIP(mask), wildcard: fmtIP(~mask >>> 0), network: fmtIP(net), broadcast: fmtIP(bc), firstHost: fmtIP(first), lastHost: fmtIP(last), total, usable, ipBin: bin32(ip), maskBin: bin32(mask), netBin: bin32(net), cls, isPrivate };
}
export const sameSubnet = (a: string, b: string, prefix: number) => subnet(a, prefix).network === subnet(b, prefix).network;
/** VLSM: smallest prefix that gives at least `hosts` usable addresses */
export const prefixForHosts = (hosts: number) => { for (let p = 30; p >= 0; p--) if (2 ** (32 - p) - 2 >= hosts) return p; return 0; };

// ------------------------------------------------------------------ TCP
export type Drop = null | 'SYN' | 'SYN-ACK' | 'ACK';
export interface TcpEvent { t: number; from: 'Client' | 'Server' | '—'; to: 'Client' | 'Server' | '—'; flags: string; seq?: number; ack?: number; lost: boolean; note: string; clientState: string; serverState: string }
export function tcpHandshake(opts: { drop?: Drop; isnC?: number; isnS?: number; rto?: number } = {}) {
  const x = opts.isnC ?? 1000, y = opts.isnS ?? 5000, rto = opts.rto ?? 3, drop = opts.drop ?? null;
  const ev: TcpEvent[] = []; let t = 0, cs = 'CLOSED', ss = 'LISTEN', retrans = 0, dropped = false;
  const push = (e: Omit<TcpEvent, 't' | 'clientState' | 'serverState'>) => { ev.push({ ...e, t, clientState: cs, serverState: ss }); };
  const lose = (flag: Drop) => { if (drop === flag && !dropped) { dropped = true; return true; } return false; };
  cs = 'SYN_SENT'; const synLost = lose('SYN');
  push({ from: 'Client', to: 'Server', flags: 'SYN', seq: x, lost: synLost, note: synLost ? 'SYN is lost in the network.' : 'Client picks an initial sequence number and asks to open a connection.' }); t++;
  if (synLost) { t += rto; retrans++; push({ from: 'Client', to: 'Server', flags: 'SYN (retransmit)', seq: x, lost: false, note: `No SYN-ACK arrived within the retransmission timeout (${rto} ticks): the client retransmits.` }); t++; }
  ss = 'SYN_RCVD'; const saLost = lose('SYN-ACK');
  push({ from: 'Server', to: 'Client', flags: 'SYN-ACK', seq: y, ack: x + 1, lost: saLost, note: saLost ? 'SYN-ACK is lost in the network.' : `Server acknowledges the client's SYN (ack = ${x} + 1) and sends its own initial sequence number.` }); t++;
  if (saLost) { t += rto; retrans++; push({ from: 'Server', to: 'Client', flags: 'SYN-ACK (retransmit)', seq: y, ack: x + 1, lost: false, note: 'The server never got an ACK, so its timer expires and it retransmits the SYN-ACK.' }); t++; }
  cs = 'ESTABLISHED'; const aLost = lose('ACK');
  push({ from: 'Client', to: 'Server', flags: 'ACK', seq: x + 1, ack: y + 1, lost: aLost, note: aLost ? 'The final ACK is lost. The client already considers the connection ESTABLISHED, but the server is still in SYN_RCVD.' : 'Client acknowledges the server (ack = y + 1). Both sides now agree on both sequence numbers.' }); t++;
  if (aLost) { t += rto; retrans++; push({ from: 'Server', to: 'Client', flags: 'SYN-ACK (retransmit)', seq: y, ack: x + 1, lost: false, note: 'The server times out waiting for the ACK and retransmits its SYN-ACK.' }); t++;
    push({ from: 'Client', to: 'Server', flags: 'ACK (again)', seq: x + 1, ack: y + 1, lost: false, note: 'The client re-sends the ACK.' }); t++; }
  ss = 'ESTABLISHED'; push({ from: '—', to: '—', flags: '', lost: false, note: 'Connection established on both sides: data may now flow.' });
  return { events: ev, retransmissions: retrans, clientState: cs, serverState: ss };
}
export const tcpClose = () => [
  { from: 'Client', to: 'Server', flags: 'FIN', note: 'Client has no more data: sends FIN (client → FIN_WAIT_1).' },
  { from: 'Server', to: 'Client', flags: 'ACK', note: 'Server acknowledges the FIN (server → CLOSE_WAIT, client → FIN_WAIT_2). The server may still send data (half-close).' },
  { from: 'Server', to: 'Client', flags: 'FIN', note: 'Server finishes sending and sends its own FIN (server → LAST_ACK).' },
  { from: 'Client', to: 'Server', flags: 'ACK', note: 'Client acknowledges and enters TIME_WAIT (waits 2×MSL so stray packets die); the server closes immediately.' },
];

// ------------------------------------------------------------------ routing
export interface Link { a: string; b: string; cost: number }
export function nodesOf(links: Link[]) { return [...new Set(links.flatMap(l => [l.a, l.b]))].sort(); }
export function shortestPaths(links: Link[], src: string) {
  const nodes = nodesOf(links); const dist: Record<string, number> = {}, prev: Record<string, string | null> = {}, done = new Set<string>(); const order: string[] = [];
  nodes.forEach(n => { dist[n] = Infinity; prev[n] = null; }); dist[src] = 0;
  while (done.size < nodes.length) {
    const u = nodes.filter(n => !done.has(n)).sort((p, q) => dist[p] - dist[q] || (p < q ? -1 : 1))[0];
    if (dist[u] === Infinity) break; done.add(u); order.push(u);
    links.forEach(l => { const v = l.a === u ? l.b : l.b === u ? l.a : null; if (v && !done.has(v) && dist[u] + l.cost < dist[v]) { dist[v] = dist[u] + l.cost; prev[v] = u; } });
  }
  const pathTo = (d: string): string[] | null => { if (dist[d] === Infinity) return null; const p = [d]; while (prev[p[0]]) p.unshift(prev[p[0]]!); return p; };
  const table = nodes.filter(n => n !== src).map(d => { const p = pathTo(d); return { dest: d, cost: dist[d], nextHop: p ? p[1] : null, path: p }; });
  return { dist, prev, order, table, pathTo };
}
/** Distance-vector (Bellman-Ford style) rounds: every router exchanges vectors with neighbours until nothing changes. */
export function distanceVector(links: Link[]) {
  const nodes = nodesOf(links); let tables: Record<string, Record<string, number>> = {};
  nodes.forEach(n => { tables[n] = {}; nodes.forEach(m => (tables[n][m] = n === m ? 0 : Infinity)); });
  links.forEach(l => { tables[l.a][l.b] = Math.min(tables[l.a][l.b], l.cost); tables[l.b][l.a] = Math.min(tables[l.b][l.a], l.cost); });
  const rounds = [structuredClone(tables)]; let changed = true, guard = 0;
  while (changed && guard++ < 50) {
    changed = false; const next = structuredClone(tables);
    links.forEach(l => [[l.a, l.b], [l.b, l.a]].forEach(([u, v]) => nodes.forEach(d => { const c = l.cost + tables[v][d]; if (c < next[u][d]) { next[u][d] = c; changed = true; } })));
    tables = next; if (changed) rounds.push(structuredClone(tables));
  }
  return { rounds, final: tables };
}

// ------------------------------------------------------------------ error detection
export function crc(data: string, gen: string): { remainder: string; codeword: string; steps: string[] } {
  if (!/^[01]+$/.test(data) || !/^1[01]*$/.test(gen) || gen.length < 2) throw new Error('Data and generator must be binary strings; the generator must start with 1 and have at least 2 bits.');
  const r = gen.length - 1; let bits = (data + '0'.repeat(r)).split(''); const steps: string[] = [];
  for (let i = 0; i < data.length; i++) if (bits[i] === '1') { for (let j = 0; j < gen.length; j++) bits[i + j] = bits[i + j] === gen[j] ? '0' : '1'; steps.push(bits.join('')); }
  const remainder = bits.slice(data.length).join('');
  return { remainder, codeword: data + remainder, steps };
}
export const crcCheck = (word: string, gen: string) => !crc(word.slice(0, word.length - (gen.length - 1)) || '0', gen).remainder.includes('1') || /^0*$/.test(crcRemainder(word, gen));
export function crcRemainder(word: string, gen: string) { const bits = word.split(''); for (let i = 0; i <= word.length - gen.length; i++) if (bits[i] === '1') for (let j = 0; j < gen.length; j++) bits[i + j] = bits[i + j] === gen[j] ? '0' : '1'; return bits.slice(word.length - gen.length + 1).join(''); }
export const parityBit = (data: string, even = true) => { const ones = [...data].filter(c => c === '1').length; return String((ones % 2 === 0) === even ? 0 : 1); };
export function internetChecksum(words: number[]) { let s = 0; words.forEach(w => { s += w & 0xffff; while (s > 0xffff) s = (s & 0xffff) + (s >>> 16); }); return ~s & 0xffff; }

// ------------------------------------------------------------------ packet journey (IP end-to-end vs MAC hop-by-hop)
export interface Node { name: string; kind: 'host' | 'router' | 'server'; ifaces: { link: string; ip: string; mac: string }[] }
export interface Frame { link: string; from: string; to: string; srcMac: string; dstMac: string; srcIp: string; dstIp: string; ttl: number; note: string }
export const DEMO_TOPOLOGY: Node[] = [
  { name: 'Laptop', kind: 'host', ifaces: [{ link: 'Laptop-R1', ip: '192.168.1.10', mac: 'AA:AA:AA:00:00:10' }] },
  { name: 'Home router (R1)', kind: 'router', ifaces: [{ link: 'Laptop-R1', ip: '192.168.1.1', mac: 'BB:BB:BB:00:00:01' }, { link: 'R1-R2', ip: '203.0.113.2', mac: 'BB:BB:BB:00:00:02' }] },
  { name: 'ISP router (R2)', kind: 'router', ifaces: [{ link: 'R1-R2', ip: '203.0.113.1', mac: 'CC:CC:CC:00:00:01' }, { link: 'R2-Server', ip: '198.51.100.1', mac: 'CC:CC:CC:00:00:02' }] },
  { name: 'Web server', kind: 'server', ifaces: [{ link: 'R2-Server', ip: '198.51.100.80', mac: 'DD:DD:DD:00:00:80' }] },
];
export function packetJourney(topo: Node[], opts: { nat?: boolean; ttl?: number } = {}): Frame[] {
  let ttl = opts.ttl ?? 64; const frames: Frame[] = []; const dst = topo[topo.length - 1].ifaces[0].ip; let src = topo[0].ifaces[0].ip;
  for (let i = 0; i < topo.length - 1; i++) {
    const a = topo[i], b = topo[i + 1]; const link = a.ifaces.find(f => b.ifaces.some(g => g.link === f.link))!; const peer = b.ifaces.find(g => g.link === link.link)!;
    let note = `Link ${link.link}: the MAC addresses name only the two ends of THIS link.`;
    if (a.kind === 'router') { ttl--; note += ` ${a.name} decremented the TTL.`; if (opts.nat && i === 1) { src = link.ip; note += ` NAT rewrote the source IP to the router's public address ${link.ip}.`; } }
    if (ttl <= 0) { frames.push({ link: link.link, from: a.name, to: b.name, srcMac: link.mac, dstMac: peer.mac, srcIp: src, dstIp: dst, ttl: 0, note: 'TTL reached 0: the packet is dropped and an ICMP Time Exceeded is returned.' }); break; }
    frames.push({ link: link.link, from: a.name, to: b.name, srcMac: link.mac, dstMac: peer.mac, srcIp: src, dstIp: dst, ttl, note });
  }
  return frames;
}
export const DNS_ZONE: Record<string, string> = { 'example.com': '198.51.100.80', 'www.example.com': '198.51.100.80', 'university.edu': '203.0.113.77' };
export function dnsResolve(name: string, cache: Record<string, string>) {
  const steps: string[] = []; const n = name.toLowerCase();
  if (cache[n]) { steps.push(`Browser/OS cache hit: ${n} = ${cache[n]} (no network traffic).`); return { ip: cache[n], steps, hit: true }; }
  steps.push(`Cache miss for ${n}.`, 'Ask the recursive resolver (e.g. your ISP).');
  const tld = n.split('.').slice(-1)[0];
  steps.push('Resolver → root server: "who handles .' + tld + '?"', 'Root → resolver: referral to the .' + tld + ' TLD servers.', 'Resolver → TLD server: "who handles ' + n.split('.').slice(-2).join('.') + '?"', 'TLD → resolver: referral to the domain\'s authoritative name server.');
  const ip = DNS_ZONE[n];
  if (!ip) { steps.push(`Authoritative server answers NXDOMAIN: ${n} does not exist.`); return { ip: null, steps, hit: false }; }
  steps.push(`Authoritative server → resolver: A record ${n} = ${ip}.`, 'Resolver caches the answer (until its TTL expires) and returns it to the browser.');
  return { ip, steps, hit: false };
}
