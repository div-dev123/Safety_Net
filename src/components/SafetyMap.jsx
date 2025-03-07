import { useRef, useState, useLayoutEffect, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AWS_CONFIG } from '../config/aws-config';
import { SEVERITY_COLORS, INCIDENT_TYPES, getMarkerColor, formatTimestamp } from '../data/crimeData';
import { generateMockCrimeData } from '../services/indianCrimeDataService';
import { calculateSafeRoute, searchPlace } from '../services/awsLocationService';

const SafetyMap = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const locationMarker = useRef(null);
  const crimeMarkers = useRef([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [containerReady, setContainerReady] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [showLegend, setShowLegend] = useState(true);
  const [crimeData, setCrimeData] = useState([]);
  const [selectedCity, setSelectedCity] = useState('all');
  const [cities, setCities] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [districts, setDistricts] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [routeStart, setRouteStart] = useState(null);
  const [routeEnd, setRouteEnd] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showGeofences, setShowGeofences] = useState(true);
  const routeLayer = useRef(null);
  const geofenceLayer = useRef(null);
  const [startSearch, setStartSearch] = useState('');
  const [endSearch, setEndSearch] = useState('');
  const [startResults, setStartResults] = useState([]);
  const [endResults, setEndResults] = useState([]);
  const [selectedStart, setSelectedStart] = useState(null);
  const [selectedEnd, setSelectedEnd] = useState(null);
  const [routeDetails, setRouteDetails] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const startMarker = useRef(null);
  const endMarker = useRef(null);

  // Effect to check when container is mounted
  useLayoutEffect(() => {
    if (mapContainer.current && !containerReady) {
      setContainerReady(true);
    }
  }, []);

  // Effect to initialize map once container is ready
  useLayoutEffect(() => {
    if (!containerReady || !mapContainer.current) return;
    if (map.current) return;

    try {
      console.log('Container ready, initializing map...', mapContainer.current);
      
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: AWS_CONFIG.MAP_STYLE_URL,
        center: AWS_CONFIG.DEFAULT_CENTER,
        zoom: AWS_CONFIG.DEFAULT_ZOOM,
        attributionControl: false
      });

      map.current.addControl(new maplibregl.NavigationControl(), 'top-left');
      map.current.addControl(new maplibregl.AttributionControl(), 'bottom-right');

      map.current.on('load', () => {
        console.log('Map loaded successfully');
        setLoading(false);
        // Initialize geofences after map is loaded
        if (crimeData.length > 0 && showGeofences) {
          createHighCrimeGeofences();
        }
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setError('Failed to load map: ' + (e.error?.message || 'Unknown error'));
        setLoading(false);
      });

      map.current.on('click', handleMapClick);

    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map: ' + error.message);
      setLoading(false);
    }

    return () => {
      crimeMarkers.current.forEach(marker => marker.remove());
      if (locationMarker.current) {
        locationMarker.current.remove();
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [containerReady]);

  // Function to load crime data
  const loadCrimeData = async () => {
    setDataLoading(true);
    try {
      const mockData = generateMockCrimeData();
      setCrimeData(mockData);
      
      // Extract unique cities and districts
      const uniqueCities = [...new Set(mockData.map(item => item.city))].sort();
      setCities(uniqueCities);
      
      // Extract districts for the selected city
      const cityDistricts = [...new Set(mockData
        .filter(item => selectedCity === 'all' || item.city === selectedCity)
        .map(item => item.district))].sort();
      setDistricts(cityDistricts);
      
      // Create markers if map is ready
      if (map.current) {
        createCrimeMarkers(mockData);
      }
    } catch (err) {
      console.error('Error loading crime data:', err);
      setError('Failed to load crime data. Please try again later.');
    }
    setDataLoading(false);
  };

  // Effect to fetch crime data
  useEffect(() => {
    loadCrimeData();
  }, []);

  // Effect to update districts when city changes
  useEffect(() => {
    if (crimeData.length > 0) {
      const cityDistricts = [...new Set(crimeData
        .filter(item => selectedCity === 'all' || item.city === selectedCity)
        .map(item => item.district))].sort();
      setDistricts(cityDistricts);
      setSelectedDistrict('all'); // Reset district selection when city changes
    }
  }, [selectedCity, crimeData]);

  // Effect to filter markers based on selected city and district
  useEffect(() => {
    if (crimeData.length > 0 && map.current) {
      createCrimeMarkers(crimeData);
    }
  }, [selectedCity, selectedDistrict]);

  // Function to create crime markers
  const createCrimeMarkers = (data) => {
    // Remove existing markers
    crimeMarkers.current.forEach(marker => marker.remove());
    crimeMarkers.current = [];

    // Filter data based on selected city and district
    const filteredData = data.filter(incident => {
      const cityMatch = selectedCity === 'all' || incident.city === selectedCity;
      const districtMatch = selectedDistrict === 'all' || incident.district === selectedDistrict;
      return cityMatch && districtMatch;
    });

    // If a city is selected, fly to its location
    if (selectedCity !== 'all' && filteredData.length > 0) {
      const cityIncident = filteredData[0];
      map.current.flyTo({
        center: cityIncident.location,
        zoom: 11,
        duration: 2000
      });
    } else {
      // If no city is selected, show all of India
      map.current.flyTo({
        center: AWS_CONFIG.DEFAULT_CENTER,
        zoom: AWS_CONFIG.DEFAULT_ZOOM,
        duration: 2000
      });
    }

    filteredData.forEach(incident => {
      // Create marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'crime-marker';
      markerEl.innerHTML = `
        <div class="w-4 h-4 rounded-full border-2 border-white shadow-lg relative cursor-pointer"
             style="background-color: ${getMarkerColor(incident.severity)}">
        </div>
      `;

      // Create popup
      const popup = new maplibregl.Popup({
        offset: 25,
        closeButton: false,
        className: 'crime-popup'
      }).setHTML(`
        <div class="bg-gray-900 p-4 rounded-lg shadow-lg max-w-xs">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-2 h-2 rounded-full" style="background-color: ${getMarkerColor(incident.severity)}"></span>
            <span class="font-semibold text-white">${INCIDENT_TYPES[incident.type]}</span>
          </div>
          <p class="text-gray-300 text-sm mb-2">${incident.description}</p>
          <div class="text-gray-400 text-xs mb-2">
            <div>City: ${incident.city}</div>
            <div>District: ${incident.district}</div>
            <div>Police Station: ${incident.policeStation}</div>
          </div>
          <div class="flex justify-between items-center text-xs">
            <span class="text-gray-400">${formatTimestamp(incident.timestamp)}</span>
            <span class="px-2 py-1 rounded-full text-xs" 
                  style="background-color: ${getMarkerColor(incident.severity)}20; color: ${getMarkerColor(incident.severity)}">
              ${incident.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      `);

      // Create and store marker
      const marker = new maplibregl.Marker({
        element: markerEl,
        anchor: 'center'
      })
        .setLngLat(incident.location)
        .setPopup(popup)
        .addTo(map.current);

      crimeMarkers.current.push(marker);
    });
  };

  // Function to handle getting user's location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setLocatingUser(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        
        if (map.current) {
          // Remove existing marker if it exists
          if (locationMarker.current) {
            locationMarker.current.remove();
          }

          // Create marker element
          const markerEl = document.createElement('div');
          markerEl.className = 'location-marker';
          markerEl.innerHTML = `
            <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg relative">
              <div class="absolute -inset-2 bg-blue-500/20 rounded-full animate-ping"></div>
            </div>
          `;

          // Create and store new marker reference
          locationMarker.current = new maplibregl.Marker({
            element: markerEl,
            anchor: 'center'
          })
            .setLngLat([longitude, latitude])
            .addTo(map.current);

          // Fly to location
          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 14,
            duration: 2000
          });
        }

        setLocatingUser(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocationError(
          error.code === 1 ? 'Location access denied. Please enable location services.' :
          error.code === 2 ? 'Unable to determine your location.' :
          error.code === 3 ? 'Location request timed out.' :
          'An error occurred while getting your location.'
        );
        setLocatingUser(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  // Function to create geofences for high-crime areas
  const createHighCrimeGeofences = async () => {
    if (!map.current || !map.current.isStyleLoaded()) {
      console.log('Map or style not ready, skipping geofence creation');
      return;
    }

    // Remove existing geofence layer
    if (geofenceLayer.current) {
      if (map.current.getLayer(geofenceLayer.current)) {
        map.current.removeLayer(geofenceLayer.current);
      }
      if (map.current.getSource('geofences')) {
        map.current.removeSource('geofences');
      }
      geofenceLayer.current = null;
    }

    try {
      // Group incidents by area
      const gridSize = 0.01; // roughly 1km
      const gridCells = {};
      
      crimeData.forEach(incident => {
        const gridX = Math.floor(incident.location[0] / gridSize);
        const gridY = Math.floor(incident.location[1] / gridSize);
        const key = `${gridX},${gridY}`;
        
        if (!gridCells[key]) {
          gridCells[key] = {
            count: 0,
            incidents: [],
            center: incident.location
          };
        }
        
        gridCells[key].count++;
        gridCells[key].incidents.push(incident);
      });

      // Create geofences for areas with high incident counts
      const highCrimeAreas = Object.entries(gridCells)
        .filter(([, data]) => data.count >= 5) // Areas with 5 or more incidents
        .map(([key, data]) => {
          const [x, y] = key.split(',').map(Number);
          return {
            type: 'Feature',
            properties: {
              count: data.count,
              description: `High-crime area with ${data.count} incidents`
            },
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [x * gridSize, y * gridSize],
                [(x + 1) * gridSize, y * gridSize],
                [(x + 1) * gridSize, (y + 1) * gridSize],
                [x * gridSize, (y + 1) * gridSize],
                [x * gridSize, y * gridSize]
              ]]
            }
          };
        });

      // Add geofences to the map
      map.current.addSource('geofences', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: highCrimeAreas
        }
      });

      const layerId = 'geofence-areas';
      map.current.addLayer({
        id: layerId,
        type: 'fill',
        source: 'geofences',
        paint: {
          'fill-color': '#ff0000',
          'fill-opacity': 0.2,
          'fill-outline-color': '#ff0000'
        }
      });

      geofenceLayer.current = layerId;
    } catch (error) {
      console.error('Error creating geofences:', error);
      setError('Failed to create geofences. Please try again later.');
    }
  };

  // Function to handle map clicks for route selection
  const handleMapClick = (e) => {
    if (!routeStart) {
      setRouteStart(e.lngLat);
    } else if (!routeEnd) {
      setRouteEnd(e.lngLat);
      calculateRoute(routeStart, e.lngLat);
    } else {
      // Reset route
      setRouteStart(e.lngLat);
      setRouteEnd(null);
      if (routeLayer.current) {
        map.current.removeLayer(routeLayer.current);
        map.current.removeSource('route');
        routeLayer.current = null;
      }
    }
  };

  // Function to calculate and display safe route
  const calculateRoute = async (start, end) => {
    setRouteLoading(true);
    try {
      const route = await calculateSafeRoute(
        [start.lng, start.lat],
        [end.lng, end.lat],
        crimeData
      );

      if (routeLayer.current) {
        map.current.removeLayer(routeLayer.current);
        map.current.removeSource('route');
      }

      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: route.geometry
          }
        }
      });

      const layerId = 'safe-route';
      map.current.addLayer({
        id: layerId,
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#4CAF50',
          'line-width': 4,
          'line-opacity': 0.8
        }
      });

      routeLayer.current = layerId;
    } catch (error) {
      console.error('Error calculating route:', error);
      setError('Failed to calculate safe route. Please try again.');
    }
    setRouteLoading(false);
  };

  // Effect to create geofences for high-crime areas
  useEffect(() => {
    if (map.current && map.current.isStyleLoaded() && crimeData.length > 0 && showGeofences) {
      createHighCrimeGeofences();
    } else if (map.current && geofenceLayer.current && !showGeofences) {
      if (map.current.getLayer(geofenceLayer.current)) {
        map.current.removeLayer(geofenceLayer.current);
      }
      if (map.current.getSource('geofences')) {
        map.current.removeSource('geofences');
      }
      geofenceLayer.current = null;
    }
  }, [crimeData, showGeofences]);

  // Function to search locations
  const handleSearch = async (query, isStart = true) => {
    if (!query.trim()) {
      isStart ? setStartResults([]) : setEndResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await searchPlace(query);
      isStart ? setStartResults(results) : setEndResults(results);
    } catch (error) {
      setError(error.message);
    }
    setSearchLoading(false);
  };

  // Function to handle location selection
  const handleLocationSelect = (location, isStart = true) => {
    if (isStart) {
      setSelectedStart(location);
      setStartSearch(location.text);
      setStartResults([]);
      
      // Update start marker
      if (startMarker.current) startMarker.current.remove();
      startMarker.current = new maplibregl.Marker({ color: '#4CAF50' })
        .setLngLat(location.coordinates)
        .addTo(map.current);
    } else {
      setSelectedEnd(location);
      setEndSearch(location.text);
      setEndResults([]);
      
      // Update end marker
      if (endMarker.current) endMarker.current.remove();
      endMarker.current = new maplibregl.Marker({ color: '#f44336' })
        .setLngLat(location.coordinates)
        .addTo(map.current);
    }

    // If both locations are selected, calculate route
    if ((isStart && selectedEnd) || (!isStart && selectedStart)) {
      calculateSafeRoute(
        isStart ? location.coordinates : selectedStart.coordinates,
        isStart ? selectedEnd.coordinates : location.coordinates,
        crimeData
      ).then(route => {
        displayRoute(route);
        setRouteDetails(route);
      }).catch(error => {
        setError(error.message);
      });
    }

    // Fit map to show selected location
    map.current.flyTo({
      center: location.coordinates,
      zoom: 13,
      duration: 2000
    });
  };

  // Function to display route on map
  const displayRoute = (route) => {
    if (routeLayer.current) {
      map.current.removeLayer(routeLayer.current);
      map.current.removeSource('route');
    }

    map.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: route.geometry
        }
      }
    });

    const layerId = 'safe-route';
    map.current.addLayer({
      id: layerId,
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#4CAF50',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });

    routeLayer.current = layerId;

    // Fit map to show entire route
    const bounds = new maplibregl.LngLatBounds();
    route.geometry.forEach(coord => bounds.extend(coord));
    map.current.fitBounds(bounds, { padding: 50, duration: 2000 });
  };

  return (
    <div className="bg-[#0a0a0f] rounded-xl shadow-2xl overflow-hidden border border-gray-800/50">
      <div className="p-6 bg-gradient-to-r from-gray-900 to-gray-800/95 text-white flex justify-between items-center border-b border-gray-800/50">
        <h2 className="text-2xl font-bold flex items-center">
          <div className="p-2 bg-blue-500/10 rounded-lg mr-3">
            <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="bg-gradient-to-r from-blue-400 to-indigo-500 text-transparent bg-clip-text">
            India Safety Map
          </span>
        </h2>

        <div className="flex items-center gap-4">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-gray-900/90 px-4 py-2 rounded-lg border border-gray-700/50 
              text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Cities</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          {selectedCity !== 'all' && (
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-gray-900/90 px-4 py-2 rounded-lg border border-gray-700/50 
                text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Districts</option>
              {districts.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowLegend(!showLegend)}
            className="bg-gray-900/90 px-4 py-2 rounded-lg border border-gray-700/50 
              hover:border-indigo-500/50 hover:bg-gray-800 transition-all duration-300 
              focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          >
            {showLegend ? 'Hide Legend' : 'Show Legend'}
          </button>

          <button
            onClick={handleGetLocation}
            disabled={locatingUser}
            className={`bg-gray-900/90 px-4 py-2 rounded-lg border border-gray-700/50 
              hover:border-indigo-500/50 hover:bg-gray-800 transition-all duration-300 
              focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
              disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
          >
            {locatingUser ? (
              <>
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Locating...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Find My Location</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowGeofences(!showGeofences)}
            className="bg-gray-900/90 px-4 py-2 rounded-lg border border-gray-700/50 
              hover:border-indigo-500/50 hover:bg-gray-800 transition-all duration-300 
              focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          >
            {showGeofences ? 'Hide Risk Areas' : 'Show Risk Areas'}
          </button>

          {routeLoading ? (
            <div className="bg-gray-900/90 px-4 py-2 rounded-lg border border-gray-700/50 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Calculating Route...</span>
            </div>
          ) : (
            <div className="bg-gray-900/90 px-4 py-2 rounded-lg border border-gray-700/50">
              {!routeStart ? 'Click map to set start point' :
               !routeEnd ? 'Click map to set destination' :
               'Click map to reset route'}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="relative">
              <input
                type="text"
                value={startSearch}
                onChange={(e) => {
                  setStartSearch(e.target.value);
                  handleSearch(e.target.value, true);
                }}
                placeholder="Enter start location"
                className="w-64 bg-gray-900/90 px-4 py-2 rounded-lg border border-gray-700/50 
                  text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              {searchLoading && startSearch && (
                <div className="absolute right-3 top-2.5">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {startResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-gray-900/95 rounded-lg border border-gray-700/50 shadow-xl">
                  {startResults.map(result => (
                    <div
                      key={result.id}
                      onClick={() => handleLocationSelect(result, true)}
                      className="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm"
                    >
                      {result.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={endSearch}
                onChange={(e) => {
                  setEndSearch(e.target.value);
                  handleSearch(e.target.value, false);
                }}
                placeholder="Enter destination"
                className="w-64 bg-gray-900/90 px-4 py-2 rounded-lg border border-gray-700/50 
                  text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              {searchLoading && endSearch && (
                <div className="absolute right-3 top-2.5">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {endResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-gray-900/95 rounded-lg border border-gray-700/50 shadow-xl">
                  {endResults.map(result => (
                    <div
                      key={result.id}
                      onClick={() => handleLocationSelect(result, false)}
                      className="px-4 py-2 hover:bg-gray-800 cursor-pointer text-sm"
                    >
                      {result.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {routeDetails && (
            <div className="bg-gray-900/90 px-4 py-2 rounded-lg border border-gray-700/50">
              <div className="text-sm">
                Distance: {Math.round(routeDetails.distance / 100) / 10} km
              </div>
              <div className="text-sm">
                Duration: {Math.round(routeDetails.duration / 60)} mins
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative w-full h-[600px]">
        <div 
          ref={mapContainer} 
          className="absolute inset-0" 
          id="map"
        />

        {showLegend && (
          <div className="absolute top-4 right-4 bg-gray-900/95 p-4 rounded-lg shadow-lg border border-gray-800/50 backdrop-blur-sm">
            <h3 className="text-white font-semibold mb-3">Incident Severity</h3>
            <div className="space-y-2">
              {Object.entries(SEVERITY_COLORS).map(([severity, color]) => (
                <div key={severity} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
                  <span className="text-gray-300 text-sm">{severity.charAt(0) + severity.slice(1).toLowerCase()}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800">
              <h3 className="text-white font-semibold mb-2">Statistics</h3>
              <div className="text-sm text-gray-300">
                <div>Total Incidents: {crimeData.length}</div>
                <div>Filtered: {crimeMarkers.current.length}</div>
                {selectedCity !== 'all' && (
                  <div>City: {selectedCity}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {(locationError || error) && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm">
            {locationError || error}
          </div>
        )}

        {dataLoading && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500/90 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm">
            Loading crime data...
          </div>
        )}
      </div>

      {loading && (
        <div className="absolute inset-0 bg-[#0a0a0f]/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[#0a0a0f] rounded-xl shadow-2xl p-8 text-center border border-gray-800/50">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-400">Initializing Safety Map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafetyMap; 