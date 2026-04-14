import { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
};

const containerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 10.7769,
  lng: 106.7009,
};

const libraries = ['visualization'];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_APP_GOOGLE_MAPS_API_KEY;

export default function MapSection({ incidents, mapMode }) {
  const [map, setMap] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  // const [heatmapData, setHeatmapData] = useState([]);

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const onMarkerClick = useCallback((incident) => {
    setSelectedMarker(incident);
  }, []);

  useEffect(() => {
    if (map && mapMode === 'heatmap' && incidents.length > 0) {
      const heatmap = new window.google.maps.visualization.HeatmapLayer({
        data: incidents.map(item => ({
          location: new window.google.maps.LatLng(item.lat, item.lon),
          weight: item.severity_weight,
        })),
        radius: 30,
        opacity: 0.7,
        dissipating: true,
      });
      heatmap.setMap(map);

      return () => {
        heatmap.setMap(null);
      };
    }
  }, [map, mapMode, incidents]);

  const markers = useMemo(() => {
    if (mapMode !== 'hotspots') return null;
    return incidents.map(item => (
      <Marker
        key={item.event_id}
        position={{ lat: item.lat, lng: item.lon }}
        title={`${item.incident_type} - ${item.district_name}`}
        onClick={() => onMarkerClick(item)}
      />
    ));
  }, [incidents, mapMode, onMarkerClick]);

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {markers}
        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div style={{ padding: 8, maxWidth: 200 }}>
              <strong>{selectedMarker.incident_type}</strong>
              <p style={{ margin: '4px 0' }}>{selectedMarker.district_name}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#666' }}>{selectedMarker.event_time}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
}