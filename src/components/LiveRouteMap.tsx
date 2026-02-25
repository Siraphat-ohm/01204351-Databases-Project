"use client";

import React, { memo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup
} from "react-simple-maps";
import { Plane } from "lucide-react";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export interface FlightRoute {
  id: string;
  fromCode: string;
  fromCoords: [number, number]; // [longitude, latitude]
  toCode: string;
  toCoords: [number, number];   // [longitude, latitude]
  status: 'ACTIVE' | 'SCHEDULED';
}

interface LiveRouteMapProps {
  routes: FlightRoute[];
  defaultZoom?: number;               // ✅ Add defaultZoom
  defaultCenter?: [number, number];   // ✅ Add defaultCenter
}

const LiveRouteMap = ({ 
  routes, 
  defaultZoom = 4,                   // ✅ Default to 4 (zoomed in)
  defaultCenter = [105, 20]          // ✅ Default center to Southeast Asia
}: LiveRouteMapProps) => {
  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{
        scale: 120, 
      }}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#006994", 
        borderRadius: "8px",
      }}
    >
      {/* ✅ Apply the center and zoom props here */}
      <ZoomableGroup center={defaultCenter} zoom={defaultZoom} minZoom={1} maxZoom={12}>
        
        {/* Render World Map */}
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#2b8a3e"
                stroke="#13502c" 
                strokeWidth={0.5 / defaultZoom} // Dynamically scale borders so they don't get huge
                style={{
                  default: { outline: "none" },
                  hover: { fill: "#1864ab", outline: "none" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {/* Render Flight Paths */}
        {routes.map((route) => {
          const isObjectActive = route.status === 'ACTIVE';
          const lineColor = isObjectActive ? "#d21c1c" : "#adb5bd"; 
          
          return (
            <g key={route.id}>
              {/* Draw Curved Line */}
              <Line
                from={route.fromCoords}
                to={route.toCoords}
                stroke={lineColor}
                strokeWidth={1.5 / (defaultZoom * 0.5)} // Scale line width
                strokeLinecap="round"
                fill="none"
              />

              {/* Origin Marker */}
              <Marker coordinates={route.fromCoords}>
                <circle r={3 / (defaultZoom * 0.5)} fill="#ff6b6b" stroke="#fff" strokeWidth={0.5} />
                <text textAnchor="middle" y={-5} style={{ fontSize: `${10 / defaultZoom}px`, fill: "#495057", fontWeight: "bold" }}>
                  {route.fromCode}
                </text>
              </Marker>

              {/* Destination Marker */}
              <Marker coordinates={route.toCoords}>
                <circle r={3 / (defaultZoom * 0.5)} fill="#ff6b6b" stroke="#fff" strokeWidth={0.5} />
                <text textAnchor="middle" y={-5} style={{ fontSize: `${10 / defaultZoom}px`, fill: "#495057", fontWeight: "bold" }}>
                  {route.toCode}
                </text>
              </Marker>

              {/* Plane Icon at the midpoint */}
              {isObjectActive && (
                <Marker 
                  coordinates={[
                    (route.fromCoords[0] + route.toCoords[0]) / 2, 
                    (route.fromCoords[1] + route.toCoords[1]) / 2
                  ]}
                >
                  <g transform={`translate(-${8 / defaultZoom}, -${8 / defaultZoom})`}>
                    <Plane size={16 / defaultZoom} color="#1864ab" fill="#339af0" />
                  </g>
                </Marker>
              )}
            </g>
          );
        })}
      </ZoomableGroup>
    </ComposableMap>
  );
};

export default memo(LiveRouteMap);