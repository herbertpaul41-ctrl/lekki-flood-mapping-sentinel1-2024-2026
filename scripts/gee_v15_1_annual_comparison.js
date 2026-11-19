
 // ======================================================
 // VERSION 15.1 — LEKKI 2024–2026 COMPARATIVE MAPPING
 //
 // Seasonal window: June 1 to August 31
 // Sentinel-1 descending orbit 95, VV and VH
 //
 // OUTPUTS:
 // Annual candidate-frequency maps
 // Annual observation-count maps
 // Annual summary table
 // GeoTIFF and CSV exports
 //
 // IMPORTANT:
 // Radar-derived water candidates are NOT
 // independently confirmed flood extents.
 // ======================================================


 // ------------------------------------------------------
 // 1. STUDY AREA
 // ------------------------------------------------------

var aoi = ee.Geometry.Polygon([[
  [3.435, 6.451],
  [3.448, 6.459],
  [3.473, 6.460],
  [3.490, 6.454],
  [3.490, 6.432],
  [3.480, 6.428],
  [3.453, 6.428],
  [3.439, 6.435],
  [3.435, 6.451]
]]);


// ------------------------------------------------------
// 2. ANALYSIS SETTINGS
// ------------------------------------------------------

var years = [2024, 2025, 2026];

var decreaseDb = -1.5;

var variabilityMultiplier = 1.5;

var absoluteVV = -16;

var minClusterPixels = 8;

var minBaselineScenes = 3;

var exportFolder = 'GEE_Flood_Mapping';

Map.centerObject(aoi, 14);

Map.addLayer(
  aoi,
  {color: 'yellow'},
  'Provisional Study Boundary',
  true
);


// ------------------------------------------------------
// 3. EXCLUSION AND TERRAIN MASKS
// ------------------------------------------------------

var wc = ee.Image(
  ee.ImageCollection(
    'ESA/WorldCover/v200'
  ).first()
).select('Map').clip(aoi);

var jrc = ee.Image(
  'JRC/GSW1_4/GlobalSurfaceWater'
)
.select('occurrence')
.unmask(0)
.clip(aoi);

var slope = ee.Image(
  ee.Terrain.slope(
    ee.Image('USGS/SRTMGL1_003')
  )
).clip(aoi);

var eligible = wc.neq(80)
  .and(jrc.lt(90))
  .and(slope.lt(5));


// ------------------------------------------------------
// 4. SENTINEL-1 IMAGE COLLECTION
// ------------------------------------------------------

var s1 = ee.ImageCollection(
  'COPERNICUS/S1_GRD'
)
.filterBounds(aoi)
.filter(
  ee.Filter.eq(
    'instrumentMode',
    'IW'
  )
)
.filter(
  ee.Filter.eq(
    'resolution_meters',
    10
  )
)
.filter(
  ee.Filter.eq(
    'orbitProperties_pass',
    'DESCENDING'
  )
)
.filter(
  ee.Filter.eq(
    'relativeOrbitNumber_start',
    95
  )
)
.filter(
  ee.Filter.listContains(
    'transmitterReceiverPolarisation',
    'VV'
  )
)
.filter(
  ee.Filter.listContains(
    'transmitterReceiverPolarisation',
    'VH'
  )
)
.select(['VV', 'VH']);


// ------------------------------------------------------
// 5. HISTORICAL ACQUISITION CHECK
// ------------------------------------------------------

years.forEach(function(year) {

  var start = ee.Date.fromYMD(
    year, 6, 1
  );

  var end = ee.Date.fromYMD(
    year, 9, 1
  );

  var seasonal = s1.filterDate(
    start, end
  );

  print(
    'SENTINEL-1 ACQUISITIONS — ' + year,
    seasonal.size()
  );

  print(
    'FIRST ACQUISITION — ' + year,
    ee.Date(
      seasonal.aggregate_min(
        'system:time_start'
      )
    ).format('YYYY-MM-dd')
  );

});


// ------------------------------------------------------
// 6. IMAGE SMOOTHING
// ------------------------------------------------------

function smooth(img) {

  img = ee.Image(img);

  var smoothed = ee.Image(
    img.focal_median(
      30,
      'circle',
      'meters'
    )
  );

  return ee.Image(
    smoothed.copyProperties(
      img,
      ['system:time_start']
    )
  );
}


// ------------------------------------------------------
// 7. ADD BASELINE COUNT TO ACQUISITIONS
// ------------------------------------------------------

