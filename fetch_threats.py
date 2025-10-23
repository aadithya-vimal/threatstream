# --- Imports ---
import os
import requests # For downloading files
import tarfile # For extracting the .tar.gz file
import shutil # For file operations (like removing temp files)
import geoip2.database # For reading the MaxMind DB
import geoip2.errors # For specific MaxMind errors
import firebase_admin # For Firebase connection
from firebase_admin import credentials, db # Specific Firebase modules
from datetime import datetime # For timestamps
import time # For timing the script execution

# --- Configuration (Read from Environment Variables/Secrets) ---
FIREBASE_URL = os.environ.get("FIREBASE_DATABASE_URL")
# Path where GitHub Actions runner will place the service account key file
SERVICE_ACCOUNT_KEY_PATH = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "service-account.json")
# Your MaxMind key (must be set as a GitHub Secret)
MAXMIND_LICENSE_KEY = os.environ.get("MAXMIND_LICENSE_KEY")

# --- Constants ---
GEOLITE_DB_DIR = "geoip_db" # Directory to store the downloaded DB
GEOLITE_DB_PATH = os.path.join(GEOLITE_DB_DIR, "GeoLite2-City.mmdb") # Full path to the DB file

# Blocklist.de Feeds: Dictionary mapping attack type to the URL of the IP list
THREAT_FEEDS = {
    "ssh": "https://lists.blocklist.de/lists/ssh.txt",
    "ftp": "https://lists.blocklist.de/lists/ftp.txt",
    "apache": "https://lists.blocklist.de/lists/apache.txt",
    "imap": "https://lists.blocklist.de/lists/imap.txt",
    "sip": "https://lists.blocklist.de/lists/sip.txt",
    "bots": "https://lists.blocklist.de/lists/bots.txt",
    "strongips": "https://lists.blocklist.de/lists/strongips.txt",
    # We can skip 'all.txt' to avoid duplicates if processing others individually
}

# Firebase Realtime Database paths
PROCESSED_IPS_PATH = "processed_ips" # Stores IPs we've already handled (keys only)
THREAT_DATA_PATH = "threats"         # Stores the actual threat objects for the frontend

# --- Helper Functions ---

def initialize_firebase():
    """Initializes the Firebase Admin SDK."""
    try:
        if not FIREBASE_URL:
            print("❌ Error: FIREBASE_DATABASE_URL environment variable not set.")
            return False
        if not os.path.exists(SERVICE_ACCOUNT_KEY_PATH):
            print(f"❌ Error: Service account key file not found at {SERVICE_ACCOUNT_KEY_PATH}")
            print("Ensure GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly.")
            return False

        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
        firebase_admin.initialize_app(cred, {
            'databaseURL': FIREBASE_URL
        })
        print("✅ Firebase initialized successfully.")
        return True
    except ValueError as e:
        # Check if the app was already initialized (common during local testing)
        try:
            firebase_admin.get_app()
            print("ℹ️ Firebase seems to be already initialized.")
            return True
        except ValueError:
             print(f"❌ Error initializing Firebase: {e}")
             return False
    except Exception as e:
        print(f"❌ An unexpected error occurred during Firebase initialization: {e}")
        return False

