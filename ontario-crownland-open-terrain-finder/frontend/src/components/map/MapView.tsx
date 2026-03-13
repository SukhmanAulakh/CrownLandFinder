"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapLegend from "@/components/ui/MapLegend";

export interface MapHandle {
  flyToFeature: (feature: any) => void;
}

interface MapViewProps {
  onFeatureClassify: (feature: any) => void;
  onCandidatesLoaded?: (features: any[]) => void;
  onMapReady?: (handle: MapHandle) => void;
  activeLayers: string[];
  baseLayer: 'outdoors' | 'satellite';
  showTerrain: boolean;
  ballisticResult: any | null;
}

type DataStatus = "idle" | "loading" | "loaded" | "error" | "empty";

function getBoundsFromFeature(feature: any): mapboxgl.LngLatBounds | null {
  const bounds = new mapboxgl.LngLatBounds();
  let hasPoints = false;
  const coords = feature?.geometry?.coordinates;
  const typ = feature?.geometry?.type;
  if (!coords) return null;
  const flatCoords =
    typ === "MultiPolygon" ? coords.flat(2) :
    typ === "Polygon"      ? coords.flat(1) :
    coords;
  for (const pt of flatCoords) {
    if (typeof pt[0] === "number" && typeof pt[1] === "number") {
      bounds.extend([pt[0], pt[1]]);
      hasPoints = true;
    }
  }
  return hasPoints ? bounds : null;
}

