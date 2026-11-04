from pathlib import Path
from fractions import Fraction
import argparse, hashlib, json, re, struct, zlib
import numpy as np
from PIL import Image

# Independent optional QA: requires locally available Pillow and numpy; no network or installs.
parser = argparse.ArgumentParser(description='Independently decode a selected local banner sample')
parser.add_argument('sample', nargs='?', default='.', help='child directory, e.g. chinese or mixed; default is the legacy English sample')
args = parser.parse_args()
assert args.sample == '.' or re.fullmatch(r'[a-z][a-z0-9-]{0,31}', args.sample), 'Unsafe sample directory'
root = Path(__file__).resolve().parent
folder = root if args.sample == '.' else root / args.sample
assert not folder.is_symlink() and folder.is_dir(), 'Sample must be a real local directory'
report = json.loads((folder / 'verification.json').read_text('utf-8'))
W, H = report['outputSize']
r = report['animationRegion']
region = np.zeros((H, W), dtype=bool)
region[r['y']*2:(r['y']+r['h'])*2, r['x']*2:(r['x']+r['w'])*2] = True
protected = np.array(Image.open(folder/'protected-mask.png').convert('RGB'))
protected = (protected == 255).all(axis=2)
receivers = np.array(Image.open(folder/'receiver-mask.png').convert('RGB'))
receivers = (receivers == 255).all(axis=2)
result = {}
for variant in ('dark', 'light'):
    file = folder / f'banner.{variant}.animated.png'
    data = file.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    p, sequence, delays, controls = 8, [], [], []
    while p < len(data):
        n = struct.unpack_from('>I', data, p)[0]
        kind, body = data[p+4:p+8], data[p+8:p+8+n]
        assert p+n+12 <= len(data)
        assert zlib.crc32(kind+body) & 0xffffffff == struct.unpack_from('>I', data, p+8+n)[0]
        if kind == b'IHDR':
            assert struct.unpack_from('>II', body) == (W, H)
            assert body[8:10] == bytes([8, 6])
        if kind == b'acTL': assert struct.unpack('>II', body) == (72, 0)
        if kind in (b'fcTL', b'fdAT'): sequence.append(struct.unpack_from('>I', body)[0])
        if kind == b'fcTL':
            assert len(body) == 26
            numerator, denominator = struct.unpack_from('>HH', body, 20)
            assert (numerator, denominator) == (1, 30)
            delays.append(Fraction(numerator, denominator))
            controls.append(body)
        p += n+12
    assert p == len(data) and sequence == list(range(len(sequence)))
    assert len(delays) == 72 and sum(delays) == Fraction(12, 5)
    im = Image.open(file)
    assert im.n_frames == 72 and im.info.get('loop') == 0
    base = np.array(Image.open(folder/f'base.{variant}.png').convert('RGBA'))
    outside_changes = protected_changes = receiver_motion = 0
    first_decoded = None
    frames = []
    for i in range(im.n_frames):
        im.seek(i)
        decoded = im.convert('RGBA')
        arr = np.array(decoded)
        assert (arr[:, :, 3] == 255).all()
        assert (arr[0::2, 0::2] == arr[1::2, 0::2]).all()
        assert (arr[0::2, 0::2] == arr[0::2, 1::2]).all()
        assert (arr[0::2, 0::2] == arr[1::2, 1::2]).all()
        assert hashlib.sha256(decoded.tobytes()).hexdigest() == report['variants'][variant]['decodedFrameSha256'][i]
        changed = (arr != base).any(axis=2)
        outside_changes += int((changed & ~region).sum())
        protected_changes += int((changed & protected).sum())
        if first_decoded is None: first_decoded = arr.copy()
        receiver_motion += int(((arr != first_decoded).any(axis=2) & receivers).sum())
        frames.append(decoded.copy())
    assert outside_changes == protected_changes == 0
    assert receiver_motion > 0, 'Decoded exposed metal surfaces must visibly react to the core light'
    assert frames[0].tobytes() == Image.open(folder/f'banner.{variant}.png').convert('RGBA').tobytes()
    assert len(set(frame.tobytes() for frame in frames)) == 72
    adjacent = [int((np.array(frames[i]) != np.array(frames[i-1])).any(axis=2).sum()) for i in range(72)]
    # Poster rotation moves the original71->0 seam INSIDE the exported animation.
    native_wrap = (72 - report['posterSourceFrame']) % 72
    ordinary_max = max(n for i, n in enumerate(adjacent) if i not in (0, native_wrap))
    assert adjacent[0] <= ordinary_max * 1.05
    assert adjacent[native_wrap] <= ordinary_max * 1.05
    if variant == 'dark':
        contact = Image.new('RGB', (W*2, H*2))
        for j, index in enumerate((0, 18, 36, 54)):
            contact.paste(frames[index].convert('RGB'), (j%2*W, j//2*H))
        contact.save(folder / 'animation-phases.png')
        seam_contact = Image.new('RGB', (W*2, H*2))
        for j, index in enumerate(((native_wrap-2)%72, (native_wrap-1)%72, native_wrap, (native_wrap+1)%72)):
            seam_contact.paste(frames[index].convert('RGB'), (j%2*W, j//2*H))
        seam_contact.save(folder / 'native-loop-boundary.png')
    result[variant] = {'frames': 72, 'durationSeconds': '12/5', 'fps': '30/1',
        'outsideRegionChangedPixels': outside_changes, 'protectedShadowChangedPixels': protected_changes,
        'receiverAnimatedPixelComparisons': receiver_motion,
        'rgbaSourceHashesMatch': True, 'nearest2x': True, 'outputWrapChangedPixels': adjacent[0],
        'nativeWrapChangedPixels': adjacent[native_wrap], 'nativeWrapExportIndex': native_wrap,
        'maxOrdinaryAdjacentChangedPixels': ordinary_max, 'encodedBytes': len(data)}
assert report['variants']['dark']['nativeEffectSha256'] == report['variants']['light']['nativeEffectSha256']
(folder / 'decoding-report.json').write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
print(json.dumps(result, indent=2))
