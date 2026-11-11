import os
import sys
import json
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from image_uploader import upload_to_imgbb, update_mapping_table

items = [
    {
        "name": "지옥의 아수라",
        "category": "monster",
        "prompt": "Fierce six-armed demonic Asura warrior engulfed in crimson hellfire and black smoke, wielding glowing demon blades",
        "path": r"C:\Users\PC\.gemini\antigravity\brain\bd241ccb-370f-4827-807e-eaf07c092c5a\hell_asura_1794397500923.jpg"
    },
    {
        "name": "기계식 훈련 로봇",
        "category": "monster",
        "prompt": "Steampunk magic-tech sparring robot with polished brass gears, steel armor plates, combat stance, and glowing cyan core",
        "path": r"C:\Users\PC\.gemini\antigravity\brain\bd241ccb-370f-4827-807e-eaf07c092c5a\mechanical_training_robot_clean_1794397527683.jpg"
    },
    {
        "name": "마력 깃든 스파링 골렘",
        "category": "monster",
        "prompt": "Ancient rune-carved stone sparring golem with glowing violet and sapphire-blue mana crystals",
        "path": r"C:\Users\PC\.gemini\antigravity\brain\bd241ccb-370f-4827-807e-eaf07c092c5a\mana_infused_sparring_golem_1794397508197.jpg"
    },
    {
        "name": "빛의 나비",
        "category": "monster",
        "prompt": "Holy glowing butterfly with crystalline wings, radiating divine golden and white light",
        "path": r"C:\Users\PC\.gemini\antigravity\brain\bd241ccb-370f-4827-807e-eaf07c092c5a\holy_light_butterfly_1794397393983.jpg"
    }
]

print("Starting batch upload directly to ko.imgbb.com...")
for item in items:
    print(f"\nUploading {item['name']} ({item['path']})...")
    try:
        res = upload_to_imgbb(item['path'], item['name'])
        print(f"-> SUCCESS: {res['direct_url']} (Viewer: {res['viewer_url']})")
        entry = {
            "name": item["name"],
            "category": item["category"],
            "prompt": item["prompt"],
            "localPath": item["path"],
            "imageUrl": res["direct_url"],
            "viewerUrl": res["viewer_url"],
            "host": "imgbb"
        }
        update_mapping_table(entry)
        time.sleep(1) # respectful interval
    except Exception as e:
        print(f"-> FAILED for {item['name']}: {e}")

print("\nBatch upload complete!")
