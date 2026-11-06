
export const ELF_MONSTER_IMAGE_MAP: Record<string, string> = {
    "숲의 픽시": "https://i.ibb.co/WNGNLQTq/Gemini-Generated-Image-291oqr291oqr291o.png",
    "야생 꽃 사슴": "https://i.ibb.co/390jjjRD/Gemini-Generated-Image-smx1q6smx1q6smx1.png",
    "발광 버섯 슬라임": "https://i.ibb.co/v6cYXjTZ/Gemini-Generated-Image-1w0l561w0l561w0l.png",
    "노래하는 나비": "https://i.ibb.co/gMYrGp1P/Gemini-Generated-Image-9cuabq9cuabq9cua.png",
    "엘프 정찰병 원혼": "https://i.ibb.co/DgbwbtPK/Gemini-Generated-Image-5wvh1s5wvh1s5wvh.png",
    "덩굴 가시 슬라임": "https://i.ibb.co/pr6FtbzH/Gemini-Generated-Image-1jpmvs1jpmvs1jpm.png",
    "숲의 살쾡이": "https://i.ibb.co/WNbRw0Jr/Gemini-Generated-Image-hxyffvhxyffvhxyf.png",
    "오염된 요정": "https://i.ibb.co/NdhQJs4m/Gemini-Generated-Image-b803ttb803ttb803.png",
    "그린 트롤": "https://i.ibb.co/0jz0033m/Gemini-Generated-Image-osflt5osflt5osfl.png",
    "고대 엔트": "https://i.ibb.co/G4dWyvhn/Gemini-Generated-Image-pt1dm0pt1dm0pt1d.png",
    "정령의 인도자": "https://i.ibb.co/PZyD1ZF9/Gemini-Generated-Image-poeughpoeughpoeu.png",
    "숲의 파수꾼": "https://i.ibb.co/gFdz1sTH/Gemini-Generated-Image-s7yymxs7yymxs7yy.png",
    "타락한 상급 정령": "https://i.ibb.co/d49RxV7R/Gemini-Generated-Image-egp3hxegp3hxegp3.png",
    "실바나르 유니콘": "https://i.ibb.co/vx7JfJpc/Gemini-Generated-Image-xu4cfuxu4cfuxu4c.png",
    "숲의 가디언 골렘": "https://i.ibb.co/DDMFskj9/Gemini-Generated-Image-tt7zfqtt7zfqtt7z.png",
    "독안개 히드라": "https://i.ibb.co/6cjFMGLh/Gemini-Generated-Image-9ggi7x9ggi7x9ggi.png",
    "숲의 대장로 환영": "https://i.ibb.co/VWFVM4nw/Gemini-Generated-Image-gkiplugkiplugkip.png",
    "세계수의 수호룡 파편": "https://i.ibb.co/VWFVM4nw/Gemini-Generated-Image-gkiplugkiplugkip.png",
    "정령왕의 대리인": "https://i.ibb.co/KjBLQXbC/Gemini-Generated-Image-dy9tpqdy9tpqdy9t.png",
    "미르탈 전사령": "https://i.ibb.co/wFvGV8Zs/Gemini-Generated-Image-8526sp8526sp8526.png",
    "폭주하는 숲의 심장": "https://i.ibb.co/Z1pC6BSF/Gemini-Generated-Image-emac20emac20emac.png",
    "고대 재앙의 포자": "https://i.ibb.co/VctvFh6Z/Gemini-Generated-Image-f5m7l2f5m7l2f5m7.png",
    "만물을 삼키는 덩굴": "https://i.ibb.co/jPrL6BQm/Gemini-Generated-Image-c5rjn5c5rjn5c5rj.png",
    "태초의 숲 정령": "https://i.ibb.co/XZscZF1m/Gemini-Generated-Image-qiw2zdqiw2zdqiw2.png",
    "공허의 세계수 가지": "https://i.ibb.co/k2fv49fD/Gemini-Generated-Image-pqayiypqayiypqay.png",
    "차원 균열의 숲 요괴": "https://i.ibb.co/WWQfdMn6/Gemini-Generated-Image-6c4e9i6c4e9i6c4e.png",
    "심연의 정령 로드": "https://i.ibb.co/TxQY1vw0/Gemini-Generated-Image-1orpjf1orpjf1orp.png",
    "엘프 여왕 엘라디아의 투영": "https://i.ibb.co/3YcL8rhK/Gemini-Generated-Image-dxw4ngdxw4ngdxw4.png",
    "태초의 생명수 화신": "https://i.ibb.co/GQk4HcJf/Gemini-Generated-Image-z4o5s8z4o5s8z4o5.png",
    "신수 실바나스": "https://i.ibb.co/2196NWM2/Gemini-Generated-Image-avwqt0avwqt0avwq.png"
};

export const ELF_HUNT_THEMES = {
    "미르탈 숲연합": {
        fieldSuffix: "신비로운 정령의 숲과 세계수의 뿌리",
        monsters: {
            beginner: ["숲의 픽시", "야생 꽃 사슴", "발광 버섯 슬라임","숲의 살쾡이", "노래하는 나비"],
            lower: ["엘프 정찰병 원혼", "덩굴 가시 슬라임", "오염된 요정"],
            intermediate: ["그린 트롤", "고대 엔트", "정령의 인도자", "숲의 파수꾼"],
            advanced: ["타락한 상급 정령", "실바나르 유니콘", "숲의 가디언 골렘", "독안개 히드라"],
            elite: ["숲의 대장로 환영", "세계수의 수호룡 파편", "정령왕의 대리인", "미르탈 전사령"],
            disaster: ["폭주하는 숲의 심장", "고대 재앙의 포자", "만물을 삼키는 덩굴", "태초의 숲 정령"],
            abyss: ["공허의 세계수 가지", "차원 균열의 숲 요괴", "심연의 정령 로드"],
            mythic: ["엘프 여왕 엘라디아의 투영", "태초의 생명수 화신", "신수 실바나스"]
        }
    }
};
