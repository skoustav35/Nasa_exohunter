import urllib.parse
import urllib.request
import json

import ssl

def query_vizier_tap(adql: str, timeout: int = 15) -> list:
    params = urllib.parse.urlencode({
        "request": "doQuery",
        "lang": "adql",
        "format": "json",
        "query": adql,
    })
    url = f"https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync?{params}"
    req = urllib.request.Request(url, headers={
        "User-Agent": "SarkarExoHunter/3.0 (test_script)"
    })
    context = ssl._create_unverified_context()
    with urllib.request.urlopen(req, timeout=timeout, context=context) as resp:
        raw = json.loads(resp.read().decode("utf-8"))

    if isinstance(raw, dict):
        metadata = raw.get("metadata", [])
        data_rows = raw.get("data", [])
        if metadata and data_rows:
            col_names = [m.get("name", f"col{i}") for i, m in enumerate(metadata)]
            return [{col_names[j]: val for j, val in enumerate(row)} for row in data_rows]
    return raw

# Let's query Gaia cross-match first for WASP-18 (TIC 241569046)
adql_xmatch = 'SELECT TOP 1 * FROM "IV/39/tic82" WHERE "TIC"=241569046'
print("XMatch result:")
print(query_vizier_tap(adql_xmatch))


# Now query Gaia DR3 for nearby sources
ra_target = 206.98109901991
dec_target = -49.721916084
radius_deg = 60.0 / 3600.0 # 60 arcseconds in degrees
adql_spatial = (
    f"SELECT \"Source\", \"RA_ICRS\", \"DE_ICRS\", \"Gmag\", "
    f"DISTANCE(POINT('ICRS', \"RA_ICRS\", \"DE_ICRS\"), POINT('ICRS', {ra_target}, {dec_target})) * 3600 AS dist_arcsec "
    f"FROM \"I/355/gaiadr3\" "
    f"WHERE CONTAINS(POINT('ICRS', \"RA_ICRS\", \"DE_ICRS\"), CIRCLE('ICRS', {ra_target}, {dec_target}, {radius_deg})) = 1"
)
try:
    spatial_res = query_vizier_tap(adql_spatial)
    print("\nSpatial query results (first 10):")
    target_star = None
    min_dist = 999.0
    for r in spatial_res:
        d = r.get("dist_arcsec", 999.0)
        if d < min_dist:
            min_dist = d
            target_star = r
    
    print("Target Star:", target_star)
    
    # Calculate dynamic crowdsap
    F_target = 10 ** (-0.4 * target_star["Gmag"])
    F_comp_total = 0.0
    R_ap = 40.0 # 40 arcseconds aperture radius
    for r in spatial_res:
        if r["Source"] == target_star["Source"]:
            continue
        dist = r["dist_arcsec"]
        weight = 1.0 / (1.0 + (dist / R_ap) ** 4)
        F_comp = (10 ** (-0.4 * r["Gmag"])) * weight
        F_comp_total += F_comp
        print(f"Companion Source {r['Source']}: dist={dist:.2f}\", Gmag={r['Gmag']}, weight={weight:.4f}, F_comp/F_target={F_comp/F_target:.6f}")
    
    dynamic_crowdsap = F_target / (F_target + F_comp_total)
    print(f"\nCalculated Dynamic CROWDSAP: {dynamic_crowdsap:.6f}")
except Exception as e:
    print("Spatial query error:", e)

except Exception as e:
    print("Gaia query error:", e)
