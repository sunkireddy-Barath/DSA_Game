import { describe, expect, it } from 'vitest';
import { subnet, parseIP, fmtIP, prefixForHosts, sameSubnet, tcpHandshake, shortestPaths, distanceVector, crc, crcRemainder, parityBit, internetChecksum, packetJourney, DEMO_TOPOLOGY, dnsResolve } from './engines';

describe('subnetting', () => {
  it('192.168.1.130/26', () => {
    const s = subnet('192.168.1.130', 26);
    expect(s).toMatchObject({ mask: '255.255.255.192', network: '192.168.1.128', broadcast: '192.168.1.191', firstHost: '192.168.1.129', lastHost: '192.168.1.190', total: 64, usable: 62, cls: 'C', isPrivate: true, wildcard: '0.0.0.63' });
    expect(s.maskBin).toBe('11111111.11111111.11111111.11000000');
  });
  it('edge prefixes', () => {
    expect(subnet('10.1.2.3', 8)).toMatchObject({ network: '10.0.0.0', broadcast: '10.255.255.255', usable: 16777214 });
    expect(subnet('10.0.0.1', 30).usable).toBe(2); expect(subnet('10.0.0.1', 31).usable).toBe(2); expect(subnet('10.0.0.1', 32).usable).toBe(1);
    expect(subnet('8.8.8.8', 0)).toMatchObject({ network: '0.0.0.0', broadcast: '255.255.255.255', total: 4294967296 });
    expect(subnet('172.16.5.4', 12).network).toBe('172.16.0.0'); expect(subnet('172.32.0.1', 16).isPrivate).toBe(false);
  });
  it('validation and helpers', () => {
    expect(() => parseIP('256.1.1.1')).toThrow(); expect(() => parseIP('1.2.3')).toThrow(); expect(() => subnet('1.1.1.1', 33)).toThrow();
    expect(fmtIP(parseIP('192.0.2.5'))).toBe('192.0.2.5');
    expect(prefixForHosts(50)).toBe(26); expect(prefixForHosts(2)).toBe(30); expect(prefixForHosts(254)).toBe(24); expect(prefixForHosts(255)).toBe(23);
    expect(sameSubnet('192.168.1.10', '192.168.1.200', 24)).toBe(true); expect(sameSubnet('192.168.1.10', '192.168.2.10', 24)).toBe(false);
  });
});

describe('TCP handshake', () => {
  it('normal: SYN, SYN-ACK, ACK with correct numbers', () => {
    const r = tcpHandshake(); const f = r.events.filter(e => e.flags);
    expect(f.map(e => e.flags)).toEqual(['SYN', 'SYN-ACK', 'ACK']);
    expect([f[0].seq, f[1].seq, f[1].ack, f[2].seq, f[2].ack]).toEqual([1000, 5000, 1001, 1001, 5001]);
    expect(r.clientState).toBe('ESTABLISHED'); expect(r.serverState).toBe('ESTABLISHED'); expect(r.retransmissions).toBe(0);
  });
  for (const d of ['SYN', 'SYN-ACK', 'ACK'] as const) it(`lost ${d} is recovered by retransmission`, () => {
    const r = tcpHandshake({ drop: d }); expect(r.retransmissions).toBeGreaterThanOrEqual(1);
    expect(r.clientState).toBe('ESTABLISHED'); expect(r.serverState).toBe('ESTABLISHED');
    expect(r.events.filter(e => e.lost).length).toBe(1);
  });
  it('lost final ACK: client believes it is established while server is still SYN_RCVD', () => {
    const r = tcpHandshake({ drop: 'ACK' }); const lostAt = r.events.findIndex(e => e.lost);
    expect(r.events[lostAt].clientState).toBe('ESTABLISHED'); expect(r.events[lostAt].serverState).toBe('SYN_RCVD');
  });
  it('time moves forward', () => { const t = tcpHandshake({ drop: 'SYN' }).events.map(e => e.t); expect([...t].sort((a, b) => a - b)).toEqual(t); });
});

