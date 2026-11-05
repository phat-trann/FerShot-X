#!/usr/bin/env python3
"""Write a synthetic PNG for later Shottr editor tests; never capture the desktop."""
import hashlib
import json
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = 640, 400
COLORS = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 255)]
FONT = {
    'S': ['11111','10000','10000','11111','00001','00001','11111'],
    'H': ['10001','10001','10001','11111','10001','10001','10001'],
    'O': ['01110','10001','10001','10001','10001','10001','01110'],
    'T': ['11111','00100','00100','00100','00100','00100','00100'],
    'R': ['11110','10001','10001','11110','10100','10010','10001'],
    'E': ['11111','10000','10000','11110','10000','10000','11111'],
    '1': ['00100','01100','00100','00100','00100','00100','01110'],
    '2': ['11110','00001','00001','01110','10000','10000','11111'],
    '3': ['11110','00001','00001','01110','00001','00001','11110'],
    ' ': ['00000'] * 7,
}


def main():
    pixels = bytearray(WIDTH * HEIGHT * 3)
    for y in range(HEIGHT):
        for x in range(WIDTH):
            rgb = COLORS[(x >= WIDTH // 2) + 2 * (y >= HEIGHT // 2)]
            i = (y * WIDTH + x) * 3
            pixels[i:i + 3] = bytes(rgb)
    # A white strip with deterministic, non-sensitive text.
    for y in range(160, 240):
        for x in range(60, 580):
            i = (y * WIDTH + x) * 3
            pixels[i:i + 3] = b'\xff\xff\xff'
    for index, letter in enumerate('SHOTTR TEST 123'):
        for row, bits in enumerate(FONT[letter]):
            for col, bit in enumerate(bits):
                if bit == '1':
                    for dy in range(5):
                        for dx in range(5):
                            x, y = 90 + index * 30 + col * 5 + dx, 180 + row * 5 + dy
                            i = (y * WIDTH + x) * 3
                            pixels[i:i + 3] = b'\x00\x00\x00'
    def chunk(kind, payload):
        return struct.pack('>I', len(payload)) + kind + payload + struct.pack('>I', zlib.crc32(kind + payload) & 0xffffffff)
    rows = b''.join(b'\x00' + pixels[y * WIDTH * 3:(y + 1) * WIDTH * 3] for y in range(HEIGHT))
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', WIDTH, HEIGHT, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b'')
    out = ROOT / 'captures/T03/synthetic-editor.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(png)
    probes = [{'x': x, 'y': y, 'rgb': list(rgb)} for x, y, rgb in [(20, 20, COLORS[0]), (620, 20, COLORS[1]), (20, 380, COLORS[2]), (620, 380, COLORS[3])]]
    manifest = {'kind': 'synthetic test fixture; not REA Evidence or a Shottr output',
                'path': str(out.relative_to(ROOT)), 'width': WIDTH, 'height': HEIGHT,
                'png_sha256': hashlib.sha256(png).hexdigest(), 'encoding': '8-bit RGB PNG, no color profile or DPI metadata',
                'text': 'SHOTTR TEST 123', 'coordinate_system': 'image pixels, origin top-left',
                'known_rgb_probes': probes,
                'limitations': ['RGB values are fixture bytes; the app may color-manage display/clipboard output.',
                                'No Shottr action has been executed against this fixture.']}
    p = ROOT / 'evidence/agents/codex/T03-fixture.json'
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(manifest, indent=2) + '\n')
    print('Created synthetic editor fixture and manifest; Shottr was not launched.')


if __name__ == '__main__':
    main()
