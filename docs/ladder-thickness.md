# Custom ladder thickness

The ladder snapshot field `thick` stores frame thickness in meters. Omitted values keep the existing 0.20 m frame. Generic 2D and 3D ladder rendering honors explicit thickness; fixed catalog panel-frame geometry is unchanged. The existing `rungs` field already supports one and two gate openings.

Snapshots with explicit ladder thickness require the `shape:ladder:thickness` capability. Hosts must keep using the support check so older renderers reject this requirement instead of silently showing the old frame. Legacy ladder snapshots retain their existing compatibility.

For TrackDraw issue [#1035](https://github.com/dutchdronesquad/trackdraw/issues/1035), publish the schema and viewer together, then update TrackDraw's schema dependency and lockfile. Verify snapshot and offline ZIP round trips against the published release before merging the editor feature.