export default function MapView({ 
  onFeatureClassify, 
  onCandidatesLoaded, 
  onMapReady, 
  activeLayers,
  baseLayer,
  showTerrain,
  ballisticResult
}: MapViewProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [styleLoaded, setStyleLoaded] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    const [dataStatus, setDataStatus] = useState<DataStatus>("idle");
    const [candidateCount, setCandidateCount] = useState(0);
    const [mockDataWarning, setMockDataWarning] = useState(false);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    // 1. Initialize Map
    useEffect(() => {
      if (!mapContainerRef.current) return;

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token || token.includes("REPLACE_WITH_YOUR_TOKEN")) {
        setMapError("Mapbox token missing. Add NEXT_PUBLIC_MAPBOX_TOKEN to frontend/.env.local");
        return;
      }

      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/outdoors-v12",
        center: [-81.0, 46.5],
        zoom: 5,
        antialias: true
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");
      map.addControl(
        new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }),
        "top-right"
      );

      mapRef.current = map;

      map.on("load", () => {
        setMapLoaded(true);
        if (onMapReady) {
          onMapReady({
            flyToFeature(feature: any) {
              const bounds = getBoundsFromFeature(feature);
              if (bounds && !bounds.isEmpty()) {
                map.fitBounds(bounds, { padding: 120, maxZoom: 14, duration: 1000 });
              } else {
                const coords = feature?.geometry?.coordinates;
                if (coords && feature.geometry.type === "Point") {
                  map.flyTo({ center: coords as [number, number], zoom: 12, duration: 1000 });
                }
              }
            },
          });
        }
      });

      map.on("style.load", () => {
        setStyleLoaded(true);
        setupCustomLayers(map);
      });

      return () => {
        map.remove();
        mapRef.current = null;
      };
    }, []);

    // 2. Setup Custom Layers (Reusable)
    const setupCustomLayers = (map: mapboxgl.Map) => {
      // Add DEM for 3D
      if (!map.getSource("mapbox-dem")) {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14
        });
      }

      // Add Overlays
      if (!map.getSource("candidates")) {
        map.addSource("candidates", {
          type: "vector",
          tiles: [`${baseUrl}/api/layers/mvt/candidates/{z}/{x}/{y}`],
          minzoom: 0,
          maxzoom: 22
        });
      }

      const overlayIds = ["clupa_polygons", "protected_areas", "clupa_overlays"];
      overlayIds.forEach(id => {
        if (!map.getSource(`source-${id}`)) {
          map.addSource(`source-${id}`, {
            type: "vector",
            tiles: [`${baseUrl}/api/layers/mvt/${id}/{z}/{x}/{y}`],
            minzoom: 0,
            maxzoom: 22
          });
        }
      });

      // Layer definitions
      if (!map.getLayer("candidates-fill")) {
        map.addLayer({
          id: "candidates-fill",
          type: "fill",
          source: "candidates",
          "source-layer": "candidates",
          paint: {
            "fill-color": [
              "match", ["get", "classification"],
              "Higher open-terrain candidate", "#a855f7",
              "Candidate for manual review",   "#7c3aed",
              "Excluded",                      "#6b21a8",
              "#c084fc",
            ],
            "fill-opacity": 0.7,
          },
        });
        map.addLayer({
          id: "candidates-outline",
          type: "line",
          source: "candidates",
          "source-layer": "candidates",
          paint: { "line-color": "#ffffff", "line-width": 1.5, "line-opacity": 0.8 },
        });
      }

      overlayIds.forEach(id => {
        const fillId = `layer-${id}-fill`;
        if (!map.getLayer(fillId)) {
          if (id === "clupa_polygons") {
            map.addLayer({
              id: fillId,
              type: "fill",
              source: `source-${id}`,
              "source-layer": id,
              paint: {
                "fill-color": [
                  "match", ["get", "designation_eng"],
                  "General Use Area", "#10b981",
                  "Conservation Reserve", "#3b82f6",
                  "Enhanced Management Area", "#ec4899",
                  "Forest Reserve", "#f97316",
                  "Provincial Park", "#78350f",
                  "#10b981"
                ],
                "fill-opacity": 0.35,
              }
            }, "candidates-fill");
          } else {
            map.addLayer({
              id: fillId,
              type: "fill",
              source: `source-${id}`,
              "source-layer": id,
              paint: { "fill-color": id === "protected_areas" ? "#ef4444" : "#94a3b8", "fill-opacity": 0.2 },
            }, "candidates-fill");
          }
        }
      });

      // Identification Logic
      map.on("click", (e) => {
        const layersToQuery = ["candidates-fill", "layer-clupa_polygons-fill", "layer-protected_areas-fill"];
        const availableLayers = layersToQuery.filter(id => map.getLayer(id));
        const features = map.queryRenderedFeatures(e.point, { layers: availableLayers });
        
        if (!features.length) {
          onFeatureClassify(null);
          return;
        }

        const candidate = features.find(f => f.layer?.id === "candidates-fill");
        const clupa = features.find(f => f.layer?.id === "layer-clupa_polygons-fill");
        const protectedArea = features.find(f => f.layer?.id === "layer-protected_areas-fill");

        onFeatureClassify({
          ... (candidate || clupa || protectedArea),
          properties: {
            ... (clupa?.properties || {}),
            ... (protectedArea?.properties || {}),
            ... (candidate?.properties || {}),
            _is_candidate: !!candidate,
            _is_clupa: !!clupa,
            _is_protected: !!protectedArea
          }
        } as any);
      });

      const handleMouseEnter = () => { map.getCanvas().style.cursor = "pointer"; };
      const handleMouseLeave = () => { map.getCanvas().style.cursor = ""; };
      ["candidates-fill", "layer-clupa_polygons-fill", "layer-protected_areas-fill"].forEach(id => {
        map.on("mouseenter", id, handleMouseEnter);
        map.on("mouseleave", id, handleMouseLeave);
      });

      setupBallisticLayers();
    };

    // Load custom icons after style changes
    useEffect(() => {
      if (!styleLoaded || !mapRef.current) return;
      const map = mapRef.current;

      const icons = [
        { id: 'icon-firing', url: '/icons/firing.png' },
        { id: 'icon-target', url: '/icons/target.png' }
      ];

      icons.forEach(icon => {
        if (!map.hasImage(icon.id)) {
          map.loadImage(icon.url, (error, image) => {
            if (error) {
              console.error(`Error loading icon ${icon.id}:`, error);
              return;
            }
            if (image && !map.hasImage(icon.id)) map.addImage(icon.id, image);
          });
        }
      });
    }, [styleLoaded]);

    const setupBallisticLayers = () => {
      const map = mapRef.current;
      if (!map) return;

      if (!map.getSource("ballistic-path")) {
        map.addSource("ballistic-path", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] }
        });
        map.addLayer({
          id: "ballistic-line",
          type: "line",
          source: "ballistic-path",
          paint: {
            "line-color": "#a855f7",
            "line-width": 4,
            "line-dasharray": [2, 1],
            "line-opacity": 0.8
          }
        });
      }

      if (!map.getSource("ballistic-markers")) {
        map.addSource("ballistic-markers", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] }
        });
        
        // Symbol layer for custom icons
        map.addLayer({
          id: "ballistic-points",
          type: "symbol",
          source: "ballistic-markers",
          layout: {
            "icon-image": [
              "match", ["get", "type"],
              "firing", "icon-firing",
              "target", "icon-target",
              ""
            ],
            "icon-size": 0.4, // Increased from 0.08
            "icon-allow-overlap": true,
            "icon-ignore-placement": true
          }
        });
      }
    };

    // 3. Handle Style Swaps
    useEffect(() => {
      if (!mapRef.current) return;
      const map = mapRef.current;
      const styleUrl = baseLayer === 'satellite' 
        ? "mapbox://styles/mapbox/satellite-streets-v12" 
        : "mapbox://styles/mapbox/outdoors-v12";
      
      setStyleLoaded(false);
      map.setStyle(styleUrl);
    }, [baseLayer]);

    // 4. Handle Terrain
    useEffect(() => {
      if (!styleLoaded || !mapRef.current) return;
      const map = mapRef.current;
      if (showTerrain) {
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
      } else {
        map.setTerrain(null);
      }
    }, [showTerrain, styleLoaded]);

    // 5. Handle Overlay Visibility
    useEffect(() => {
      if (!styleLoaded || !mapRef.current) return;
      const map = mapRef.current;
      const overlayIds = ["clupa_polygons", "protected_areas", "clupa_overlays"];
      
      overlayIds.forEach(id => {
        const layerId = `layer-${id}-fill`;
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, "visibility", activeLayers.includes(id) ? "visible" : "none");
        }
      });
      
      if (map.getLayer("candidates-fill")) {
        map.setLayoutProperty("candidates-fill", "visibility", activeLayers.includes("candidates") ? "visible" : "none");
        map.setLayoutProperty("candidates-outline", "visibility", activeLayers.includes("candidates") ? "visible" : "none");
      }
    }, [activeLayers, styleLoaded]);

    // ── Fetch Count & Metadata ──
    useEffect(() => {
      if (!mapLoaded) return;
      setDataStatus("loading");
      const fetchMetadata = async () => {
        try {
          const res = await fetch(`${baseUrl}/api/layers/candidates/metadata`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          setCandidateCount(data.count || 0);
          setDataStatus(data.count > 0 ? "loaded" : "empty");
          if (onCandidatesLoaded) onCandidatesLoaded(data.features ?? []);
        } catch (err) {
          console.error("Metadata fetch failed:", err);
          setDataStatus("error");
        }
      };
      fetchMetadata();
    }, [mapLoaded, baseUrl, onCandidatesLoaded]);

    // 6. Handle Ballistic Results
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !styleLoaded) return;

      const pathSource = map.getSource("ballistic-path") as mapboxgl.GeoJSONSource;
      const markerSource = map.getSource("ballistic-markers") as mapboxgl.GeoJSONSource;

      if (!ballisticResult) {
        if (pathSource) pathSource.setData({ type: "FeatureCollection", features: [] });
        if (markerSource) markerSource.setData({ type: "FeatureCollection", features: [] });
        return;
      }

      const { firing_position, target_position } = ballisticResult;

      if (pathSource) {
        pathSource.setData({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [firing_position.lng, firing_position.lat],
              [target_position.lng, target_position.lat]
            ]
          },
          properties: {}
        });
      }

      if (markerSource) {
        markerSource.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [firing_position.lng, firing_position.lat] },
              properties: { type: "firing" }
            },
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [target_position.lng, target_position.lat] },
              properties: { type: "target" }
            }
          ]
        });
      }

      // Fly to the setup
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([firing_position.lng, firing_position.lat]);
      bounds.extend([target_position.lng, target_position.lat]);
      map.fitBounds(bounds, { padding: 100, maxZoom: 18 });

    }, [ballisticResult, styleLoaded]);

    if (mapError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-300 gap-4 p-8">
          <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a1 1 0 00.86 1.5h18.64a1 1 0 00.86-1.5L12.71 3.86a1 1 0 00-1.42 0z" />
          </svg>
          <p className="text-center max-w-sm text-sm">{mapError}</p>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full min-h-[400px]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
        <div className="absolute bottom-8 right-3 z-10 flex flex-col gap-2">
          {dataStatus === "loading" && (
            <span className="flex items-center gap-1.5 bg-slate-800/90 text-slate-300 text-[10px] px-2.5 py-1 rounded-full shadow backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />Loading candidates…
            </span>
          )}
          {dataStatus === "loaded" && (
            <span className="flex items-center gap-1.5 bg-slate-800/90 text-purple-300 text-[10px] px-2.5 py-1 rounded-full shadow backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              {candidateCount} candidates loaded
            </span>
          )}
        </div>
        <div className="absolute bottom-4 right-4 z-10">
          <MapLegend />
        </div>
      </div>
    );
}
