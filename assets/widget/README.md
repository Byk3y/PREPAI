# Widget Assets

This folder contains all assets used in the iOS home screen widget.

## Folder Structure

```
widget/
├── brigo/           # Brigo mascot expressions
│   ├── proud.png        # 🥳 After study session, streak milestones
│   ├── smug.png         # 😏 Challenging/teasing ("Still not studying?")
│   ├── analytical.png   # 🤔 Stats, exam countdown, neutral
│   ├── angry.png        # 😠 Streak lost, urgent warnings
│   ├── worried.png      # 😰 Streak at risk (optional)
│   ├── celebrating.png  # 🎉 Major achievements (optional)
│   └── icon.png         # Compact version for small widgets
│
└── pets/            # Pet assets (copied from main pet assets)
    ├── stage-1/
    │   ├── bubble.png
    │   └── dying.png
    ├── stage-2/
    │   ├── bubble.png
    │   └── dying.png
    └── stage-3/
        ├── bubble.png
        └── dying.png
```

## Asset Requirements

### For iOS WidgetKit:
- **Format**: PNG (recommended) or PDF for vector
- **Sizes**: Provide @1x, @2x, @3x versions OR single high-res (widget scales)
- **Recommended base size**: 
  - Brigo expressions: 200x200px minimum
  - Pet bubbles: 150x150px minimum
- **Background**: Transparent (PNG with alpha)

### Widget States & Asset Mapping

| Widget State | Brigo Asset | Pet Asset | Message Tone |
|--------------|-------------|-----------|--------------|
| Studied today | `proud.png` | `bubble.png` | Celebratory |
| Morning, no study | `analytical.png` | `bubble.png` | Encouraging |
| Evening, no study | `smug.png` | `bubble.png` | Teasing |
| Streak at risk | `angry.png` or `worried.png` | `dying.png` | Urgent |
| Streak lost | `analytical.png` | `dying.png` | Supportive |
| Exam countdown | `analytical.png` | `bubble.png` | Focused |

## Notes

- Widget assets will be bundled into the iOS widget extension
- Keep file sizes optimized (widgets have memory limits)
- All assets should work on both light and dark backgrounds (or provide variants)
