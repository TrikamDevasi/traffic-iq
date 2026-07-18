import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useGetIntersectionsQuery } from '../store/api/apiSlice';
import { useNavigate } from 'react-router-dom';
import { useTrafficSocket } from '../hooks/useTrafficSocket';
import AsyncBoundary from '../components/common/AsyncBoundary';
const LiveMap = () => {
  const navigate = useNavigate();
  const socket = useTrafficSocket();
  const { data: intersectionsRes, isLoading, isError, error, refetch } = useGetIntersectionsQuery({});
  const intersections = intersectionsRes?.data || [];

  const [liveTraffic, setLiveTraffic] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!socket) return;
    
    socket.on('traffic:update', (data: any) => {
      setLiveTraffic(prev => ({
        ...prev,
        [data.intersectionId]: data
      }));
    });

    return () => {
      socket.off('traffic:update');
    };
  }, [socket]);

  const getMarkerColor = (intersectionId: string) => {
    const reading = liveTraffic[intersectionId];
    if (!reading) return '#0ea5e9'; // Default blue if no data
    
    if (reading.congestionLevel > 7) return '#f43f5e'; // Red (High)
    if (reading.congestionLevel > 4) return '#f59e0b'; // Amber (Medium)
    return '#10b981'; // Green (Low)
  };

  // Remove generic loading block, handled in render


  // Center on Ahmedabad-Gandhinagar Highway roughly
  const center: [number, number] = [23.1, 72.6];

  return (
    <div className="space-y-4 h-[calc(100vh-10rem)] flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Live Map</h1>
        <p className="text-slate-500 dark:text-slate-400">Real-time intersection monitoring.</p>
      </div>
      
      <AsyncBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        loadingMessage="Loading Map Data..."
      >
        <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-dark-border relative z-0">
          <MapContainer center={center} zoom={11} className="h-full w-full">
            {/* Use light tiles by default, ideally we'd switch based on theme but Leaflet doesn't natively support dynamic tile changing well without re-renders */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            
            {intersections.map((int: any) => {
              const lat = int.location.coordinates[1];
              const lng = int.location.coordinates[0];
              const color = getMarkerColor(int.intersectionId);
              const liveData = liveTraffic[int.intersectionId];

              return (
                <CircleMarker 
                  key={int.intersectionId}
                  center={[lat, lng]} 
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.7 }}
                  radius={8}
                >
                  <Popup>
                    <div className="font-semibold text-slate-900">{int.name} ({int.intersectionId})</div>
                    <div className="text-sm text-slate-600">Lanes: {int.laneCount}</div>
                    {liveData && (
                      <div className="mt-2 text-sm border-t pt-2">
                        <div>Congestion: <strong>{liveData.congestionLevel}/10</strong></div>
                        <div>Avg Wait: <strong>{liveData.averageWaitTime}s</strong></div>
                        <div>Throughput: <strong>{liveData.vehicleCount}</strong></div>
                      </div>
                    )}
                    <button 
                      onClick={() => navigate(`/intersections/${int.intersectionId}`)}
                      className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1.5 rounded transition-colors"
                    >
                      View Details
                    </button>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </AsyncBoundary>
    </div>
  );
};

export default LiveMap;
