"use client";

import { useMemo, useState, useCallback } from 'react';
import Map, { Marker, Source, Layer, Popup } from 'react-map-gl/mapbox';
import { Badge, Group, ThemeIcon, Text, Center, Paper, Stack, ActionIcon } from '@mantine/core';
import { Plane, X } from 'lucide-react';
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

  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string>('grab');
  const [popupInfo, setPopupInfo] = useState<{
    route: FlightRoute;
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
      const clickedRoute: FlightRoute = JSON.parse(feature.properties.routeData);
      
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
    <>
      {/* ✅ 1. Inject custom Mapbox CSS overrides targeting our specific popup class */}
      <style>{`
        /* Remove Mapbox's default white box and padding so Mantine Paper handles it */
        .airline-popup .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }

        /* Color the popup arrow (tip) to perfectly match Mantine's dark.7 color */
        .airline-popup .mapboxgl-popup-tip {
          border-top-color: var(--mantine-color-dark-7) !important;
          border-bottom-color: var(--mantine-color-dark-7) !important;
        }
      `}</style>

      <Map
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
          <Layer 
            id="route-line-visual" 
            type="line" 
            paint={{
              'line-color': [
                'match', 
                ['get', 'status'], 
                'ACTIVE', '#339af0', 
                'SCHEDULED', '#adb5bd', 
                '#ff6b6b' 
              ],
              'line-width': [
                'case',
                ['==', ['get', 'id'], hoveredRouteId || ''],
                6, 
                4  
              ],
              'line-opacity': [
                'case',
                ['==', ['get', 'id'], hoveredRouteId || ''],
                1.0,  
                0.35  
              ]
            }} 
          />

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
                <ThemeIcon size="xs" radius="xl" color={route.status === 'ACTIVE' ? 'blue' : 'gray'}>
                  <Plane size={10} />
                </ThemeIcon>
                <Badge size="xs" variant="light" color={route.status === 'ACTIVE' ? 'blue' : 'gray'}>
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
            maxWidth="250px"
            className="airline-popup" // ✅ 2. Attach the custom class from our CSS block!
          >
            {/* The Mantine Paper component acts as the actual visible background now */}
            <Paper p="sm" radius="md" shadow="xl" withBorder bg="dark.7" c="gray.1">
              <Group justify="space-between" mb="xs" wrap="nowrap">
                <Badge size="sm" color={popupInfo.route.status === 'ACTIVE' ? 'blue' : 'gray'} variant="light">
                  {popupInfo.route.status}
                </Badge>
                <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setPopupInfo(null)}>
                  <X size={14} />
                </ActionIcon>
              </Group>
              
              <Stack gap={4}>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">Flight Route ID</Text>
                <Text size="sm" fw={700}>#{popupInfo.route.id}</Text>
                
                <Group mt="xs" gap="xs">
                  <Badge color="dark" variant="filled">{popupInfo.route.fromCode}</Badge>
                  <Plane size={14} color="#888" />
                  <Badge color="dark" variant="filled">{popupInfo.route.toCode}</Badge>
                </Group>
              </Stack>
            </Paper>
          </Popup>
        )}
      </Map>
    </>
  );
}