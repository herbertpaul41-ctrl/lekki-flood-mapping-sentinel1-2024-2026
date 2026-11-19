# Sentinel-1 SAR Surface-Water Candidate Mapping in Lekki, Lagos (2024–2026)

**Research status:** Preliminary, exploratory remote-sensing analysis; **not** a validated flood-inundation inventory.

## Overview
This project investigates radar-derived potential surface-water inundation within a **provisional study polygon near Lekki Phase 1, Lagos, Nigeria**, during the June–August seasons of 2024, 2025 and 2026. The analysis uses Sentinel-1 SAR data in Google Earth Engine (GEE), with GIS-based spatial comparison of annual detection footprints.

**Research question:** How do the location and frequency of radar-derived surface-water candidates differ across the three study seasons, and what can be concluded given unequal observation counts and classification uncertainty?

## Study area and data
- **Location:** Provisional polygon near Lekki Phase 1, Lagos, Nigeria; it is **not** an official administrative boundary.
- **Season:** 1 June–31 August of each year, 2024–2026.
- **SAR source:** Copernicus Sentinel-1 GRD, descending orbit, relative orbit 95, VV and VH polarizations.
- **Supporting layers:** ESA WorldCover v200, JRC Global Surface Water occurrence and SRTM-derived slope.
- **Outputs:** Annual raster bands for observation count, detection count, detection frequency and whether a candidate was ever detected.

## Methodology summary
1. Select Sentinel-1 acquisitions intersecting the study polygon during each June–August season.
2. Build a rolling reference baseline from images acquired approximately 90–7 days before each target acquisition, requiring at least three baseline scenes.
3. Apply a 30 m focal median filter and identify anomalous decreases in both VV and VH backscatter relative to the baseline median and variability.
4. Apply an absolute VV threshold (−16 dB), land-cover/historical-water/slope exclusions, and a connected-component minimum of eight pixels.
5. Aggregate valid acquisitions to annual **candidate detection counts**, **observation counts**, **detection frequencies** and **seasonal union footprints**.
6. Compare annual raster footprints spatially.

The thresholds are exploratory and require sensitivity testing and independent validation. Static exclusion layers are not ground truth.

## Preliminary results

| Metric | 2024 | 2025 | 2026 |
|---|---:|---:|---:|
| Sentinel-1 acquisitions | 7 | 8 | 15 |
| Usable acquisitions | 7 | 8 | 15 |
| Seasonal candidate union (ha; GEE output) | 0.079 | 0.138 | 0.355 |
| Candidate raster pixels | 8 | 14 | 36 |
| Sum of pixel-level detections | 8 | 14 | 53 |
| Maximum observed pixel frequency | 14.29% | 12.50% | 13.33% |

**Spatial comparison:** The three annual candidate footprints have **zero overlapping candidate pixels** in the exported rasters. Across all years, 58 distinct candidate pixels were identified.

**Interpretation:** The 2026 seasonal candidate union is larger than those of 2024 and 2025, but the number of acquisitions also differs. These results **do not demonstrate confirmed flood expansion, continuous inundation, or flood causation**. Radar changes in an urban/coastal environment may have other explanations.

## Limitations and next steps
- Independently validate candidate locations with appropriate optical imagery, flood records, or field observations.
- Repeat comparisons with matched acquisition sampling and report observation-adjusted measures.
- Audit threshold sensitivity, baseline availability and potential urban SAR artifacts.
- Replace the provisional study polygon with a documented boundary where appropriate.
- Distinguish event-level detections from seasonal unions and avoid interpreting disjoint annual footprints as a spreading flood front.

## Spatial comparison map

![Lekki 2024–2026 radar-derived candidate-water spatial comparison](figures/Lekki_V16_Three_Year_Spatial_Comparison%20(1).png)

*Annual radar-derived candidate-water detections, not independently verified flood extents. The three annual candidate footprints do not overlap.*

## Research outputs
- [Original Version 15.1 Google Earth Engine script](scripts/gee_v15_1_annual_comparison.js)
- [Annual summary table](data/annual_summary.csv)
- [Version 16 spatial comparison table](data/v16_spatial_comparison.csv)
- [Illustrated two-page research note (PDF)](reports/Lekki_2024_2026_Two_Page_Research_Note.pdf)
- [Research note (Markdown)](reports/lekki_2024_2026_research_note.md)
- [2024 candidate raster](data/Lekki_Candidates_2024.tif)
- [2025 candidate raster](data/Lekki_Candidates_2025.tif)
- [2026 candidate raster](data/Lekki_Candidates_2026.tif)
- [Version 16 combined raster](data/Lekki_V16_Combined_Candidate_Footprints.tif)
- [Seasonal candidate-area chart (SVG)](figures/seasonal_candidate_area.svg)
- [Three-year spatial comparison map](figures/Lekki_V16_Three_Year_Spatial_Comparison%20(1).png)
- [Research overview figure](figures/Lekki_Research_Figure_Overview.png)
- [Zoomed candidate clusters](figures/Lekki_Research_Figure_Zoom.png)

## Repository organization
- `scripts/` — verified GEE scripts and subsequent reproducible analysis code.
- `data/` — small derived tables and metadata; original satellite collections remain at their source.
- `figures/` — maps and comparison plots.
- `reports/` — research notes and supporting documentation.
- `docs/` — methods, validation notes and data dictionary.

**Current contents:** Original Version 15.1 GEE source code, annual and spatial comparison tables, four derived GeoTIFF rasters, maps, an illustrated PDF research note and documentation. Version 16 analysis source code has not yet been deposited.

## Data availability and reproducibility
Sentinel-1 GRD and the supporting datasets are accessed through Google Earth Engine. The Version 15.1 GEE script and exported rasters are included. The Version 16 spatial comparison source code and independent validation data are not yet included; full reproducibility of that stage therefore remains incomplete.

## Citation
If referencing this work, describe it as a **preliminary Sentinel-1 SAR analysis of surface-water candidates**, not a confirmed flood inventory.

## Contact
Repository maintained by the project author. Please use GitHub issues for technical questions.
