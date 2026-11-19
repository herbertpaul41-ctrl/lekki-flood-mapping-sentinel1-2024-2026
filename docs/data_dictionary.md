# Data dictionary

- **year:** June–August analysis season.
- **acquisitions:** Sentinel-1 target scenes acquired in the season.
- **usable_acquisitions:** Target scenes meeting the minimum rolling-baseline scene count.
- **seasonal_union_ha:** Area of all pixels detected at least once during that season, as reported by the Google Earth Engine summary; not confirmed flood area.
- **candidate_pixels:** Number of candidate raster cells in the exported GeoTIFF.
- **pixel_detections:** Sum of candidate detections across raster cells and observations; not unique flooded pixels.
- **max_pixel_frequency:** Maximum pixel-level ratio of candidate detections to valid observations.

**Important:** Annual observation counts differ (7, 8, 15), and there is no spatial overlap among annual candidate pixels. Do not interpret the rising union area as verified flood spread.
