"""Wide composition QA. Existing local Pillow/numpy only; original assets remain untouched."""
from pathlib import Path
import json, unicodedata
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent
checks = {}
for slug, old_slug in [('wide-chinese', 'chinese'), ('wide-mixed', 'mixed')]:
    folder = root / slug
    old = root / old_slug
    report = json.loads((folder / 'verification.json').read_text('utf-8'))
    previous = json.loads((old / 'verification.json').read_text('utf-8'))
    assert report['logicalSize'] == [640, 144] and report['outputSize'] == [1280, 288]
    assert report['typography']['profile'] == 'wide'
    assert report['typography']['config'] == previous['typography']['config']
    assert report['typography']['font'] == previous['typography']['font']
    title = next(v for v in report['typography']['layout'] if v['role'] == 'title')
    old_title = next(v for v in previous['typography']['layout'] if v['role'] == 'title')
    assert title['scale'] == 4 and title['height'] == 48
    assert title['width'] == old_title['width'] * 2
    for item in report['typography']['layout']:
        b = item['bounds']
        assert b['x'] == 32 and b['x'] + b['width'] <= 436 and b['y'] + b['height'] <= 130
        assert item['text'] == unicodedata.normalize('NFC', report['typography']['config'][item['role']])
    for name in ['receiver-mask.png', 'protected-mask.png']:
        original = np.array(Image.open(old / name).convert('RGBA'))
        actual = np.array(Image.open(folder / name).convert('RGBA'))
        expected = np.zeros_like(actual); expected[:, :, 3] = 255
        expected[:, 920:1280] = original[26:314, 570:930]
        assert np.array_equal(actual, expected), 'Material masks must be exact integer translations, not stretched'
    decode = json.loads((folder / 'decoding-report.json').read_text('utf-8'))
    for variant in ['dark', 'light']:
        # Native right-hand steel/plinth geometry is repositioned, never resized or painted over.
        original = np.array(Image.open(old / f'base.{variant}.png').convert('RGBA'))
        actual = np.array(Image.open(folder / f'base.{variant}.png').convert('RGBA'))
        assert np.array_equal(actual[:, 920:1280], original[26:314, 570:930])
        d = decode[variant]
        assert d['frames'] == 72 and d['fps'] == '30/1' and d['nearest2x'] and d['rgbaSourceHashesMatch']
        assert d['outsideRegionChangedPixels'] == d['protectedShadowChangedPixels'] == 0
    checks[slug] = {
        'size': [1280, 288], 'aspectRatio': '40:9',
        'heightAt960pxReadmeWidth': 216, 'previousHeightAt960pxReadmeWidth': 320,
        'headlineHeightAt960pxReadmeWidth': 72, 'previousHeadlineHeightAt960pxReadmeWidth': 48,
        'headlineDisplayedScaleRatio': 1.5, 'textSafeAreaWidthFraction': 404 / 640,
        'translatedMaterialMasksExact': True, 'translatedRoomGeometryExact': True,
        'textUnchanged': True, 'fontUnchanged': True,
    }
# Both localized profiles retain the identical raw native VFX clock, colors and masks.
a = json.loads((root / 'wide-chinese/verification.json').read_text('utf-8'))
b = json.loads((root / 'wide-mixed/verification.json').read_text('utf-8'))
for variant in ['dark', 'light']:
    assert a['variants'][variant]['nativeEffectSha256'] == b['variants'][variant]['nativeEffectSha256']
preview = Image.new('RGBA', (1280, 592), (38, 43, 56, 255))
preview.paste(Image.open(root / 'wide-chinese/banner.dark.png').convert('RGBA'), (0, 0))
preview.paste(Image.open(root / 'wide-mixed/banner.light.png').convert('RGBA'), (0, 304))
preview.save(root / 'wide-preview.png')
(root / 'wide-layout-report.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(checks, ensure_ascii=False, indent=2))
