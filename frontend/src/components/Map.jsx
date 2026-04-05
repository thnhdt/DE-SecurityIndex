import { useState, useCallback, useEffect } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

export const Map = ({ 
    pos, 
    markers = [], 
    onSelect, 
    onMarkerSelect,
    onMarkerClick,
    apiKey, 
    containerStyle, 
    zoom = 16 
}) => {
    const [markerPositions, setMarkerPositions] = useState(markers);

    useEffect(() => {
        setMarkerPositions(markers);
    }, [markers]);

    const defaultCenter = pos || (markers.length > 0 ? markers[0] : { lat: 10.8231, lng: 106.6297 });

    const onMarkerDragEnd = useCallback((event, index) => {
        if (event.latLng && onMarkerSelect) {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            const newPos = { lat, lng };
            const newMarkers = [...markerPositions];
            newMarkers[index] = { ...newMarkers[index], ...newPos };
            setMarkerPositions(newMarkers);
            onMarkerSelect(newMarkers, index);
        }
    }, [onMarkerSelect, markerPositions]);

    const onMapClick = useCallback((event) => {
        if (event.latLng && onSelect) {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            onSelect({ lat, lng });
        }
    }, [onSelect]);

    const handleMarkerClick = useCallback((marker, index) => {
        if (onMarkerClick) {
            onMarkerClick(marker, index);
        }
    }, [onMarkerClick]);

    return (
        <LoadScript googleMapsApiKey={apiKey}>
            <GoogleMap
                mapContainerStyle={containerStyle || { width: "100%", height: "40vh", borderRadius: 8, border: "1px solid #eee" }}
                center={defaultCenter}
                zoom={zoom}
                onClick={onMapClick}
            >
                {markerPositions.map((marker, index) => (
                    <Marker
                        key={marker.id || index}
                        position={marker}
                        draggable={!!onMarkerSelect}
                        onDragEnd={(e) => onMarkerDragEnd(e, index)}
                        onClick={() => handleMarkerClick(marker, index)}
                        label={marker.label}
                        title={marker.title}
                    />
                ))}
            </GoogleMap>
        </LoadScript>
    );
};

export default Map;