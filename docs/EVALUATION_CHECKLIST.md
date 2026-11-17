# Real clip evaluation checklist

Record two separate clips for each scenario below (22 clips total for the complete suite). Each clip should be 10–45 seconds, continuously recorded at the camera's normal mounting height and field of view. Keep the camera fixed, include the full protected zone, and record the lighting and approximate dwell duration in `labels.csv` notes. Use real camera footage only; do not create or edit clips to simulate outcomes.

Obtain informed consent from every identifiable person before recording. Explain the purpose, storage location, who can access the footage, and deletion date. Do not record bystanders, children, private areas, or audio unless separately consented and necessary. Store clips locally and keep them out of Git.

| Scenario | Camera placement | What to film (two distinct clips) |
|---|---|---|
| `empty_corridor` | Fixed view across the full corridor zone | Empty corridor under steady light; empty corridor with ordinary lighting transition |
| `shadows_wind` | Include a window or visible shadow area and the zone | Moving foliage shadows; sunlight or indoor-light transition with no person |
| `animals` | Camera sees the floor and passage | Animal crossing; a second crossing at a different pace/direction |
| `resident` | Normal resident passage through the zone | Two consenting enrolled residents passing without lingering |
| `resident_lingering` | Face-visible view of the zone | Enrolled resident lingering naturally; second resident or distinct posture |
| `delivery_person` | Include the doorway and approach | Consenting delivery participant leaves a parcel and departs; second brief delivery interaction |
| `unknown_loitering` | Face-visible view of the protected entry | Consenting unenrolled participant loiters beyond the configured dwell threshold; repeat separately |
| `night_low_light` | Fixed low-light/IR view of the zone | Brief passage below night dwell threshold; consenting participant loiters beyond it |
| `multiple_people` | Full-width view of the zone | Resident with guest passing; two consenting unenrolled people lingering |
| `occlusion` | Include a real partial obstruction in the view | Consenting participant partially occluded while lingering; repeat with another approach |
| `mask_cap` | Face-visible view at normal camera distance | Consenting participant wearing ordinary cap/mask while lingering; repeat with a different approach |

## Minimum viable first evaluation

For an initial exploratory result, record 10–12 real clips: include at least five expected-alert and five expected-no-alert clips, at least two resident-present clips, at least two non-resident threat clips, and a mix of day/night and clear/partially occluded views. Put aside half for tuning and half for held-out evaluation before looking at outcomes. This is a small sample: results must carry a small-sample warning and should not be treated as a deployment guarantee. The complete scenario set remains 22 clips.

Use `evaluation/dataset/labels.csv` for one row per clip. The validator reports missing files, files without labels, and malformed labels. Put resident enrollment photos in `evaluation/dataset/enrollment/<resident-name>/`; enroll only consenting residents. The enrollment tool stores embeddings in the configured application database and does not copy photos there.
