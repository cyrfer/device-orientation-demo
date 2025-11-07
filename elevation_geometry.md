# Elevation Angle Geometry: How x and y Components Form the "Adjacent" Side

## The 3D to 2D Projection

When we calculate elevation (pitch angle from horizontal), we're measuring the angle between:
- The horizontal plane (where z = 0)
- The direction vector pointing up/down

### Visual Breakdown

Imagine looking at the device from above (top-down view of the x-y plane):

```
     North (y-axis)
         |
         |  transformedVector = [x, y, z]
         | /
         |/ ← angle depends on heading
    -----O----- East (x-axis)
        /
       /
      /
```

Now rotate to the side (looking from the east):

```
     Up (z-axis)
         |
         |  
    z    |     transformedVector = [x, y, z]
         |      /
         |     /  ← elevation angle
    -----O----/------  Horizontal plane (y-axis)
            /
      √(x² + y²)
         ↑
      horizontal distance
```

## The Right Triangle

The elevation angle is formed by a right triangle in the **vertical plane** that contains both:
1. The horizontal component (distance from z-axis): `√(x² + y²)`
2. The vertical component: `z`

```
        |
        |  z (opposite)
        |
        | /
        |/θ  ← elevation angle
   -----O------
    √(x²+y²)
    (adjacent)

θ = atan2(z, √(x² + y²))
```

## Why Both x AND y Together?

The **horizontal distance** from the z-axis (vertical axis) involves BOTH x and y components equally:

- If `x = 5, y = 0, z = 5` → horizontal distance = 5 → elevation = 45°
- If `x = 0, y = 5, z = 5` → horizontal distance = 5 → elevation = 45°
- If `x = 3, y = 4, z = 5` → horizontal distance = √(9+16) = 5 → elevation = 45°

In all three cases, the elevation is **45°** because the horizontal distance is the same (5 units).

### The Key Insight

The elevation angle measures how far the device is tilted **away from the horizontal plane**. This tilt is independent of which direction (heading) the device points. 

Whether you're tilted 45° while facing north, east, south, or west—the elevation should be 45°. The horizontal distance `√(x² + y²)` captures this regardless of the relative magnitude of x vs y.

## Using Only One Component (Why It Fails)

If we used only `y` (atan2(z, y)):
- Device facing north, tilted up 45°: y=5, z=5 → atan2(5, 5) = 45° ✓
- Device facing east (90° heading): y=0, z=5 → atan2(5, 0) = 90° ✗ (wrong!)

The second case incorrectly shows 90° because we ignored the x component. The device is still tilted 45° from horizontal, but we only looked at one axis of the horizontal plane.

## Mathematical Justification

In cylindrical coordinates (r, θ, z) where r is the radial distance from the z-axis:
- r = √(x² + y²)  ← combines both x and y into total radial distance
- θ = atan2(y, x)  ← azimuthal angle (heading)
- z = z              ← vertical component (elevation depends on this)

The elevation angle is naturally: `atan2(z, r)` = `atan2(z, √(x² + y²))`

This is the standard way to express elevation in cylindrical coordinates because it treats the horizontal plane symmetrically—it doesn't privilege one horizontal axis over another.
