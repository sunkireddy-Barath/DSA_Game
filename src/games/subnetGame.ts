// Subnet Sniper: IPv4 subnet questions with multiple-choice answers. Every answer is computed by the tested subnet engine.
import { fmtIP, parseIP, prefixForHosts, subnet } from '../cn/engines';
import { int, Level, pick, Rand, rng, shuffle, Stars } from './rng';

export interface SnQuestion { prompt: string; options: string[]; correct: number; explain: string; kind: string }
export interface SnRound { questions: SnQuestion[]; level: Level }

const RANGES: Record<Level, { prefixes: number[]; kinds: string[] }> = {
  1: { prefixes: [24, 25, 26, 27, 28, 29, 30], kinds: ['hosts', 'broadcast', 'network'] },
  2: { prefixes: [16, 20, 22, 23, 24, 25, 26, 27, 28, 29], kinds: ['hosts', 'broadcast', 'network', 'first', 'last', 'need'] },
  3: { prefixes: [17, 19, 21, 22, 23, 25, 26, 27, 28, 29, 30], kinds: ['hosts', 'broadcast', 'network', 'first', 'last', 'same', 'need'] },
};

const randomIp = (r: Rand, level: Level) => { const base = pick(r, level === 1 ? ['192.168.1', '192.168.10', '10.0.0'] : ['192.168', '172.16', '10']); const parts = base.split('.').length; return [...base.split('.'), ...Array.from({ length: 4 - parts }, () => String(int(r, 0, 255)))].join('.'); };

function options(r: Rand, correct: string, near: string[]): { options: string[]; correct: number } {
  const set = [...new Set([correct, ...near.filter(x => x !== correct)])].slice(0, 4);
  // guaranteed-distinct fallbacks so every question has exactly four different choices
  for (let k = 1; set.length < 4; k++) {
    const extra = /^\d+$/.test(correct) ? String(Number(correct) + 2 * k + 1) : /^\//.test(correct) ? `/${Number(correct.slice(1)) + 3 + k}` : fmtIP((parseIP(correct) + 4 * k + 1) >>> 0);
    if (!set.includes(extra)) set.push(extra);
  }
  const mixed = shuffle(r, set);
  return { options: mixed, correct: mixed.indexOf(correct) };
}

export function makeQuestion(r: Rand, level: Level): SnQuestion {
  const cfg = RANGES[level];
  const kind = pick(r, cfg.kinds);
  const prefix = pick(r, cfg.prefixes);
  const ip = randomIp(r, level);
  const s = subnet(ip, prefix);
  const net = parseIP(s.network), bc = parseIP(s.broadcast);
  const bits = `${prefix} network bits leave ${32 - prefix} host bits`;
  if (kind === 'hosts') {
    const ans = String(s.usable);
    const o = options(r, ans, [String(2 ** (32 - prefix)), String(2 ** (32 - prefix) - 1), String(2 ** (32 - prefix - 1) - 2), String(2 ** (32 - prefix) - 2 + 2)]);
    return { kind, prompt: `How many usable host addresses does ${ip}/${prefix} have?`, ...o, explain: `${bits}: 2^${32 - prefix} = ${2 ** (32 - prefix)} addresses, minus the network and broadcast addresses = ${ans} usable.` };
  }
  if (kind === 'network' || kind === 'broadcast' || kind === 'first' || kind === 'last') {
    const target = { network: s.network, broadcast: s.broadcast, first: s.firstHost, last: s.lastHost }[kind];
    const block = 2 ** (32 - prefix);
    const near = [fmtIP((net + block) >>> 0), fmtIP((net - 1) >>> 0), fmtIP((net + 1) >>> 0), fmtIP((bc - 1) >>> 0), fmtIP(bc), s.network, fmtIP((bc + 1) >>> 0), ip];
    const word = { network: 'network address', broadcast: 'broadcast address', first: 'first usable host', last: 'last usable host' }[kind];
    const o = options(r, target, shuffle(r, near.filter(x => x !== target)));
    return { kind, prompt: `What is the ${word} of ${ip}/${prefix}?`, ...o, explain: `Mask ${s.mask}. Keep the ${prefix} network bits of ${ip} and set all host bits to 0 for the network address (${s.network}) or to 1 for the broadcast address (${s.broadcast}). The usable range is ${s.firstHost} to ${s.lastHost}.` };
  }
  if (kind === 'same') {
    const sameHost = fmtIP((net + int(r, 1, Math.max(1, 2 ** (32 - prefix) - 2))) >>> 0);
    const other = r() < 0.5;
    const b = other ? fmtIP((net + 2 ** (32 - prefix) + int(r, 0, 3)) >>> 0) : sameHost;
    const same = subnet(b, prefix).network === s.network;
    const ans = same ? 'Yes, same subnet' : 'No, different subnets';
    return { kind, prompt: `Are ${ip} and ${b} in the same /${prefix} subnet?`, options: ['Yes, same subnet', 'No, different subnets'], correct: same ? 0 : 1, explain: `${ip}/${prefix} is in network ${s.network}; ${b}/${prefix} is in ${subnet(b, prefix).network}. ${ans}.` };
  }
  // need: smallest prefix for N hosts
  const hostsNeeded = pick(r, [2, 5, 10, 25, 50, 60, 100, 120, 200, 500, 1000]);
  const p = prefixForHosts(hostsNeeded);
  const o = options(r, `/${p}`, [`/${p - 1}`, `/${p + 1}`, `/${p + 2}`, `/${p - 2}`]);
  return { kind: 'need', prompt: `Which is the longest prefix (smallest subnet) that still fits ${hostsNeeded} hosts?`, ...o, explain: `You need 2^h − 2 ≥ ${hostsNeeded}. The smallest h that works is ${32 - p} (2^${32 - p} − 2 = ${2 ** (32 - p) - 2}), so the prefix is 32 − ${32 - p} = /${p}.` };
}

export function makeRound(seed: number, level: Level): SnRound {
  const r = rng(seed);
  return { level, questions: Array.from({ length: 8 }, () => makeQuestion(r, level)) };
}

export const stars = (correct: number, total: number): Stars => { const a = correct / total; return a === 1 ? 3 : a >= 0.75 ? 2 : a >= 0.5 ? 1 : 0; };
