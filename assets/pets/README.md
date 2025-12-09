# Pet Assets

This directory contains all pet-related image assets organized by evolution stage.

## Structure

```
pets/
├── stage-1/
│   ├── bubble.png          # Small floating pet (64x64 recommended)
│   └── full-view.png       # Large pet for pet sheet (192x192+ recommended)
├── stage-2/                # Future stages
│   ├── bubble.png
│   └── full-view.png
└── ...
```

## Asset Requirements

### bubble.png
- **Size**: 64x64 pixels (or higher resolution with @2x/@3x variants)
- **Format**: PNG with transparency
- **Usage**: Floating draggable pet bubble on lesson screens

### full-view.png
- **Size**: 192x192 pixels minimum (or higher for better quality)
- **Format**: PNG with transparency
- **Usage**: Large pet display in pet sheet modal

## Adding New Stages

1. Create a new folder: `stage-{number}/`
2. Add `bubble.png` and `full-view.png` to the folder
3. The code will automatically use the correct assets based on `petState.level`



