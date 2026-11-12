#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to generate all 9 fantasy continent/region backgrounds for '신의 사자 RPG'.
Saves high-resolution images to src/public/assets/visuals/backgrounds/
"""

import os
import sys
import time
import urllib.request
import urllib.parse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "src" / "public" / "assets" / "visuals" / "backgrounds"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TARGETS = [
    {
        "id": "shingye_celestial_sanctuary",
        "filename": "shingye_celestial_sanctuary.jpg",
        "region": "신계",
        "nations": ["신계", "신의 성소", "양의 기운의 성전", "음의 기운의 성전", "무의 궁"],
        "name": "신계 천상 성소",
        "concept": "천상 성소/신성 빛과 부유도",
        "prompt": "Breathtaking cinematic wide shot dark fantasy RPG landscape, celestial divine sanctuary floating high above golden clouds, monumental radiant crystal spires, majestic floating holy islands with waterfalls of pure liquid sunlight cascading into the azure abyss, intricate rotating sacred golden halos in the sky, ethereal divine rays, god rays, serene awe-inspiring atmosphere, 8k resolution, Unreal Engine 5 render, Artstation trending, fantasy wallpaper, 16:9 widescreen",
        "seed": 42
    },
    {
        "id": "magye_imperial_citadel",
        "filename": "magye_imperial_citadel.jpg",
        "region": "마계",
        "nations": ["마계", "임페리얼 제국"],
        "name": "마계 임페리얼 제국 요새",
        "concept": "뒤틀린 흑요석 요새, 핏빛 마기",
        "prompt": "Epic dark fantasy RPG landscape, sprawling demonic capital city and towering twisted obsidian fortress citadel, glowing molten lava rivers running through black jagged basalt canyons, ominous crimson blood-red demonic miasma and dark mist rising into tempestuous storm clouds, giant blood moon eclipse in the dark sky, spiked Gothic dark battlements, colossal gargoyles, intimidating sinister majesty, 8k, cinematic lighting, Artstation trending, fantasy wallpaper, 16:9 widescreen",
        "seed": 108
    },
    {
        "id": "silvanar_myrtal_forest",
        "filename": "silvanar_myrtal_forest.jpg",
        "region": "실바나르",
        "nations": ["실바나르", "미르탈 숲연합"],
        "name": "실바나르 미르탈 세계수 성역",
        "concept": "발광하는 거대 세계수와 엘프 숲",
        "prompt": "Majestic high fantasy RPG wide landscape, enchanted elven forest sanctuary of Silvanar, gigantic colossal world tree Yggdrasil with luminescent roots and sprawling canopy glowing with emerald and teal bioluminescent moss, elegant translucent elven tree-top spires and arched bridges interwoven with living nature, glowing cyan spirit lotus ponds, magical floating pollen motes, starry twilight sky, dreamlike tranquil fairy kingdom, 8k, masterpiece, Artstation trending, 16:9 widescreen",
        "seed": 256
    },
    {
        "id": "feraldia_leonis_colosseum",
        "filename": "feraldia_leonis_colosseum.jpg",
        "region": "페랄디아",
        "nations": ["페랄디아", "레오니스 투기국"],
        "name": "페랄디아 레오니스 투기국",
        "concept": "거친 협곡, 수인들의 고대 콜로세움",
        "prompt": "Vibrant epic dark fantasy RPG landscape, fierce beastfolk warrior kingdom of Feraldia, monumental ancient stone gladiatorial colosseum carved directly into giant red rock canyon cliffs, roaring ceremonial bonfires on stone bastions, massive beast skull totems and rugged war banners fluttering in desert winds, harsh jagged badlands, dusty sunset golden hour rim lighting, primal glory and untamed strength, 8k, cinematic wide angle, Artstation, 16:9 widescreen",
        "seed": 333
    },
    {
        "id": "abyssalon_necrodium",
        "filename": "abyssalon_necrodium.jpg",
        "region": "아비살론",
        "nations": ["아비살론", "네크로디움 제국"],
        "name": "아비살론 네크로디움 심연도시",
        "concept": "심연의 네크로폴리스",
        "prompt": "Haunting dark fantasy RPG wide scenery, spectral necropolis of Abyssalon Necrodium, sunken eternal tomb city in the shadowed abyss, towering spires made of bleached dragon bones and blackened mausoleum tombs, eerie glowing ghostly emerald green soul-fire lantern flames, ethereal cyan mist hovering over winding bone bridges, floating departed spirit orbs, chilling gloomy atmospheric depth, 8k, masterpiece, Artstation trending, 16:9 widescreen",
        "seed": 666
    },
    {
        "id": "asia_korea_celestial_palace",
        "filename": "asia_korea_celestial_palace.jpg",
        "region": "아시아",
        "nations": ["대한민국", "북한", "일본", "중국", "인도", "태국", "베트남", "필리핀", "몽골", "인도네시아", "말레이시아", "싱가포르"],
        "name": "아시아 동양 천도 궁궐",
        "concept": "도술과 신수가 깃든 동양풍 천도/궁궐",
        "prompt": "Splendid oriental fantasy RPG landscape, majestic ancient East Asian imperial celestial palace built atop floating mist-shrouded mountain peaks, traditional jade and gold-trimmed curved eaves roofs, towering vermilion pillars and grand marble stone staircases rising through sea of swirling clouds, glowing golden Taoist talismans and spiritual lotus lanterns floating in the night air, silhouette of mythical azure dragons soaring through the moonlight sky, cherry blossom petals, 8k resolution, cinematic digital art, 16:9 widescreen",
        "seed": 777
    },
    {
        "id": "europe_gothic_cathedral",
        "filename": "europe_gothic_cathedral.jpg",
        "region": "유럽",
        "nations": ["유럽", "영국", "프랑스", "독일", "이탈리아", "스페인", "러시아", "스웨덴", "노르웨이", "덴마크", "핀란드", "폴란드", "우크라이나", "네덜란드", "벨기에", "스위스", "오스트리아", "포르투갈", "그리스", "체코", "루마니아", "터키", "스코틀랜드"],
        "name": "유럽 고딕 대성당 성채",
        "concept": "고딕 판타지 대성당과 마법 성벽",
        "prompt": "Epic medieval gothic fantasy city view, soaring grand gothic cathedral with monumental stained-glass rose windows glowing with sapphire and golden arcane light, formidable ancient stone fortress walls inlaid with glowing blue protective magic barrier runes, grand cobblestone plaza with ornate wrought-iron street lamps under twilight starry sky, gargoyle carved ramparts, majestic chivalric kingdom atmosphere, 8k, cinematic masterpiece, Artstation trending, 16:9 widescreen",
        "seed": 888
    },
    {
        "id": "africa_middle_east_oasis_temple",
        "filename": "africa_middle_east_oasis_temple.jpg",
        "region": "아프리카",
        "nations": ["아프리카", "이집트", "사우디아라비아", "UAE", "이스라엘", "이란", "남아공", "나이지리아", "케냐", "모로코"],
        "name": "아프리카/중동 오아시스 태양 신전",
        "concept": "황금빛 모래 언덕과 오아시스 신전",
        "prompt": "Magnificent Arabian fantasy RPG landscape, vast sweeping golden sand dunes under a glorious desert sunset, shimmering turquoise mystical oasis surrounded by towering palm trees, ancient sandstone sun-god pyramid temples adorned with glowing hieroglyphics, magnificent gilded domes and minarets glistening in twilight, floating brass magical astrolabes, magical desert kingdom, 8k, cinematic lighting, Artstation trending, 16:9 widescreen",
        "seed": 999
    },
    {
        "id": "america_oceania_magitech_city",
        "filename": "america_oceania_magitech_city.jpg",
        "region": "북아메리카",
        "nations": ["북아메리카", "남아메리카", "오세아니아", "미국", "캐나다", "멕시코", "브라질", "아르헨티나", "호주", "뉴질랜드"],
        "name": "아메리카/오세아니아 마도 공학 대도시",
        "concept": "마도 공학과 마천루 신대륙",
        "prompt": "Dazzling high-fantasy magitech metropolis, futuristic arcane skyscraping towers infused with glowing blue ether conduits and crystal conductors, sleek floating arcane airships and winged sky gliders soaring between elevated glass skybridges, radiant holographic magic circle banners, grand coastal harbor looking out over boundless sapphire ocean waves, vibrant adventurous dawn sunlight, 8k, concept art, Artstation trending, 16:9 widescreen",
        "seed": 1024
    }
]

def download_image(target):
    filename = target["filename"]
    save_path = OUTPUT_DIR / filename

    if save_path.exists() and save_path.stat().st_size > 20000:
        print(f"[SKIP] {filename} already exists ({save_path.stat().st_size} bytes).")
        return True

    prompt = target["prompt"]
    seed = target.get("seed", 42)
    encoded = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=1280&height=720&nologo=true&seed={seed}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    print(f"[FETCH] Generating {target['name']} ({filename})...")
    for attempt in range(1, 4):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=40) as resp:
                data = resp.read()
                if len(data) < 5000:
                    raise ValueError(f"Downloaded image too small ({len(data)} bytes)")
                with open(save_path, "wb") as f:
                    f.write(data)
                print(f"[SUCCESS] {filename} saved ({len(data)} bytes).")
                return True
        except Exception as e:
            print(f"[RETRY {attempt}/3] {filename} failed: {e}")
            time.sleep(3)
    return False

def main():
    print(f"Starting generation for {len(TARGETS)} fantasy continent backgrounds...")
    success_count = 0
    for target in TARGETS:
        if download_image(target):
            success_count += 1
        time.sleep(1) # brief pause between requests

    print(f"\nFinished: {success_count}/{len(TARGETS)} backgrounds downloaded successfully.")

if __name__ == "__main__":
    main()