function addBaselineCount(img) {

  img = ee.Image(img);

  var date = ee.Date(
    img.get('system:time_start')
  );

  var count = s1.filterDate(
    date.advance(-90, 'day'),
    date.advance(-7, 'day')
  ).size();

  return img.set(
    'baseline_scenes',
    count
  );
}


// ------------------------------------------------------
// 8. CLASSIFY EACH ACQUISITION
// ------------------------------------------------------

function classify(img) {

  img = ee.Image(img);

  var date = ee.Date(
    img.get('system:time_start')
  );

  // Rolling historical baseline

  var baseline = s1.filterDate(
    date.advance(-90, 'day'),
    date.advance(-7, 'day')
  ).map(smooth);

  // Historical median

  var median = ee.Image(
    baseline.median()
  );

  // Historical standard deviation

  var std = ee.Image(
    baseline.reduce(
      ee.Reducer.stdDev()
    )
  ).rename([
    'VV_std',
    'VH_std'
  ]);

  // Current radar acquisition

  var post = ee.Image(
    smooth(img)
  ).clip(aoi);

  // Radar backscatter differences

  var dvv = post.select('VV')
    .subtract(
      median.select('VV')
    );

  var dvh = post.select('VH')
    .subtract(
      median.select('VH')
    );

  // VV decrease condition

  var vvChange = dvv.lt(decreaseDb)
    .and(
      dvv.lt(
        std.select('VV_std')
          .max(0.5)
          .multiply(
            -variabilityMultiplier
          )
      )
    );

  // VH decrease condition

  var vhChange = dvh.lt(decreaseDb)
    .and(
      dvh.lt(
        std.select('VH_std')
          .max(0.5)
          .multiply(
            -variabilityMultiplier
          )
      )
    );

  // Valid observations and eligible terrain

  var valid = post.select('VV').mask()
    .and(
      post.select('VH').mask()
    )
    .and(
      median.select('VV').mask()
    )
    .and(
      median.select('VH').mask()
    )
    .and(eligible);

  // Raw candidate-water classification

  var raw = vvChange
    .and(vhChange)
    .and(
      post.select('VV').lt(
        absoluteVV
      )
    )
    .and(valid)
    .selfMask();

  // Connected-pixel screening

  var count = ee.Image(
    raw.connectedPixelCount(
      100,
      true
    )
  );

  var candidate = ee.Image(
    raw.updateMask(
      count.gte(
        minClusterPixels
      )
    )
  );

  // Binary detection:
  // 1 = candidate
  // 0 = valid non-candidate
  // Masked = unavailable or excluded

  var detection = ee.Image(
    candidate
      .unmask(0)
      .updateMask(valid)
      .rename('candidate')
      .toByte()
  );

  return detection.copyProperties(
    img,
    ['system:time_start']
  ).set(
    'baseline_scenes',
    baseline.size()
  );
}


// ------------------------------------------------------
// 9. ANNUAL SEASONAL COMPOSITES
// ------------------------------------------------------

function annualComposite(year) {

  var start = ee.Date.fromYMD(
    year, 6, 1
  );

  var end = ee.Date.fromYMD(
    year, 9, 1
  );

  var acquisitions = s1.filterDate(
    start, end
  );

  // Attach historical baseline counts

  var checked = acquisitions.map(
    addBaselineCount
  );

  // Exclude acquisitions with insufficient baseline

  var usable = checked.filter(
    ee.Filter.gte(
      'baseline_scenes',
      minBaselineScenes
    )
  );

  // Apply radar classification

  var classified = usable.map(
    classify
  );

  // Valid observation count per pixel

  var observations = ee.Image(
    classified.count()
  ).rename('observations');

  // Candidate detection count per pixel

  var detections = ee.Image(
    classified.sum()
  ).rename('detections');

  // Candidate frequency

  var frequency = detections
    .divide(
      observations.max(1)
    )
    .updateMask(
      observations.gt(0)
    )
    .rename('frequency');

  // Seasonal candidate union

  var everDetected = detections
    .gt(0)
    .updateMask(
      observations.gt(0)
    )
    .rename('ever_detected');

  return ee.Image.cat([
    observations,
    detections,
    frequency,
    everDetected
  ])
  .clip(aoi)
  .set({
    year: year,
    acquisition_count: acquisitions.size(),
    usable_acquisitions: usable.size()
  });
}


// ------------------------------------------------------
// 10. CREATE ANNUAL MAPS
// ------------------------------------------------------

