import { useState } from "react";
import Map from "../components/Map";

const sampleMarkers = [
  { id: 1, lat: 10.8231, lng: 106.6297, label: "A", title: "Văn Lang University", type: "university" },
  { id: 2, lat: 10.8300, lng: 106.6350, label: "B", title: "Location B", type: "incident" },
  { id: 3, lat: 10.8150, lng: 106.6200, label: "C", title: "Location C", type: "safe" },
];

export default function MapPage() {
  const [markers, setMarkers] = useState(sampleMarkers);
  const [selectedMarker, setSelectedMarker] = useState(null);

  const handleSelect = (pos) => {
    const newMarker = {
      id: Date.now(),
      lat: pos.lat,
      lng: pos.lng,
      title: "New Location",
    };
    setMarkers([...markers, newMarker]);
  };

  const handleMarkerSelect = (newMarkers, index) => {
    setMarkers(newMarkers);
    setSelectedMarker(newMarkers[index]);
  };

  const handleMarkerClick = (marker, index) => {
    setSelectedMarker({ ...marker, index });
  };

  return (
    <div className="map-page">
      <header className="map-page-header">
        <h1>Security Map</h1>
        <p>Click on map to add marker. Drag markers to update position.</p>
      </header>

      <div className="map-container">
        <Map
          markers={markers}
          onSelect={handleSelect}
          onMarkerSelect={handleMarkerSelect}
          onMarkerClick={handleMarkerClick}
          apiKey="YOUR_GOOGLE_MAPS_API_KEY"
          containerStyle={{ width: "100%", height: "60vh", borderRadius: 8 }}
          zoom={14}
        />
      </div>

      <div className="marker-info">
        <h3>Marker Details</h3>
        {selectedMarker ? (
          <div className="info-card">
            <p><strong>ID:</strong> {selectedMarker.id}</p>
            <p><strong>Latitude:</strong> {selectedMarker.lat}</p>
            <p><strong>Longitude:</strong> {selectedMarker.lng}</p>
            <p><strong>Title:</strong> {selectedMarker.title}</p>
          </div>
        ) : (
          <p>Click on a marker to see details</p>
        )}
      </div>

      <div className="marker-list">
        <h3>All Markers ({markers.length})</h3>
        <ul>
          {markers.map((marker) => (
            <li key={marker.id} onClick={() => handleMarkerClick(marker)}>
              {marker.title || `Marker ${marker.id}`} ({marker.lat}, {marker.lng})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}