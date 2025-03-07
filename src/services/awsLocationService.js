import { 
  LocationClient, 
  SearchPlaceIndexForTextCommand,
  CalculateRouteCommand,
  CreateGeofenceCollectionCommand,
  PutGeofenceCommand,
  SearchPlaceIndexForPositionCommand
} from "@aws-sdk/client-location";
import { AWS_CONFIG } from '../config/aws-config';

const locationClient = new LocationClient({
  region: AWS_CONFIG.region,
  credentials: {
    accessKeyId: AWS_CONFIG.accessKeyId,
    secretAccessKey: AWS_CONFIG.secretAccessKey
  }
});

// Search for places by text query
export const searchPlace = async (searchText) => {
  try {
    const command = new SearchPlaceIndexForTextCommand({
      IndexName: AWS_CONFIG.placeIndexName,
      Text: searchText,
      BiasPosition: AWS_CONFIG.DEFAULT_CENTER, // Bias towards India
      MaxResults: 5,
      FilterCountries: ['IND'] // Only search in India
    });

    const response = await locationClient.send(command);
    return response.Results.map(result => ({
      id: result.PlaceId,
      text: result.Place.Label,
      coordinates: result.Place.Geometry.Point,
      address: result.Place.Address
    }));
  } catch (error) {
    console.error('Error searching places:', error);
    throw new Error('Failed to search location. Please try again.');
  }
};

// Calculate safe route between two points
export const calculateSafeRoute = async (startCoords, endCoords, crimeData) => {
  try {
    // Calculate high-risk areas based on crime data
    const highRiskAreas = calculateHighRiskAreas(crimeData);
    
    const command = new CalculateRouteCommand({
      CalculatorName: AWS_CONFIG.routeCalculatorName,
      DeparturePosition: startCoords,
      DestinationPosition: endCoords,
      IncludeLegGeometry: true,
      TravelMode: 'Walking',
      // Avoid areas with high crime rates
      AvoidPolygons: highRiskAreas
    });

    const response = await locationClient.send(command);
    
    return {
      geometry: response.Legs[0].Geometry.LineString,
      distance: response.Summary.Distance,
      duration: response.Summary.DurationSeconds,
      startPoint: startCoords,
      endPoint: endCoords
    };
  } catch (error) {
    console.error('Error calculating route:', error);
    throw new Error('Failed to calculate safe route. Please try again.');
  }
};

// Create geofence for high-crime areas
export const createCrimeGeofence = async (areaName, coordinates) => {
  try {
    const command = new PutGeofenceCommand({
      CollectionName: AWS_CONFIG.geofenceCollectionName,
      GeofenceId: `crime-area-${Date.now()}`,
      Geometry: {
        Polygon: [coordinates]
      }
    });

    await locationClient.send(command);
    return command.GeofenceId;
  } catch (error) {
    console.error('Error creating geofence:', error);
    throw error;
  }
};

// Get nearby police stations
export const getNearbyPoliceStations = async (coordinates, radiusInMeters = 5000) => {
  try {
    const command = new SearchPlaceIndexForPositionCommand({
      IndexName: AWS_CONFIG.placeIndexName,
      Position: coordinates,
      MaxResults: 10,
      FilterCategories: ['police']
    });

    const response = await locationClient.send(command);
    return response.Results.map(result => ({
      id: result.PlaceId,
      name: result.Place.Label,
      coordinates: [
        result.Place.Geometry.Point[0],
        result.Place.Geometry.Point[1]
      ],
      address: result.Place.Address
    }));
  } catch (error) {
    console.error('Error finding police stations:', error);
    throw error;
  }
};

// Helper function to calculate high-risk areas from crime data
const calculateHighRiskAreas = (crimeData) => {
  const gridSize = 0.01; // roughly 1km
  const gridCells = {};
  
  // Group incidents by grid cells
  crimeData.forEach(incident => {
    const gridX = Math.floor(incident.location[0] / gridSize);
    const gridY = Math.floor(incident.location[1] / gridSize);
    const key = `${gridX},${gridY}`;
    
    if (!gridCells[key]) {
      gridCells[key] = {
        count: 0,
        severity: 0
      };
    }
    
    gridCells[key].count++;
    // Add severity weight
    gridCells[key].severity += incident.severity === 'high' ? 3 :
                              incident.severity === 'medium' ? 2 : 1;
  });
  
  // Convert high-risk cells to polygons
  return Object.entries(gridCells)
    .filter(([_, data]) => data.count >= 5 || data.severity >= 10)
    .map(([key, _]) => {
      const [x, y] = key.split(',').map(Number);
      return [
        [x * gridSize, y * gridSize],
        [(x + 1) * gridSize, y * gridSize],
        [(x + 1) * gridSize, (y + 1) * gridSize],
        [x * gridSize, (y + 1) * gridSize],
        [x * gridSize, y * gridSize]
      ];
    });
}; 