var map2024 = annualComposite(2024);

var map2025 = annualComposite(2025);

var map2026 = annualComposite(2026);


// ------------------------------------------------------
// 11. MAP VISUALIZATION
// ------------------------------------------------------

var frequencyStyle = {
  min: 0,
  max: 1,
  palette: [
    'ffffff',
    'b3e5fc',
    '4fc3f7',
    '0288d1',
    '01579b'
  ]
};

Map.addLayer(
  map2024.select('frequency'),
  frequencyStyle,
  '2024 Candidate Frequency',
  false
);

Map.addLayer(
  map2025.select('frequency'),
  frequencyStyle,
  '2025 Candidate Frequency',
  false
);

Map.addLayer(
  map2026.select('frequency'),
  frequencyStyle,
  '2026 Candidate Frequency',
  true
);


// ------------------------------------------------------
// 12. OBSERVATION COVERAGE MAPS
// ------------------------------------------------------

var observationStyle = {
  min: 0,
  max: 20,
  palette: [
    'ffffff',
    'fff59d',
    'ffb74d',
    'e65100'
  ]
};

Map.addLayer(
  map2024.select('observations'),
  observationStyle,
  '2024 Observation Count',
  false
);

Map.addLayer(
  map2025.select('observations'),
  observationStyle,
  '2025 Observation Count',
  false
);

Map.addLayer(
  map2026.select('observations'),
  observationStyle,
  '2026 Observation Count',
  false
);


// ------------------------------------------------------
// 13. ANNUAL SUMMARY STATISTICS
// ------------------------------------------------------

function summarise(img, year) {

  img = ee.Image(img);

  var detected = img.select(
    'ever_detected'
  ).eq(1);

  var area = ee.Image.pixelArea()
    .divide(10000)
    .updateMask(detected)
    .rename('candidate_area_ha');

  var stats = area.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: aoi,
    scale: 10,
    maxPixels: 1e13,
    tileScale: 8
  });

  var areaValue = stats.get(
    'candidate_area_ha'
  );

  return ee.Feature(null, {

    year: year,

    acquisitions: img.get(
      'acquisition_count'
    ),

    usable_acquisitions: img.get(
      'usable_acquisitions'
    ),

    seasonal_union_ha: ee.Number(
      ee.Algorithms.If(
        areaValue,
        areaValue,
        0
      )
    )

  });
}


// ------------------------------------------------------
// 14. GENERATE ANNUAL SUMMARY
// ------------------------------------------------------

var summary = ee.FeatureCollection([
  summarise(map2024, 2024),
  summarise(map2025, 2025),
  summarise(map2026, 2026)
]);

print(
  'VERSION 15.1 — ANNUAL SUMMARY',
  summary
);

print(
  'VERSION 15.1 — EXPANDED ANNUAL TABLE',
  ui.Chart.feature.byFeature(
    summary,
    'year',
    [
      'acquisitions',
      'usable_acquisitions',
      'seasonal_union_ha'
    ]
  ).setChartType('Table')
);


// ------------------------------------------------------
// 15. EXPORT ANNUAL GEOTIFF MAPS
// ------------------------------------------------------

function exportMap(img, year) {

  Export.image.toDrive({

    image: ee.Image(img).toFloat(),

    description:
      'Lekki_Candidates_' + year,

    folder: exportFolder,

    fileNamePrefix:
      'Lekki_Candidates_' + year,

    region: aoi,

    scale: 10,

    maxPixels: 1e13,

    fileFormat: 'GeoTIFF'

  });

}

exportMap(map2024, 2024);

exportMap(map2025, 2025);

exportMap(map2026, 2026);


// ------------------------------------------------------
// 16. EXPORT ANNUAL SUMMARY CSV
// ------------------------------------------------------

Export.table.toDrive({

  collection: summary,

  description:
    'Lekki_2024_2026_Annual_Summary',

  folder: exportFolder,

  fileNamePrefix:
    'Lekki_2024_2026_Annual_Summary',

  fileFormat: 'CSV'

});


// ------------------------------------------------------
// 17. COMPLETION MESSAGE
// ------------------------------------------------------

print('VERSION 15.1 INITIALIZED');

print(
  'Expected annual summary: 3 records'
);

print(
  'Check acquisition and usable-acquisition counts.'
);

print(
  'Four export tasks have been configured.'
);

print(
  'Next: Version 16 — Spatial change analysis'
);