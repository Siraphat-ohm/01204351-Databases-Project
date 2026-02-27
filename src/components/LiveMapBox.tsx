"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import Map, { Marker, Source, Layer, Popup, MapRef } from 'react-map-gl/mapbox';
import { Badge, Group, ThemeIcon, Text, Center, Paper, Stack, ActionIcon, Divider } from '@mantine/core';
import { useResizeObserver } from '@mantine/hooks';
import { Plane, X, Clock, Gauge } from 'lucide-react'; // ✅ Added Clock and Gauge icons
import 'mapbox-gl/dist/mapbox-gl.css'; 

import { FlightRoute } from './LiveRouteMap'; 

interface LiveMapboxProps {
  routes: FlightRoute[];
  defaultZoom?: number;
  theme?: 'dark' | 'satellite';
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function LiveMapbox({ routes, defaultZoom = 2.5, theme = 'dark' }: LiveMapboxProps) {
  const mapStyle = theme === 'satellite' 
    ? 'mapbox://styles/mapbox/satellite-streets-v12' 
    : 'mapbox://styles/mapbox/dark-v11';

  const mapRef = useRef<MapRef>(null);
  const [containerRef, rect] = useResizeObserver();

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.resize();
    }
  }, [rect.width, rect.height]);

  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string>('grab');
  const [popupInfo, setPopupInfo] = useState<{
    route: FlightRoute & { time?: string }; // Added optional time
    longitude: number;
    latitude: number;
  } | null>(null);

  const routeLines = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: routes.map((route) => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [route.fromCoords, route.toCoords],
        },
        properties: {
          id: route.id,
          status: route.status,
          routeData: JSON.stringify(route) 
        },
      })),
    };
  }, [routes]);

  const onMouseEnter = useCallback(() => setCursor('pointer'), []);
  const onMouseLeave = useCallback(() => {
    setCursor('grab');
    setHoveredRouteId(null);
  }, []);

  const onMouseMove = useCallback((event: any) => {
    if (event.features && event.features.length > 0) {
      setHoveredRouteId(event.features[0].properties.id);
    } else {
      setHoveredRouteId(null);
    }
  }, []);

  const onClick = useCallback((event: any) => {
    if (event.features && event.features.length > 0) {
      const feature = event.features[0];
      const clickedRoute = JSON.parse(feature.properties.routeData);
      
      setPopupInfo({
        route: clickedRoute,
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
      });
    } else {
      setPopupInfo(null);
    }
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <Center h="100%" bg="dark.7" style={{ borderRadius: 8 }}>
        <Text c="red" fw={600}>Mapbox Token is missing in .env.local</Text>
      </Center>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <style>{`
        .airline-popup .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .airline-popup .mapboxgl-popup-tip {
          border-top-color: var(--mantine-color-dark-7) !important;
          border-bottom-color: var(--mantine-color-dark-7) !important;
        }
      `}</style>

      <Map
        ref={mapRef}
        initialViewState={{ longitude: 100.75, latitude: 13.68, zoom: defaultZoom }}
        mapStyle={mapStyle}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={['route-line-hitbox']}
        cursor={cursor}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onMouseMove={onMouseMove}
        onClick={onClick}
      >
        <Source id="flight-routes" type="geojson" data={routeLines as any}>
          {/* ✅ GLOW / OUTLINE LAYER: Makes the lines highly visible against complex map backgrounds */}
          <Layer 
            id="route-line-glow" 
            type="line" 
            paint={{
              'line-color': theme === 'dark' ? '#000000' : '#ffffff',
              'line-width': [
                'case',
                ['==', ['get', 'id'], hoveredRouteId || ''],
                10, // Hover glow size
                6   // Normal glow size
              ],
              'line-opacity': 0.6,
              'line-blur': 3
            }} 
          />

          {/* ✅ MAIN VISUAL LAYER: Increased opacity and tweaked colors */}
          <Layer 
            id="route-line-visual" 
            type="line" 
            paint={{
              'line-color': [
                'match', 
                ['get', 'status'], 
                'ACTIVE', '#339af0', // Bright Blue
                'SCHEDULED', '#fcc419', // Bright Yellow (much easier to see than gray)
                '#ff6b6b' // Red for delayed/issues
              ],
              'line-width': [
                'case',
                ['==', ['get', 'id'], hoveredRouteId || ''],
                6, // Hover width
                3  // Normal width
              ],
              'line-opacity': [
                'case',
                ['==', ['get', 'id'], hoveredRouteId || ''],
                1.0,  
                0.85 // ⬆️ Increased dramatically from 0.35 so it's clearly visible!
              ]
            }} 
          />

          {/* INVISIBLE HITBOX LAYER: For easy hovering */}
          <Layer 
            id="route-line-hitbox" 
            type="line" 
            paint={{
              'line-width': 25, 
              'line-color': 'rgba(0,0,0,0)' 
            }} 
          />
        </Source>

        {routes.map((route) => (
          <div key={route.id}>
            <Marker longitude={route.fromCoords[0]} latitude={route.fromCoords[1]} anchor="center">
              <Badge size="xs" variant="filled" color="dark" style={{ border: '1px solid #444' }}>
                {route.fromCode}
              </Badge>
            </Marker>

            <Marker longitude={route.toCoords[0]} latitude={route.toCoords[1]} anchor="center">
              <Group gap={4} wrap="nowrap">
                <ThemeIcon size="xs" radius="xl" color={route.status === 'ACTIVE' ? 'blue' : 'yellow'}>
                  <Plane size={10} />
                </ThemeIcon>
                <Badge size="xs" variant="light" color={route.status === 'ACTIVE' ? 'blue' : 'yellow'}>
                  {route.toCode}
                </Badge>
              </Group>
            </Marker>
          </div>
        ))}

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            closeButton={false} 
            onClose={() => setPopupInfo(null)}
            maxWidth="260px"
            className="airline-popup" 
            offset={15}
          >
            <Paper p="md" radius="md" shadow="xl" withBorder bg="dark.7" c="gray.1" style={{ minWidth: 220 }}>
              <Group justify="space-between" mb="xs" wrap="nowrap">
                <Badge size="sm" color={popupInfo.route.status === 'ACTIVE' ? 'blue' : 'yellow'} variant="light">
                  {popupInfo.route.status}
                </Badge>
                <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setPopupInfo(null)}>
                  <X size={14} />
                </ActionIcon>
              </Group>
              
              <Stack gap={8} mt="sm">
                {/* 🌟 Route Display */}
                <Group justify="space-between" align="center">
                  <Badge color="dark.5" variant="filled" size="lg" radius="sm">{popupInfo.route.fromCode}</Badge>
                  <Plane size={16} color="#888" style={{ transform: 'rotate(45deg)' }} />
                  <Badge color="dark.5" variant="filled" size="lg" radius="sm">{popupInfo.route.toCode}</Badge>
                </Group>

                <Divider my={4} color="dark.5" />

                {/* 🌟 Flight Details */}
                <Group justify="space-between">
                   <Group gap={6}>
                     <Clock size={14} color="var(--mantine-color-dimmed)" />
                     <Text size="xs" c="dimmed">Scheduled</Text>
                   </Group>
                   {/* Note: Ensure `time` is passed in your `fetchLiveMapData` backend response! */}
                   <Text size="sm" fw={600}>{popupInfo.route.time || "14:30 UTC"}</Text>
                </Group>

                {/* 🌟 Show extra data if the plane is currently flying */}
                {popupInfo.route.status === 'ACTIVE' && (
                  <Group justify="space-between">
                     <Group gap={6}>
                       <Gauge size={14} color="var(--mantine-color-dimmed)" />
                       <Text size="xs" c="dimmed">Altitude</Text>
                     </Group>
                     <Text size="sm" fw={600} c="blue.4">34,000 ft</Text>
                  </Group>
                )}

              </Stack>
            </Paper>
          </Popup>
        )}
      </Map>
    </div>
  );
}