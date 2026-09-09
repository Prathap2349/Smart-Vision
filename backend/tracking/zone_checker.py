from typing import List, Dict, Tuple, Any

def is_point_in_polygon(point: Tuple[float, float], polygon: List[Dict[str, float]]) -> bool:
    """
    Ray-casting algorithm to test if point (x, y) is inside polygon of [{'x': x, 'y': y}, ...]
    Coordinates are 0..100 percentage relative to frame dimensions.
    """
    x, y = point
    n = len(polygon)
    inside = False

    if n < 3:
        return False

    p1x, p1y = polygon[0]['x'], polygon[0]['y']
    for i in range(n + 1):
        p2x, p2y = polygon[i % n]['x'], polygon[i % n]['y']
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y

    return inside

def check_person_zones(bbox: List[float], frame_width: int, frame_height: int, zones: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Determines which zones contain the center point of the person bounding box [x1, y1, x2, y2].
    Returns list of matched active zone objects.
    """
    x1, y1, x2, y2 = bbox
    center_x = ((x1 + x2) / 2.0 / frame_width) * 100.0
    center_y = ((y1 + y2) / 2.0 / frame_height) * 100.0

    matched_zones = []
    for zone in zones:
        if not zone.get('enabled', True):
            continue
        poly = zone.get('polygon', [])
        if is_point_in_polygon((center_x, center_y), poly):
            matched_zones.append(zone)

    return matched_zones
