#!/usr/bin/env python3
"""Oracolo indipendente del Calcolatore Subnet (specifica tecnica, 10.1).

Genera i risultati attesi con il modulo standard `ipaddress` di Python e li salva in
tests/fixtures/oracle-*.json. Il test tests/engine/oracle.test.js li confronta con il motore.

Le regole /31 e /32 (tabella 3.3) sono applicate esplicitamente qui, senza dipendere
dal comportamento di `hosts()` nelle diverse versioni di Python.

Uso: python3 tools/oracle.py   (oppure npm run oracle)
L'uscita è deterministica: in CI i fixture rigenerati devono coincidere con quelli salvati.
"""

from __future__ import annotations

import ipaddress
import json
import random
from itertools import islice
from pathlib import Path

SEED = 20261118
RANDOM_IPS = 2000
OUT = Path(__file__).resolve().parent.parent / "tests" / "fixtures"

IPv4 = ipaddress.IPv4Address
Net = ipaddress.IPv4Network

FIXED_IPS = [
    "0.0.0.0", "0.0.0.1", "0.255.255.255", "1.0.0.0", "127.255.255.255", "128.0.0.0",
    "255.255.255.253", "255.255.255.254", "255.255.255.255",
    # esempi ed esercizi della guida e della specifica
    "192.168.10.75", "172.16.45.200", "10.150.33.7", "10.20.30.140", "192.168.1.200",
    "172.20.100.5", "10.1.77.33", "192.168.50.99", "10.0.0.255", "10.0.1.0",
    "203.0.113.10", "10.1.1.1", "10.0.0.1", "192.168.1.255", "10.1.2.3",
    "192.168.10.70", "192.168.10.130", "172.16.33.10", "172.16.46.200", "10.1.63.5", "10.1.64.5",
]


def u(addr) -> int:
    return int(IPv4(addr)) if isinstance(addr, str) else int(addr)


def f01_case(ip: int, p: int) -> list:
    """[rete, broadcast | None, primo host, ultimo host] con le regole della tabella 3.3."""
    net = Net((ip, p), strict=False)
    n = int(net.network_address)
    b = int(net.broadcast_address)
    if p == 32:
        return [n, None, n, n]
    if p == 31:
        return [n, None, n, b]
    return [n, b, n + 1, b - 1]


def prefix_table() -> list:
    rows = []
    for p in range(33):
        net = Net(("0.0.0.0", p))
        total = net.num_addresses
        usable = 1 if p == 32 else 2 if p == 31 else total - 2
        rows.append([p, str(net.netmask), str(net.hostmask), total, usable])
    return rows


def mask_prefix(m: int):
    """Prefisso se m è una netmask valida, altrimenti None.
    ipaddress accetta anche le hostmask (0.0.0.255 → /24): si confronta la netmask letta con m."""
    try:
        net = Net(f"0.0.0.0/{IPv4(m)}")
    except ValueError:
        return None
    return net.prefixlen if int(net.netmask) == m else None


def hosts_prefix(n: int) -> int:
    """Prefisso più lungo il cui blocco ha almeno n host utilizzabili (2^h − 2, h ≥ 2)."""
    for p in range(30, -1, -1):
        if Net(("0.0.0.0", p)).num_addresses - 2 >= n:
            return p
    raise ValueError(n)


def subnets_prefix(block: int, s: int):
    size = Net(("0.0.0.0", block)).num_addresses
    for p in range(block, 33):
        if size // Net(("0.0.0.0", p)).num_addresses >= s:
            return p
    return None


SPECIAL = {
    "THIS_NETWORK": [Net("0.0.0.0/8")],
    "PRIVATE": [Net("10.0.0.0/8"), Net("172.16.0.0/12"), Net("192.168.0.0/16")],
    "CGNAT": [Net("100.64.0.0/10")],
    "DOCUMENTATION": [Net("192.0.2.0/24"), Net("198.51.100.0/24"), Net("203.0.113.0/24")],
}


def classify_flags(ip: int) -> dict:
    a = IPv4(ip)
    flags = {code: any(a in n for n in nets) for code, nets in SPECIAL.items()}
    flags.update(
        LOOPBACK=a.is_loopback,
        LINK_LOCAL=a.is_link_local,
        MULTICAST=a.is_multicast,
        RESERVED=a.is_reserved,
        LIMITED_BROADCAST=a == IPv4("255.255.255.255"),
    )
    return {k: v for k, v in sorted(flags.items())}


def dump(name: str, data) -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "\n"
    (OUT / name).write_text(text, encoding="utf-8")
    return len(text.encode("utf-8"))


