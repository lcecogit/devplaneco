# Photography credits

Every image in this directory is recorded here before it is used. An
unattributed licence trail is a problem that surfaces at the worst possible
moment, and "we got it from Google" is not a licence.

One row per asset. Do not add an image without its row.

| File | Source | Photographer | Licence | Added | Used on |
|---|---|---|---|---|---|
| _(none yet)_ | | | | | |

## Sourcing rules

- Unsplash or Pexels under their standard licences, or commissioned/own work.
- **Subject matter**: vans, crates, hallways, loading, warehouse light, road and
  city texture. Prefer environment and material over people.
- **Avoid outright**: grinning teams with clipboards, high-fives, handshakes
  over boxes, headset call-centre portraits. They read as generic and actively
  undercut a premium impression.
- **Grade every image to one treatment** — cool-neutral, slightly desaturated,
  matched contrast — so six brands still look like one platform.
- **Replace stock with real photography of the actual fleet and crews as soon
  as it exists.** Stock is scaffolding, not the finish.

## Technical

Serve through `BrandPhoto` (`src/components/media/BrandPhoto.tsx`), which uses
`next/image`, so AVIF/WebP, sizing and lazy loading are handled. Export at
2560px on the long edge; `next/image` takes it from there. Set `priority` only
on an image that is the LCP element.

Remote sources are not permitted: `next.config.mjs` allows no remote patterns
on purpose. Commit the file so the build is reproducible and the page does not
depend on somebody else's CDN staying up.
