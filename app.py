import os
import re
import json
import time
import requests
import html as html_lib
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "feed_cache.json"
CACHE_DURATION_SECS = 600  # 10 minutes cache

def clean_html(html_str):
    """Strips HTML tags to extract clean text description for tweets."""
    if not html_str:
        return ""
    # Remove some specific code formatting, translate lists to bullet-points
    text = html_str
    text = re.sub(r'<li>', '• ', text)
    text = re.sub(r'</li>', '\n', text)
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'</p>', '\n', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = html_lib.unescape(text)
    # Normalize spaces and newlines
    text = re.sub(r' +', ' ', text)
    text = re.sub(r'\n+', '\n', text)
    return text.strip()

def parse_xml_feed(xml_data):
    """Parses Atom XML feed and splits multiple updates within a single day's entry."""
    try:
        root = ET.fromstring(xml_data)
    except Exception as e:
        print(f"XML parsing error: {e}")
        return []

    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('atom:entry', namespaces)
    
    parsed_updates = []
    
    for entry in entries:
        title_el = entry.find('atom:title', namespaces)
        date_str = title_el.text.strip() if title_el is not None else "Unknown Date"
        
        updated_el = entry.find('atom:updated', namespaces)
        updated_str = updated_el.text.strip() if updated_el is not None else ""
        
        id_el = entry.find('atom:id', namespaces)
        entry_id = id_el.text.strip() if id_el is not None else ""
        
        link_el = entry.find('atom:link[@rel="alternate"]', namespaces)
        if link_el is None:
            link_el = entry.find('atom:link', namespaces)
        link_href = link_el.attrib.get('href', '') if link_el is not None else ""
        
        content_el = entry.find('atom:content', namespaces)
        content_html = content_el.text if content_el is not None else ""
        
        if not content_html:
            continue
            
        # Split updates by <h3> tags, since Google Cloud release notes place multiple updates
        # under <h3>[Type]</h3> in a single day's entry.
        raw_parts = re.split(r'<h3[^>]*>(.*?)</h3>', content_html, flags=re.IGNORECASE)
        
        if len(raw_parts) < 3:
            if content_html.strip():
                clean_txt = clean_html(content_html)
                parsed_updates.append({
                    "id": f"{entry_id}-0",
                    "date": date_str,
                    "timestamp": updated_str,
                    "type": "General",
                    "content_html": content_html.strip(),
                    "content_text": clean_txt,
                    "link": link_href
                })
        else:
            sub_idx = 0
            for i in range(1, len(raw_parts), 2):
                update_type = raw_parts[i].strip()
                update_html = raw_parts[i+1].strip() if i+1 < len(raw_parts) else ""
                
                clean_txt = clean_html(update_html)
                
                parsed_updates.append({
                    "id": f"{entry_id}-{sub_idx}",
                    "date": date_str,
                    "timestamp": updated_str,
                    "type": update_type,
                    "content_html": update_html,
                    "content_text": clean_txt,
                    "link": link_href
                })
                sub_idx += 1
                
    return parsed_updates

def get_cached_feed(force_refresh=False):
    """Fetches feed and handles file caching."""
    now = time.time()
    
    if not force_refresh and os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                cache_data = json.load(f)
            if now - cache_data.get("cached_at", 0) < CACHE_DURATION_SECS:
                return cache_data.get("updates", []), cache_data.get("cached_at", 0), False
        except Exception as e:
            print(f"Error reading cache: {e}")
            
    # Fetch from web
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        xml_data = response.text
        updates = parse_xml_feed(xml_data)
        
        # Write to cache
        cache_data = {
            "cached_at": now,
            "updates": updates
        }
        with open(CACHE_FILE, 'w') as f:
            json.dump(cache_data, f)
            
        return updates, now, True
    except Exception as e:
        print(f"Error fetching feed from Google: {e}")
        # If fetch failed but we have stale cache, return stale cache
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r') as f:
                    cache_data = json.load(f)
                return cache_data.get("updates", []), cache_data.get("cached_at", 0), False
            except:
                pass
        return [], 0, False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    updates, cached_at, fetched = get_cached_feed(force_refresh=False)
    return jsonify({
        "status": "success",
        "updates": updates,
        "cached_at": cached_at,
        "is_fresh_fetch": fetched
    })

@app.route('/api/refresh', methods=['POST'])
def refresh_notes():
    updates, cached_at, fetched = get_cached_feed(force_refresh=True)
    return jsonify({
        "status": "success",
        "updates": updates,
        "cached_at": cached_at,
        "is_fresh_fetch": fetched
    })

if __name__ == '__main__':
    # Using 5002 port to ensure it doesn't conflict with other default ports
    app.run(debug=True, host='0.0.0.0', port=5002)