def download_and_extract_geolite_db():
    """Downloads and extracts the GeoLite2 City database from MaxMind."""
    if not MAXMIND_LICENSE_KEY:
        print("❌ Error: MAXMIND_LICENSE_KEY environment variable not set.")
        return False

    download_url = f"https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key={MAXMIND_LICENSE_KEY}&suffix=tar.gz"
    tar_path = os.path.join(GEOLITE_DB_DIR, "GeoLite2-City.tar.gz")

    try:
        os.makedirs(GEOLITE_DB_DIR, exist_ok=True)
        print(f"⬇️ Downloading GeoLite2 DB from MaxMind...")
        with requests.get(download_url, stream=True, timeout=60) as r:
            r.raise_for_status()
            with open(tar_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        print("📥 Download complete. Extracting...")

        with tarfile.open(tar_path, "r:gz") as tar:
            mmdb_member = None
            for member in tar.getmembers():
                if member.name.endswith("GeoLite2-City.mmdb"):
                    mmdb_member = member
                    break
            if not mmdb_member:
                raise Exception("GeoLite2-City.mmdb not found within the downloaded archive.")

            mmdb_member.name = os.path.basename(GEOLITE_DB_PATH) # Rename during extraction
            tar.extract(mmdb_member, path=GEOLITE_DB_DIR)

        print(f"✅ GeoLite2 DB extracted successfully to {GEOLITE_DB_PATH}")
        return True
    except requests.exceptions.HTTPError as http_err:
        print(f"❌ HTTP error downloading GeoLite2 DB: {http_err}")
        print("Check if your MAXMIND_LICENSE_KEY is correct and active.")
    except Exception as e:
        print(f"❌ An error occurred during GeoLite2 DB download/extraction: {e}")
    finally:
        if os.path.exists(tar_path):
            try:
                os.remove(tar_path)
                print(f"🗑️ Removed temporary archive {tar_path}")
            except OSError as e:
                 print(f"⚠️ Error removing temporary tar file {tar_path}: {e}")
    return False

def get_processed_ips():
    """Fetches the set of already processed IPs from Firebase."""
    processed_ips = set()
    try:
        ref = db.reference(PROCESSED_IPS_PATH)
        # Use shallow=True to efficiently get only the keys (IPs)
        data = ref.get(shallow=True)
        if data:
            processed_ips = set(data.keys())
        print(f"🔍 Fetched {len(processed_ips)} processed IPs from Firebase.")
    except firebase_admin.exceptions.FirebaseError as fb_error:
        print(f"❌ Firebase error fetching processed IPs: {fb_error}")
    except Exception as e:
        print(f"❌ An unexpected error occurred fetching processed IPs: {e}")
    return processed_ips

def fetch_threat_feed(url):
    """Fetches a list of IPs from a given Blocklist.de URL."""
    ips = set()
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        for line in response.text.splitlines():
            ip = line.strip()
            if ip and not ip.startswith('#'):
                ips.add(ip)
        print(f"⬇️ Fetched {len(ips)} unique IPs from {url}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching {url}: {e}")
    except Exception as e:
        print(f"❌ An unexpected error occurred while fetching {url}: {e}")
    return ips

def geolocate_ip(reader, ip_address):
    """Looks up geolocation for an IP using the MaxMind DB reader object."""
    try:
        response = reader.city(ip_address)
        # Ensure lat/lon are present before returning
        if response.location.latitude is not None and response.location.longitude is not None:
            return {
                "lat": response.location.latitude,
                "lon": response.location.longitude,
                "country_code": response.country.iso_code, # e.g., "US", "DE", "CN"
                # Add others if needed by frontend, but keep payload small
                # "country_name": response.country.name,
                # "city": response.city.name,
            }
        else:
            # print(f"⚠️ Geolocation data incomplete for IP: {ip_address}")
            return None
    except geoip2.errors.AddressNotFoundError:
        # IP not in the database - this is common, not an error
        return None
    except Exception as e:
        print(f"⚠️ Error geolocating IP {ip_address}: {e}")
        return None

# --- Main Logic ---
def main():
    """Main function to orchestrate the threat data fetching and processing."""
    start_time = time.time()
    print(f"🚀 Starting ThreatStream update run at {datetime.utcnow()} UTC...")

    # 1. Initialize Firebase
    if not initialize_firebase():
        print("❌ Firebase initialization failed. Aborting.")
        return # Stop script execution if Firebase connection fails

    # 2. Ensure GeoLite DB is available (download/extract if needed)
    geoip_reader = None
    if not os.path.exists(GEOLITE_DB_PATH):
        print(f"🌍 GeoLite DB not found at {GEOLITE_DB_PATH}. Attempting download...")
        if not download_and_extract_geolite_db():
            print("❌ Failed to get GeoLite DB. Aborting.")
            return
    else:
        print(f"🌍 Using existing GeoLite DB at {GEOLITE_DB_PATH}")

    # Try to open the GeoLite DB file
    try:
        geoip_reader = geoip2.database.Reader(GEOLITE_DB_PATH)
        print("✅ GeoLite DB opened successfully.")
    except Exception as e:
        print(f"❌ Error opening GeoLite DB: {e}. Aborting.")
        # Optional: Could attempt re-download here, but keep it simple for now
        return

    # 3. Get the set of IPs already processed
    processed_ips = get_processed_ips()

    # --- Data Processing ---
    new_threats_batch = {} # Store new threats before pushing to Firebase
    newly_processed_ips_batch = {} # Store IPs to mark as processed in Firebase
    total_new_ips_found = 0
    geolocated_count = 0

    # 4. Loop through each defined threat feed URL
    print("\n--- Processing Threat Feeds ---")
    for attack_type, url in THREAT_FEEDS.items():
        # 5. Fetch the current list of IPs from the feed
        current_ips_in_feed = fetch_threat_feed(url)

        # 6. Find which IPs in this list are new (not in our processed_ips set)
        new_ips = current_ips_in_feed - processed_ips
        print(f"🔍 Found {len(new_ips)} new IPs for type '{attack_type}'.")
        total_new_ips_found += len(new_ips)

        # 7. Geolocate each new IP and prepare data for Firebase
        for ip in new_ips:
            location_data = geolocate_ip(geoip_reader, ip)
            if location_data and location_data.get("country_code"): # Ensure we have at least country
                geolocated_count += 1
                timestamp_ms = int(datetime.utcnow().timestamp() * 1000)
                # Create a unique key for Firebase (timestamp + modified IP)
                threat_key = f"{timestamp_ms}_{ip.replace('.', '_').replace(':', '-')}"

                # Data structure matching the frontend's expectation
                threat_data = {
                    "ip": ip,
                    "lat": location_data.get("lat"),
                    "lon": location_data.get("lon"),
                    "country": location_data.get("country_code"), # Use 2-letter code
                    "attack_type": attack_type,
                    "timestamp": timestamp_ms,
                    # Optional: Add .priority for Firebase ordering optimization
                    # ".priority": timestamp_ms
                }
                # Add to the batch for threat data
                new_threats_batch[f"{THREAT_DATA_PATH}/{threat_key}"] = threat_data

            # Add the IP to the batch to mark it as processed, even if geolocation failed
            newly_processed_ips_batch[f"{PROCESSED_IPS_PATH}/{ip}"] = True
            # Update the main set immediately to prevent duplicates if an IP appears in multiple lists during the same run
            processed_ips.add(ip)


        # Optional: Implement smaller batch pushes here if dealing with very large lists
        # E.g., if len(new_threats_batch) > 500: push_batches() and clear

    # Close the GeoIP database reader
    if geoip_reader:
        geoip_reader.close()
        print("🌍 GeoLite DB closed.")

    # --- Push data to Firebase ---
    print("\n--- Pushing Updates to Firebase ---")
    if new_threats_batch:
        print(f"🔥 Pushing {len(new_threats_batch)} new threat entries...")
        try:
            # Use update() for efficient multi-path writes
            db.reference().update(new_threats_batch)
            print("✅ Threat data pushed successfully.")
        except firebase_admin.exceptions.FirebaseError as fb_error:
            print(f"❌ Firebase error pushing threat data: {fb_error}")
        except Exception as e:
            print(f"❌ An unexpected error occurred pushing threat data: {e}")
    else:
        print("ℹ️ No new geolocated threats to push.")

    if newly_processed_ips_batch:
        print(f"📝 Marking {len(newly_processed_ips_batch)} IPs as processed...")
        try:
            db.reference().update(newly_processed_ips_batch)
            print("✅ Processed IPs list updated successfully.")
        except firebase_admin.exceptions.FirebaseError as fb_error:
            print(f"❌ Firebase error updating processed IPs: {fb_error}")
        except Exception as e:
            print(f"❌ An unexpected error occurred updating processed IPs: {e}")
    else:
        # This case should only happen if no feeds were fetched or all IPs were already processed
        print("ℹ️ No new IPs encountered in this run to mark as processed.")


    # --- Run Summary ---
    end_time = time.time()
    print("\n--- Run Summary ---")
    print(f"🏁 ThreatStream update run finished.")
    print(f"⏱️ Total execution time: {end_time - start_time:.2f} seconds.")
    print(f"💡 Total new unique IPs found across feeds: {total_new_ips_found}")
    print(f"🌍 Successfully geolocated: {geolocated_count} new IPs.")
    print(f"🔥 Pushed to Firebase: {len(new_threats_batch)} new threats.")
    print(f"📝 Marked as processed: {len(newly_processed_ips_batch)} IPs.")

# --- Main Execution Trigger ---
if __name__ == "__main__":
    main() # Run the main function when the script is executed