def main() -> None:
    rnd = random.Random(SEED)
    rand32 = lambda: rnd.getrandbits(32)  # noqa: E731

    # ---------------------------------------------------------- F01: tutti i prefissi su ogni IP
    ips = [u(x) for x in FIXED_IPS] + [rand32() for _ in range(RANDOM_IPS)]
    rows = []
    for ip in ips:
        row = [ip]
        for p in range(33):
            row.extend(f01_case(ip, p))
        rows.append(row)
    size_f01 = dump("oracle-f01.json", {
        "generator": "tools/oracle.py",
        "seed": SEED,
        "layout": "ogni riga: ip, poi per p = 0..32 [rete, broadcast|null, primo, ultimo]",
        "prefixes": prefix_table(),
        "rows": rows,
    })

    # ---------------------------------------------------------- F02: rappresentazioni dell'indirizzo
    addresses = []
    for ip in [u(x) for x in FIXED_IPS] + [rand32() for _ in range(300)]:
        packed = IPv4(ip).packed
        addresses.append([
            ip,
            str(IPv4(ip)),
            ".".join(format(b, "08b") for b in packed),
            ".".join(format(b, "02X") for b in packed),
            "0x" + packed.hex().upper(),
        ])

    # ---------------------------------------------------------- F03: mask valide e non valide
    mask_values = [int(Net(("0.0.0.0", p)).netmask) for p in range(33)]
    near = []
    for m in mask_values:
        for _ in range(4):
            near.append(m ^ (1 << rnd.randrange(32)))
        near.append(~m & 0xFFFFFFFF)
    candidates = mask_values + near + [rand32() for _ in range(1000)]
    masks = [[m, mask_prefix(m)] for m in candidates]

    # ---------------------------------------------------------- F05: host → prefisso, subnet → prefisso
    host_values = set()
    for h in range(2, 33):
        for delta in (-3, -2, -1):
            n = 2 ** h + delta
            if 1 <= n <= 4294967294:
                host_values.add(n)
    host_values.update(rnd.randint(1, 4294967294) for _ in range(500))
    host_values.update(range(1, 70))
    hosts = [[n, hosts_prefix(n)] for n in sorted(host_values)]

    subnet_cases = set()
    for block in range(33):
        for s in (1, 2, 3, 4, 5, 7, 8, 9, 16, 17, 100, 256, 257, 65536, 65537):
            subnet_cases.add((block, s))
        for _ in range(10):
            subnet_cases.add((block, rnd.randint(1, 2 ** 20)))
    subnets = [[b, s, subnets_prefix(b, s)] for b, s in sorted(subnet_cases)]

    # ---------------------------------------------------------- F06: suddivisioni (fino a 4.096 subnet)
    subdivisions = []
    for _ in range(400):
        ip = rand32()
        block = rnd.randint(0, 32)
        new = min(32, block + rnd.randint(0, 12))
        net = Net((ip, block), strict=False)
        subs = list(net.subnets(new_prefix=new))
        idx = rnd.randrange(len(subs))
        inside = int(net.network_address) + rnd.randrange(net.num_addresses)
        containing = Net((inside, new), strict=False)
        subdivisions.append({
            "ip": ip, "block": block, "newPrefix": new,
            "network": int(net.network_address),
            "count": len(subs),
            "first": [int(s.network_address) for s in islice(subs, 3)],
            "last": int(subs[-1].network_address),
            "index": idx,
            "atIndex": int(subs[idx].network_address),
            "inside": inside,
            "indexOfInside": subs.index(containing),
        })

    # ---------------------------------------------------------- F07: stessa subnet, anche con prefissi diversi
    same = []
    for i in range(1500):
        a = rand32()
        # metà delle coppie vicine (stessi 16 bit alti) per avere anche esiti "same"
        b = (a & 0xFFFF0000) | rnd.getrandbits(16) if i % 2 else rand32()
        pa = rnd.randint(0, 32)
        pb = pa if i % 3 else rnd.randint(0, 32)
        a_sees_b = IPv4(b) in Net((a, pa), strict=False)
        b_sees_a = IPv4(a) in Net((b, pb), strict=False)
        verdict = "same" if a_sees_b and b_sees_a else "different" if not a_sees_b and not b_sees_a else "asymmetric"
        same.append([a, pa, b, pb, verdict])

    # ---------------------------------------------------------- F04: appartenenza ai blocchi speciali
    probe = [u(x) for x in FIXED_IPS] + [rand32() for _ in range(2000)]
    all_blocks = [n for nets in SPECIAL.values() for n in nets] + [
        Net("127.0.0.0/8"), Net("169.254.0.0/16"), Net("224.0.0.0/4"), Net("240.0.0.0/4"),
    ]
    for n in all_blocks:
        lo, hi = int(n.network_address), int(n.broadcast_address)
        probe += [x for x in (lo - 1, lo, lo + 1, hi - 1, hi, hi + 1) if 0 <= x <= 0xFFFFFFFF]
        probe += [rnd.randint(lo, hi) for _ in range(40)]
    classify = [[ip, classify_flags(ip)] for ip in probe]

    size_misc = dump("oracle-misc.json", {
        "generator": "tools/oracle.py",
        "seed": SEED,
        "addresses": addresses,
        "masks": masks,
        "hosts": hosts,
        "subnets": subnets,
        "subdivisions": subdivisions,
        "same": same,
        "classify": classify,
    })

    print(f"oracle-f01.json   {len(rows)} IP × 33 prefissi = {len(rows) * 33} casi, {size_f01:,} byte")
    print(
        f"oracle-misc.json  {len(addresses)} indirizzi, {len(masks)} mask, {len(hosts)} host, "
        f"{len(subnets)} subnet, {len(subdivisions)} suddivisioni, {len(same)} coppie, "
        f"{len(classify)} classificazioni, {size_misc:,} byte"
    )


if __name__ == "__main__":
    main()
