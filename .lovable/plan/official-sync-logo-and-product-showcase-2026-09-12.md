# Official SYNC logo and product showcase

## What will change
- Replace the existing wristband showcase asset with the uploaded full product board, keeping the current asset reference stable through a CDN pointer.
- Replace the existing recreated/text-based brand mark with the uploaded official logo in the shared logo component.
- Make the shared logo component a responsive home link so every brand placement returns to `/` without a full reload.
- Replace the remaining standalone brand label on the home page with the official logo while preserving normal uses of “SYNC” in sentences, feature names, and actions.
- Update the home product image treatment so the full showcase remains visible without cropping on desktop, tablet, or mobile.

## Validation
- Check all logo placements and navigation targets across public and signed-in pages.
- Verify the product showcase at desktop and mobile sizes.
- Run focused type checks and fix the existing live badge subscription error without changing app behavior.

## Technical details
- Upload both user images through Lovable Assets and keep only `.asset.json` pointers in the repository.
- Use TanStack Router `Link` inside the shared logo component.
- Keep logo proportions with width-auto sizing and object-contain rendering.