describe('routing', () => {
  const links = [{ a: 'A', b: 'B', cost: 1 }, { a: 'A', b: 'C', cost: 4 }, { a: 'B', b: 'C', cost: 2 }, { a: 'B', b: 'D', cost: 5 }, { a: 'C', b: 'D', cost: 1 }];
  it('Dijkstra', () => {
    const r = shortestPaths(links, 'A');
    expect(r.dist).toEqual({ A: 0, B: 1, C: 3, D: 4 }); expect(r.pathTo('D')).toEqual(['A', 'B', 'C', 'D']);
    expect(r.table.find(t => t.dest === 'D')).toMatchObject({ nextHop: 'B', cost: 4 });
  });
  it('distance vector converges to the same answer as Dijkstra from every node', () => {
    const dv = distanceVector(links);
    for (const n of ['A', 'B', 'C', 'D']) { const d = shortestPaths(links, n).dist; expect(dv.final[n]).toEqual(d); }
    expect(dv.rounds.length).toBeGreaterThan(1);
  });
  it('unreachable nodes', () => { const r = shortestPaths([{ a: 'A', b: 'B', cost: 1 }, { a: 'C', b: 'D', cost: 1 }], 'A'); expect(r.table.find(t => t.dest === 'C')!.nextHop).toBeNull(); });
  it('a cheaper link changes the route', () => {
    expect(shortestPaths([...links.slice(0, 4), { a: 'C', b: 'D', cost: 10 }], 'A').pathTo('D')).toEqual(['A', 'B', 'D']);
  });
});

describe('error detection', () => {
  it('CRC textbook example: 1101011011 / 10011 → 1110', () => {
    const r = crc('1101011011', '10011'); expect(r.remainder).toBe('1110'); expect(r.codeword).toBe('11010110111110');
    expect(crcRemainder(r.codeword, '10011')).toBe('0000');
    const bad = r.codeword.slice(0, 3) + (r.codeword[3] === '1' ? '0' : '1') + r.codeword.slice(4);
    expect(crcRemainder(bad, '10011')).not.toBe('0000');
  });
  it('parity and the RFC 1071 IPv4 header example', () => { expect(parityBit('1011', true)).toBe('1'); expect(parityBit('1001', true)).toBe('0'); expect(internetChecksum([0x4500, 0x0073, 0x0000, 0x4000, 0x4011, 0xc0a8, 0x0001, 0xc0a8, 0x00c7])).toBe(0xb861); });
  it('checksum verifies to zero when included', () => { const w = [0x1234, 0xabcd, 0x0f0f]; const c = internetChecksum(w); expect(internetChecksum([...w, c])).toBe(0); });
});

describe('packet journey', () => {
  it('IPs stay constant end-to-end while MACs change on every link and TTL drops per router', () => {
    const f = packetJourney(DEMO_TOPOLOGY, { ttl: 64 });
    expect(f.length).toBe(3);
    expect(new Set(f.map(x => x.srcIp)).size).toBe(1); expect(new Set(f.map(x => x.dstIp)).size).toBe(1);
    expect(new Set(f.map(x => x.srcMac)).size).toBe(3);
    expect(f.map(x => x.ttl)).toEqual([64, 63, 62]);
    expect(f[0].dstMac).toBe('BB:BB:BB:00:00:01');
  });
  it('NAT rewrites the source IP', () => { const f = packetJourney(DEMO_TOPOLOGY, { nat: true }); expect(f[0].srcIp).toBe('192.168.1.10'); expect(f[2].srcIp).toBe('203.0.113.2'); });
  it('small TTL expires in transit', () => { const f = packetJourney(DEMO_TOPOLOGY, { ttl: 1 }); expect(f[f.length - 1].ttl).toBe(0); expect(f.length).toBeLessThan(3); });
  it('DNS', () => {
    expect(dnsResolve('example.com', {}).ip).toBe('198.51.100.80');
    expect(dnsResolve('example.com', { 'example.com': '1.2.3.4' }).hit).toBe(true);
    expect(dnsResolve('nope.invalid', {}).ip).toBeNull();
  });
});
