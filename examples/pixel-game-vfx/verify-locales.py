"""Cross-profile QA; Pillow/numpy are optional existing local tools, not installed here."""
from pathlib import Path
import json, unicodedata
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent
legacy = json.loads((root / 'verification.json').read_text('utf-8'))
font = json.loads((root / 'fonts/manifest.json').read_text('utf-8'))
checks = {}
for name, config_name in [('chinese', 'zh'), ('mixed', 'mixed')]:
    folder = root / name
    data = json.loads((folder / 'verification.json').read_text('utf-8'))
    config = json.loads((root / f'text.{config_name}.json').read_text('utf-8'))
    for key in ['logicalSize', 'outputSize', 'fps', 'frames', 'durationMs', 'apngFrameDelay',
                'posterSourceFrame', 'effect', 'effectOrigin', 'animationRegion', 'effectOptions', 'maskPixels', 'sources']:
        assert data[key] == legacy[key], (name, key)
    assert data['typography']['font']['id'] == font['id']
    assert data['typography']['font']['sha256'] == font['asset']['sha256']
    assert data['typography']['font']['bdfSha256'] == font['source']['bdfSha256']
    assert data['typography']['config'] == config
    slots = np.zeros((320, 960), dtype=bool)
    for item in data['typography']['layout']:
        b = item['bounds']
        slots[b['y']*2:(b['y']+b['height'])*2, b['x']*2:(b['x']+b['width'])*2] = True
        assert b['x'] >= 27 and b['x'] + b['width'] <= 236
        normalized = unicodedata.normalize('NFC', config[item['role']].replace('\r\n', '\n').replace('\r', '\n'))
        assert item['text'] == normalized
        # Soft wraps may consume ASCII separator spaces, but never glyphs or punctuation.
        assert ''.join(line['text'] for line in item['lines']).replace(' ', '') == normalized.replace('\n', '').replace(' ', '')
    for mask in ['receiver-mask.png', 'protected-mask.png']:
        assert (folder / mask).read_bytes() == (root / mask).read_bytes()
    variants = {}
    for variant in ['dark', 'light']:
        stats = data['variants'][variant]
        assert stats['nativeEffectSha256'] == legacy['variants'][variant]['nativeEffectSha256']
        assert stats['outsideRegionChanges'] == stats['protectedShadowChanges'] == 0
        assert stats['typographyChangedPixels'] > 0
        old = np.array(Image.open(root / f'base.{variant}.png').convert('RGBA'))
        new = np.array(Image.open(folder / f'base.{variant}.png').convert('RGBA'))
        changed = (old != new).any(axis=2)
        assert int((changed & ~slots).sum()) == 0, 'Localization altered room geometry outside text slots'
        variants[variant] = {'changedPixelsOutsideTextSlots': 0,
            'nativeEffectMatchesEnglish': True, 'materialMasksMatchEnglish': True,
            'typographyChangedLogicalPixels': stats['typographyChangedPixels']}
    decode = json.loads((folder / 'decoding-report.json').read_text('utf-8'))
    assert all(v['rgbaSourceHashesMatch'] and v['nearest2x'] and v['frames'] == 72
        and v['protectedShadowChangedPixels'] == 0 for v in decode.values())
    checks[name] = {'fontId': font['id'], 'fontSha256': font['asset']['sha256'], 'variants': variants}
(root / 'localization-report.json').write_text(json.dumps(checks, indent=2)+'\n', encoding='utf-8')
preview = Image.new('RGBA', (960, 656), (38, 43, 56, 255))
preview.paste(Image.open(root / 'chinese/banner.dark.png').convert('RGBA'), (0, 0))
preview.paste(Image.open(root / 'mixed/banner.light.png').convert('RGBA'), (0, 336))
preview.save(root / 'localization-preview.png')
print(json.dumps(checks, indent=2))
